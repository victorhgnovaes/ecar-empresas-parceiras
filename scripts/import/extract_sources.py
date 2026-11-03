"""Read-only extraction. Run with Python containing openpyxl, pypdf and Pillow."""
from pathlib import Path
from zipfile import ZipFile
import json, hashlib
from pypdf import PdfReader
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[2]
DOWNLOADS = ROOT.parent
OUT = ROOT / 'docs/fontes-comerciais'
OUT.mkdir(parents=True, exist_ok=True)
with ZipFile(DOWNLOADS / 'Fazer_Site_-_VW_e_GM___parcerias.zip') as z:
    for item in z.infolist():
        if not item.is_dir() and Path(item.filename).suffix.lower() in ('.xlsx', '.pdf'):
            (OUT / Path(item.filename).name).write_bytes(z.read(item))
sources = []
for f in sorted(OUT.glob('*.xlsx')):
    wb = load_workbook(f, data_only=False)
    values = load_workbook(f, data_only=True)
    sheets = []
    for ws in wb:
        rows = []
        for row in ws:
            cells = [{ 'cell': c.coordinate, 'value': c.value, 'cached': values[ws.title][c.coordinate].value } for c in row if c.value is not None]
            if cells: rows.append(cells)
        sheets.append({'name':ws.title, 'merged':list(map(str,ws.merged_cells.ranges)), 'rows':rows})
    record = {'file':f.name, 'sha256':hashlib.sha256(f.read_bytes()).hexdigest(), 'sheets':sheets}
    (OUT / (f.stem+'.json')).write_text(json.dumps(record,ensure_ascii=False,indent=2,default=str),encoding='utf8')
    sources.append({'file':f.name,'sheets':[{ 'name':s['name'], 'rows':len(s['rows']) } for s in sheets]})
pdfs = list(OUT.glob('*.pdf')) + list(DOWNLOADS.glob('Volkswagen_Dados_Coletados*.pdf'))
for f in pdfs:
    reader = PdfReader(f)
    pages = [{'page':i+1,'text':p.extract_text(extraction_mode='layout')} for i,p in enumerate(reader.pages)]
    (OUT / (f.stem+'.json')).write_text(json.dumps({'file':f.name,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'pages':pages},ensure_ascii=False,indent=2),encoding='utf8')
    (OUT / (f.stem+'.txt')).write_text('\n\n'.join(f'=== PAGE {p["page"]} ===\n{p["text"]}' for p in pages),encoding='utf8')
    sources.append({'file':f.name,'pages':len(pages)})
(OUT / 'inventory.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(sources,ensure_ascii=False,indent=2))
