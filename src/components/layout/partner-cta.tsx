import Link from "next/link";
import { ArrowRight, Building2, Handshake, FileText } from "lucide-react";
import { FooterContactAction } from "@/components/chevrolet/footer-contact-action";
import { brands } from "@/config/brands";
import type { BrandId } from "@/types/domain";
import styles from "@/components/chevrolet/chevrolet-footer.module.css";

const benefits = [
  { icon: Building2, title: "Condições corporativas", description: "Soluções sob medida para empresas." },
  { icon: Handshake, title: "Atendimento especializado", description: "Suporte em todas as etapas." },
  { icon: FileText, title: "Processo simplificado", description: "Cotação rápida e sem burocracia." },
];

export function PartnerCta({ brand }: { brand: BrandId }) {
  const chevrolet = brand === "chevrolet";
  return <section className={`${styles.cta} ${chevrolet ? "" : styles.volkswagenCta}`} data-testid={`${brand}-cta`} aria-labelledby={`${brand}-cta-title`}>
    <div className={styles.ctaInner}>
      <div className={styles.ctaMessage}><p className={styles.eyebrow}>SUA EMPRESA EM MOVIMENTO</p><h2 id={`${brand}-cta-title`}>Seu próximo<br />caminho começa aqui.</h2><span className={styles.titleRule} aria-hidden="true" /><p className={styles.ctaDescription}>Descubra os modelos {brands[brand].name} ideais para o seu negócio com condições exclusivas e atendimento especializado.</p></div>
      <div className={styles.ctaCommercial}><ul className={styles.benefits} aria-label="Benefícios comerciais">{benefits.map(({ icon: Icon, title, description }) => <li key={title}><span className={styles.benefitIcon}><Icon size={24} strokeWidth={1.6} aria-hidden="true" /></span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ul><div className={styles.ctaActions}><Link href={`/${brand}/modelos`} className={`${styles.action} ${styles.gold}`}><span>Explore os modelos</span><ArrowRight size={18} aria-hidden="true" /></Link><FooterContactAction brand={brand}>Falar com um especialista</FooterContactAction></div></div>
      {chevrolet && <div className={styles.vehicleSpace} aria-hidden="true" />}
    </div>
    {chevrolet && <div className={styles.ctaArt} data-testid="chevrolet-cta-background" aria-hidden="true" />}
  </section>;
}
