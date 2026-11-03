"""Validate every imported image and emit coverage and unresolved items."""
from pathlib import Path
from PIL import Image
import json, hashlib
from datetime import date

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'src/data/generated'
def read(p): return json.loads(Path(p).read_text(encoding='utf8'))
def main():
    models=read(DATA/'chevrolet.json')+read(DATA/'volkswagen.json')
    assets=read(DATA/'vehicle-assets.json')
    errors=[]; ids=set(); count=0
    for m in models:
        for v in m['versions']:
            if v['id'] in ids: errors.append('Duplicate version '+v['id'])
            ids.add(v['id']); count+=1
            if not v['colors']: errors.append('Missing paint '+v['id'])
            if v['priceCents'] is not None and (not isinstance(v['priceCents'],int) or v['priceCents']<0): errors.append('Bad price '+v['id'])
            if not 0<=v['discount']['basisPoints']<=10000: errors.append('Bad percentage '+v['id'])
            if v['discount']['status']=='VALIDADO' and v['priceStatus']!='VALIDADO': errors.append('Discount on unreconciled price '+v['id'])
            if not v['sources']: errors.append('Missing provenance '+v['id'])
    image_rows=[]
    for a in assets:
        p=ROOT/'public'/a['path'].lstrip('/')
        try:
            with Image.open(p) as im:
                im.verify()
            with Image.open(p) as im:
                png=im.format=='PNG'; width,height=im.size
                transparent='A' in im.getbands() and im.getchannel('A').getextrema()[0]<255
                if not png or width<300 or height<150: errors.append('Bad image '+str(p))
                if hashlib.sha256(p.read_bytes()).hexdigest()!=a['sha256']: errors.append('Image hash mismatch '+str(p))
                image_rows.append((a,png,transparent,width,height))
        except Exception as e: errors.append(str(e))
    coverage=read(DATA/'coverage.json')
    paint_stats=read(DATA/'paint-image-coverage.json') if (DATA/'paint-image-coverage.json').exists() else {}
    for brand in coverage:
        ms=[m for m in models if m['brand']==brand]
        vs=[v for m in ms for v in m['versions']]
        coverage[brand]['familiesWithPng']=sum((ROOT/'public'/m['image'].lstrip('/')).is_file() and m['image'].endswith('.png') for m in ms)
        coverage[brand]['versionsWithReferencePng']=sum(bool(v.get('image')) and v['image'].endswith('.png') for v in vs)
        coverage[brand]['pngAssets']=sum(a['brand']==brand for a in assets)
        coverage[brand]['transparentPngAssets']=sum(a['brand']==brand and t for a,p,t,w,h in image_rows)
        coverage[brand].update(paint_stats.get(brand,{}))
    (DATA/'coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    lines=['# Imagens e proveniência', '\nValidação completa em 30/10/2026. Arquivos abertos com Pillow, assinatura PNG, dimensão e SHA-256 conferidos. Sem recoloração e sem remoção de marcas. Fontes: Volkswagen pública, mídia pública do dealer já referenciada no acervo ECAR e Chevrolet do Aurora.',f'\n{len(assets)} associações de assets PNG; {len({a["sha256"] for a in assets})} arquivos distintos por hash; {sum(t for a,p,t,w,h in image_rows)} associações com transparência real.', '\nVW: 283 imagens de pintura baixadas do dealer sem login, por código/MY/pintura. 271 associações consideradas correspondentes; 12 permanecem referências devido a fotos idênticas para cores diferentes. Mais 51 imagens não foram encontradas. Total: 63 pinturas em pendência, listadas em `IMAGENS-FALTANTES-DEALER.csv`. 56 versões possuem alguma imagem de pintura; 6 versões ainda dependem de referências. Permanecem também 10 fotos gerais transparentes (864×432) do seletor https://www.vw.com.br/pt/carros.html. Imagens de pintura do dealer têm resolução original próxima de 400 px e fundo branco; sem ampliação artificial. Confirmar licença de republicação comercial antes de publicação externa. Origem oficial/comercial não equivale a licença irrestrita.', '\nChevrolet: 220 associações herdadas do Aurora, cobrindo 40 versões e 9 famílias; 211 associações de cor e 9 referências da própria versão. Fotos fornecidas e aprovadas no Aurora não foram tratadas como fotografias oficiais. Fotos opacas permanecem opacas. Galeria permite selecionar pinturas com fotos. Referências são identificadas na interface.', '\nMarca | Família | MY | Versão | Cor | Imagem | PNG | Transparente | Dimensões | Fonte e direito de uso | Pendência', '--- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---']
    for a,p,t,w,h in image_rows:
        lines.append(' | '.join(str(x).replace('|','/') for x in [a['brand'],a['family'],a.get('modelYear','Vários'),a.get('version','Referência da família'),a.get('color','Referência'),a['path'],p,t,f'{w}×{h}',a.get('url') or a.get('sourcePath'),a['permission']]))
    lines[1]=lines[1].replace('Validação completa em 30/10/2026.',f'Referência comercial em 30/10/2026; integridade conferida em {date.today().isoformat()}.')
    if (DATA/'package72-coverage.json').exists():
        lines.insert(3,'\nPacote provisório: 60 desenhos fornecidos pelo usuário foram instalados apenas em caminhos ausentes; 12 fotos de referência preexistentes foram preservadas. As 482 associações correspondentes anteriores continuam intactas. Nenhuma das 72 fotografias reais foi homologada nesta etapa; 37 candidatos oficiais estão em pasta privada, incluindo 12 rejeitados por rodas/acabamento. Ver `RELATORIO_IMAGENS_ECAR.md` para os resultados individuais e limites de permissão. Esses desenhos não são contabilizados como fotos reais.')
    (ROOT/'docs/RELATORIO-IMAGENS.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
    summary=['# Cobertura e validação comercial', '\nData de referência: 30/10/2026. Conferência técnica de fontes, não promessa de disponibilidade. Condições pendentes não geram oferta final; o visitante é direcionado ao Emerson ECAR. Documentos-fonte internos nunca são servidos como assets públicos.', '\nMétrica | Chevrolet | Volkswagen','--- | --- | ---']
    keys=list(coverage['chevrolet'])
    for key in keys: summary.append(f'| {key} | {json.dumps(coverage["chevrolet"][key],ensure_ascii=False)} | {json.dumps(coverage["volkswagen"][key],ensure_ascii=False)} |')
    summary+=['\nChevrolet: 34 regras conciliadas, incluindo Captiva dependente de seleção de código; 33 valores finais disponíveis sem esta seleção. Seis condições bloqueadas: Onix PRO, Onix Turbo MT, Spin AT e Tracker AT (vigência anterior), Montana LT (código divergente), Spark MY26 (regra nova é MY27). A comissão de 2,5% nunca foi somada. A chave de condição remove o caractere final V/T do modelcode, conforme implementação original `Aurora/scripts/import-october-conditions.ts` e configurador do Aurora.', '\nVolkswagen: Faixa II da coluna H do MY correto + 300 pontos-base, aplicada ao total configurado somente quando conciliado. Vigência da tabela: aprovações até 30/10/2026. Faixa II requer frota comprovada de 5 veículos; quantidade digitada no site não comprova elegibilidade. MY26 sem tabela de preço correspondente, percentuais zero, divergências materiais e dependências não comprovadas ficam em consulta. As 13 fichas técnicas vazias continuam vazias, sem herança de outras versões. Três câmbios T-Cross conflitantes foram omitidos da apresentação. Dois MY25 e Passat 2019 estão no arquivo histórico interno, fora do catálogo ativo.', '\nBotões de consulta/proposta abrem WhatsApp em `5511989266321` com mensagem detalhada de versão, MY, código, pintura, pacotes, quantidade e valores permitidos. O envio é uma ação do visitante. Não há checkout, reserva, pagamento ou armazenamento de contatos. Interface usa aviso discreto e relatórios preservam as divergências completas.']
    (ROOT/'docs/VALIDACAO-COMERCIAL.md').write_text('\n'.join(summary)+'\n',encoding='utf8')
    pending=['# Fase 3 — pendências reais','\n- Revisar 6 condições Chevrolet bloqueadas e confirmar as condições atuais com o Emerson ECAR. Captiva necessita selecionar código com regra documentada.',f'- Resolver {coverage["volkswagen"]["pending"]} versões VW pendentes; relatório detalha cada campo e ambas as fontes. Solicitar planilhas de preços MY26 correspondentes e tabelas comerciais renovadas após 30/10/2026.','- Validar 14 registros VW com Faixa II zero, códigos novos ausentes de descontos, divergências de pinturas/pacotes e câmbios. Não aplicar automaticamente 3%.','- Obter 13 fichas técnicas VW vazias e completar dados técnicos ausentes na Chevrolet. Não preenchidos por memória.','- Validar imagem exata por versão/MY/cor VW (62 versões usam referências oficiais de família), 9 referências de pintura GM herdadas do Aurora e licenças de republicação comercial.','- Não há opcionais pagos independentes documentados no snapshot Chevrolet: foram preservadas todas as configurações/códigos e pinturas; não inventar pacotes.','- Homologação comercial, privacidade e termos definitivos, hospedagem e domínio. `noindex` foi preservado. Supabase/administração não implementados sem necessidade de serviço nesta fase.','- Checkpoint ZIP externo disponível em Downloads. Esta pasta não é repositório Git; não foram criados commits fictícios.']
    pending=[line.replace('Validar imagem exata por versão/MY/cor VW (62 versões usam referências oficiais de família), 9 referências de pintura GM herdadas do Aurora e licenças de republicação comercial.','Completar 63 associações VW de pintura (51 ausentes e 12 em revisão por foto repetida), 9 associações GM e licenças de republicação comercial. Lista exata em IMAGENS-FALTANTES-DEALER.csv. O usuário ficou de obter as imagens restantes no dealer.') for line in pending]
    (ROOT/'docs/FASE-3-PENDENCIAS.md').write_text('\n'.join(pending)+'\n',encoding='utf8')
    report={'models':len(models),'versions':count,'assets':len(assets),'errors':errors,'coverage':coverage}
    (ROOT/'docs/fontes-comerciais/validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if errors: raise SystemExit(1)
if __name__=='__main__': main()
