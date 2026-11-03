import { notFound } from "next/navigation";
import { isBrandId, brandStyle } from "@/config/brands";
import { BrandHeader } from "@/components/brand-header";
import { Footer } from "@/components/footer";

export default async function BrandLayout({ children, params }: { children: React.ReactNode; params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  if (!isBrandId(brand)) notFound();
  return <div className={`brand-shell theme-${brand}`} style={brandStyle(brand)}><BrandHeader brand={brand} />{children}<Footer brand={brand} /></div>;
}
