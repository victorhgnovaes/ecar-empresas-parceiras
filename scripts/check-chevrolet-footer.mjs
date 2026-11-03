import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const directory = "docs/referencias-visuais/rodape-chevrolet";
await mkdir(directory, { recursive: true });
const mode = process.argv[2] || "after";
const base = process.argv[3] || "http://localhost:3000";
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
const protectedPaths = ["src/components/brand-header.tsx", "src/data/demo-factory.ts", "src/data/chevrolet/vehicles.ts", "src/data/volkswagen/vehicles.ts", "src/lib/pricing/index.ts", "src/styles/visual-system.css", "src/app/globals.css"];
const protectedFiles = Object.fromEntries(await Promise.all(protectedPaths.map(async (path) => [path, hash(await readFile(path))])));
const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  page.setDefaultNavigationTimeout(90000);
  await page.addInitScript(() => localStorage.clear());
  await page.goto(`${base}/volkswagen`, { waitUntil: "load" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator("header img").evaluate((element) => element.decode());
  const header = await page.locator("header").screenshot({ path: `${directory}/volkswagen-header-${mode}.png` });
  await page.locator("footer").scrollIntoViewIfNeeded();
  await page.locator("footer img").evaluate((element) => element.decode());
  const footer = await page.locator("footer").screenshot({ path: `${directory}/volkswagen-footer-${mode}.png` });
  const state = { protectedFiles, header: hash(header), footer: hash(footer) };
  await writeFile(`${directory}/baseline-${mode}.json`, JSON.stringify(state, null, 2));
  if (mode === "after") {
    const baseline = JSON.parse(await readFile(`${directory}/baseline-before.json`, "utf8"));
    console.log(JSON.stringify({ volkswagenHeaderUnchanged: baseline.header === state.header, volkswagenFooterChangedAsRequested: baseline.footer !== state.footer, protectedFilesUnchanged: JSON.stringify(baseline.protectedFiles) === JSON.stringify(state.protectedFiles) }));
    for (const brand of ["chevrolet", "volkswagen"]) {
    await page.goto(`${base}/${brand}`, { waitUntil: "load" });
    await page.addStyleTag({ content: `nextjs-portal,header,main > :not([data-testid="${brand}-cta"]){display:none!important}` });
    await page.evaluate(() => document.fonts.ready);
    for (const [width, height] of [[1920,1080],[1440,900],[1366,768],[1024,768],[768,1024],[390,844],[375,812],[320,640]]) {
      await page.setViewportSize({ width, height });
      await page.getByTestId(`${brand}-cta`).scrollIntoViewIfNeeded();
      const bounds = await page.getByTestId(`${brand}-cta`).boundingBox();
      const footerBounds = await page.getByTestId(`${brand}-footer`).boundingBox();
      await page.evaluate(() => scrollTo(0,0));
      await page.screenshot({ path: `${directory}/${brand}-${width}.png`, fullPage: true, clip: { x: 0, y: 0, width, height: Math.ceil(bounds.height + footerBounds.height) } });
      console.log(JSON.stringify({ brand, width, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), ctaHeight: bounds.height, footerHeight: footerBounds.height }));
    }
    }
  } else console.log("Baseline de Volkswagen e arquivos protegidos registrada.");
} finally { await browser.close(); }
