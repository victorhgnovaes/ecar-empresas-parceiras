"""Idempotent Aurora + VW ingestion. No source mutations, credentials or customer records."""
from pathlib import Path
from decimal import Decimal, ROUND_HALF_UP
import json, re, unicodedata, shutil, hashlib
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / 'docs/fontes-comerciais'
AURORA = ROOT.parent / 'ecar.aurora/Ecar/Aurora'
GENERATED = ROOT / 'src/data/generated'
GENERATED.mkdir(parents=True, exist_ok=True)
ISSUES, ASSETS = [], []
DATE = '2026-10-30'

def read(p): return json.loads(Path(p).read_text(encoding='utf8'))
def write(p, d): Path(p).write_text(json.dumps(d, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
def clean(v): return re.sub(r'\s+', ' ', str(v or '')).strip()
def norm(v): return unicodedata.normalize('NFKD', clean(v)).encode('ascii','ignore').decode().upper()
def slug(v): return re.sub(r'[^a-z0-9]+','-',norm(v).lower()).strip('-')
def cents(v): return int((Decimal(str(v))*100).quantize(Decimal('1'),rounding=ROUND_HALF_UP))
def brl(v): return cents(v.replace('.','').replace(',','.'))
def source(file, **kw): return {'file':file,'lastVerifiedAt':DATE,**kw}
def issue(brand, family, year, code, field, a, sa, b, sb, action='Consultar condições; bloquear valor final'):
    ISSUES.append(dict(brand=brand, family=family, modelYear=year, code=code, field=field, valueA=a, sourceA=sa, valueB=b, sourceB=sb, status='PENDENTE_VALIDACAO', action=action))

def copy_asset(path, family, year, version='', color='', origin=None):
    if not path or not (AURORA/'public'/path.lstrip('/')).is_file(): return None
    src = AURORA/'public'/path.lstrip('/')
    if src.suffix.lower()=='.svg': return None
    dest = ROOT/'public/images/vehicles/chevrolet'/family/str(year)/version/color/src.name
    dest.parent.mkdir(parents=True,exist_ok=True)
    with Image.open(src) as im:
        if src.suffix.lower() != '.png':
            dest=dest.with_suffix('.png'); im.save(dest,format='PNG')
        else: shutil.copyfile(src,dest)
        width,height=im.size
        alpha='A' in im.getbands() and im.getchannel('A').getextrema()[0]<255
    url='/'+dest.relative_to(ROOT/'public').as_posix()
    ASSETS.append(dict(brand='chevrolet',family=family,modelYear=year,version=version,color=color,path=url,width=width,height=height,transparent=alpha,format='PNG',sourcePath=str(src),source=origin,verified=True,permission='Acervo ECAR Aurora autorizado nesta migração; restrições das fontes originais preservadas',sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
    return url

def vehicle_base(brand,family,name,category,versions):
    colors=[c for v in versions for c in v['colors']]
    options=[o for v in versions for o in v['options']]
    years=sorted(set(v['modelYear'] for v in versions))
    return dict(id=f'{brand}-{family}',brand=brand,slug=family,name=name,category=category,year=' / '.join(map(str,years)),modelYear=' / '.join('MY'+str(y)[2:] for y in years),description=f'{name}: versões e condições documentadas, sujeitas à confirmação comercial.',image=next((v.get('image') for v in versions if v.get('image')),'/images/vehicles/placeholder.svg'),imageAlt=f'{name} — imagem de referência; confira versão, ano e cor.',featured=family in ['onix','tracker','s10','montana','polo','t-cross','nivus','taos'],fuel=' / '.join(sorted(set(v.get('fuel','Não informado') for v in versions))),versions=versions,colors=colors,options=options,discount=dict(id='per-version',label='Consultar regra da versão',basisPoints=0,appliesTo='configured-total',source='commercial'),dataStatus='documented')

def import_gm():
    api=read(AURORA/'data/generated/api-fixtures.json')['details']
    official=read(AURORA/'data/generated/chevrolet-catalog.json')
    gm_pdf=read(next(SOURCES.glob('LISTA*.json')))
    # This ZIP copy is byte-identical to Aurora's reconciled public price list.
    same_pdf=gm_pdf['sha256']==official['source']['sha256']
    if not same_pdf: raise ValueError('GM public PDF differs from Aurora source; reconciliation required')
    manifest=read(AURORA/'data/image-manifest.json')+read(AURORA/'data/reviewed-image-manifest.json')
    result=[]
    for m in api:
        versions=[]
        for v in m['versions']:
            s=source('Aurora/data/generated/api-fixtures.json',sourcePath='data/generated/api-fixtures.json',page=v['source']['page'],effectiveDate=v['source']['effectiveDate'],sha256=gm_pdf['sha256'])
            d=v.get('discount') or {}
            code=v['modelCode']+'/'+v['configurationCode']
            problems=[]
            if d.get('pendingReason'): problems.append(d['pendingReason'])
            if d.get('referenceMonth')!='2026-10': problems.append('Condição anterior a outubro/2026; renovar vigência')
            if m['slug']=='montana' and v['configurationCode']=='RFC': problems.append('Código da condição 5A43TRFC diverge do cadastro 5B43TV/RFC')
            if not d: problems.append('Condição não informada')
            for p in problems: issue('chevrolet',m['slug'],m['modelYear'],code,'Condição',d.get('rate'),d.get('sourceFileName'),p,'Aurora/docs/conditions-october-2026.md')
            discount=dict(id=v['id']+'-condition',label='Condição Aurora',basisPoints=int(Decimal(d.get('rate','0'))*10000),appliesTo='configured-total',source='aurora',status='PENDENTE_VALIDACAO' if problems else 'VALIDADO',referenceMonth=d.get('referenceMonth'),requiresConfiguration=d.get('requiresConfiguration',False),configurationRates={k:(int(Decimal(val)*10000) if val is not None else None) for k,val in d.get('configurationRates',{}).items()},stateRates={k:int(Decimal(val)*10000) for k,val in d.get('stateRates',{}).items()},requiresBillingState=d.get('requiresBillingState',False),sources=[source(d.get('sourceFileName','Não informado'),cell=d.get('sourceCell'),sheet=d.get('sourceSheet'))])
            colors=[]
            for c in v['colors']:
                origin=next((x for x in manifest if x['model']==m['slug'] and x.get('color')==c['slug'] and x.get('version')==v['slug']),None)
                img=copy_asset(c.get('image'),m['slug'],m['modelYear'],v['slug'],c['slug'],origin)
                colors.append(dict(id=c['id'],code=c['slug'],name=c['name'],hex=c['hex'],priceCents=cents(c['additional']),versionIds=[v['id']],paintType=c.get('paintType'),image=img,sources=[s],requiredOptionIds=[]))
            technical={k:clean(val) for k,val in v['technical'].items() if val}
            version=dict(id=v['id'],name=v['name'],commercialCode=code,modelYear=m['modelYear'],priceCents=cents(v['publicPriceNational']),priceStatus='VALIDADO',power=technical.get('Motorização','Não informado'),transmission='Automático' if 'AUTOMAT' in norm(technical.get('Transmissão','')) else 'Manual' if 'MANUAL' in norm(technical.get('Transmissão','')) else 'Não informado',fuel=technical.get('Combustível','Não informado'),features=[clean(x) for x in v['features']],technicalSpecs=technical,colors=colors,options=[],discount=discount,status='PENDENTE_VALIDACAO' if problems else 'VALIDADO',issues=problems,sources=[s],image=next((c['image'] for c in colors if c['image']),None),configurations=[re.sub('[VT]$','',x['modelCode'])+x['optionalCode'] for x in v['configurations']],observations=v.get('observations'),rawContent=v.get('rawContent'),publicPriceZfm=v.get('publicPriceZfm'))
            # Factory codes are configuration identifiers, never priced optional packages.
            versions.append(version)
        result.append(vehicle_base('chevrolet',m['slug'],m['name'],m['category'],versions))
    write(GENERATED/'chevrolet.json',result)
    return result

def extract_sheets():
    prices=[]; discounts={}
    for f in sorted(SOURCES.glob('*.json')):
        if not f.name.startswith(('01 -','02 -','Descontos')): continue
        doc=read(f)
        for sheet in doc['sheets']:
            rows=sheet['rows']
            if f.name.startswith('Descontos') and sheet['name'].startswith('MY '):
                year=int(sheet['name'][-4:])
                for row in rows:
                    cells={re.sub(r'\d','',c['cell']):c for c in row}
                    code=clean(cells.get('C',{}).get('value'))
                    if re.fullmatch('[A-Z0-9]{6}',code):
                        rate=cells.get('H',{}).get('cached')
                        discounts[(year,code)]=dict(rate=int(Decimal(str(rate))*10000) if isinstance(rate,(int,float)) else None,source=source(doc['file'],sheet=sheet['name'],cell=cells.get('H',{}).get('cell'),effectiveDate='2026-09-01',validUntil='2026-10-30'),name=clean(cells.get('B',{}).get('value')))
                continue
            if not f.name.startswith(('01 -','02 -')): continue
            price_indices=[i for i,r in enumerate(rows) if any('PREÇO PÚBLICO' in str(c['value']) for c in r)]
            for j,idx in enumerate(price_indices):
                before=rows[max(0,idx-3):idx]
                code=None
                for r in reversed(before):
                    for c in r:
                        match=re.match(r'^([A-Z0-9]{6})(?:\s*\+|$)',clean(c['value']))
                        if match: code=match[1]; break
                    if code: break
                if not code: raise ValueError(f'Missing modelcode {f} {sheet["name"]} {idx}')
                title=next((clean(c['value']) for r in before for c in r if c['cell'].startswith('A') and len(clean(c['value']))>14 and not clean(c['value']).startswith(('ESTOF','CONSULTAR'))),'')
                year=int(re.search(r'20\d{2}',sheet['name'])[0])
                cell=next(c for c in rows[idx] if isinstance(c['cached'],(int,float)))
                s=source(doc['file'],sheet=sheet['name'],cell=cell['cell'],sha256=doc['sha256'])
                block=rows[idx+1:price_indices[j+1]-1 if j+1<len(price_indices) else len(rows)]
                state=''; colors=[]; options=[]; features=[]
                for row in block:
                    cells={re.sub(r'\d','',c['cell']):c['cached'] for c in row}
                    a=clean(cells.get('A'))
                    if 'ITENS DE SÉRIE' in a: state='features'; continue
                    if 'OPCIONAIS' in a: state='options'; continue
                    if 'CORES DISPON' in a: state='colors'; continue
                    if 'ESTOFAMENTO' in a: state=''; continue
                    if state=='features':
                        features.extend(clean(cells[k]) for k in ['A','F'] if k in cells and not re.fullmatch('[A-Z0-9]{6}',clean(cells[k])))
                    elif state=='options' and isinstance(cells.get('I'),(int,float)):
                        options.append(dict(code=clean(cells.get('H')),name=clean(str(cells.get('A','')).split('\n')[0]),description=a,priceCents=cents(cells['I']),requiresText=clean(cells.get('F')),excludesText=clean(cells.get('G')),sources=[source(doc['file'],sheet=sheet['name'],cell=row[0]['cell'])]))
                    elif state=='colors':
                        if isinstance(cells.get('H'),(int,float)) and cells.get('F'):
                            colors.append(dict(code=clean(cells['F']),name=a,paintType=clean(cells.get('G')),priceCents=cents(cells['H']),sources=[source(doc['file'],sheet=sheet['name'],cell=row[0]['cell'])]))
                        elif isinstance(cells.get('F'),(int,float)) and re.fullmatch('[A-Z0-9]{4}',a):
                            colors.append(dict(code=a,name=clean(cells.get('B')),paintType=clean(cells.get('E') or cells.get('D')),priceCents=cents(cells['F']),sources=[source(doc['file'],sheet=sheet['name'],cell=row[0]['cell'])]))
                for row in block:
                    for color in colors:
                        if color['sources'][0]['cell']==row[0]['cell']:
                            color['requiredOptionCodes']=re.findall(r'OBRIGA(?: PR)?\s+(\w+)',norm(' '.join(str(c['cached']) for c in row)))
                prices.append(dict(code=code,modelYear=year,name=title,priceCents=cents(cell['cached']),sources=[s],colors=colors,options=options,features=features,sheet=sheet['name']))
    write(SOURCES/'vw-spreadsheet-records.json',{'prices':prices,'discounts':[dict(modelYear=y,code=c,**v) for (y,c),v in discounts.items()]})
    return prices,discounts

def extract_vw_pdf():
    doc=read(next(SOURCES.glob('Volkswagen*.json')))
    chunks=[]; current=None
    for page in doc['pages'][4:]:
        text='\n'.join(l.strip() for l in page['text'].splitlines() if l.strip() and not l.strip().startswith('Empresas Parceiras |'))
        m=re.search(r'^(.+?)\s*\|\s*MY(\d{2})\s+Código\s+(\S+)\s*\|\s*(.*?)\s*\|\s*Família\s+([^\n]+)',text,re.S)
        if m:
            current=dict(name=clean(m[1]),modelYear=2000+int(m[2]),commercialCode=m[3],fuel=clean(m[4]),family=slug(m[5]),page=page['page'],text=text)
            chunks.append(current)
        elif current: current['text']+='\n'+text
    for r in chunks:
        text=r['text']; s=source(doc['file'],page=r['page'],capturedAt='2026-10-28',sha256=doc['sha256'])
        r['sources']=[s]
        line=re.search(r'R\$\s*([\d.,]+)\s+([\d.]+)%',text)
        if not line: raise ValueError('PDF missing price '+r['commercialCode'])
        r['priceCents']=brl(line[1]); r['faixa2BasisPoints']=int(Decimal(line[2])*100)
        r['issues']=re.findall(r'Observação:\s*(.+)',text)
        color_section=text.split('Pinturas disponíveis',1)[1].split('Opcionais / pacotes',1)[0]
        r['colors']=[]
        for line in color_section.splitlines():
            m=re.match(r'([A-Z0-9]{4})\s+(.+?)\s*/\s*(.+?)\s+R\$\s*([\d.,]+)$',line)
            if m: r['colors'].append(dict(code=m[1],name=clean(m[2]),paintType=clean(m[3]),priceCents=brl(m[4]),sources=[s]))
        opt=text.split('Opcionais / pacotes',1)[1].split('Equipamentos de série',1)[0]
        r['options']=[]
        active=None
        for line in opt.splitlines():
            m=re.match(r'\(([^)]+)\)\s+(.+?)\s*-\s*R\$\s*([\d.,]+)$',line)
            if m:
                active=dict(code=m[1],name=m[2],description=m[2],priceCents=brl(m[3]),sources=[s]); r['options'].append(active)
            elif active and line: active['description']+=' '+line
        feat=text.split('Equipamentos de série',1)[1].split('Dados técnicos',1)[0]
        r['features']=[]
        for line in feat.splitlines():
            if line.startswith('- '): r['features'].append(line[2:])
            elif line and r['features']: r['features'][-1]+=' '+line
        tech=text.split('Dados técnicos',1)[1].split('Referência da versão',1)[0] if 'Dados técnicos' in text else ''
        r['technicalSpecs']={}
        for line in tech.splitlines():
            if ': ' in line:
                k,v=line.split(': ',1); r['technicalSpecs'][k]=v
        if any('Câmbio divergente' in p for p in r['issues']):
            r['technicalSpecs'].pop('TRANSMISSÃO',None)
            r['features']=[x for x in r['features'] if not x.startswith('TRANSMISSÃO')]
        r.pop('text')
    if len(chunks)!=64: raise ValueError(f'Expected 64 PDF fiches, got {len(chunks)}')
    write(SOURCES/'vw-pdf-records.json',chunks)
    return chunks

def paint_hex(name):
    n=norm(name)
    return '#f0f1f2' if 'BRANCO' in n else '#22252a' if 'PRETO' in n else '#b8bdc3' if 'PRATA' in n else '#285880' if 'AZUL' in n else '#a72a36' if 'VERMELHO' in n else '#787f88' if 'CINZA' in n else '#ada18b'

def normalize_extras(r,vid,spreadsheet=None):
    colors=[]; options=[]
    for i,c in enumerate(r['colors']):
        colors.append({**c,'id':f'{vid}-paint-{i}','hex':paint_hex(c['name']),'versionIds':[vid],'requiredOptionIds':[]})
    for i,o in enumerate(r['options']):
        options.append({**o,'id':f'{vid}-option-{o["code"]}','description':o.get('description',o['name']),'versionIds':[vid],'requiresOptionIds':[],'excludesOptionIds':[],'allowedColorIds':[],'required':False,'blocked':o.get('blocked',False)})
    # Preserve explicit dependency texts. Unknown expressions are blocked, never guessed.
    for o in options:
        req=o.get('requiresText',''); exc=o.get('excludesText','')
        if 'OBRIGATORIO' in norm(req): o['required']=True
        tokens=re.findall(r'\b[A-Z0-9]{3,4}\b',req+' '+exc)
        for other in options:
            if other['code'] in req and other['id']!=o['id']: o['requiresOptionIds'].append(other['id'])
            if other['code'] in exc and other['id']!=o['id']: o['excludesOptionIds'].append(other['id'])
        allowed=[c['id'] for c in colors if c['code'] in req]
        if allowed: o['allowedColorIds']=allowed
        for c in colors:
            if c['code'] in exc: o.setdefault('excludedColorIds',[]).append(c['id'])
        unresolved=[t for t in tokens if t not in [x['code'] for x in options]+[c['code'] for c in colors] and t not in ['100','PR']]
        if unresolved or ('Demais cores' in exc and not allowed): o['blocked']=True
        if not tokens and req.strip() not in ('','-') and not o['required']: o['blocked']=True
    # Color-specific PR requirements, taken from explicit spreadsheet notes.
    for c in colors:
        match=re.search(r'OBRIGA(?: PR)?\s+(\w+)',norm(c['name']))
        required=c.get('requiredOptionCodes',[]) or ([match[1]] if match else [])
        for code in required:
            found=next((o for o in options if o['code']==code),None)
            if found and not found['blocked']: c['requiredOptionIds'].append(found['id'])
            else: c['blocked']=True
    return colors,options

def import_vw():
    sheets,discounts=extract_sheets(); pdf=extract_vw_pdf()
    used=set(); families={}; historical=[]
    for r in pdf:
        if r['modelYear']==2025: historical.append(r); continue
        code=r['commercialCode'].split('-')[0]; year=r['modelYear']; family=r['family']; vid=f'vw-{family}-{year}-{r["commercialCode"].lower()}'
        x=next((x for x in sheets if x['code']==code and x['modelYear']==year),None)
        d=discounts.get((year,code)); problems=[]
        if not x: problems.append('Preço público sem segunda fonte XLSX para este código/MY')
        else:
            used.add((year,code))
            if x['priceCents']!=r['priceCents']:
                problems.append('Preço público divergente entre planilha e relatório')
                issue('volkswagen',family,year,r['commercialCode'],'Preço público',x['priceCents'],x['sources'],r['priceCents'],r['sources'])
            # Check every documented paint/package by commercial code. Preserve PDF-only additions with their provenance.
            for field in ['colors','options']:
                for item in r[field]:
                    other=next((a for a in x[field] if a['code']==item['code']),None)
                    if other:
                        if other['priceCents']!=item['priceCents']:
                            problems.append(f'{field}: {item["code"]} com preço divergente')
                            item['blocked']=True
                            issue('volkswagen',family,year,r['commercialCode'],field+'/'+item['code'],other['priceCents'],other['sources'],item['priceCents'],item['sources'])
                        if field=='colors':
                            candidates=[a for a in x[field] if a['code']==item['code']]
                            # Reconcile base color names separately from roof and PR notes.
                            base=lambda n:norm(re.split(r'[/\(]',n)[0])
                            if len(set(base(a['name']) for a in candidates))>1 or base(other['name'])!=base(item['name']):
                                problems.append(f'Pintura {item["code"]}: nome/código divergente')
                                item['blocked']=True
                                issue('volkswagen',family,year,r['commercialCode'],'Pintura/'+item['code'],[a['name'] for a in candidates],other['sources'],item['name'],item['sources'])
                            else:
                                # Preserve the more detailed roof/PR description from primary XLSX.
                                item['name']=other['name']
                            # XLSX's PR notes are explicit requirements, not decorative labels.
                            required_codes=other.get('requiredOptionCodes',[])
                            for required_code in required_codes:
                                required=next((o for o in r['options'] if o['code']==required_code),None)
                                if required: item.setdefault('requiredOptionCodes',[]).append(required_code)
                                else:
                                    item['blocked']=True
                                    problems.append(f'Pintura {item["code"]} exige PR {required_code} não localizado nesta versão')
                        if field=='options': item.update({k:other[k] for k in ['requiresText','excludesText']})
                        item['sources']+=other['sources']
                for other in x[field]:
                    if not any(a['code']==other['code'] for a in r[field]):
                        r[field].append(other)
                        problems.append(f'{field}: {other["code"]} presente somente na planilha')
            if 'SOMENTE VAREJO' in ' '.join(r['issues']): problems.append('Elegibilidade corporativa não comprovada')
        if not d or d['rate'] is None: problems.append('Faixa II não localizada por código e MY na planilha')
        elif d['rate']!=r['faixa2BasisPoints']:
            problems.append('Faixa II divergente entre planilha e relatório')
            issue('volkswagen',family,year,r['commercialCode'],'Faixa II',d['rate'],d['source'],r['faixa2BasisPoints'],r['sources'])
        if r['faixa2BasisPoints']==0: problems.append('Faixa II zero: adicional de 3 p.p. bloqueado até validação')
        if any('Câmbio divergente' in i for i in r['issues']): problems.append('Câmbio divergente: especificação omitida até revisão')
        if any('Ficha técnica vazia' in i for i in r['issues']): r['technicalSpecs']={}
        for p in problems: issue('volkswagen',family,year,r['commercialCode'],'Validação',p,r['sources'],d['rate'] if d else None,d['source'] if d else 'XLSX sem correspondência')
        colors,options=normalize_extras(r,vid,x)
        technical=r['technicalSpecs']; transmission=next((val for key,val in technical.items() if key=='TRANSMISSÃO'),'')
        if not transmission and not any('Câmbio divergente' in i for i in r['issues']): transmission=next((f for f in r['features'] if f.startswith('TRANSMISSÃO')),'')
        status='PENDENTE_VALIDACAO' if problems else 'DADOS_INCOMPLETOS' if not technical else 'VALIDADO'
        price_ok=bool(x and x['priceCents']==r['priceCents'])
        discount=dict(id=vid+'-discount',label='Faixa II + 3 p.p.',basisPoints=r['faixa2BasisPoints']+300,faixa2BasisPoints=r['faixa2BasisPoints'],additionalBasisPoints=300,appliesTo='configured-total',source='volkswagen',status='PENDENTE_VALIDACAO' if problems else 'VALIDADO',referenceMonth='2026-10',validUntil='2026-10-30',sources=[r['sources'][0]]+([d['source']] if d else []))
        v=dict(id=vid,name=r['name'],commercialCode=r['commercialCode'],modelYear=year,priceCents=r['priceCents'],priceStatus='VALIDADO' if price_ok else 'PENDENTE_VALIDACAO',power=technical.get('POTÊNCIA LÍQUIDA MÁXIMA','Não informado'),transmission='Manual' if 'MANUAL' in norm(transmission) else 'Automático' if 'AUTOMAT' in norm(transmission) else 'Não informado',fuel=r['fuel'],features=r['features'],technicalSpecs=technical,colors=colors,options=options,discount=discount,status=status,issues=list(dict.fromkeys(problems+r['issues'])),sources=r['sources']+(x['sources'] if x else []),image=None,configurations=[])
        families.setdefault(family,[]).append(v)
    # XLSX-only models remain visible for consultation; no fabricated PDF matching.
    for r in sheets:
        if r['modelYear']<2026: historical.append(r); continue
        if (r['modelYear'],r['code']) in used: continue
        family='saveiro' if r['sheet'].startswith('SAVEIRO') else slug(r['sheet'].split(' - ')[0])
        vid=f'vw-{family}-{r["modelYear"]}-{r["code"].lower()}-xlsx'
        colors,options=normalize_extras(r,vid)
        d=discounts.get((r['modelYear'],r['code']))
        p='Versão presente na planilha, ausente do relatório consolidado; revisão necessária'
        issue('volkswagen',family,r['modelYear'],r['code'],'Correspondência',r['name'],r['sources'],None,'PDF Volkswagen')
        families.setdefault(family,[]).append(dict(id=vid,name=r['name'],commercialCode=r['code'],modelYear=r['modelYear'],priceCents=r['priceCents'],priceStatus='PENDENTE_VALIDACAO',power='Não informado',transmission='Não informado',fuel='Etanol' if 'ETANOL' in norm(r['name']) else 'Não informado',features=r['features'],technicalSpecs={},colors=colors,options=options,discount=dict(id=vid+'-discount',basisPoints=(d['rate']+300) if d and d['rate'] is not None else 0,label='Consultar condições',source='volkswagen',status='PENDENTE_VALIDACAO',appliesTo='configured-total'),status='PENDENTE_VALIDACAO',issues=[p],sources=r['sources'],image=None,configurations=[]))
    result=[]
    for family,versions in families.items():
        category='Hatch' if family=='polo' else 'Sedã' if family in ['virtus','jetta'] else 'Picape' if family in ['saveiro','amarok'] else 'SUV'
        versions.sort(key=lambda v:(-v['modelYear'],v['priceCents']))
        result.append(vehicle_base('volkswagen',family,{'t-cross':'T-Cross','saveiro':'Saveiro'}.get(family,family.title()),category,versions))
    write(GENERATED/'volkswagen.json',result); write(SOURCES/'historical.json',historical)
    return result

def reports(gm,vw):
    coverage={}
    for brand,models in [('chevrolet',gm),('volkswagen',vw)]:
        versions=[v for m in models for v in m['versions']]
        coverage[brand]=dict(families=len(models),versions=len(versions),years={str(y):sum(v['modelYear']==y for v in versions) for y in sorted(set(v['modelYear'] for v in versions))},publicPriceValidated=sum(v['priceStatus']=='VALIDADO' for v in versions),discountValidated=sum(v['discount']['status']=='VALIDADO' for v in versions),withEquipment=sum(bool(v['features']) for v in versions),equipmentItems=sum(len(v['features']) for v in versions),paints=sum(len(v['colors']) for v in versions),packages=sum(len(v['options']) for v in versions),withTechnical=sum(bool(v['technicalSpecs']) for v in versions),pending=sum(v['status']=='PENDENTE_VALIDACAO' for v in versions))
    write(GENERATED/'coverage.json',coverage); write(SOURCES/'issues.json',ISSUES); write(GENERATED/'vehicle-assets.json',ASSETS)
    for brand,title,filename in [('chevrolet','Chevrolet — migração Aurora','RELATORIO-CHEVROLET-AURORA.md'),('volkswagen','Volkswagen — importação e reconciliação','RELATORIO-VOLKSWAGEN-IMPORTACAO.md')]:
        c=coverage[brand]
        lines=[f'# {title}',f'\nExtração: {DATE}. Pipeline idempotente; originais preservados.','\n| Métrica | Quantidade |','| --- | --- |']+[f'| {k} | {json.dumps(v,ensure_ascii=False)} |' for k,v in c.items()]
        lines+=['\n## Registros por família','\n| Família | Versões | Preço validado | Condição validada |','| --- | --- | --- | --- |']
        for m in gm if brand=='chevrolet' else vw: lines.append(f'| {m["name"]} | {len(m["versions"])} | {sum(v["priceStatus"]=="VALIDADO" for v in m["versions"])} | {sum(v["discount"]["status"]=="VALIDADO" for v in m["versions"])} |')
        lines+=['\n## Critérios','\nPreços e descontos são separados. Divergência material ou falta de cruzamento bloqueia o valor final. Equipamentos não migram entre versões. Dados ausentes permanecem não informados. Códigos de configuração GM não são opcionais pagos. O PDF GM do ZIP tem SHA-256 idêntico ao reconciliado no Aurora, comprovando a conferência secundária dos preços de todas as 40 versões. Na VW foram lidas todas as 170 páginas, incluindo as 64 fichas completas; 62 MY26/MY27 e 2 MY25 históricos. Passat 2019 permanece histórico. Planilhas: todas as abas, notas, mesclagens, fórmulas e caches em extratos internos. Faixa II é a coluna H, nunca comissão D. Vigência da tabela de descontos VW: aprovações até 30/10/2026; elegibilidade Faixa II exige comprovação de 5 veículos na frota.']
        (ROOT/'docs'/filename).write_text('\n'.join(lines)+'\n',encoding='utf8')
    lines=['# Divergências e pendências',f'\n{len(ISSUES)} ocorrências. Valores monetários em centavos; percentuais em pontos-base.','\nMarca | Modelo | MY | Código | Campo | Valor A | Fonte A | Valor B | Fonte B | Status | Ação','--- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---']
    for i in ISSUES:
        lines.append(' | '.join(clean(json.dumps(i[k],ensure_ascii=False) if isinstance(i[k],(list,dict)) else i[k]).replace('|','/') for k in ['brand','family','modelYear','code','field','valueA','sourceA','valueB','sourceB','status','action']))
    (ROOT/'docs/RELATORIO-DIVERGENCIAS.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
    print(json.dumps(coverage,ensure_ascii=False,indent=2))

if __name__=='__main__':
    gm=import_gm(); vw=import_vw(); reports(gm,vw)
