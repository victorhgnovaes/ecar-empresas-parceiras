import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { vehicles } from "@/data/vehicles";
import manifest from "@/data/generated/package72-manifest.json";
import baseline from "@/data/generated/package72-preserved-assets.json";
import research from "@/data/generated/package72-research.json";
import assets from "@/data/generated/vehicle-assets.json";

const hash = (path: string) => createHash("sha256").update(readFileSync(`public${path}`)).digest("hex");

describe("Pacote de 72 imagens — preservação e limites de validação", () => {
  it("preserva os arquivos e vínculos das 482 associações anteriormente correspondentes", () => {
    expect(baseline).toHaveLength(482);
    for (const entry of baseline) {
      const version = vehicles.flatMap(v => v.versions).find(v => v.id === entry.version)!;
      const color = version.colors!.find(c => c.id === entry.colorId)!;
      expect(color.image).toBe(entry.path);
      expect(color.imageStatus).toMatch(/^MATCHED_/);
      expect(hash(entry.path)).toBe(entry.sha256);
    }
  }, 30000);
  it("mantém os 72 caminhos exatos e não promove desenhos a fotografias", () => {
    expect(manifest).toHaveLength(72);
    expect(new Set(manifest.map(a => a.path)).size).toBe(72);
    expect(manifest.filter(a => a.imageStatus === "TEMPORARY_ILLUSTRATION")).toHaveLength(60);
    expect(manifest.filter(a => a.preservedExistingFile)).toHaveLength(12);
    for (const entry of manifest) {
      expect(hash(entry.path)).toBe(entry.sha256);
      expect(readFileSync(`public${entry.path}`).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      const version = vehicles.flatMap(v => v.versions).find(v => v.id === entry.version)!;
      const color = version.colors!.find(c => c.id === entry.colorId)!;
      expect(version.modelYear).toBe(entry.modelYear);
      expect(version.commercialCode).toBe(entry.commercialCode);
      expect(color.code).toBe(entry.color);
      expect(color.image).toBe(entry.path);
      expect(color.imageStatus).toBe(entry.imageStatus);
      expect(entry.photographVerified).toBe(false);
      if (!entry.preservedExistingFile) expect(assets.find(a => a.path === entry.path)?.verified).toBe(false);
    }
  }, 30000);
  it("mantém os 37 candidatos fora da área pública e rejeita rodas incompatíveis", () => {
    expect(research).toHaveLength(72);
    expect(research.filter(r => "candidateFile" in r)).toHaveLength(37);
    const rejected = research.filter(r => r.status === "DIVERGENCIA_RODAS_ACABAMENTO");
    expect(rejected).toHaveLength(12);
    expect(rejected.every(r => ["DF13B5-0", "DF14B5-0"].includes(r.commercialCode))).toBe(true);
    for (const item of research) {
      expect(item.photographVerified).toBe(false);
      if ("candidateFile" in item) expect(item.candidateFile).toMatch(/^docs\/fontes-comerciais\//);
    }
  });
});
