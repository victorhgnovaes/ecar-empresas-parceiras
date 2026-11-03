import { describe, expect, it } from "vitest";
import { vehicles } from "@/data/vehicles";
import { defaultFilters, filterVehicles, startingPrice } from "@/lib/catalog";

describe("Catálogo", () => {
  it("pesquisa sem distinguir maiúsculas e acentos", () => {
    expect(filterVehicles(vehicles, { ...defaultFilters, search: "  SEDA  " }).every((vehicle) => vehicle.category === "Sedã")).toBe(true);
    expect(filterVehicles(vehicles, { ...defaultFilters, search: "TRACKER" }).map((vehicle) => vehicle.slug)).toEqual(["tracker"]);
  });
  it("combina pesquisa, categoria, câmbio e preço máximo", () => {
    const results = filterVehicles(vehicles, { ...defaultFilters, search: "chevrolet", category: "SUV", transmission: "Automático", maxPriceCents: 14500000 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((vehicle) => vehicle.brand === "chevrolet" && vehicle.category === "SUV")).toBe(true);
    expect(results.some((vehicle) => vehicle.slug === "captiva-ev")).toBe(false);
  });
  it("filtra preço pela versão compatível com o câmbio", () => {
    const onix = vehicles.filter((vehicle) => vehicle.slug === "onix");
    expect(filterVehicles(onix, { ...defaultFilters, maxPriceCents: 9000000 })).toHaveLength(1);
    expect(filterVehicles(onix, { ...defaultFilters, transmission: "Automático", maxPriceCents: 9000000 })).toHaveLength(0);
  });
  it.each(["price-asc", "price-desc"] as const)("ordena por %s sem alterar os dados originais", (sort) => {
    const originalOrder = vehicles.map((vehicle) => vehicle.id);
    const prices = filterVehicles(vehicles, { ...defaultFilters, sort }).map(startingPrice).filter((p): p is number => p !== null);
    expect(prices).toEqual([...prices].sort((a, b) => sort === "price-asc" ? a - b : b - a));
    expect(vehicles.map((vehicle) => vehicle.id)).toEqual(originalOrder);
  });
  it("ordena alfabeticamente e responde a uma pesquisa sem resultados", () => {
    const names = filterVehicles(vehicles, { ...defaultFilters, sort: "name" }).map((vehicle) => vehicle.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "pt-BR")));
    expect(filterVehicles(vehicles, { ...defaultFilters, search: "modelo inexistente" })).toHaveLength(0);
  });
});
