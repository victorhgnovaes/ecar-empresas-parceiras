import { sitePath } from "@/lib/site-path";
/** Imagens fornecidas pelo usuário. Estudos de veículos ilustrativos, sem validação comercial. */
export const portalBackground = sitePath("/assets/portal/portal-unificado.png");
export const visualAssets = {
  chevrolet: {
    portal: sitePath("/assets/portal/portal-chevrolet-background.webp"),
    hero: sitePath("/assets/chevrolet/hero/chevrolet-hero-background.webp"),
    section: sitePath("/assets/chevrolet/backgrounds/chevrolet-section-background.webp"),
    catalogHeader: sitePath("/assets/chevrolet/backgrounds/chevrolet-catalog-header.webp"),
    catalog: sitePath("/assets/chevrolet/backgrounds/chevrolet-catalog-background.webp"),
    vehicle: sitePath("/assets/chevrolet/hero/s10-estudo.png"),
    vehicleAlt: "Estudo ilustrativo Chevrolet S10 do pacote fornecido. Não representa a configuração ou um veículo oficialmente validado.",
  },
  volkswagen: {
    portal: sitePath("/assets/portal/portal-volkswagen-background.webp"),
    hero: sitePath("/assets/volkswagen/hero/volkswagen-hero-background.webp"),
    section: sitePath("/assets/volkswagen/backgrounds/volkswagen-section-background.webp"),
    catalogHeader: sitePath("/assets/volkswagen/backgrounds/volkswagen-catalog-header.webp"),
    catalog: sitePath("/assets/volkswagen/backgrounds/volkswagen-catalog-background.webp"),
    vehicle: sitePath("/assets/volkswagen/hero/tcross-frente-esquerda.png"),
    vehicleAlt: "Estudo ilustrativo Volkswagen T-Cross do pacote fornecido. Não representa a configuração ou um veículo oficialmente validado.",
  },
};
