"""Review public manufacturer media against the 72 requested identities.

Candidates stay outside public/. A successful response is neither a license nor
proof of the requested paint: always retain the resolved configuration.
"""
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from PIL import Image, ImageDraw
import json, hashlib, re, unicodedata

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / 'docs/fontes-comerciais/pacote72-auditoria'
PACKAGE = ROOT / 'docs/fontes-comerciais/pacote72-provisorio'

def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p, data): p.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
def normal(value): return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', value.casefold()).encode('ascii', 'ignore').decode())

def main():
    PRIVATE.mkdir(exist_ok=True)
    inventory = read(PACKAGE/'inventario_72_imagens.json')
    state = next(read(f)['modelOverviewResult'] for f in PRIVATE.glob('ssr-*.json') if 'modelOverviewResult' in read(f))
    origin = urlsplit(state['url'])
    common = dict(parse_qsl(origin.query))
    nodes = {}
    def walk(obj):
        if isinstance(obj, dict):
            key = obj.get('key', {})
            if key.get('modelId'): nodes[key['modelId']] = key
            for val in obj.values(): walk(val)
        elif isinstance(obj, list):
            for val in obj: walk(val)
    walk(state['modelOverview'])
    gm = read(PRIVATE/'gm-onix-colorizer.json')['data']['colorizerModelByPath']['item']['trims']
    activ = next(t for t in gm if t['trimId']=='activ')
    def research(job):
        number, row = job
        brand, model, year, version, code, paint, color, path = list(row.values())[:8]
        record = dict(number=number, brand=brand, model=model, modelYear=int(year), versionName=version,
                      commercialCode=code, paintCode=paint, colorName=color, path=path,
                      photographVerified=False, licenseStatus='PENDENTE_AUTORIZACAO_COMERCIAL', checkedAt='2026-10-30')
        try:
            if brand == 'chevrolet':
                record['sourcePage']='https://www.chevrolet.com.br/carros/novo-onix' if model=='Onix' else 'https://www.chevrolet.com.br/picapes/s10'
                if model != 'Onix':
                    record.update(status='SEM_CANDIDATO_EXATO', reason='Aurora contém apenas Prata Shark R9D; páginas consultadas não comprovam o chassi-cabine nas cinco pinturas solicitadas.')
                    return record
                exterior = next(x for x in activ['exteriors'] if x['exteriorId']==paint)
                url = 'https://www.chevrolet.com.br'+exterior['flipbook']['desktopImagePathFormat'].replace('{framenumber}', '001')
                record.update(sourceUrl=url, resolved=dict(trim=activ['name'],paint=exterior['name'],modelYear=2027), metadataMatches=True)
            else:
                base, revision = code.rsplit('-',1)
                key = nodes.get(base)
                record['sourcePage']='https://www.vw.com.br/pt/configurador.html/__app/'+re.sub(r'[^a-z0-9-]', '', model.casefold())+'.app'
                if not key:
                    record.update(status='CONFIGURACAO_NAO_DISPONIVEL', reason='Código não consta no seletor oficial atual; não substituir por outra versão.')
                    return record
                params = {**common, 'carlineKey':key['carlineId'], 'category':'private', 'equipmentLine':key['trimId'],
                          'exterior':'F14 '+paint, 'features':'', 'interior':'F56     ST', 'modelKey':base,
                          'modelVersion':revision, 'modelYear':year, 'salesgroupKey':key['salesgroupId'],
                          'includeMediaAssets':'true', 'allowHeal':'true'}
                # The public configurator may heal to another year, paint or trim.
                # Such responses are retained as divergences, never exact photos.
                url = urlunsplit((origin.scheme, origin.netloc, '/bff/vehicle-configuration', urlencode(params), ''))
                with urlopen(Request(url,headers={'User-Agent':'ECAR image correspondence review'}),timeout=25) as response:
                    payload=json.load(response).get('payload', {})
                vehicle = payload.get('vehicleConfiguration', {})
                write(PRIVATE/f'configuration-{number:02d}.json', vehicle)
                resolved=vehicle.get('resolvedConfiguration', {})
                record['resolved']=resolved
                exterior=vehicle.get('exterior', {})
                record['resolvedPaintName']=exterior.get('name')
                identity = (resolved.get('modelId')==base and str(resolved.get('modelYear'))==year
                            and str(resolved.get('modelVersion'))==revision and resolved.get('exteriorId','').split()[-1:]==[paint])
                paint_matches = normal(color)==normal(exterior.get('name',''))
                record.update(metadataMatches=identity, paintNameMatches=paint_matches)
                if not identity or not paint_matches:
                    record.update(status='DIVERGENCIA_CONFIGURADOR', reason='Resposta não comprova exatamente código, MY, revisão e nome/código de pintura solicitados.')
                    return record
                data=vehicle.get('imageData', {})
                urls=[]
                def collect(item):
                    if isinstance(item,dict):
                        for k,v in item.items():
                            if isinstance(v,str) and v.startswith('https://') and ('media' in v or '.png' in v): urls.append(v)
                            else:collect(v)
                    elif isinstance(item,list):
                        for v in item:collect(v)
                collect(data.get('newImageData', {}))
                if not urls: collect(data)
                urls=list(dict.fromkeys(urls))
                if not urls:
                    record.update(status='SEM_IMAGEM_CONFIGURADOR',reason='Configuração encontrada sem mídia utilizável.')
                    return record
                record['mediaUrls']=urls
                url=urls[0]
                record['sourceUrl']=url
            with urlopen(Request(url,headers={'User-Agent':'ECAR image correspondence review'}),timeout=25) as response:
                data=response.read()
            with Image.open(BytesIO(data)) as im:
                im.load()
                dest=PRIVATE/f'candidate-{number:02d}.png'
                im.save(dest,format='PNG')
                record.update(candidateFile=dest.relative_to(ROOT).as_posix(),width=im.width,height=im.height,
                              transparent='A' in im.getbands() and im.getchannel('A').getextrema()[0]<255,
                              sha256=hashlib.sha256(dest.read_bytes()).hexdigest())
            record.update(status='CANDIDATO_OFICIAL_LICENCA_PENDENTE', imageKind='RENDER_OFICIAL_CONFIGURADOR',
                          reason='Correspondência nominal encontrada; verificar rodas/acabamento e autorização comercial. Render não é fotografia capturada.')
        except HTTPError as exc:
            record.update(status='FONTE_INDISPONIVEL', reason=f'HTTP {exc.code}; não contornado.')
        except Exception as exc:
            record.update(status='PESQUISA_PENDENTE', reason=type(exc).__name__+': '+str(exc)[:180])
        return record
    results=[]
    with ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(research,enumerate(inventory,1)):
            results.append(result)
            if len(results)%12==0: print(f'{len(results)}/72 configurações revisadas',flush=True)
    # Same rendered pixels as MPI do not prove Comfort/High: the local PDF
    # specifies alloy wheels 16/17 inches, while MPI has steel wheels/covers.
    mpi = {r['paintCode']:r.get('sha256') for r in results if r['commercialCode']=='DF12Q4-0'}
    for r in results:
        if r['commercialCode'] in ['DF13B5-0','DF14B5-0'] and r.get('sha256') and r['sha256']==mpi.get(r['paintCode']):
            r.update(status='DIVERGENCIA_RODAS_ACABAMENTO', visualReview='REJEITADO',
                     reason='Pixels idênticos ao Tera MPI da mesma cor, com supercalotas. PDF exige rodas de liga leve 16 polegadas no Comfort e 17 no High. Código retornado não valida a imagem.')
    write(PRIVATE/'research-results.json', results)
    samples=[r for r in results if r.get('candidateFile')]
    for offset in range(0,len(samples),12):
        group=samples[offset:offset+12]; sheet=Image.new('RGB',(1200,250*((len(group)+3)//4)),'white')
        for i,r in enumerate(group):
            with Image.open(ROOT/r['candidateFile']) as original:
                im=original.convert('RGBA');im.thumbnail((290,200));tile=Image.new('RGBA',(300,250),'white');tile.alpha_composite(im,((300-im.width)//2,0))
                draw=ImageDraw.Draw(tile);draw.text((8,205),f'{r["number"]}: {r["model"]} {r["modelYear"]}',fill='black');draw.text((8,222),r['commercialCode']+' '+r['paintCode'],fill='black')
                sheet.paste(tile.convert('RGB'),((i%4)*300,(i//4)*250))
        sheet.save(PRIVATE/f'candidates-review-{offset//12+1}.png')
    from collections import Counter
    print(json.dumps(dict(Counter(r['status'] for r in results)),ensure_ascii=False,indent=2))

if __name__=='__main__': main()
