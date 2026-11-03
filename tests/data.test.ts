import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { vehicles } from "@/data/vehicles";
import { brands } from "@/config/brands";
import { vehicleRepository } from "@/lib/repositories/vehicle-repository";
import { calculateQuote, selectionForVersion, versionColors } from "@/lib/pricing";

describe("Catálogo comercial importado", () => {
  it("preserva 40 Chevrolet e 62 Volkswagen, famílias reais e anos separados", () => {
    expect(vehicles.filter((v) => v.brand === "chevrolet")).toHaveLength(9);
    expect(vehicles.filter((v) => v.brand === "volkswagen")).toHaveLength(10);
    expect(vehicles.filter((v) => v.brand === "chevrolet").flatMap((v) => v.versions)).toHaveLength(40);
    expect(vehicles.filter((v) => v.brand === "volkswagen").flatMap((v) => v.versions)).toHaveLength(62);
    expect(new Set(vehicles.map((v) => v.id)).size).toBe(19);
    expect(new Set(vehicles.flatMap((v) => v.versions.map((x) => x.id))).size).toBe(102);
    expect(vehicles.some((v) => v.slug === "transporter")).toBe(false);
    expect(vehicles.flatMap((v) => v.versions).every((v) => [2026, 2027].includes(v.modelYear!))).toBe(true);
  });
  it.each(vehicles.map((v) => [v.id, v] as const))("valida fonte, imagem PNG e combinações de %s", (_id, vehicle) => {
    expect(vehicle.dataStatus).toBe("documented");
    expect(existsSync(`public${vehicle.image}`)).toBe(true);
    expect(readFileSync(`public${vehicle.image}`).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    for (const version of vehicle.versions) {
      expect(version.sources?.length).toBeGreaterThan(0);
      expect(version.features.length).toBeGreaterThan(0);
      expect(version.name).not.toMatch(/Versão [ABC]|DEMO/);
      expect(version.commercialCode).toBeTruthy();
      const initial = selectionForVersion(vehicle, version.id);
      const quote = calculateQuote(vehicle, initial);
      expect(quote.publicCents - quote.discountCents).toBe(quote.unitCents);
      expect(quote.unitCents).toBeGreaterThan(0);
      if (vehicle.brand === "volkswagen") expect(quote.finalAvailable).toBe(true);
      else if (version.status === "PENDENTE_VALIDACAO") expect(quote.finalAvailable).toBe(false);
      for (const color of versionColors(vehicle, version).filter((c) => !c.blocked)) {
        expect(color.versionIds).toContain(version.id);
        expect(color.sources?.length).toBeGreaterThan(0);
        const optionIds = [...new Set([...(version.options ?? []).filter((o) => o.required && !o.blocked).map((o) => o.id), ...(color.requiredOptionIds ?? [])])];
        const paintQuote = calculateQuote(vehicle, { ...initial, colorId: color.id, optionIds });
        expect(paintQuote.colorCents).toBe(color.priceCents);
      }
    }
  });
  it("isola marcas e preserva os heroes", async () => {
    for (const brand of Object.values(brands)) {
      const list = await vehicleRepository.listByBrand(brand.id);
      expect(list.every((v) => v.brand === brand.id)).toBe(true);
      expect(await vehicleRepository.findBySlug(brand.id, brand.heroVehicle)).not.toBeNull();
    }
    expect(await vehicleRepository.findBySlug("volkswagen", "onix")).toBeNull();
  });
});
