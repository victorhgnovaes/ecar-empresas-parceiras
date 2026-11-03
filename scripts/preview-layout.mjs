import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const output = "docs/referencias-visuais/verificacao";
const base = process.argv[2] || "http://localhost:3100";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const issues = [];
  page.on("pageerror", (error) => issues.push(error.message));
  for (const [name, route] of [["portal", "/"], ["chevrolet", "/chevrolet"], ["volkswagen", "/volkswagen"], ["catalogo-chevrolet", "/chevrolet/modelos"], ["catalogo-volkswagen", "/volkswagen/modelos"], ["configurador", "/chevrolet/veiculo/tracker"]]) {
    const response = await page.goto(`${base}${route}`, { waitUntil: "load", timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    for (const image of await page.locator("main img").all()) { await image.scrollIntoViewIfNeeded(); await image.evaluate((element) => element.decode().catch(() => undefined)); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${output}/${name}-1440.png`, fullPage: true });
    console.log(JSON.stringify({ route, status: response?.status(), title: await page.title(), overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) }));
    if (route === "/chevrolet" || route === "/volkswagen") console.log(JSON.stringify(await page.locator(".hero-visual img").evaluate((element) => ({ src: element.currentSrc, loaded: element.naturalWidth, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height, top: element.getBoundingClientRect().top }))));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: "load" });
  await page.screenshot({ path: `${output}/portal-390.png`, fullPage: true });
  console.log(JSON.stringify({ issues }));
} finally { await browser.close(); }
