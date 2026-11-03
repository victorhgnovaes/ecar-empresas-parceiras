import Link from "next/link";
import { ArrowRight, Check, ClipboardList, CarFront, SlidersHorizontal, ChevronDown, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { VehicleImage } from "@/components/vehicle-image";
import { VehicleCard } from "@/components/vehicle-card";
import { ContactButton } from "@/components/brand-header";
import { brands } from "@/config/brands";
import { visualAssets } from "@/config/visual-assets";
import type { BrandId, Vehicle } from "@/types/domain";
import { PartnerCta } from "@/components/layout/partner-cta";

const faqs = [
  { question: "Quem pode consultar os veículos?", answer: "Qualquer pessoa pode explorar o catálogo e testar uma configuração, sem cadastro. O Emerson ECAR confirma as condições e a elegibilidade para sua empresa." },
  { question: "Os preços e descontos são oficiais?", answer: "As referências vêm das fontes comerciais de outubro/2026. Consulte o Emerson ECAR para confirmar valores atualizados, condições e disponibilidade da configuração escolhida." },
  { question: "Como configurar meu veículo?", answer: "Abra um modelo e escolha versão, cor e opcionais. Os valores são atualizados a cada escolha. Imagens ilustrativas; o Emerson confirma os detalhes da configuração." },
  { question: "Como solicitar uma proposta?", answer: "Configure seu veículo e clique em Solicitar proposta ou Consultar Emerson ECAR. Seu WhatsApp abre com o resumo completo, pronto para conversar com o Emerson." },
  { question: "Como funciona o atendimento?", answer: "Fale diretamente com o Emerson ECAR pelo WhatsApp (11) 98926-6321. Ele ajuda você a escolher e confirma condições, disponibilidade e prazo." },
];

export function BrandHome({ brand, vehicles }: { brand: BrandId; vehicles: Vehicle[] }) {
  const config = brands[brand];
  const assets = visualAssets[brand];
  const hero = vehicles.find((vehicle) => vehicle.slug === config.heroVehicle)!;
  const featuredOrder = brand === "chevrolet" ? ["onix", "tracker", "s10", "montana"] : ["polo", "t-cross", "nivus", "taos"];
  const featured = featuredOrder.map((slug) => vehicles.find((vehicle) => vehicle.slug === slug)!);
  return <main id="conteudo" className="brand-home">
    <section className="brand-hero"><div className="container hero-grid"><div className="hero-copy"><div className="eyebrow">PARCERIA CORPORATIVA<span className="accent-line" /></div><h1>Seu próximo<br /><em>{config.name}</em> está aqui</h1><p>Condições comerciais exclusivas para empresas.<br className="desktop-only" /> Modelos, versões e configurações em um só lugar.</p><div className="hero-actions"><ButtonLink href={`/${brand}/modelos`}>Ver todos os veículos</ButtonLink></div><span className="hero-trust"><ShieldCheck size={14} />Atendimento Emerson ECAR · condições sob consulta</span></div><div className="hero-visual"><VehicleImage vehicle={{ ...hero, image: assets.vehicle, imageAlt: assets.vehicleAlt }} priority sizes="(max-width: 760px) 100vw, 62vw" /><div className="hero-vehicle-caption"><span>{config.name} {hero.name}</span><span>Imagem ilustrativa</span></div></div></div></section>
    <div className="brand-content"><section className="section container featured-section"><div className="section-heading"><h2>Modelos <em>em destaque</em></h2><Link className="text-link" href={`/${brand}/modelos`}>Ver catálogo completo<ArrowRight size={19} /></Link></div><div className="vehicle-grid featured-grid">{featured.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} compact />)}</div><p className="section-disclaimer">Imagens ilustrativas. Valores e disponibilidade: consulte o Emerson ECAR.</p></section>
    <section className="steps-section" id="como-funciona"><div className="container"><div className="section-heading"><div><h2>Seu {config.name} em <em>três passos</em></h2><p>Veja como é simples preparar sua proposta.</p></div></div><div className="steps-grid">{[
      { icon: CarFront, title: `Escolha seu ${config.name}`, text: "Navegue pelos modelos, versões e opcionais e encontre o ideal para sua empresa." },
      { icon: SlidersHorizontal, title: "Compare e configure", text: "Compare versões, pinturas e pacotes e consulte as condições da sua configuração." },
      { icon: ClipboardList, title: "Solicite sua proposta", text: "Preencha seus dados e prepare sua mensagem com o resumo completo." },
    ].map((step, index) => <article className="step-card" key={step.title}><span className="step-number">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><step.icon className="step-icon" size={30} strokeWidth={1.4} /></article>)}</div></div></section></div>
    <section className="conditions-section container" id="condicoes"><div className="conditions-panel"><div><span className="eyebrow">CONDIÇÕES PARA SUA EMPRESA</span><h2>Transparência em<br />cada escolha.</h2></div><div><p>Conheça todas as possibilidades antes do próximo passo.</p><ul><li><Check size={16} />Consulte o Emerson ECAR sobre preços e condições atualizados.</li><li><Check size={16} />Resumo detalhado da configuração que você escolheu.</li><li><Check size={16} />Sem cadastro obrigatório e sem envio automático de dados.</li></ul><p className="small muted">Emerson ECAR · (11) 98926-6321. Atendimento para encontrar a melhor opção para sua empresa.</p></div></div></section>
    <section className="faq-section container" id="duvidas"><div><span className="eyebrow">PODEMOS AJUDAR?</span><h2>Dúvidas frequentes.</h2><p>Todos os detalhes para escolher com confiança.</p><ContactButton /></div><div className="faq-list">{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}<ChevronDown size={18} aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div></section>
    <PartnerCta brand={brand} />
  </main>;
}
