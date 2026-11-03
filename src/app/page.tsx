import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { BrandHeader, BrandLabel } from "@/components/brand-header";
import { VehicleImage } from "@/components/vehicle-image";
import { vehicles } from "@/data/vehicles";
import { brands, brandStyle } from "@/config/brands";
import { visualAssets, portalBackground } from "@/config/visual-assets";
import { brandIds } from "@/types/domain";
import styles from "./portal.module.css";

export default function PortalPage() {
  const artwork = {
    "--portal-shared-art": `url('${portalBackground}')`,
  } as CSSProperties;

  return (
    <>
      <BrandHeader />
      <main id="conteudo">
        <h1 className="sr-only">
          ECAR Frotas | Empresas Parceiras — escolha sua montadora
        </h1>
        <section
          className={`portal-split ${styles.portal}`}
          style={artwork}
          aria-label="Escolha sua montadora"
        >
          {brandIds.map((id) => {
            const brand = brands[id];
            const assets = visualAssets[id];
            const vehicle = vehicles.find(
              (item) => item.brand === id && item.slug === brand.heroVehicle,
            )!;

            return (
              <article
                key={id}
                className={`brand-selection theme-${id} ${styles.panel} ${styles[id]}`}
                style={brandStyle(id)}
                aria-labelledby={`${id}-title`}
              >
                <div className={styles.content}>
                  <div className={styles.brand}>
                    <BrandLabel brand={id} />
                    <span className={styles.rule} aria-hidden="true" />
                  </div>
                  <h2 id={`${id}-title`}>
                    Veículos<br />
                    <em>{brand.name}</em><br />
                    para sua empresa
                  </h2>
                  <p>
                    Modelos, versões, opcionais, preços públicos e condições
                    comerciais exclusivas.
                  </p>
                  <Link className={styles.action} href={`/${id}`}>
                    Explorar {brand.name}
                    <ArrowRight size={20} aria-hidden="true" />
                  </Link>
                </div>
                <div className={styles.vehicle}>
                  <VehicleImage
                    vehicle={{ ...vehicle, image: assets.vehicle, imageAlt: assets.vehicleAlt }}
                    priority
                    sizes="(min-width: 1840px) 920px, (min-width: 900px) 50vw, 98vw"
                  />
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </>
  );
}
