import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { brands, isBrandId } from "@/config/brands";
import { vehicleRepository } from "@/lib/repositories/vehicle-repository";
import { BrandHome } from "@/components/brand-home";
import { brandIds } from "@/types/domain";

export const dynamicParams = false;

export function generateStaticParams() { return brandIds.map((brand) => ({ brand })); }
export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
  const { brand } = await params;
  return isBrandId(brand) ? { title: `Veículos ${brands[brand].name} para Empresas`, description: `${brands[brand].heroDescription} Consulte as condições com o Emerson ECAR.` } : {};
}
export default async function BrandPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  if (!isBrandId(brand)) notFound();
  return <BrandHome brand={brand} vehicles={await vehicleRepository.listByBrand(brand)} />;
}
