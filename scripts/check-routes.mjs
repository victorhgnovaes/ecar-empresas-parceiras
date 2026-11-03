// Smoke test HTTP local. Não controla um navegador e não substitui QA visual.
import { readFile } from "node:fs/promises";

const base = process.env.ECAR_TEST_URL || "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error("Use um servidor local para este teste.");
const routes = ["/", "/chevrolet", "/volkswagen", "/chevrolet/modelos", "/volkswagen/modelos"];
const assets = new Set(["/fonts/InterVariable.woff2", "/icons/icon.svg", "/images/vehicles/placeholder.svg"]);
for (const brand of ["chevrolet", "volkswagen"]) {
  const models = JSON.parse(await readFile(`src/data/generated/${brand}.json`, "utf8"));
  for (const model of models) { routes.push(`/${brand}/veiculo/${model.slug}`); assets.add(model.image); }
}
const manifest = JSON.parse(await readFile("src/data/generated/vehicle-assets.json", "utf8"));
for (const asset of manifest) assets.add(asset.path);
const failures = [];
for (const route of routes) {
  const response = await fetch(`${base}${route}`);
  const html = await response.text();
  if (response.status !== 200 || !html.includes('id="conteudo"') || !/<h1\b/.test(html)) failures.push(`${route}: status=${response.status}, conteúdo ou h1 ausente`);
  for (const match of html.matchAll(/(?:src|href)="(\/images\/[^"?]+)"/g)) assets.add(match[1]);
  for (const match of html.matchAll(/href="([^"#]*)(#[^"]+)"/g)) {
    if ((!match[1] || match[1] === route) && !html.includes(`id="${match[2].slice(1)}"`)) failures.push(`${route}: âncora ausente ${match[2]}`);
  }
  if (/href="#"|href="javascript:/.test(html)) failures.push(`${route}: link vazio ou inválido`);
  console.log(`${response.status} ${route}`);
}
for (const asset of assets) {
  const response = await fetch(`${base}${asset}`);
  if (response.status !== 200) failures.push(`${asset}: status=${response.status}`);
  await response.arrayBuffer();
}
for (const route of ["/marca-inexistente", "/chevrolet/veiculo/nao-existe", "/chevrolet/veiculo/t-cross"]) {
  const response = await fetch(`${base}${route}`);
  if (response.status !== 404) failures.push(`${route}: deveria retornar 404; retornou ${response.status}`);
  console.log(`${response.status} ${route}`);
}
if (failures.length) throw new Error(failures.join("\n"));
console.log(`OK: ${routes.length} páginas, ${assets.size} assets e 3 rotas inválidas.`);
