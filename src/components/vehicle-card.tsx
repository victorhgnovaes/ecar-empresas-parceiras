import Link from "next/link";
import { ArrowRight, CarFront, Settings2 } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { startingPrice } from "@/lib/catalog";
import { VehicleImage } from "@/components/vehicle-image";
import type { Vehicle } from "@/types/domain";

export function VehicleCard({ vehicle, compact = false }: { vehicle: Vehicle; compact?: boolean }) {
  const price = startingPrice(vehicle);
  return <article className={`vehicle-card ${compact ? "vehicle-card-compact" : ""}`}><Link href={`/${vehicle.brand}/veiculo/${vehicle.slug}`} className="vehicle-card-link" aria-label={`Configurar ${vehicle.name}`}>
    <div className="card-visual"><div className="card-badges"><span className="category-badge">{vehicle.category}</span><span className="demo-pill">{vehicle.versions.length} versões</span></div><VehicleImage vehicle={vehicle} sizes={compact ? "(max-width: 600px) 90vw, (max-width: 1100px) 45vw, 23vw" : "(max-width: 600px) 90vw, (max-width: 1100px) 43vw, 30vw"} /></div>
    <div className="card-content"><span className="card-year">{vehicle.modelYear}</span><div className="card-model"><h3>{vehicle.name}</h3><span className="card-cta">{compact ? null : "Configurar"}<ArrowRight size={16} /></span></div><p className="card-version">{compact ? vehicle.versions[0].name : `${vehicle.versions.length} versões para conhecer`}</p><div className="card-specs"><span><CarFront size={15} />{vehicle.category}</span><span><Settings2 size={15} />{vehicle.fuel}</span></div><div className="card-price"><span>{price === null ? "Atendimento personalizado" : "A partir de · sujeito à confirmação"}</span><strong>{price === null ? "Consulte o Emerson ECAR" : formatMoney(price)}</strong></div></div>
  </Link></article>;
}
