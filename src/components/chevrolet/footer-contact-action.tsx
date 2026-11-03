"use client";

import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";

import { useState } from "react";
import { ArrowRight, Phone } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getWhatsAppUrl, consultationMessage } from "@/lib/proposal";
import { Modal } from "@/components/ui";
import { brands } from "@/config/brands";
import type { BrandId } from "@/types/domain";
import styles from "./chevrolet-footer.module.css";

export function FooterContactAction({ children, variant = "outline", channel = "whatsapp", arrow = false, brand = "chevrolet" }: {
  children: React.ReactNode;
  variant?: "gold" | "outline" | "dark" | "text";
  channel?: "whatsapp" | "phone";
  arrow?: boolean;
  brand?: BrandId;
}) {
  const [open, setOpen] = useState(false);
  const isPhone = channel === "phone";
  const whatsappUrl = getWhatsAppUrl(siteConfig.whatsappNumber, consultationMessage(brands[brand].name));
  const phone = siteConfig.phoneNumber.replace(/[\s()-]/g, "");
  const url = isPhone ? (/^\+?[1-9]\d{7,14}$/.test(phone) ? `tel:${phone}` : null) : whatsappUrl;
  const className = `${styles.action} ${styles[variant]}`;
  const Icon = isPhone ? Phone : WhatsAppIcon;
  const content = <><Icon size={19} aria-hidden="true" /><span>{children}</span>{arrow && <ArrowRight size={17} aria-hidden="true" />}</>;
  return <>{url ? <a className={className} href={url} target={isPhone ? undefined : "_blank"} rel={isPhone ? undefined : "noopener noreferrer"}>{content}</a> : <button type="button" className={className} onClick={() => setOpen(true)}>{content}</button>}<Modal open={open} onClose={() => setOpen(false)} title={isPhone ? "Atendimento por telefone" : `Atendimento ${brands[brand].name}`}><div className={styles.modalText}><Icon size={30} aria-hidden="true" /><p>{isPhone ? "O telefone de atendimento ainda não está disponível no ambiente DEMO." : "O WhatsApp oficial será configurado na próxima fase."}</p><p>Você pode explorar os modelos, configurar um veículo e preparar sua solicitação de proposta. Nenhuma mensagem é enviada automaticamente.</p><button type="button" className="button button-primary" onClick={() => setOpen(false)}>Continuar explorando</button></div></Modal></>;
}
