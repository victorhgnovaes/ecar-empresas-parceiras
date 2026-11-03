import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";

const root = resolve("out");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/ecar-empresas-parceiras";
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".txt": "text/plain", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === basePath) { res.writeHead(308, { Location: `${basePath}/${url.search}` }); res.end(); return; }
    if (!url.pathname.startsWith(`${basePath}/`)) throw new Error("Not found");
    let file = resolve(root, `.${decodeURIComponent(url.pathname.slice(basePath.length))}`);
    if (!file.startsWith(`${root}${sep}`) && file !== root) throw new Error("Not found");
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(await readFile(resolve(root, "404.html")));
  }
}).listen(3200, "127.0.0.1", () => console.log(`ECAR export: http://127.0.0.1:3200${basePath}/`));
