import { siteConfig } from "@/config/site";
import { getWhatsAppUrl } from "@/lib/proposal";

export function ContentReviewNotice() {
  const url = getWhatsAppUrl(siteConfig.whatsappNumber, "Olá, Emerson! Vim pelo site ECAR e gostaria de confirmar os preços atualizados e a disponibilidade dos veículos para minha empresa.");
  return <aside className="content-review-notice" aria-label="Aviso sobre o conteúdo"><p><strong>Conteúdo em revisão.</strong> Confirme preços, condições e disponibilidade com o {siteConfig.consultantName}.</p><a href={url!} target="_blank" rel="noopener noreferrer">Falar com o Emerson <span className="sr-only">pelo WhatsApp, em nova aba</span></a></aside>;
}
