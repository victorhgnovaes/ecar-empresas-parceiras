"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { EcarLogo, ContactButton } from "@/components/brand-header";
import { Modal } from "@/components/ui";
import type { BrandId } from "@/types/domain";
import { PartnerFooter } from "@/components/layout/partner-footer";

export function Footer({ brand }: { brand?: BrandId }) {
  const [privacy, setPrivacy] = useState(false);
  if (brand) return <PartnerFooter brand={brand} />;
  return <footer className="site-footer"><div className="container">
    <div className="footer-top"><Link href="/" aria-label="Portal ECAR"><EcarLogo light /></Link><p>O próximo passo da sua empresa<br /><strong>começa com uma boa escolha.</strong></p><Link href="/chevrolet" className="footer-explore">Conheça a plataforma<ArrowUpRight size={20} /></Link></div>
    <div className="footer-links"><span>ECAR FROTAS | EMPRESAS PARCEIRAS</span><nav aria-label="Navegação do rodapé"><Link href="/chevrolet">Chevrolet</Link><Link href="/volkswagen">Volkswagen</Link><button type="button" onClick={() => setPrivacy(true)}>Privacidade</button><ContactButton compact /></nav></div>
    <div className="footer-bottom"><p>© {new Date().getFullYear()} ECAR Frotas. Plataforma em desenvolvimento.</p><p>Fase 1 · Dados e imagens demonstrativos. Sem validade comercial.</p></div>
  </div><Modal open={privacy} onClose={() => setPrivacy(false)} title="Privacidade nesta fase"><div className="prose"><p>Os dados preenchidos no formulário são utilizados apenas no navegador para gerar o texto da solicitação. Não são enviados a servidores, banco de dados ou ferramentas de análise.</p><p>A plataforma não salva dados de contato no LocalStorage. Ao copiar a mensagem, os dados ficam na área de transferência do dispositivo. Fechar a janela de proposta limpa o formulário.</p><p>Quando o WhatsApp oficial estiver configurado, a mensagem somente será aberta no serviço externo após sua ação. O envio dependerá de você.</p><p>A política definitiva de privacidade será preparada antes da publicação comercial.</p></div></Modal></footer>;
}
