import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isBrandId, brands } from "@/config/brands";
import { vehicleRepository } from "@/lib/repositories/vehicle-repository";
import { vehicles } from "@/data/vehicles";
import { PremiumConfigurator } from "@/components/configurator/premium-configurator";

export const dynamicParams = false;

export function generateStaticParams() { return vehicles.map(({ brand, slug }) => ({ brand, slug })); }
export async function generateMetadata({ params }: { params: Promise<{ brand: string; slug: string }> }): Promise<Metadata> {
  const { brand, slug } = await params;
  if (!isBrandId(brand)) return {};
  const vehicle = await vehicleRepository.findBySlug(brand, slug);
  return vehicle ? { title: `Configure ${brands[brand].name} ${vehicle.name}`, description: `Escolha versão, cor e pacotes do ${vehicle.name}. Consulte as condições com o Emerson ECAR.` } : {};
}
export default async function VehiclePage({ params }: { params: Promise<{ brand: string; slug: string }> }) {
  const { brand, slug } = await params;
  if (!isBrandId(brand)) notFound();
  const vehicle = await vehicleRepository.findBySlug(brand, slug);
  if (!vehicle) notFound();
  return <PremiumConfigurator key={vehicle.id} vehicle={vehicle} />;
}
