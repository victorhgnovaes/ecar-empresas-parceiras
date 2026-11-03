import type { BrandId, Category, Vehicle } from "@/types/domain";

/** Fixtures fictícias: nenhum equipamento, ano, taxa ou valor é oficial. */
export function demoVehicle(brand: BrandId, slug: string, name: string, category: Category, baseReais: number, featured = false): Vehicle {
  const photoExtensions: Record<string, string> = { onix: "png", "onix-plus": "png", tracker: "png", montana: "png", spin: "jpg", s10: "jpg", polo: "webp", virtus: "webp", "t-cross": "webp", nivus: "webp", saveiro: "webp", taos: "webp" };
  return {
    id: `${brand}-${slug}`, brand, slug, name, category, year: "2026 / 2027", modelYear: "2026 / 2027", featured,
    description: `Explore uma configuração demonstrativa do ${name} para a sua empresa.`,
    image: photoExtensions[slug] ? `/images/vehicles/${slug}.${photoExtensions[slug]}` : `/images/vehicles/${brand}/${slug}.svg`,
    imageAlt: `${name} — imagem temporária ilustrativa; não representa a versão, a cor ou os opcionais selecionados.`,
    fuel: "Motorização DEMO", dataStatus: "demonstrative",
    versions: [
      { id: "a", name: "Versão A · DEMO", priceCents: baseReais * 100, transmission: "Manual", power: "Motorização demonstrativa", features: ["Pacote de entrada fictício", "Equipamentos sujeitos à validação"] },
      { id: "b", name: "Versão B · DEMO", priceCents: (baseReais + 14000) * 100, transmission: "Automático", power: "Motorização demonstrativa", features: ["Pacote intermediário fictício", "Equipamentos sujeitos à validação"] },
      { id: "c", name: "Versão C · DEMO", priceCents: (baseReais + 28000) * 100, transmission: "Automático", power: "Motorização demonstrativa", features: ["Pacote superior fictício", "Equipamentos sujeitos à validação"] },
    ],
    colors: [
      { id: "white", name: "Branco", hex: "#f4f5f6", priceCents: 0 },
      { id: "silver", name: "Prata", hex: "#a2a7ad", priceCents: 180000 },
      { id: "black", name: "Preto", hex: "#25272b", priceCents: 180000 },
      { id: "gray", name: "Cinza", hex: "#68727d", priceCents: 120000 },
      { id: "blue", name: "Azul", hex: "#183e69", priceCents: 220000 },
    ],
    options: [
      { id: "technology", name: "Pacote Tecnológico", description: "Conectividade ilustrativa. Equipamentos fictícios.", priceCents: 480000, versionIds: ["a", "b", "c"] },
      { id: "comfort", name: "Pacote Conforto", description: "Conveniências ilustrativas para a rotina.", priceCents: 350000, versionIds: ["a", "b", "c"] },
      { id: "wheels", name: "Rodas Especiais", description: "Conjunto de rodas fictício para simulação.", priceCents: 320000, versionIds: ["a", "b", "c"] },
      { id: "premium", name: "Acabamento Premium", description: "Acabamento interno fictício para demonstração.", priceCents: 260000, versionIds: ["a", "b", "c"] },
    ],
    discount: { id: `${brand}-demo`, label: "Desconto demonstrativo", basisPoints: brand === "chevrolet" ? 800 : 700, appliesTo: "vehicle", source: "demo" },
  };
}
