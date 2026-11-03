"""Public manufacturer assets only. No recoloring, background removal or authentication."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from io import BytesIO
import json, re, hashlib
from PIL import Image, ImageOps, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/fontes-comerciais'
PAGE='https://www.vw.com.br/pt/carros.html'
def fetch(url):
    with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=45) as r: return r.read()
class Images(HTMLParser):
    def __init__(self): super().__init__(); self.images=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='img': self.images.append(a)

def main():
    html=fetch(PAGE).decode(); (OUT/'vw-public-models.html').write_text(html,encoding='utf8')
    parser=Images(); parser.feed(html)
    entries=[]
    for img in parser.images:
        alt=img.get('alt',''); url=img.get('src') or img.get('data-src') or ''
        if not url and img.get('srcset'): url=img['srcset'].split(',')[0].split()[0]
        if any(n.lower() in alt.lower() for n in ['Polo','Virtus','T-Cross','Nivus','Tera','Taos','Tiguan','Jetta','Saveiro','Amarok']): entries.append({'alt':alt,'url':url})
    if not entries:
        # Public model selector embeds image URLs in JSON attributes.
        urls=list(dict.fromkeys(re.findall(r'https://media\.vw\.mediaservice\.avp\.tech/[^"<>\s]+',html)))
        print('Image tags',parser.images[:2], 'public media URLs',len(urls)); return
    (OUT/'vw-public-image-links.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf8')
    catalog=json.loads((ROOT/'src/data/generated/volkswagen.json').read_text(encoding='utf8'))
    manifest=[]; previews=[]
    for model in catalog:
        candidate=next((e for e in entries if model['name'].lower() in e['alt'].lower()),None)
        if not candidate: print('Missing',model['name']); continue
        url=candidate['url'].replace('&amp;','&')
        if url.startswith('//'): url='https:'+url
        if not url.startswith('https://media.vw.mediaservice.avp.tech/'): print('Skip non-official media',model['name']); continue
        dest=ROOT/'public/images/vehicles/volkswagen'/model['slug']/'reference.png'; dest.parent.mkdir(parents=True,exist_ok=True)
        try:
            with Image.open(BytesIO(fetch(url))) as im:
                im.load(); im.save(dest,format='PNG'); w,h=im.size
                alpha='A' in im.getbands() and im.getchannel('A').getextrema()[0]<255
                canvas=Image.new('RGB',(360,235),'#f4f6f9'); thumb=im.copy(); thumb.thumbnail((350,200)); canvas.paste(thumb,((360-thumb.width)//2,10),thumb if 'A' in thumb.getbands() else None); ImageDraw.Draw(canvas).text((12,213),model['name'],fill='#142746'); previews.append(canvas)
            path='/'+dest.relative_to(ROOT/'public').as_posix()
            model['image']=path
            for v in model['versions']: v['image']=path
            manifest.append(dict(brand='volkswagen',family=model['slug'],path=path,width=w,height=h,transparent=alpha,format='PNG',sourcePage=PAGE,url=url,credit='Volkswagen do Brasil',permission='Mídia do seletor público oficial; referência local. Confirmar licença comercial antes de publicação externa.',verified=True,exactVersion=False,exactColor=False,exactYear=False,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
            print(model['name'],w,h,'alpha',alpha)
        except Exception as e: print('Download pending',model['name'],str(e))
    (ROOT/'src/data/generated/volkswagen.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    gm=json.loads((ROOT/'src/data/generated/vehicle-assets.json').read_text(encoding='utf8'))
    gm=[x for x in gm if x['brand']!='volkswagen']
    (ROOT/'src/data/generated/vehicle-assets.json').write_text(json.dumps(gm+manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    if previews:
        sheet=Image.new('RGB',(360*3,235*((len(previews)+2)//3)),'white')
        for i,im in enumerate(previews): sheet.paste(im,((i%3)*360,(i//3)*235))
        sheet.save(OUT/'vw-image-review.png')
if __name__=='__main__': main()
