import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vehicles } from "@/data/vehicles";
import { calculateQuote, initialSelection, selectionForVersion, optionConflict } from "@/lib/pricing";
import { configurationSummary, consultationMessage, getWhatsAppUrl } from "@/lib/proposal";
import { defaultFilters, filterVehicles, startingPrice } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";
import type { Vehicle } from "@/types/domain";

const polo = vehicles.find((v) => v.brand === "volkswagen" && v.slug === "polo")!;
const robust = polo.versions.find((v) => v.commercialCode === "R11AQ4-2" && v.modelYear === 2027)!;

// Historical commercial examples run inside the documented table's validity.
// The production app and browser tests continue to use the real current date.
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-30T12:00:00Z")); });
afterEach(() => vi.useRealTimers());
describe("Regras comerciais conciliadas", () => {
  it("após outubro mantém a configuração, mas não oferece desconto expirado", () => {
    vi.setSystemTime(new Date("2026-11-02T12:00:00Z"));
    const selection = selectionForVersion(polo, robust.id);
    const quote = calculateQuote(polo, selection);
    expect(quote.finalAvailable).toBe(false);
    expect(quote.discountCents).toBe(0);
    expect(configurationSummary(polo, selection)).not.toContain("Valor final por unidade");
    expect(configurationSummary(polo, selection)).toContain("confirmar com você");
  });
  it("classifica automática com modo manual sem virar câmbio manual", () => {
    const tracker = vehicles.find((v) => v.brand === "chevrolet" && v.slug === "tracker")!;
    expect(tracker.versions.every((v) => v.transmission === "Automático")).toBe(true);
  });
  it("reproduz Polo Robust MY27: 100.830,00 − 14% = 86.713,80", () => {
    const color = robust.colors!.find((c) => c.priceCents === 110000)!;
    const option = robust.options!.find((o) => o.code === "P7D")!;
    const q = calculateQuote(polo, { ...selectionForVersion(polo, robust.id), colorId: color.id, optionIds: [option.id] });
    expect(q).toMatchObject({ publicCents: 10083000, discountCents: 1411620, unitCents: 8671380, finalAvailable: true, basisPoints: 1400 });
    expect(robust.discount?.faixa2BasisPoints).toBe(1100);
  });
  it("separa os mesmos códigos entre MY26 e MY27 e muda equipamentos por versão", () => {
    const old = polo.versions.find((v) => v.commercialCode === "R11AQ4-1")!;
    expect(old.modelYear).toBe(2026);
    expect(old.id).not.toBe(robust.id);
    expect(old.priceCents).not.toBe(robust.priceCents);
    expect(old.status).toBe("PENDENTE_VALIDACAO");
    const high = polo.versions.find((v) => v.modelYear === 2027 && v.name.includes("HIGHLINE"))!;
    expect(high.features).not.toEqual(robust.features);
    expect(high.colors!.every((c) => c.versionIds?.includes(high.id))).toBe(true);
  });
  it("zero Faixa II não vira oferta de 3%, nem entra no menor preço", () => {
    const tCross = vehicles.find((v) => v.brand === "volkswagen" && v.slug === "t-cross")!;
    const sense = tCross.versions.find((v) => v.discount?.faixa2BasisPoints === 0)!;
    const q = calculateQuote(tCross, selectionForVersion(tCross, sense.id));
    expect(q.finalAvailable).toBe(false); expect(q.basisPoints).toBeNull(); expect(q.discountCents).toBe(0);
    expect(configurationSummary(tCross, selectionForVersion(tCross, sense.id))).not.toMatch(/Valor final por unidade|Desconto: 3%/);
    expect(startingPrice({ ...tCross, versions: [sense] })).toBeNull();
  });
  it("não inventa ficha técnica vazia nem publica marchas conflitantes", () => {
    expect(robust.technicalSpecs).toEqual({});
    const tc = vehicles.find((v) => v.brand === "volkswagen" && v.slug === "t-cross")!;
    const conflicting = tc.versions.filter((v) => v.issues?.some((s) => s.includes("Câmbio divergente")));
    expect(conflicting.length).toBe(3);
    for (const v of conflicting) {
      expect(v.technicalSpecs?.TRANSMISSÃO).toBeUndefined();
      expect(v.features.some((s) => s.startsWith("TRANSMISSÃO"))).toBe(false);
    }
  });
  it("ausência de preço bloqueia cálculo, e prazo vencido bloqueia oferta", () => {
    const noPrice: Vehicle = { ...polo, versions: [{ ...robust, priceCents: null }] };
    expect(() => calculateQuote(noPrice, selectionForVersion(noPrice, robust.id))).toThrow("Preço público não informado");
    const expired: Vehicle = { ...polo, versions: [{ ...robust, discount: { ...robust.discount!, validUntil: "2020-01-01" } }] };
    expect(calculateQuote(expired, selectionForVersion(expired, robust.id)).finalAvailable).toBe(false);
  });
  it("cor gratuita e paga, opcionais e quantidade mantêm centavos exatos", () => {
    const base = selectionForVersion(polo, robust.id);
    const q = calculateQuote(polo, base);
    expect(q.colorCents).toBe(0); expect(q.optionsCents).toBe(0);
    const paid = robust.colors!.find((c) => c.priceCents > 0)!;
    const extra = calculateQuote(polo, { ...base, colorId: paid.id, quantity: 3 });
    expect(extra.publicCents).toBe(q.publicCents + paid.priceCents);
    expect(extra.totalCents).toBe(extra.unitCents * 3);
    const other = polo.versions.find((v) => v.modelYear === 2026)!;
    expect(() => calculateQuote(polo, { ...base, colorId: other.colors![0].id })).toThrow();
  });
  it("Amarok exige protetor, dependências e cor dos pacotes; rejeita combinações inválidas", () => {
    const amarok = vehicles.find((v) => v.slug === "amarok")!;
    const high = amarok.versions.find((v) => v.commercialCode?.startsWith("AGDC"))!;
    const initial = selectionForVersion(amarok, high.id);
    const protector = high.options!.find((o) => o.code === "YI3")!;
    const cover = high.options!.find((o) => o.code === "YI1")!;
    expect(initial.optionIds).toContain(protector.id);
    expect(() => calculateQuote(amarok, { ...initial, optionIds: [cover.id] })).toThrow("obrigatório");
    expect(calculateQuote(amarok, { ...initial, optionIds: [...initial.optionIds, cover.id] }).optionsCents).toBe(698000);
    const extreme = amarok.versions.find((v) => v.commercialCode?.startsWith("AGDD"))!;
    const hero = extreme.options!.find((o) => o.code === "PHB")!;
    const white = extreme.colors!.find((c) => c.code === "0Q0Q")!;
    const s = { ...selectionForVersion(amarok, extreme.id), colorId: white.id };
    expect(optionConflict(amarok, s, hero.id)).toBeTruthy();
    expect(() => calculateQuote(amarok, { ...s, optionIds: [...s.optionIds, hero.id] })).toThrow("incompatível");
  });
  it("Captiva exige código específico; Spark MY26 não recebe regra MY27", () => {
    const captiva = vehicles.find((v) => v.slug === "captiva-ev")!;
    const initial = initialSelection(captiva);
    expect(calculateQuote(captiva, initial).finalAvailable).toBe(false);
    const valid = captiva.versions[0].configurations!.find((c) => captiva.versions[0].discount?.configurationRates?.[c] !== null)!;
    expect(calculateQuote(captiva, { ...initial, factoryCode: valid }).basisPoints).toBe(1000);
    const spark = vehicles.find((v) => v.slug === "spark-euv")!;
    expect(spark.versions[0].modelYear).toBe(2026);
    expect(calculateQuote(spark, initialSelection(spark)).finalAvailable).toBe(false);
  });
  it("preserva o HALF_UP no valor final Aurora, inclusive meio centavo", () => {
    const gm = vehicles.find((v) => v.slug === "onix")!;
    const v = gm.versions[0];
    const tiny: Vehicle = { ...gm, versions: [{ ...v, priceCents: 101, colors: [{ ...v.colors![0], priceCents: 0 }], discount: { ...v.discount!, basisPoints: 5000 } }] };
    const q = calculateQuote(tiny, initialSelection(tiny));
    expect(q.unitCents).toBe(51); expect(q.discountCents).toBe(50);
  });
});
describe("Consulta do cliente", () => {
  it("leva configuração completa e número correto ao Emerson, sem expor conflitos internos", () => {
    const s = selectionForVersion(polo, robust.id); const text = configurationSummary(polo, s);
    for (const value of ["Olá, Emerson", "Volkswagen", "R11AQ4-2", "2027", "Quantidade: 1", "Preço público", "Valor final", "disponibilidade", "documentação"]) expect(text).toContain(value);
    expect(text).not.toMatch(/PENDENTE_VALIDACAO|\.json|\.xlsx|DEMO/);
    const url = new URL(getWhatsAppUrl("5511989266321", text)!);
    expect(url.pathname).toBe("/5511989266321"); expect(url.searchParams.get("text")).toBe(text);
    expect(consultationMessage("Chevrolet")).toContain("Emerson");
  });
  it("filtra por ano e código da mesma versão e mantém anos históricos fora", () => {
    expect(filterVehicles(vehicles, { ...defaultFilters, search: "R11AQ4-2", modelYear: "2027" }).map((v) => v.slug)).toEqual(["polo"]);
    expect(filterVehicles(vehicles, { ...defaultFilters, search: "R11AQ4-2", modelYear: "2026" })).toHaveLength(0);
    expect(filterVehicles(vehicles, { ...defaultFilters, modelYear: "2025" })).toHaveLength(0);
    expect(formatMoney(8671380).replace(/\s/g," ")).toBe("R$ 86.713,80");
  });
});
