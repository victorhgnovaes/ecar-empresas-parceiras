import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brands, isBrandId } from "@/config/brands";
import { vehicleRepository } from "@/lib/repositories/vehicle-repository";
import { VehicleCatalog } from "@/components/catalog/vehicle-catalog";
import { brandIds } from "@/types/domain";

export const dynamicParams = false;

export function generateStaticParams() { return brandIds.map((brand) => ({ brand })); }
export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
  const { brand } = await params;
  return isBrandId(brand) ? { title: `Catálogo ${brands[brand].name}`, description: `Conheça modelos, versões e configurações ${brands[brand].name} na ECAR Frotas. Atendimento com o Emerson ECAR.` } : {};
}
export default async function ModelsPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  if (!isBrandId(brand)) notFound();
  return <VehicleCatalog brand={brand} vehicles={await vehicleRepository.listByBrand(brand)} />;
}
