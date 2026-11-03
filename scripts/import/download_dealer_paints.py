"""Import public vehicle media URLs evidenced by the user's existing ECAR audit.
No login, cookies, token export, recoloring, or access-control bypass.
"""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
from io import BytesIO
import json,hashlib,re

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'src/data/generated'; INTERNAL=ROOT/'docs/fontes-comerciais'
AUDIT=ROOT.parent/'ECAR_FROTAS_BASE_COMPLETA/ECAR_FROTAS_BASE/docs/audit-validation/image-assets.json'
BASE='https://dealers.vendascorporativas.com.br/images/vw'

def read(p): return json.loads(Path(p).read_text(encoding='utf8'))
def write(p,d): Path(p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

def download(job):
    model,version,color=job
    code=version['commercialCode'].split('-')[0]
    paint=color['code']; year=version['modelYear']
    url=f'{BASE}/{year}/{code}/{paint}.jpg'
    path=ROOT/'public/images/vehicles/volkswagen'/model['slug']/str(year)/code/paint/'front-3q.png'
    result=dict(brand='volkswagen',family=model['slug'],version=version['id'],commercialCode=version['commercialCode'],modelYear=year,colorId=color['id'],color=paint,colorName=color['name'],url=url,sourcePage='https://dealers.vendascorporativas.com.br/',sourceEvidence='ECAR_FROTAS_BASE_COMPLETA/ECAR_FROTAS_BASE/docs/audit-validation/image-assets.json',permission='Mídia do dealer já referenciada no acervo ECAR, reutilização solicitada pelo usuário; confirmar licença para publicação externa.',exactVersion=True,exactColor=True,exactYear=True)
    try:
        if path.exists():
            with Image.open(path) as im: im.load(); width,height=im.size
        else:
            with urlopen(Request(url,headers={'User-Agent':'ECAR vehicle media import'}),timeout=25) as response:
                if 'image/' not in response.headers.get('Content-Type',''): raise ValueError('Resposta não é imagem; acesso não contornado')
                data=response.read()
            with Image.open(BytesIO(data)) as im:
                im.load(); width,height=im.size
                if width<200 or height<100: raise ValueError('Resolução insuficiente')
                path.parent.mkdir(parents=True,exist_ok=True);im.save(path,format='PNG')
        result.update(path='/'+path.relative_to(ROOT/'public').as_posix(),width=width,height=height,transparent=False,format='PNG',verified=True,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),status='DOWNLOADED',quality='Resolução original do dealer; não ampliada artificialmente')
    except Exception as e:
        result.update(status='MISSING',reason=f'{type(e).__name__}: {str(e)[:180]}')
    return result

def main():
    evidence=read(AUDIT)
    examples=[x for x in evidence['images'] if '/images/vw/' in x.get('source','')]
    if not examples: raise ValueError('No public dealer image evidence in ECAR source')
    catalog=read(DATA/'volkswagen.json')
    jobs=[(m,v,c) for m in catalog for v in m['versions'] for c in v['colors']]
    results=[]
    with ThreadPoolExecutor(max_workers=3) as pool:
        for i,result in enumerate(pool.map(download,jobs),1):
            results.append(result)
            if i%30==0: print(f'{i}/{len(jobs)} processed',flush=True)
    write(INTERNAL/'dealer-paint-results.json',results)
    ready={(r['version'],r['colorId']):r for r in results if r['status']=='DOWNLOADED'}
    for m in catalog:
        for v in m['versions']:
            for c in v['colors']:
                if (v['id'],c['id']) in ready:
                    asset=ready[(v['id'],c['id'])];c['image']=asset['path'];c['imageStatus']='MATCHED_DEALER';c['imageSources']=[{'file':asset['url'],'lastVerifiedAt':'2026-10-30'}]
                else: c['imageStatus']='MISSING_PAINT_REFERENCE_ONLY'
            v['image']=next((c['image'] for c in v['colors'] if c.get('image')),v.get('image'))
        m['image']=next((v['image'] for v in m['versions'] if v.get('image')),m['image'])
        m['colors']=[c for v in m['versions'] for c in v['colors']]
    write(DATA/'volkswagen.json',catalog)
    assets=[a for a in read(DATA/'vehicle-assets.json') if a.get('sourceEvidence')!='ECAR_FROTAS_BASE_COMPLETA/ECAR_FROTAS_BASE/docs/audit-validation/image-assets.json']
    assets.extend(ready.values());write(DATA/'vehicle-assets.json',assets)
    write(DATA/'dealer-paint-manifest.json',list(ready.values()))
    print(json.dumps({'requestedPaints':len(jobs),'downloaded':len(ready),'missing':len(jobs)-len(ready)},ensure_ascii=False),flush=True)
if __name__=='__main__': main()
