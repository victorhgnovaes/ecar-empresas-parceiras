import { readdir, copyFile, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";

if (process.env.GITHUB_PAGES === "true" && process.env.VERCEL !== "1") {
  const root = resolve("out");
  let repaired = 0;
  // Next 16.4 on Windows exports segment-cache paths with backslashes;
  // the browser requests these files with dots, as on Linux.
  async function visit(directory, segmentRoot = null) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      const segment = segmentRoot ?? (entry.isDirectory() && entry.name.startsWith("__next.") ? path : null);
      if (entry.isDirectory()) await visit(path, segment);
      else if (segment && entry.name.endsWith(".txt")) {
        const destination = `${segment}.${relative(segment, path).split(sep).join(".")}`;
        await copyFile(path, destination);
        repaired++;
      }
    }
  }
  await visit(root);
  await writeFile(resolve(root, ".nojekyll"), "");
  console.log(`Static export ready${repaired ? `; normalized ${repaired} Windows segment paths` : ""}.`);
}
