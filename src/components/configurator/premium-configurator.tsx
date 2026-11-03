"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ClipboardList, Copy, ListChecks, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { brands } from "@/config/brands";
import { siteConfig } from "@/config/site";
import { calculateQuote, initialSelection, optionConflict, selectionForVersion, versionColors, versionOptions } from "@/lib/pricing";
import { configurationSummary, getWhatsAppUrl } from "@/lib/proposal";
import { formatMoney, formatPercent } from "@/lib/format";
import { VehicleImage } from "@/components/vehicle-image";
import { Modal } from "@/components/ui";
import { ProposalForm } from "./proposal-form";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import type { Vehicle, VehicleSelection } from "@/types/domain";

export function PremiumConfigurator({ vehicle }: { vehicle: Vehicle }) {
  const [selection, setSelection] = useState(() => initialSelection(vehicle));
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [versionSearch, setVersionSearch] = useState("");
  const [equipmentTab, setEquipmentTab] = useState<"equipment" | "technical">("equipment");
  const [copyStatus, setCopyStatus] = useState("");
  const version = vehicle.versions.find((v) => v.id === selection.versionId)!;
  const colors = versionColors(vehicle, version);
  const availableOptions = versionOptions(vehicle, version);
  const color = colors.find((c) => c.id === selection.colorId)!;
  const options = availableOptions.filter((o) => selection.optionIds.includes(o.id));
  const rule = version.discount ?? vehicle.discount;
  const quote = version.priceCents === null ? null : calculateQuote(vehicle, selection);
  const years = [...new Set(vehicle.versions.map((v) => v.modelYear))].sort((a, b) => (b ?? 0) - (a ?? 0));
  const versions = vehicle.versions.filter((v) => v.modelYear === version.modelYear && `${v.name} ${v.commercialCode}`.toLocaleLowerCase("pt-BR").includes(versionSearch.toLocaleLowerCase("pt-BR")));
  const equipment = version.features.filter((f) => f.toLocaleLowerCase("pt-BR").includes(equipmentSearch.toLocaleLowerCase("pt-BR")));
  const image = color.image ?? version.image ?? vehicle.image;
  const temporaryImage = color.imageStatus === "TEMPORARY_ILLUSTRATION";
  const whatsapp = getWhatsAppUrl(siteConfig.whatsappNumber, configurationSummary(vehicle, selection))!;
  const technical = Object.entries(version.technicalSpecs ?? {});
  function selectVersion(id: string) { setSelection(selectionForVersion(vehicle, id, selection.quantity)); setVersionSearch(""); setCopyStatus(""); }
  function selectColor(id: string) {
    const nextColor = colors.find((c) => c.id === id)!;
    let next: VehicleSelection = { ...selection, colorId: id, optionIds: [...new Set([...availableOptions.filter((o) => o.required && !o.blocked).map((o) => o.id), ...(nextColor.requiredOptionIds ?? [])])] };
    // Retain only packages whose dependencies remain valid for the new paint.
    for (const o of availableOptions.filter((o) => selection.optionIds.includes(o.id))) if (!optionConflict(vehicle, next, o.id)) next = { ...next, optionIds: [...new Set([...next.optionIds, o.id])] };
    setSelection(next); setCopyStatus("");
  }
  function toggleOption(id: string) {
    const selected = selection.optionIds.includes(id);
    let ids = selected ? selection.optionIds.filter((x) => x !== id) : [...selection.optionIds, id];
    if (selected) {
      let previous: number;
      do { previous = ids.length; ids = ids.filter((x) => availableOptions.find((o) => o.id === x)?.requiresOptionIds?.every((dep) => ids.includes(dep)) ?? true); } while (previous !== ids.length);
    }
    setSelection({ ...selection, optionIds: ids }); setCopyStatus("");
  }
  async function copy() {
    try { await navigator.clipboard.writeText(configurationSummary(vehicle, selection)); setCopyStatus("Resumo copiado. Envie ao Emerson ECAR quando desejar."); }
    catch { setProposalOpen(true); setCopyStatus("Abra o resumo para copiar manualmente."); }
  }
  return <main id="conteudo" className="configurator premium-configurator container">
    <nav className="breadcrumb" aria-label="Caminho da página"><Link href="/">Início</Link><ArrowRight size={12} /><Link href={`/${vehicle.brand}`}>{brands[vehicle.brand].name}</Link><ArrowRight size={12} /><Link href={`/${vehicle.brand}/modelos`}>Modelos</Link><ArrowRight size={12} /><span aria-current="page">{vehicle.name}</span></nav>
    <div className="premium-heading"><div><span className="eyebrow">SEU PRÓXIMO CAMINHO</span><h1>Seu <em>{vehicle.name}.</em><br /><span>Em cada detalhe.</span></h1></div><Link href={`/${vehicle.brand}/modelos`} className="text-link"><ArrowLeft size={16} />Voltar aos modelos</Link></div>
    <div className="premium-layout">
      <div className="premium-showcase">
        <section className="vehicle-preview premium-preview" aria-label="Prévia do veículo">
          <div className="preview-toolbar"><button type="button" className="equipment-button" onClick={() => { setEquipmentSearch(""); setEquipmentTab("equipment"); setEquipmentOpen(true); }}><ListChecks size={15} />Itens de série</button><span className="model-year-badge">MY{String(version.modelYear).slice(2)}</span></div>
          <div className="premium-image-stage"><VehicleImage vehicle={{ ...vehicle, image, imageAlt: temporaryImage ? `Ilustração temporária de referência ${brands[vehicle.brand].name} ${vehicle.name}; versão, rodas e pintura não verificadas. Consulte o Emerson ECAR.` : `${brands[vehicle.brand].name} ${vehicle.name} — imagem de referência da família; confira versão e cor com o Emerson ECAR.` }} temporary={temporaryImage} priority sizes="(max-width: 900px) 95vw, 60vw" /></div>
          <div className="preview-caption"><span>{temporaryImage ? "Imagem ilustrativa temporária" : color.imageStatus === "MISSING_PAINT_REFERENCE_ONLY" ? "Foto desta cor: consulte o Emerson" : "Imagem ilustrativa"}</span></div>
        </section>
        {colors.some((c) => c.image) && <div className="premium-gallery" aria-label="Galeria de pinturas disponíveis">{colors.filter((c) => c.image && !c.blocked).map((c) => <button type="button" key={c.id} aria-pressed={c.id === color.id} aria-label={`Ver pintura ${c.name}`} title={c.imageStatus === "TEMPORARY_ILLUSTRATION" ? "Imagem ilustrativa temporária; versão e pintura não verificadas" : undefined} onClick={() => selectColor(c.id)}><VehicleImage vehicle={{ ...vehicle, image: c.image!, imageAlt: `${c.imageStatus === "TEMPORARY_ILLUSTRATION" ? "Ilustração temporária, versão e pintura não verificadas" : "Imagem de referência"} · ${c.name}` }} temporary={c.imageStatus === "TEMPORARY_ILLUSTRATION"} sizes="120px" /><span>{c.name}</span></button>)}</div>}
        <div className="preview-finish"><ShieldCheck size={17} /><p>Atendimento com o <strong>Emerson ECAR</strong>. Sua configuração, nossa atenção em cada escolha.</p></div>
        <div className="configuration-story"><span className="eyebrow">FEITO PARA A SUA EMPRESA</span><h2>Uma escolha que<br />acompanha seu negócio.</h2><p>Compare as versões, conheça os equipamentos e personalize os detalhes. O Emerson cuida da sua consulta e confirma as melhores condições disponíveis para você.</p><button type="button" className="text-link" onClick={() => { setEquipmentTab("technical"); setEquipmentOpen(true); }}>Ver ficha técnica<ArrowRight size={15} /></button></div>
      </div>
      <section className="premium-selections" aria-label="Configure seu veículo"><div className="selection-panel-title"><SlidersHorizontal size={19} /><div><h2>Do seu jeito.</h2><p>Configure seu {vehicle.name}</p></div></div>
        <fieldset className="premium-fieldset"><legend><span>01</span>Ano e versão</legend><div className="model-year-switch" role="group" aria-label="Ano/modelo">{years.map((year) => <button type="button" key={year} aria-pressed={version.modelYear === year} onClick={() => selectVersion(vehicle.versions.find((v) => v.modelYear === year)!.id)}>MY{String(year).slice(2)}</button>)}</div>
          {vehicle.versions.length > 6 && <div className="version-search"><Search size={15} /><label className="sr-only" htmlFor="version-search">Buscar versão ou código</label><input id="version-search" value={versionSearch} onChange={(e) => setVersionSearch(e.target.value)} placeholder="Buscar versão ou código" /></div>}
          <div className="premium-version-list">{versions.map((v) => <label className={`premium-version ${selection.versionId === v.id ? "selected" : ""}`} key={v.id}><input type="radio" name="version" value={v.id} checked={selection.versionId === v.id} onChange={() => selectVersion(v.id)} /><div><strong>{v.name}</strong><small>{v.commercialCode} · MY{String(v.modelYear).slice(2)}</small><span>{v.transmission === "Não informado" ? "Consulte os detalhes" : v.transmission}</span></div><b>{v.priceCents !== null && v.priceStatus === "VALIDADO" ? formatMoney(v.priceCents) : "Consultar"}</b></label>)}</div>{!versions.length && <p className="muted">Nenhuma versão encontrada para esta busca.</p>}
          {rule.requiresConfiguration && <label className="factory-select">Código de fábrica<select value={selection.factoryCode ?? ""} onChange={(e) => setSelection({ ...selection, factoryCode: e.target.value })}><option value="">Selecione o código</option>{version.configurations?.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>}
          {rule.requiresBillingState && <label className="factory-select">UF de faturamento<select value={selection.billingState ?? ""} onChange={(e) => setSelection({ ...selection, billingState: e.target.value })}><option value="">Selecione a UF</option>{["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf) => <option key={uf}>{uf}</option>)}</select></label>}
        </fieldset>
        <fieldset className="premium-fieldset"><legend><span>02</span>A cor da sua escolha</legend><p className="selected-paint"><strong>{color.name}</strong><span>{color.paintType ?? "Pintura"} · {color.priceCents ? `+ ${formatMoney(color.priceCents)}` : "Sem adicional"}</span></p><div className="premium-color-list">{colors.map((c) => <label key={c.id} className={`premium-color ${c.id === selection.colorId ? "selected" : ""} ${c.blocked ? "unavailable" : ""}`} title={`${c.name} · ${c.blocked ? "Consulte o Emerson ECAR" : formatMoney(c.priceCents)}`}><input type="radio" name="color" value={c.id} disabled={c.blocked} checked={selection.colorId === c.id} onChange={() => selectColor(c.id)} aria-label={`${c.name} · ${c.priceCents ? formatMoney(c.priceCents) : "Sem adicional"}`} /><span style={{ background: c.hex }} aria-hidden="true">{c.id === selection.colorId && <Check size={17} color="#fff" />}</span><small>{c.name}</small></label>)}</div></fieldset>
        <fieldset className="premium-fieldset"><legend><span>03</span>Pacotes e opcionais</legend><p className="selection-hint">Os detalhes que fazem a diferença.</p>{availableOptions.length ? <div className="premium-options">{availableOptions.map((o) => { const conflict = optionConflict(vehicle, selection, o.id); const selected = selection.optionIds.includes(o.id); const required = o.required || color.requiredOptionIds?.includes(o.id); return <div key={o.id} className={`premium-option ${selected ? "selected" : ""}`}><label><input type="checkbox" name="options" value={o.id} checked={selected} disabled={!!required || (!selected && !!conflict)} onChange={() => toggleOption(o.id)} /><span><strong>{o.name.split(/\n/)[0]}</strong><small>{o.code}{required ? " · Obrigatório" : " · Opcional"}</small></span><b>{o.priceCents ? `+ ${formatMoney(o.priceCents)}` : "Sem adicional"}</b></label><details><summary>Ver detalhes</summary><p>{o.description}</p>{o.requiresText && o.requiresText !== "-" && <p>Exige: {o.requiresText}</p>}{o.excludesText && o.excludesText !== "-" && <p>Não combina com: {o.excludesText}</p>}</details>{conflict && !selected && <p className="option-restriction">{o.blocked ? "Consulte o Emerson ECAR" : conflict}</p>}</div>; })}</div> : <p className="no-options">Nenhum opcional adicional listado para esta versão.</p>}</fieldset>
      </section>
      <section className="premium-commercial" aria-label="Resumo comercial"><div className="commercial-heading"><span className="eyebrow"><ClipboardList size={16} />SUA PRÓXIMA CONQUISTA</span><h2>{brands[vehicle.brand].name} {vehicle.name}</h2><p>{version.name} · MY{String(version.modelYear).slice(2)} · {version.commercialCode}</p></div>
        <div className="commercial-grid"><div className="commercial-details"><dl><div><dt>Pintura</dt><dd>{color.name}</dd></div><div><dt>Pacotes</dt><dd>{options.length ? options.map((o) => o.name.split(/\n/)[0]).join(", ") : "Nenhum selecionado"}</dd></div><div><dt>Preço público da versão</dt><dd>{quote && version.priceStatus === "VALIDADO" ? formatMoney(quote.versionCents) : "Consulte o Emerson ECAR"}</dd></div><div><dt>Adicionais de cor e pacotes</dt><dd>{quote ? formatMoney(quote.colorCents + quote.optionsCents) : "A consultar"}</dd></div><div className="configured-price"><dt>Preço público configurado</dt><dd data-testid="public-price">{quote && version.priceStatus === "VALIDADO" ? formatMoney(quote.publicCents) : "Consulte o Emerson ECAR"}</dd></div><div><dt>Desconto aplicado{quote?.finalAvailable ? ` (${formatPercent(quote.basisPoints!)})` : ""}</dt><dd data-testid="discount-price">{quote?.finalAvailable ? `− ${formatMoney(quote.discountCents)}` : "Sob consulta"}</dd></div></dl>{quote?.finalAvailable && <p className="commercial-saving"><Check size={15} />Você economiza {formatMoney(quote.discountCents)} por veículo</p>}</div>
          <div className="commercial-action"><div className="commercial-final" aria-live="polite" aria-atomic="true"><span>{quote?.finalAvailable ? "Valor final por unidade" : "Sua condição personalizada"}</span><strong data-testid="final-price">{quote?.finalAvailable ? formatMoney(quote.unitCents) : "Consulte o Emerson ECAR"}</strong><small>Condições e disponibilidade sujeitas à confirmação.</small></div><div className="premium-quantity"><label htmlFor="quantity">Quantidade de veículos</label><input id="quantity" type="number" min={1} max={999} value={selection.quantity} onChange={(e) => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 1 && n <= 999) setSelection({ ...selection, quantity: n }); }} /></div>{selection.quantity > 1 && quote?.finalAvailable && <p className="premium-fleet-total">Total da frota: <strong>{formatMoney(quote.totalCents)}</strong><br />Economia: {formatMoney(quote.totalSavingsCents)}</p>}<a href={whatsapp} target="_blank" rel="noopener noreferrer" className="button button-primary premium-main-cta"><WhatsAppIcon size={19} />{quote?.finalAvailable ? "Solicitar proposta" : "Consultar Emerson ECAR"}<ArrowRight size={17} /></a><div className="commercial-secondary"><button type="button" className="text-link" onClick={copy}><Copy size={14} />Copiar resumo</button><button type="button" className="text-link" onClick={() => setProposalOpen(true)}>Incluir meus dados<ArrowRight size={14} /></button></div><p className="consultant-signature">Emerson ECAR · {siteConfig.consultantPhone}</p><p role="status" className="copy-status">{copyStatus}</p></div>
        </div><div className="commercial-bottom"><Link href={`/${vehicle.brand}/modelos`} className="text-link"><ArrowLeft size={15} />Voltar aos modelos</Link><span>Referência comercial: outubro/2026. Consulte as condições atuais.</span></div>
      </section>
    </div>
    <Modal open={equipmentOpen} onClose={() => setEquipmentOpen(false)} title={`Equipamentos de série — ${brands[vehicle.brand].name} ${vehicle.name} ${version.name} MY${String(version.modelYear).slice(2)}`} wide><div className="equipment-modal"><div className="equipment-tabs" role="group" aria-label="Conteúdo do veículo"><button type="button" aria-pressed={equipmentTab === "equipment"} onClick={() => setEquipmentTab("equipment")}>Itens de série ({version.features.length})</button><button type="button" aria-pressed={equipmentTab === "technical"} onClick={() => setEquipmentTab("technical")}>Ficha técnica</button></div>{equipmentTab === "equipment" ? <><div className="equipment-search"><Search size={17} /><label className="sr-only" htmlFor="equipment-search">Buscar equipamento</label><input id="equipment-search" type="search" placeholder="Buscar equipamento..." value={equipmentSearch} onChange={(e) => setEquipmentSearch(e.target.value)} /></div><p className="equipment-count" role="status">{equipment.length} de {version.features.length} itens de série · versão selecionada</p>{equipment.length ? <ul className="equipment-list">{equipment.map((f, i) => <li key={`${version.id}-${i}`}><Check size={15} /><span>{f}</span><small>De série</small></li>)}</ul> : <p>{version.features.length ? "Nenhum equipamento encontrado." : "Equipamentos de série ainda não verificados para esta versão. Consulte o Emerson ECAR."}</p>}</> : technical.length ? <dl className="technical-list">{technical.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl> : <p>Consulte o Emerson ECAR para conhecer a ficha técnica desta versão.</p>}<p className="equipment-footnote">Pacotes opcionais são apresentados separadamente no configurador. Confirme os detalhes com o Emerson ECAR.</p></div></Modal>
    <Modal open={proposalOpen} onClose={() => setProposalOpen(false)} title={`Sua proposta · ${vehicle.name}`} wide>{proposalOpen && <ProposalForm vehicle={vehicle} selection={selection} />}</Modal>
  </main>;
}
