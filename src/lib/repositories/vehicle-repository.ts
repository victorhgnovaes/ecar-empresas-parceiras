import type { BrandId, Vehicle } from "@/types/domain";
import { vehicles } from "@/data/vehicles";

/** Trocar o adapter local por Supabase preservando este contrato na Fase 2. */
export interface VehicleRepository {
  listByBrand(brand: BrandId): Promise<Vehicle[]>;
  findBySlug(brand: BrandId, slug: string): Promise<Vehicle | null>;
}

export const vehicleRepository: VehicleRepository = {
  async listByBrand(brand) { return vehicles.filter((vehicle) => vehicle.brand === brand); },
  async findBySlug(brand, slug) { return vehicles.find((vehicle) => vehicle.brand === brand && vehicle.slug === slug) ?? null; },
};
