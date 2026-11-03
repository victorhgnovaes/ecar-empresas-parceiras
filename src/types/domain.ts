export const brandIds = ["chevrolet", "volkswagen"] as const;
export type BrandId = (typeof brandIds)[number];
export type Category = "Hatch" | "Sedã" | "SUV" | "Picape" | "7 lugares" | "Comercial";
export type Transmission = "Automático" | "Manual" | "Não informado";
export type ValidationStatus = "VALIDADO" | "PENDENTE_VALIDACAO" | "DADOS_INCOMPLETOS" | "HISTORICO" | "DESCONTINUADO";
export interface SourceReference { file: string; page?: number; sheet?: string; cell?: string; effectiveDate?: string; lastVerifiedAt?: string; sha256?: string }
export interface Brand {
  id: BrandId;
  name: string;
  tagline: string;
  heroTitle: string;
  heroDescription: string;
  heroVehicle: string;
  primary: string;
  dark: string;
  background: string;
  logo?: string;
}
export interface VehicleColor {
  id: string;
  name: string;
  hex: string;
  priceCents: number;
  code?: string;
  paintType?: string | null;
  versionIds?: string[];
  image?: string | null;
  imageStatus?: "MATCHED_AURORA" | "MATCHED_DEALER" | "MISSING_PAINT_REFERENCE_ONLY" | "TEMPORARY_ILLUSTRATION";
  imageKind?: "ILUSTRACAO_TEMPORARIA" | "REFERENCE_PHOTO_UNVERIFIED";
  requiredOptionIds?: string[];
  blocked?: boolean;
  sources?: SourceReference[];
}
export interface VehicleOption {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  versionIds: string[];
  exclusiveGroup?: string;
  code?: string;
  required?: boolean;
  blocked?: boolean;
  requiresOptionIds?: string[];
  excludesOptionIds?: string[];
  allowedColorIds?: string[];
  excludedColorIds?: string[];
  requiresText?: string;
  excludesText?: string;
  sources?: SourceReference[];
}
export interface VehicleVersion {
  id: string;
  name: string;
  priceCents: number | null;
  power: string;
  transmission: Transmission;
  features: string[];
  modelYear?: number;
  commercialCode?: string;
  priceStatus?: ValidationStatus;
  status?: ValidationStatus;
  colors?: VehicleColor[];
  options?: VehicleOption[];
  discount?: DiscountRule;
  technicalSpecs?: Record<string, string>;
  sources?: SourceReference[];
  issues?: string[];
  configurations?: string[];
  image?: string | null;
  fuel?: string;
  observations?: string | null;
}
export interface DiscountRule {
  id: string;
  label: string;
  basisPoints: number;
  appliesTo: "vehicle" | "configured-total";
  source: "demo" | "commercial" | "aurora" | "volkswagen";
  status?: ValidationStatus;
  faixa2BasisPoints?: number;
  additionalBasisPoints?: number;
  referenceMonth?: string;
  validUntil?: string;
  sources?: SourceReference[];
  requiresConfiguration?: boolean;
  configurationRates?: Record<string, number | null>;
  requiresBillingState?: boolean;
  stateRates?: Record<string, number>;
}
export interface Vehicle {
  id: string;
  brand: BrandId;
  slug: string;
  name: string;
  category: Category;
  year: string;
  modelYear: string;
  description: string;
  image: string;
  imageAlt: string;
  featured: boolean;
  fuel: string;
  versions: VehicleVersion[];
  colors: VehicleColor[];
  options: VehicleOption[];
  discount: DiscountRule;
  dataStatus: "demonstrative" | "documented";
}
export interface VehicleSelection {
  versionId: string;
  colorId: string;
  optionIds: string[];
  quantity: number;
  factoryCode?: string;
  billingState?: string;
}
export interface QuoteCalculation {
  versionCents: number;
  colorCents: number;
  optionsCents: number;
  publicCents: number;
  discountCents: number;
  unitCents: number;
  totalCents: number;
  totalSavingsCents: number;
  quantity: number;
  finalAvailable: boolean;
  basisPoints: number | null;
  pendingReasons: string[];
}
export interface ProposalContact {
  name: string;
  company: string;
  cnpj: string;
  email: string;
  phone: string;
  notes: string;
  consent: boolean;
}
