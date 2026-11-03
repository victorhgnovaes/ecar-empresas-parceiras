"use client";

import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, ChevronDown, Menu, X } from "lucide-react";
import { brands } from "@/config/brands";
import { sitePath } from "@/lib/site-path";
import { siteConfig } from "@/config/site";
import type { BrandId } from "@/types/domain";
import { getWhatsAppUrl, consultationMessage } from "@/lib/proposal";
import { Modal } from "@/components/ui";

export function EcarLogo({ light = false }: { light?: boolean }) {
  return <span className={`ecar-wordmark ${light ? "ecar-wordmark-light" : ""}`}>
    {siteConfig.institutionalLogo ? <Image src={sitePath(siteConfig.institutionalLogo)} width={2048} height={683} sizes="(max-width: 600px) 112px, 184px" priority alt="ECAR Frotas — logo metálico" /> : <><strong>ECAR<span className="wordmark-dot">.</span></strong><span>FROTAS</span></>}
  </span>;
}

export function BrandLabel({ brand }: { brand: BrandId }) {
  const config = brands[brand];
  return config.logo ? <Image src={sitePath(config.logo)} alt={config.name} width={110} height={32} /> : <span className={`brand-label brand-label-${brand}`}>{config.name}</span>;
}

export function ContactButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const url = getWhatsAppUrl(siteConfig.whatsappNumber, consultationMessage());
  return <>
    {url ? <a className={compact ? "contact-icon" : "button button-primary"} href={url} target="_blank" rel="noopener noreferrer" aria-label="Abrir WhatsApp oficial"><WhatsAppIcon size={21} />{!compact && "Fale com a ECAR"}</a> : <button type="button" className={compact ? "contact-icon" : "button button-primary"} onClick={() => setOpen(true)} aria-label={compact ? "Informações sobre o atendimento via WhatsApp" : undefined}><WhatsAppIcon size={21} />{!compact && "Fale com a ECAR"}</button>}
    <Modal open={open} onClose={() => setOpen(false)} title="Atendimento ECAR"><div className="contact-info"><WhatsAppIcon size={36} /><p>O WhatsApp oficial será configurado na próxima fase.</p><p className="muted">Enquanto isso, você pode explorar os modelos, simular uma configuração e copiar a solicitação de proposta. Nenhuma mensagem é enviada por esta plataforma.</p><button type="button" className="button button-primary" onClick={() => setOpen(false)}>Continuar explorando</button></div></Modal>
  </>;
}

export function BrandHeader({ brand }: { brand?: BrandId }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const other: BrandId = brand === "chevrolet" ? "volkswagen" : "chevrolet";
  const links = brand ? [
    { label: "Início", href: `/${brand}` }, { label: "Modelos", href: `/${brand}/modelos` },
    { label: "Como funciona", href: `/${brand}#como-funciona` }, { label: "Condições", href: `/${brand}#condicoes` }, { label: "Dúvidas", href: `/${brand}#duvidas` },
  ] : [];
  return <header className="brand-header"><div className="header-inner">
    <Link className="institutional-link" href="/" aria-label="ECAR Frotas — portal inicial"><EcarLogo /></Link>
    <span className="header-divider" aria-hidden="true" />
    {brand ? <details className="brand-switch" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) event.currentTarget.open = false; }}><summary><BrandLabel brand={brand} /><ChevronDown size={13} aria-hidden="true" /></summary><div className="brand-switch-menu"><span className="eyebrow">Trocar montadora</span><Link href={`/${other}`}><ArrowLeftRight size={15} /><BrandLabel brand={other} /></Link><Link href="/">Voltar ao portal</Link></div></details> : <span className="partner-label">EMPRESAS<br />PARCEIRAS</span>}
    {brand && <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navegação principal">{links.map((link) => <Link key={link.label} href={link.href} className={pathname === link.href ? "active" : ""} onClick={() => setMenuOpen(false)}>{link.label}</Link>)}</nav>}
    <div className="header-actions"><ContactButton compact />{brand && <button type="button" className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button>}</div>
  </div></header>;
}
