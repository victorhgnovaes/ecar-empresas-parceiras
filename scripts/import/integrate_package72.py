"""Install only absent provisional PNGs, preserve photos, and reapply explicit statuses.

No network and no automatic promotion of manufacturer candidates. Commercial
validation and photographic validation remain independent.
"""
from pathlib import Path
from PIL import Image
import json, hashlib, csv, shutil, sys
from datetime import date
from collections import Counter

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'src/data/generated'
DOCS=ROOT/'docs'
PACKAGE=DOCS/'fontes-comerciais/pacote72-provisorio'
PRIVATE=DOCS/'fontes-comerciais/pacote72-auditoria'
MANIFEST=DATA/'package72-manifest.json'
ARCHIVE='ECAR_72_PNGs_versoes_cores_PACOTE_PROVISORIO.zip'

def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,d): p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def image_info(p):
    with Image.open(p) as im:
        im.load()
        if im.format!='PNG': raise ValueError('Not a real PNG: '+str(p))
        return dict(width=im.width,height=im.height,transparent='A' in im.getbands() and im.getchannel('A').getextrema()[0]<255,sha256=sha(p))

def initialize(models,assets):
    inventory=read(PACKAGE/'inventario_72_imagens.json')
    csv_rows=list(csv.DictReader((PACKAGE/'inventario_72_imagens.csv').open(encoding='utf-8-sig',newline=''),delimiter=';'))
    searches=list(csv.DictReader((PACKAGE/'buscas_72_fotografias_reais.csv').open(encoding='utf-8-sig',newline=''),delimiter=';'))
    audit=read(PACKAGE/'auditoria_arquivos.json')
    assert len(inventory)==len(csv_rows)==len(searches)==len(audit['files'])==audit['total']==72
    for row,csv_row in zip(inventory,csv_rows):
        assert all(str(v)==csv_row[k] for k,v in row.items())
        assert row['tipo_imagem']=='ILUSTRACAO_TEMPORARIA' and not row['foto_oficial_verificada']
    for row,search in zip(inventory,searches):
        assert search['arquivo_esperado']==row['PNG esperado em public'] and search['foto_real_confirmada']=='NAO'
    for item in audit['files']:
        info=image_info(PACKAGE/item['path'])
        assert item['exists'] and item['mode']=='RGBA' and item['dimensions']==[info['width'],info['height']]
        with Image.open(PACKAGE/item['path']) as im:
            assert all(im.getpixel(corner)[3]==0 for corner in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)])
    result=[]
    for number,row in enumerate(inventory,1):
        model=next(m for m in models if m['brand']==row['Marca'] and m['name']==row['Modelo'])
        version=next(v for v in model['versions'] if v['commercialCode']==row['Código da versão'] and v['modelYear']==int(row['MY']))
        color=next(c for c in version['colors'] if c['code']==row['Código da pintura'])
        if color.get('imageStatus','').startswith('MATCHED'): raise ValueError('Refusing to replace a matched photo: '+color['id'])
        path=row['PNG esperado em public']
        target=(ROOT/'public'/path.lstrip('/')).resolve()
        if not target.is_relative_to((ROOT/'public/images/vehicles').resolve()): raise ValueError('Invalid requested path')
        existed=target.exists()
        # Do not overwrite even uncertain photographs with cartoons.
        if not existed:
            target.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(PACKAGE/row['arquivo_no_zip'],target)
        status='MISSING_PAINT_REFERENCE_ONLY' if existed else 'TEMPORARY_ILLUSTRATION'
        source=next((a for a in assets if a['path']==path),{})
        result.append(dict(number=number,brand=model['brand'],family=model['slug'],model=model['name'],modelYear=version['modelYear'],
                           version=version['id'],commercialCode=version['commercialCode'],colorId=color['id'],color=color['code'],colorName=color['name'],
                           path=path,imageStatus=status,imageKind='REFERENCE_PHOTO_UNVERIFIED' if existed else 'ILUSTRACAO_TEMPORARIA',
                           photographVerified=False,verified=False,exactVersion=False,exactColor=False,exactYear=False,
                           licenseStatus='REFERENCIA_PREEXISTENTE' if existed else 'PACOTE_FORNECIDO_PELO_USUARIO',
                           sourceArchive=ARCHIVE,sourcePath=row['arquivo_no_zip'],url=source.get('url'),
                           permission=source.get('permission','Ilustração temporária fornecida pelo usuário e uso provisório solicitado. Não é fotografia nem imagem oficial.'),
                           originalImage=color.get('image'),preservedExistingFile=existed,**image_info(target)))
    baseline=read(PRIVATE/'verified-before.json')
    write(DATA/'package72-preserved-assets.json',baseline)
    write(MANIFEST,result)
    return result

def make_report(manifest,research):
    by_number={r['number']:r for r in research}
    rows=[]
    for item in manifest:
        found=by_number.get(item['number'],{})
        rows.append(dict(numero=item['number'],marca=item['brand'],modelo=item['model'],MY=item['modelYear'],versao=item['commercialCode'],
                         pintura=item['color'],cor=item['colorName'],arquivo=item['path'],imagem_em_uso=item['imageKind'],
                         foto_verificada=False,pesquisa=found.get('status','PESQUISA_PENDENTE'),
                         pendencia=found.get('reason','Sem candidato validado'),fonte=found.get('sourcePage',''),
                         candidato_url=found.get('sourceUrl',''),candidato_local=found.get('candidateFile',''),
                         licenca=found.get('licenseStatus','PENDENTE_AUTORIZACAO_COMERCIAL'),sha256=item['sha256']))
    write(DATA/'package72-research.json',research)
    with (DOCS/'INVENTARIO_72_FOTOGRAFIAS.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0]),delimiter=';');writer.writeheader();writer.writerows(rows)
    counts=Counter(r.get('status') for r in research)
    summary=dict(requested=72,photographsVerified=0,photographsReplaced=0,temporaryIllustrations=sum(not x['preservedExistingFile'] for x in manifest),
                 existingReferencesPreserved=sum(x['preservedExistingFile'] for x in manifest),officialCandidatesDownloaded=sum(bool(r.get('candidateFile')) for r in research),
                 candidatesRejectedForWheels=counts['DIVERGENCIA_RODAS_ACABAMENTO'],candidatesAwaitingValidation=counts['CANDIDATO_OFICIAL_LICENCA_PENDENTE'],
                 realPhotographsPending=72,previousMatchedAssociationsPreserved=482)
    write(DATA/'package72-coverage.json',summary)
    lines=['# Relatório de imagens ECAR — pacote de 72 PNGs','',
           f'Pesquisa iniciada em 30/10/2026; integração conferida em {date.today().isoformat()}. Todos os documentos, inventários JSON/CSV, buscas e auditoria do ZIP foram lidos. As 72 imagens do pacote são desenhos temporários, não fotografias; o status comercial não valida a imagem. Extração original preservada em `docs/fontes-comerciais/pacote72-provisorio`, fora da área pública.',
           '', '## Resultado efetivo', '',
           f'- 72 caminhos conferidos; {summary["temporaryIllustrations"]} PNGs temporários instalados apenas onde o caminho estava ausente. {summary["existingReferencesPreserved"]} fotos de referência preexistentes mantidas sem sobrescrita.',
           '- 482 associações anteriormente correspondentes (211 GM + 271 VW) preservadas, com mesmos caminhos e SHA-256. Backup em Downloads: `ecar-pacote72-checkpoint-20261030-163534.zip`.',
           f'- {summary["officialCandidatesDownloaded"]} renders oficiais candidatos obtidos para inspeção, separados em pasta privada. {summary["candidatesRejectedForWheels"]} rejeitados por rodas/acabamento e {summary["candidatesAwaitingValidation"]} aguardam validação visual completa e autorização comercial.',
           '- **0 fotografias reais novas homologadas ou aplicadas. 72 fotografias reais continuam pendentes.** Arquivo disponível, código retornado e autorização de uso são verificações diferentes. Um render de configurador não foi contado como fotografia capturada.',
           '- Ilustrações aparecem como “Imagem ilustrativa temporária”; referências não exatas continuam indicando consulta ao Emerson. Não foram feitas recolorações, recortes por IA ou trocas silenciosas de MY/versão.',
           '', '## Fontes locais e divergências', '',
           '- Aurora original inspecionado primeiro, sem alterações: `Downloads/ecar.aurora/Ecar/Aurora`. Manifestos oficiais/revisados, overrides e diretórios R7Y/R9D contêm Activ Prata Shark e S10 chassi-cabine Prata Shark; não comprovam as nove cores faltantes. Essas duas fotos prateadas não foram copiadas com nomes de outras pinturas.',
           '- O pacote cita `Volkswagen_Dados_Coletados_28-10-2026(2).pdf`, ausente em Downloads. Foi utilizado o original disponível `Volkswagen_Dados_Coletados_28-10-2026.pdf`, SHA-256 `c74c51fa044230c860d3cd9858dcc536b6933627e12e2d0831ae99d51f377583`, já extraído integralmente, e os registros conciliados das quatro planilhas.',
           '- Nivus GTS MY27: PDF p. 88 usa B4A1/6KA1/C2A1/I8A1 para cores bicolores; a listagem comercial inclui B4B4/2R2R/C2C2/6K6K com nomes que não coincidem com a resposta oficial. “2R2R Vermelho Sunset” retorna Cinza Platinum; “6K6K Azul Titan” retorna Vermelho Sunset. Não houve correção automática dos valores comerciais nem validação dessas fotos.',
           '- Nivus MY26: PDF p. 99 informa Preto Ninja / Bi-Color nas pinturas B4A1/6KA1/C2A1/I8A1. O nome abreviado no inventário não comprova teto monocromático. Divergência permanece registrada.',
           '- Tera High: PDF p. 108 lista bicolores, mas as consultas públicas desses códigos retornaram Preto Ninja; imagens rejeitadas para as pinturas pedidas. Comfort/High sólidos: 12 renders têm os mesmos pixels do MPI na mesma pintura e supercalotas; PDF exige rodas de liga leve 16/17 polegadas. Rejeitados para Comfort/High, mesmo com o modelId nominal retornado correto.',
           '- Taos Highline MY26: PDF p. 124 contém bicolores; o configurador curou esses pedidos para Branco Puro. Não foi aceita essa substituição. Os dez arquivos locais já em revisão continuam sem homologação fotográfica.',
           '- Amarok: os códigos C2C2, 3X3X/X3X3 e 7Z7Z não foram homologados pela lista de nomes. Polo MY26 BZ32K4 e Amarok AGDC8A/AGDD8A não constam no seletor oficial atual. Não foram usados MY/versões atuais como substitutos.',
           '- As seis linhas de `ALERTAS_VALIDACAO_CODIGOS_VW.csv` foram consideradas. O significado do código depende do modelo/MY; não foi aplicada equivalência global de códigos.',
           '', '## Fontes públicas e permissão', '',
           '- [Onix oficial Chevrolet](https://www.chevrolet.com.br/carros/novo-onix): o colorizer atual inclui Activ em Azul Boreal, Branco Summit, Preto Ouro Negro e Vermelho Scarlet. Quatro PNGs oficiais transparentes foram encontrados e inspecionados; liberação comercial não foi comprovada e eles permanecem privados.',
           '- [S10 oficial Chevrolet](https://www.chevrolet.com.br/picapes/s10), [Energia](https://www.chevroletenergia.com.br/picapes/chevrolet-s10) e [Américas](https://www.chevroletamericas.com.br/novos/s10-2027): não foi comprovada fotografia exata da carroceria chassi-cabine nas cinco pinturas solicitadas.',
           '- [Configurador oficial VW](https://www.vw.com.br/pt/configurador.html): respostas públicas revisadas por código, MY, revisão, pintura e configuração efetivamente resolvida. Media URLs e configurações foram preservadas no inventário de candidatos, sem cookies, login ou credenciais pessoais.',
           '- [Termos de download VW News](https://www.vwnews.com.br/termos-legais/termoDownload): material de imprensa tem finalidade editorial e não autoriza uso comercial. Essas fotos não foram instaladas. Disponibilidade pública não foi tratada como licença de republicação.',
           '- Fontes com licença aberta também pesquisadas: [Polo TSI no Wikimedia](https://commons.wikimedia.org/wiki/File:Volkswagen_Polo_TSI.jpg) é Polo V fotografado na Suécia; não corresponde ao Polo brasileiro solicitado. [Nivus GTS](https://commons.wikimedia.org/wiki/File:Volkswagen-nivus-gts-2025-13-2048x1152.webp) e [Tera](https://commons.wikimedia.org/wiki/Category:Volkswagen_Tera) não comprovam todas as combinações MY/versão/pintura pedidas. Não usados como substitutos.',
           '- Para homologar um candidato: comprovar autorização comercial aplicável ao arquivo, confirmar visualmente rodas, teto, acabamento e ano/versão, registrar crédito e licença, e só então promover o status. Nenhuma autorização foi presumida.',
           '', '## Inventário por combinação', '',
           'Nº | Marca/modelo | MY / versão | Pintura | Em uso | Pesquisa e pendência | Fonte',
           '--- | --- | --- | --- | --- | --- | ---']
    for r in rows:
        source=f'[página]({r["fonte"]})' if r['fonte'] else 'Fonte local'
        if r['candidato_url']:source+=f' · [arquivo candidato]({r["candidato_url"]})'
        lines.append(f'{r["numero"]} | {r["marca"]} {r["modelo"]} | {r["MY"]} / {r["versao"]} | {r["pintura"]} — {r["cor"]} | {r["imagem_em_uso"]} | {r["pesquisa"]}: {r["pendencia"]} | {source}')
    lines+=['','Caminhos exatos, hashes, fontes e arquivos candidatos: `INVENTARIO_72_FOTOGRAFIAS.csv`, `src/data/generated/package72-manifest.json` e `package72-research.json`. Candidatos privados não são servidos pelo site. Nenhum envio externo ou publicação foi realizado.','','## Verificações','','Ver resultados da execução em `VALIDACAO_PACOTE_72.md`.']
    (DOCS/'RELATORIO_IMAGENS_ECAR.md').write_text('\n'.join(lines)+'\n',encoding='utf8')

def main():
    models=read(DATA/'chevrolet.json')+read(DATA/'volkswagen.json')
    assets=read(DATA/'vehicle-assets.json')
    if not MANIFEST.exists() and not (PACKAGE/'inventario_72_imagens.json').exists():
        print('Pacote 72 ainda não instalado; catálogo preservado.');return
    manifest=read(MANIFEST) if MANIFEST.exists() else initialize(models,assets)
    for item in manifest:
        target=ROOT/'public'/item['path'].lstrip('/')
        if not target.exists() or sha(target)!=item['sha256']: raise ValueError('Arquivo ausente ou alterado sem revisão: '+item['path'])
        model=next(m for m in models if m['brand']==item['brand'] and m['slug']==item['family'])
        version=next(v for v in model['versions'] if v['id']==item['version'])
        color=next(c for c in version['colors'] if c['id']==item['colorId'])
        if color.get('imageStatus','').startswith('MATCHED'): raise ValueError('Refusing to downgrade matched photo: '+color['id'])
        color.update(image=item['path'],imageStatus=item['imageStatus'],imageKind=item['imageKind'],
                     imageSources=[dict(file=ARCHIVE,sha256=item['sha256'],lastVerifiedAt='2026-10-30')])
        if not any(a['path']==item['path'] for a in assets): assets.append({**item,'format':'PNG','sourceEvidence':'ECAR_PACKAGE72'})
    for model in models: model['colors']=[c for v in model['versions'] for c in v['colors']]
    for brand in ['chevrolet','volkswagen']:write(DATA/f'{brand}.json',[m for m in models if m['brand']==brand])
    write(DATA/'vehicle-assets.json',assets)
    for preserved in read(DATA/'package72-preserved-assets.json'):
        assert sha(ROOT/'public'/preserved['path'].lstrip('/'))==preserved['sha256'], 'Verified photograph modified'
        version=next(v for m in models for v in m['versions'] if v['id']==preserved['version'])
        color=next(c for c in version['colors'] if c['id']==preserved['colorId'])
        assert color['image']==preserved['path'] and color['imageStatus'].startswith('MATCHED')
    research=read(PRIVATE/'research-results.json') if (PRIVATE/'research-results.json').exists() else read(DATA/'package72-research.json')
    make_report(manifest,research)
    print(json.dumps(read(DATA/'package72-coverage.json'),ensure_ascii=False,indent=2))

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf8')
    main()
