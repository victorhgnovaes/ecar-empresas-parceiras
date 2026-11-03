// Preparação opcional de imagens temporárias. Não é executada pela aplicação.
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execute = promisify(execFile);
const directory = path.resolve("public/images/vehicles");
await mkdir(directory, { recursive: true });
const chevroletRoot = "https://www.chevrolet.com.br/content/dam/chevrolet/south-america/brazil/portuguese/index/";
const assets = ["onix", "onix-plus", "tracker", "montana"].map((slug) => ({ slug, url: `${chevroletRoot}visid/home/11-images/${slug}.png`, extension: "png", sourcePage: "https://www.chevrolet.com.br/" }));
assets.push({ slug: "spin", url: `${chevroletRoot}portable-navigation/jellys/11-images/jelly-flyout-spin-2027.jpg`, extension: "jpg", sourcePage: "https://www.chevrolet.com.br/" });
assets.push({ slug: "s10", url: `${chevroletRoot}portable-navigation/jellys/05-images/s10-2027-flyout-jelly.jpg`, extension: "jpg", sourcePage: "https://www.chevrolet.com.br/" });
const temporaryPage = path.resolve("scripts/.vw-configurator.tmp.html");
await execute("curl.exe", ["-f", "-L", "--max-time", "30", "-sS", "https://www.vw.com.br/pt/configurador.html", "-o", temporaryPage], { windowsHide: true });
const html = await readFile(temporaryPage, "utf8");
await unlink(temporaryPage);
for (const [slug, name] of Object.entries({ polo: "Polo", virtus: "Virtus", "t-cross": "T-Cross", nivus: "Nivus", saveiro: "Saveiro", taos: "Taos" })) {
  const tag = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]).find((item) => item.includes(`alt="${name}"`) && item.includes("media.vw.mediaservice"));
  const url = tag?.match(/\ssrc="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
  if (!url) throw new Error(`Imagem de ${name} não encontrada.`);
  assets.push({ slug, url, extension: "webp", sourcePage: "https://www.vw.com.br/pt/configurador.html" });
}
const results = await Promise.allSettled(assets.map(async (asset) => {
  const file = path.join(directory, `${asset.slug}.${asset.extension}`);
  await execute("curl.exe", ["-f", "-L", "--max-time", "40", "--retry", "1", "-sS", asset.url, "-o", file], { windowsHide: true });
  const bytes = await readFile(file);
  if (bytes.length < 1000) throw new Error(`Imagem inválida: ${asset.slug}`);
  console.log(`${asset.slug}: ${bytes.length} bytes`);
  return { ...asset, file: `/images/vehicles/${asset.slug}.${asset.extension}`, downloadedAt: new Date().toISOString(), status: "temporary", notice: "Imagem de referência temporária, sem vínculo com as configurações ou condições demonstrativas. Validar autorização e substituição antes da publicação comercial." };
}));
await writeFile("public/images/vehicles/sources.json", JSON.stringify(results.filter((result) => result.status === "fulfilled").map((result) => result.value), null, 2));
for (const result of results) if (result.status === "rejected") console.error(result.reason.message);
if (results.some((result) => result.status === "rejected")) process.exitCode = 1;
