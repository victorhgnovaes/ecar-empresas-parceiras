import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const bundled = join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe");
const python = process.env.ECAR_PYTHON || (existsSync(bundled) ? bundled : "python");
function run(script) {
  const result = spawnSync(python, [`scripts/import/${script}.py`], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!process.argv.includes("--skip-extract")) run("extract_sources");
function migrate() { run("import_catalog"); run("vehicle_images"); run("apply_paint_manifest"); run("integrate_package72"); run("validate_catalog"); }
migrate();
if (process.argv.includes("--verify-idempotence")) {
  const files = ["chevrolet", "volkswagen", "coverage"].map((f) => `src/data/generated/${f}.json`);
  const hashes = () => files.map((f) => createHash("sha256").update(readFileSync(f)).digest("hex"));
  const before = hashes(); migrate(); const after = hashes();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Importação não idempotente: datasets divergiram.");
  console.log("Idempotência aprovada: duas importações, mesmos dados, IDs e contagens.");
}
