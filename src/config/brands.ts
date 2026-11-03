import type { Brand, BrandId } from "@/types/domain";
import type { CSSProperties } from "react";
import { sitePath } from "@/lib/site-path";
import { visualAssets } from "./visual-assets";

export const brands: Record<BrandId, Brand> = {
  chevrolet: { id: "chevrolet", name: "Chevrolet", tagline: "Novos caminhos para o seu negócio.", heroTitle: "Seu próximo Chevrolet está aqui", heroDescription: "Condições comerciais exclusivas para empresas. Modelos, versões e configurações em um só lugar.", heroVehicle: "s10", primary: "#F2B51C", dark: "#172434", background: "#F4F6F8" },
  volkswagen: { id: "volkswagen", name: "Volkswagen", tagline: "O próximo movimento da sua empresa.", heroTitle: "Seu próximo Volkswagen está aqui", heroDescription: "Condições comerciais exclusivas para empresas. Modelos, versões e configurações em um só lugar.", heroVehicle: "t-cross", primary: "#0066FF", dark: "#001E50", background: "#EAF3FF" },
};
export const ecarTheme = { navy: "#071D42", dark: "#04132C", blue: "#0B4C9C", white: "#FFFFFF", silver: "#E9EEF5" };
export function brandStyle(id: BrandId): CSSProperties {
  const theme = brands[id];
  const assets = visualAssets[id];
  return { "--chevrolet-cta-art": `url('${sitePath("/assets/chevrolet/footer/chevrolet-cta-original.png")}')`, "--accent": theme.primary, "--dark": theme.dark, "--surface": theme.background, "--portal-art": `url('${assets.portal}')`, "--hero-art": `url('${assets.hero}')`, "--section-art": `url('${assets.section}')`, "--catalog-art": `url('${assets.catalog}')`, "--catalog-heading-art": `url('${assets.catalogHeader}')` } as CSSProperties;
}
export function isBrandId(value: string): value is BrandId { return Object.hasOwn(brands, value); }
