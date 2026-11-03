import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { vehicles } from "@/data/vehicles";
import coverage from "@/data/generated/paint-image-coverage.json";
import missing from "@/data/generated/paint-image-missing.json";

describe("Imagens vinculadas à pintura e versão", () => {
  it("contabiliza fotos reais, referências e pendências sem confundir modelos com pinturas", () => {
    expect(coverage.chevrolet.paintImagesMatched).toBe(211);
    expect(coverage.chevrolet.paintImagesMissing).toBe(9);
    expect(coverage.volkswagen.paintImagesMatched).toBe(271);
    expect(coverage.volkswagen.paintImagesMissing).toBe(63);
    expect(missing).toHaveLength(72);
  });
  it.each(vehicles.map(v => [v.id,v] as const))("pinturas diferentes usam imagens diferentes em %s", (_id,vehicle) => {
    for (const version of vehicle.versions) {
      const colors=version.colors!.filter(c=>c.imageStatus?.startsWith("MATCHED"));
      const hashes=colors.map(c=>{
        expect(c.image).toBeTruthy();
        const file=readFileSync(`public${c.image}`);
        expect(file.subarray(0,8).toString("hex")).toBe("89504e470d0a1a0a");
        return createHash("sha256").update(file).digest("hex");
      });
      expect(new Set(hashes).size).toBe(hashes.length);
    }
  }, 30000);
  it("Polo Robust branco e preto têm associações e pixels distintos", () => {
    const polo=vehicles.find(v=>v.brand==="volkswagen"&&v.slug==="polo")!;
    const version=polo.versions.find(v=>v.commercialCode==="R11AQ4-2")!;
    const black=version.colors!.find(c=>c.code==="A1A1")!;
    const white=version.colors!.find(c=>c.code==="B4B4")!;
    expect(black.imageStatus).toBe("MATCHED_DEALER");expect(white.imageStatus).toBe("MATCHED_DEALER");
    expect(black.image).not.toBe(white.image);
    expect(readFileSync(`public${black.image}`).equals(readFileSync(`public${white.image}`))).toBe(false);
  });
});
