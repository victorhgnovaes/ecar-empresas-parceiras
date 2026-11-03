import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
const base = process.argv[2] || 'http://localhost:3000';
const alphaBounds = [];
for (const path of ['public/assets/chevrolet/hero/s10-estudo.png', 'public/assets/volkswagen/hero/tcross-frente-esquerda.png']) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let top = info.height, bottom = 0, left = info.width, right = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 20) {
      top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
      left = Math.min(left, x); right = Math.max(right, x + 1);
    }
  }
  alphaBounds.push({ top: top / info.height, bottom: bottom / info.height, left: left / info.width, right: right / info.width });
}
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await mkdir('test-results/portal-layout', { recursive: true });
try {
  for (const [width, height] of [[320,640],[390,844],[768,1024],[900,600],[1024,768],[1366,768],[1440,900],[1920,1080],[2560,1080]]) {
    await page.setViewportSize({ width, height });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.querySelectorAll('main img')].map(img => img.decode())); });
    const result = await page.evaluate(() => {
      const rect = e => { const r = e.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, bottom:r.bottom, right:r.right }; };
      const panels = [...document.querySelectorAll('article')].map(e => ({ panel:rect(e), heading:rect(e.querySelector('h2')), button:rect(e.querySelector('a')), image:rect(e.querySelector('img')), sourceWidth:e.querySelector('img').naturalWidth }));
      return { overflow:document.documentElement.scrollWidth > innerWidth, verticalOverflow:document.documentElement.scrollHeight > innerHeight, panels, footer:!!document.querySelector('.portal-note, .portal-panel-bottom'), background:getComputedStyle(document.querySelector('section')).backgroundImage };
    });
    if(result.overflow || result.footer) throw new Error(`Overflow/footer at ${width}`);
    for(const [index, p] of result.panels.entries()) {
      const alpha = alphaBounds[index];
      const vehicleTop = p.image.y + alpha.top * p.image.height;
      const tireBottom = p.image.y + alpha.bottom * p.image.height;
      if(p.heading.right > p.panel.right || p.button.right > p.panel.right || !p.sourceWidth) throw new Error(`Content escaped at ${width}`);
      if(vehicleTop < p.button.bottom) throw new Error(`Vehicle overlaps button at ${width}`);
      if(Math.abs(tireBottom - p.panel.bottom) > 1) throw new Error(`Tires are not grounded at ${width}`);
      if(p.image.x + alpha.left * p.image.width < p.panel.x || p.image.x + alpha.right * p.image.width > p.panel.right) throw new Error(`Vehicle sides are clipped at ${width}`);
    }
    if(width>=900) {
      if(result.verticalOverflow) throw new Error(`Layout does not fit viewport at ${width}x${height}`);
      if(!result.background.includes('portal-unificado.png')) throw new Error(`Original background missing at ${width}`);
      if(Math.abs(result.panels[0].panel.width-width/2)>.5 || Math.abs(result.panels[0].button.y-result.panels[1].button.y)>.5) throw new Error(`Columns/button alignment at ${width}`);
    } else if(result.panels[0].panel.bottom > result.panels[1].panel.y+.5) throw new Error(`Mobile order at ${width}`);
    if([390,768,1440,2560].includes(width)) await page.screenshot({path:`test-results/portal-layout/portal-${width}.png`,fullPage:true});
    console.log(JSON.stringify({width,height,overflow:result.overflow,panels:result.panels.map(p=>({width:p.panel.width,buttonY:p.button.y,imageY:p.image.y,bottom:p.panel.bottom})),footer:result.footer}));
  }
  if(errors.length) throw new Error(errors.join('\n'));
} finally { await browser.close(); }
