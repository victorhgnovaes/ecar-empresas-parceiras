"""Apply persisted paint associations after any catalogue reimport; no network needed."""
from pathlib import Path
import json,csv,hashlib
ROOT=Path(__file__).resolve().parents[2]; DATA=ROOT/'src/data/generated'; DOCS=ROOT/'docs'
def read(p): return json.loads(Path(p).read_text(encoding='utf8'))
def write(p,d): Path(p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def main():
    manifest_path=DATA/'dealer-paint-manifest.json'
    if not manifest_path.exists(): print('No dealer paint manifest yet'); return
    images=read(manifest_path); index={(a['version'],a['colorId']):a for a in images}
    grouped={}
    for asset in images: grouped.setdefault((asset['version'],asset['sha256']),[]).append(asset)
    collisions=[group for group in grouped.values() if len(set(a['color'] for a in group))>1]
    ambiguous={(a['version'],a['colorId']) for group in collisions for a in group}
    for asset in images:
        asset['exactColor']=(asset['version'],asset['colorId']) not in ambiguous
        if not asset['exactColor']: asset['reviewIssue']='Imagem idêntica para códigos de pintura distintos no dealer; confirmar correspondência'
    write(manifest_path,images)
    all_assets=read(DATA/'vehicle-assets.json')
    all_assets=[a for a in all_assets if a.get('sourceEvidence')!='ECAR_FROTAS_BASE_COMPLETA/ECAR_FROTAS_BASE/docs/audit-validation/image-assets.json']
    all_assets+=images
    write(DATA/'vehicle-assets.json',all_assets)
    missing=[]; duplicate_colors=[]; stats={}
    for brand in ['chevrolet','volkswagen']:
        models=read(DATA/f'{brand}.json'); available=0; unavailable=0; versions_ready=0
        for model in models:
            for version in model['versions']:
                hashes=[]
                for color in version['colors']:
                    if brand=='volkswagen':
                        asset=index.get((version['id'],color['id']))
                        if asset and (ROOT/'public'/asset['path'].lstrip('/')).exists():
                            color['image']=asset['path'];color['imageStatus']='MISSING_PAINT_REFERENCE_ONLY' if (version['id'],color['id']) in ambiguous else 'MATCHED_DEALER';color['imageSources']=[{'file':asset['url'],'lastVerifiedAt':'2026-10-30'}]
                        else: color['imageStatus']='MISSING_PAINT_REFERENCE_ONLY'
                    else:
                        source=next((a for a in all_assets if a['path']==color.get('image')),None)
                        color['imageStatus']='TEMPORARY_ILLUSTRATION' if source and source.get('sourceEvidence')=='ECAR_PACKAGE72' else 'MISSING_PAINT_REFERENCE_ONLY' if source and Path(source.get('sourcePath','')).name=='reference.png' else 'MATCHED_AURORA'
                    if color['imageStatus'].startswith('MATCHED') and color.get('image'):
                        available+=1
                        path=ROOT/'public'/color['image'].lstrip('/')
                        hashes.append((color['code'],hashlib.sha256(path.read_bytes()).hexdigest()))
                    else:
                        unavailable+=1
                        expected=(f'/images/vehicles/{brand}/{model["slug"]}/{version["modelYear"]}/{version["commercialCode"].split("-")[0].replace("/","-")}/{color["code"]}/front-3q.png')
                        reason='Foto do dealer repetida para pinturas diferentes; confirmar correspondência' if (version['id'],color['id']) in ambiguous else 'Foto da pintura não localizada; permanece referência identificada na interface'
                        missing.append({'Marca':brand,'Modelo':model['name'],'MY':version['modelYear'],'Versão':version['name'],'Código da versão':version['commercialCode'],'Código da pintura':color['code'],'Cor':color['name'],'PNG esperado em public':expected,'Situação comercial':version['status'],'Observação':reason})
                if hashes: versions_ready+=1
                version_hashes={h:[code for code,other in hashes if other==h] for code,h in hashes}
                for h,codes in version_hashes.items():
                    if len(set(codes))>1: duplicate_colors.append(dict(brand=brand,version=version['id'],code=version['commercialCode'],modelYear=version['modelYear'],colors=codes,sha256=h))
                version['image']=next((c['image'] for c in version['colors'] if c.get('image') and c['imageStatus'].startswith('MATCHED')),version.get('image'))
            model['image']=next((v['image'] for v in model['versions'] if v.get('image')),model['image'])
            model['colors']=[c for v in model['versions'] for c in v['colors']]
        write(DATA/f'{brand}.json',models)
        stats[brand]=dict(paintImagesMatched=available,paintImagesMissing=unavailable,versionsWithPaintImages=versions_ready)
    write(DATA/'paint-image-coverage.json',stats);write(DATA/'paint-image-missing.json',missing)
    duplicate_colors=[dict(brand=g[0]['brand'],version=g[0]['version'],code=g[0]['commercialCode'],modelYear=g[0]['modelYear'],colors=[a['color'] for a in g],sha256=g[0]['sha256']) for g in collisions]
    write(ROOT/'docs/fontes-comerciais/paint-image-hash-collisions.json',duplicate_colors)
    with (DOCS/'IMAGENS-FALTANTES-DEALER.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(missing[0]) if missing else ['Marca'],delimiter=';');writer.writeheader();writer.writerows(missing)
    lines=['# Pinturas e imagens — complementação do dealer', '\nAs imagens foram obtidas diretamente de URLs de mídia pública do dealer, já documentadas no acervo ECAR em `ECAR_FROTAS_BASE_COMPLETA/ECAR_FROTAS_BASE/docs/audit-validation/image-assets.json`. Nenhum login, senha, token ou cookie foi utilizado. Foram preservados modelo, código, MY e código da pintura, com conversão real JPEG→PNG, sem recoloração e sem ampliação artificial.', '\nMarca | Fotos de pintura associadas | Fotos pendentes | Versões com alguma foto de pintura', '--- | --- | --- | ---']
    for brand,s in stats.items(): lines.append(f'| {brand} | {s["paintImagesMatched"]} | {s["paintImagesMissing"]} | {s["versionsWithPaintImages"]} |')
    lines+=[f'\nA planilha `IMAGENS-FALTANTES-DEALER.csv` lista exatamente as {len(missing)} combinações faltantes ou sob revisão e o caminho para receber o PNG. O usuário autorizou concluir as fontes disponíveis e fornecer posteriormente as imagens que faltarem no dealer. São associações de versão/MY/pintura, não modelos ausentes.',f'\nDetecção de fotos repetidas entre cores distintas da mesma versão: {len(duplicate_colors)} pares para revisão, envolvendo {len(ambiguous)} associações. Esses casos são marcados como referências, nunca como fotos exatas confirmadas. Igualdade entre MY ou versões não comprova erro visual: pode haver mesma carroceria. A correspondência é registrada conforme o caminho comercial da fonte.','\nAs imagens do dealer têm resolução original próxima de 400 px e fundo branco opaco. Elas mudam de acordo com a pintura selecionada; não foram apresentadas como recortes transparentes nem como imagens de resolução maior. Para impressos e imagens muito grandes, solicitar fotos maiores. Fotos de referência restantes são indicadas discretamente na prévia, e não atribuídas à pintura exata.']
    (DOCS/'RELATORIO-PINTURAS-IMAGENS.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
    divergence=DOCS/'RELATORIO-DIVERGENCIAS.md'
    if divergence.exists():
        original=divergence.read_text(encoding='utf8').split('\n<!-- PAINT-IMAGE-ISSUES -->')[0]
        rows=['\n<!-- PAINT-IMAGE-ISSUES -->','\n## Divergências de imagens por pintura','\nMarca | MY | Versão | Campo | Valor A | Fonte A | Valor B | Fonte B | Status | Ação','--- | --- | --- | --- | --- | --- | --- | --- | --- | ---']
        for group in collisions:
            a,b=group[:2]
            rows.append(f'volkswagen | {a["modelYear"]} | {a["commercialCode"]} | Imagem de pintura | {a["color"]} / {a["sha256"]} | {a["url"]} | {b["color"]} / {b["sha256"]} | {b["url"]} | PENDENTE_VALIDACAO | Foto idêntica para códigos diferentes; manter referência e solicitar imagem correta')
        divergence.write_text(original+'\n'.join(rows)+'\n',encoding='utf8')
    print(json.dumps({'coverage':stats,'missing':len(missing),'sameVersionColorHashCollisions':len(duplicate_colors)},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
