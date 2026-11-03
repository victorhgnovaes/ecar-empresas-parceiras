import { describe, expect, it } from "vitest";
import { vehicles } from "./fixtures/demo-vehicles";
import { calculateQuote, initialSelection } from "@/lib/finance";

const vehicle = vehicles.find((item) => item.slug === "onix")!;
const selection = initialSelection(vehicle);

describe("Motor financeiro demonstrativo", () => {
  it("calcula preço, adicionais, desconto da versão e quantidade com valores exatos", () => {
    const quote = calculateQuote(vehicle, { ...selection, colorId: "silver", optionIds: ["comfort"], quantity: 3 });
    expect(quote).toMatchObject({ versionCents: 9500000, colorCents: 180000, optionsCents: 350000, publicCents: 10030000, discountCents: 760000, unitCents: 9270000, totalCents: 27810000, totalSavingsCents: 2280000, quantity: 3, finalAvailable: true });
  });
  it("suporta desconto sobre o total configurado de forma explícita", () => {
    const configured = { ...vehicle, discount: { ...vehicle.discount, appliesTo: "configured-total" as const } };
    const quote = calculateQuote(configured, { ...selection, colorId: "silver", optionIds: ["comfort"] });
    expect(quote.discountCents).toBe(802400);
    expect(quote.unitCents).toBe(9227600);
  });
  it("arredonda exatamente meio centavo para cima", () => {
    const tiny = { ...vehicle, versions: [{ ...vehicle.versions[0], priceCents: 101 }], discount: { ...vehicle.discount, basisPoints: 5000 } };
    expect(calculateQuote(tiny, selection).discountCents).toBe(51);
    expect(calculateQuote(tiny, selection).unitCents).toBe(50);
  });
  it("não cobra opcionais duplicados e não altera a seleção", () => {
    const input = { ...selection, optionIds: ["comfort", "comfort"] };
    expect(calculateQuote(vehicle, input).optionsCents).toBe(350000);
    expect(input.optionIds).toEqual(["comfort", "comfort"]);
  });
  it.each([0, -1, 1.5, 1000, NaN, Infinity])("rejeita quantidade inválida: %s", (quantity) => {
    expect(() => calculateQuote(vehicle, { ...selection, quantity })).toThrow("1 a 999");
  });
  it("aceita as duas quantidades limite", () => {
    expect(calculateQuote(vehicle, { ...selection, quantity: 999 }).totalCents).toBe(8731260000);
    expect(calculateQuote(vehicle, selection).quantity).toBe(1);
  });
  it.each(["versionId", "colorId"] as const)("rejeita %s inexistente", (key) => {
    expect(() => calculateQuote(vehicle, { ...selection, [key]: "does-not-exist" })).toThrow();
  });
  it("rejeita opcionais inexistentes ou incompatíveis", () => {
    expect(() => calculateQuote(vehicle, { ...selection, optionIds: ["does-not-exist"] })).toThrow();
    const restricted = { ...vehicle, options: vehicle.options.map((item) => ({ ...item, versionIds: ["another-version"] })) };
    expect(() => calculateQuote(restricted, { ...selection, optionIds: ["comfort"] })).toThrow("incompatível");
  });
  it("rejeita dois opcionais de um grupo exclusivo", () => {
    const exclusive = { ...vehicle, options: vehicle.options.map((item) => ({ ...item, exclusiveGroup: "package" })) };
    expect(() => calculateQuote(exclusive, { ...selection, optionIds: ["comfort", "technology"] })).toThrow("exclusivos");
  });
  it.each([-1, 10001, 7.5, NaN])("rejeita percentual inválido: %s", (basisPoints) => {
    expect(() => calculateQuote({ ...vehicle, discount: { ...vehicle.discount, basisPoints } }, selection)).toThrow("desconto");
  });
  it("aceita desconto zero e de 100% sem deixar negativos", () => {
    expect(calculateQuote({ ...vehicle, discount: { ...vehicle.discount, basisPoints: 0 } }, selection).unitCents).toBe(9500000);
    expect(calculateQuote({ ...vehicle, discount: { ...vehicle.discount, basisPoints: 10000 } }, selection).unitCents).toBe(0);
  });
  it.each([-1, .5, NaN, Number.MAX_SAFE_INTEGER + 1])("rejeita preço inválido: %s", (priceCents) => {
    expect(() => calculateQuote({ ...vehicle, versions: [{ ...vehicle.versions[0], priceCents }] }, selection)).toThrow("monetário");
  });
  it("rejeita total da frota que excede a precisão segura", () => {
    const huge = { ...vehicle, versions: [{ ...vehicle.versions[0], priceCents: Number.MAX_SAFE_INTEGER }], discount: { ...vehicle.discount, basisPoints: 0 } };
    expect(() => calculateQuote(huge, { ...selection, quantity: 2 })).toThrow();
  });
  it.each(vehicles.map((item) => [item.id, item] as const))("mantém invariantes em todas as versões e cores: %s", (_id, item) => {
    for (const version of item.versions) for (const color of item.colors) {
      const quote = calculateQuote(item, { versionId: version.id, colorId: color.id, optionIds: item.options.filter((option) => option.versionIds.includes(version.id)).map((option) => option.id), quantity: 7 });
      expect(quote.publicCents - quote.discountCents).toBe(quote.unitCents);
      expect(quote.totalCents).toBe(quote.unitCents * 7);
      expect(quote.totalSavingsCents).toBe(quote.discountCents * 7);
      expect(Number.isSafeInteger(quote.totalCents)).toBe(true);
      expect(quote.unitCents).toBeGreaterThanOrEqual(0);
    }
  });
});
