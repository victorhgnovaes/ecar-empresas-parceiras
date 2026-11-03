"use client";
import { sitePath } from "@/lib/site-path";


import Image from "next/image";
import { useState } from "react";
import type { Vehicle } from "@/types/domain";

export function VehicleImage({ vehicle, priority = false, sizes = "(max-width: 700px) 90vw, 40vw", temporary = false }: { vehicle: Vehicle; priority?: boolean; sizes?: string; temporary?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === vehicle.image;
  return <Image src={sitePath(failed ? "/images/vehicles/placeholder.svg" : vehicle.image)} alt={failed ? `Imagem indisponível — ${vehicle.name}` : vehicle.imageAlt} width={960} height={560} sizes={sizes} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} className={`vehicle-image${temporary && !failed ? " vehicle-image-temporary" : ""}`} onError={() => setFailedSrc(vehicle.image)} />;
}
