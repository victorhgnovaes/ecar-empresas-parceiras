import { calculateQuote, selectionForVersion } from "@/lib/pricing";
import type { Category, Transmission, Vehicle } from "@/types/domain";

export interface CatalogFilters {
  search: string;
  category: Category | "all";
  transmission: Transmission | "all";
  maxPriceCents: number;
  sort: "featured" | "price-asc" | "price-desc" | "name";
  modelYear?: string;
  family?: string;
  fuel?: string;
}
export const defaultFilters: CatalogFilters = { search: "", category: "all", transmission: "all", maxPriceCents: 60000000, sort: "featured", modelYear: "all", family: "all", fuel: "all" };
export function versionPrice(vehicle: Vehicle, versionId: string) {
  try { const quote = calculateQuote(vehicle, selectionForVersion(vehicle, versionId)); return quote.finalAvailable ? quote.unitCents : null; } catch { return null; }
}
export function startingPrice(vehicle: Vehicle) {
  const prices = vehicle.versions.map((v) => versionPrice(vehicle, v.id)).filter((p): p is number => p !== null);
  return prices.length ? Math.min(...prices) : null;
}
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
export function filterVehicles(vehicles: Vehicle[], filters: CatalogFilters) {
  const query = normalize(filters.search);
  const result = vehicles.filter((vehicle) => {
    const versions = vehicle.versions.filter((version) => (filters.transmission === "all" || version.transmission === filters.transmission)
      && (!filters.modelYear || filters.modelYear === "all" || String(version.modelYear) === filters.modelYear)
      && (!filters.fuel || filters.fuel === "all" || version.fuel === filters.fuel));
    return versions.some((v) => normalize(`${vehicle.name} ${vehicle.brand} ${vehicle.category} ${v.name} ${v.commercialCode ?? ""} ${v.modelYear ?? ""}`).includes(query) && (v.priceCents === null || (versionPrice(vehicle, v.id) ?? v.priceCents) <= filters.maxPriceCents))
      && (filters.category === "all" || vehicle.category === filters.category)
      && (!filters.family || filters.family === "all" || vehicle.slug === filters.family);
  });
  return result.sort((a, b) => {
    const pa = startingPrice(a), pb = startingPrice(b);
    if (filters.sort === "price-asc" || filters.sort === "price-desc") {
      if (pa === null) return pb === null ? 0 : 1;
      if (pb === null) return -1;
      return filters.sort === "price-asc" ? pa - pb : pb - pa;
    }
    if (filters.sort === "name") return a.name.localeCompare(b.name, "pt-BR");
    return Number(b.featured) - Number(a.featured);
  });
}
