from pathlib import Path
from PIL import Image,ImageDraw
import json
ROOT=Path(__file__).resolve().parents[2]
models=json.loads((ROOT/'src/data/generated/volkswagen.json').read_text(encoding='utf8'))
chosen=[]
for m in models:
    versions=[v for v in m['versions'] if any(c.get('imageStatus')=='MATCHED_DEALER' for c in v['colors'])]
    for v in versions:
        paints=[c for c in v['colors'] if c.get('imageStatus')=='MATCHED_DEALER']
        for c in paints[:2]: chosen.append((m,v,c))
tiles=[]
for m,v,c in chosen:
    canvas=Image.new('RGB',(330,210),'white');draw=ImageDraw.Draw(canvas)
    with Image.open(ROOT/'public'/c['image'].lstrip('/')) as im:
        thumb=im.convert('RGB');thumb.thumbnail((322,165));canvas.paste(thumb,((330-thumb.width)//2,3))
    draw.text((7,170),f'{m["name"]} {v["commercialCode"]} MY{v["modelYear"]}',fill='#203447')
    draw.text((7,186),f'{c["code"]} {c["name"][:34]}',fill='#56697c');tiles.append(canvas)
out=ROOT/'docs/fontes-comerciais'
for part in range(0,len(tiles),28):
    batch=tiles[part:part+28];sheet=Image.new('RGB',(1320,210*((len(batch)+3)//4)),'#e8edf3')
    for i,tile in enumerate(batch):sheet.paste(tile,((i%4)*330,(i//4)*210))
    sheet.save(out/f'paint-review-{part//28+1}.png')
print(f'{len(tiles)} paint images sampled across {len({v["id"] for m,v,c in chosen})} versions; contact sheets saved')
