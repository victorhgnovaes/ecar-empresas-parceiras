import type { ProposalContact, Vehicle, VehicleSelection } from "@/types/domain";
import { calculateQuote } from "@/lib/finance";
import { formatMoney, formatPercent } from "@/lib/format";
import { hasPublicPrice, versionColors, versionOptions } from "@/lib/pricing";

export function consultationMessage(brand?: string) {
  return `Olá, Emerson! Tudo bem? Vim pelo site ECAR Frotas | Empresas Parceiras e gostaria de atendimento para escolher ${brand ? `um veículo ${brand}` : "um veículo Chevrolet ou Volkswagen"} para minha empresa. Pode me ajudar com as versões disponíveis, preços, condições comerciais, documentação necessária e previsão de entrega? Quero conhecer a melhor opção para o meu perfil. Obrigado!`;
}

export function configurationSummary(vehicle: Vehicle, selection: VehicleSelection) {
  const version = vehicle.versions.find((v) => v.id === selection.versionId);
  if (!version) throw new Error("Versão inválida.");
  const color = versionColors(vehicle, version).find((c) => c.id === selection.colorId);
  if (!color) throw new Error("Cor inválida.");
  const options = versionOptions(vehicle, version).filter((o) => selection.optionIds.includes(o.id));
  const quote = version.priceCents === null ? null : calculateQuote(vehicle, selection);
  return [
    "Olá, Emerson! Tudo bem? Vim pelo site ECAR Frotas | Empresas Parceiras e gostaria de consultar uma proposta para esta configuração:", "",
    `Montadora: ${vehicle.brand === "chevrolet" ? "Chevrolet" : "Volkswagen"}`,
    `Modelo: ${vehicle.name}`, `Versão: ${version.name}`, `Ano/modelo: ${version.modelYear ?? vehicle.modelYear}`,
    `Código: ${version.commercialCode ?? version.id}`,
    ...(selection.factoryCode ? [`Código de fábrica: ${selection.factoryCode}`] : []),
    ...(selection.billingState ? [`UF de faturamento: ${selection.billingState}`] : []),
    ...(version.transmission !== "Não informado" ? [`Câmbio: ${version.transmission}`] : []),
    `Pintura: ${color.name} (${color.paintType ?? "pintura"}) · adicional ${formatMoney(color.priceCents)}`,
    `Opcionais: ${options.map((o) => `${o.code ? `${o.code} — ` : ""}${o.name} (${formatMoney(o.priceCents)})`).join("; ") || "Nenhum selecionado"}`,
    `Quantidade: ${selection.quantity}`, "",
    ...(quote && hasPublicPrice(vehicle, version) ? [`Preço público da versão: ${formatMoney(quote.versionCents)}`, `Cor e pacotes: ${formatMoney(quote.colorCents + quote.optionsCents)}`, `Preço público configurado: ${formatMoney(quote.publicCents)}`] : []),
    ...(quote?.finalAvailable ? [`Desconto: ${formatPercent(quote.basisPoints!)} sobre ${((version.discount ?? vehicle.discount).appliesTo === "vehicle") ? "o preço da versão" : "o preço configurado"}`, `Economia por unidade: ${formatMoney(quote.discountCents)}`, `Valor final por unidade: ${formatMoney(quote.unitCents)}`, `Total para ${selection.quantity} veículo(s): ${formatMoney(quote.totalCents)}`, `Economia total: ${formatMoney(quote.totalSavingsCents)}`] : ["Condições comerciais: gostaria de confirmar com você."]), "",
    "Referência de valores: outubro/2026, sujeita à confirmação de condições, elegibilidade e disponibilidade.",
    "Pode confirmar o valor atualizado, a disponibilidade desta configuração, a documentação necessária e a previsão de entrega? Tenho interesse em seguir com seu atendimento. Obrigado!",
  ].join("\n");
}

export const emptyContact: ProposalContact = { name: "", company: "", cnpj: "", email: "", phone: "", notes: "", consent: false };
export type ContactErrors = Partial<Record<keyof ProposalContact, string>>;

export function isValidCnpj(value: string) {
  if (!/^[\d.\/\-\s]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) return false;
  const check = (part: string, weights: number[]) => {
    const sum = [...part].reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
    return sum % 11 < 2 ? 0 : 11 - sum % 11;
  };
  return check(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(digits[12])
    && check(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(digits[13]);
}

export function validateContact(contact: ProposalContact): ContactErrors {
  const errors: ContactErrors = {};
  if (contact.name.trim().length < 3 || contact.name.length > 100) errors.name = "Informe seu nome (3 a 100 caracteres).";
  if (contact.company.trim().length < 2 || contact.company.length > 150) errors.company = "Informe a razão social (2 a 150 caracteres).";
  if (contact.cnpj.trim() && !isValidCnpj(contact.cnpj)) errors.cnpj = "Informe um CNPJ numérico válido, com 14 dígitos, ou deixe em branco.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()) || contact.email.length > 254) errors.email = "Informe um e-mail válido.";
  if (!/^[1-9]{2}\d{8,9}$/.test(contact.phone.replace(/\D/g, ""))) errors.phone = "Informe telefone com DDD (10 ou 11 dígitos).";
  if (contact.notes.length > 1000) errors.notes = "Use até 1.000 caracteres.";
  if (!contact.consent) errors.consent = "Autorize a inclusão dos dados na mensagem.";
  return errors;
}

export function generateProposal(vehicle: Vehicle, selection: VehicleSelection, contact: ProposalContact) {
  if (Object.keys(validateContact(contact)).length) throw new Error("Revise os dados de contato.");
  if (vehicle.dataStatus === "documented") return [configurationSummary(vehicle, selection), "", "MEUS DADOS PARA ATENDIMENTO", `Nome: ${contact.name.trim()}`, `Empresa: ${contact.company.trim()}`, ...(contact.cnpj.trim() ? [`CNPJ: ${contact.cnpj.trim()}`] : []), `E-mail: ${contact.email.trim()}`, `Telefone: ${contact.phone.trim()}`, ...(contact.notes.trim() ? [`Observações: ${contact.notes.trim()}`] : [])].join("\n");
  const quote = calculateQuote(vehicle, selection);
  const version = vehicle.versions.find((item) => item.id === selection.versionId)!;
  const color = vehicle.colors.find((item) => item.id === selection.colorId)!;
  const options = vehicle.options.filter((item) => selection.optionIds.includes(item.id));
  return [
    "ECAR FROTAS | EMPRESAS PARCEIRAS", "SOLICITAÇÃO DE PROPOSTA — SIMULAÇÃO DEMONSTRATIVA", "",
    `Montadora: ${vehicle.brand === "chevrolet" ? "Chevrolet" : "Volkswagen"}`,
    `Modelo: ${vehicle.name} | Ano/modelo ilustrativo: ${vehicle.year}`,
    `Versão: ${version.name}`, `Câmbio: ${version.transmission}`, `Cor: ${color.name}`,
    `Opcionais: ${options.map((item) => `${item.name} (${formatMoney(item.priceCents)})`).join(", ") || "Nenhum"}`,
    `Quantidade: ${selection.quantity}`, "",
    `Versão: ${formatMoney(quote.versionCents)}`, `Cor: ${formatMoney(quote.colorCents)}`, `Opcionais: ${formatMoney(quote.optionsCents)}`,
    `Preço público DEMONSTRATIVO configurado: ${formatMoney(quote.publicCents)}`,
    `Desconto ilustrativo (${formatPercent(vehicle.discount.basisPoints)}, base: ${vehicle.discount.appliesTo === "vehicle" ? "somente versão" : "total configurado"}): ${formatMoney(quote.discountCents)}`,
    `Valor final DEMONSTRATIVO unitário: ${formatMoney(quote.unitCents)}`, `Total simulado: ${formatMoney(quote.totalCents)}`, `Economia total ilustrativa: ${formatMoney(quote.totalSavingsCents)}`, "",
    `Nome: ${contact.name.trim()}`, `Empresa: ${contact.company.trim()}`, `CNPJ: ${contact.cnpj.trim()}`, `E-mail: ${contact.email.trim()}`, `Telefone: ${contact.phone.trim()}`,
    ...(contact.notes.trim() ? [`Observações: ${contact.notes.trim()}`] : []), "",
    "Dados e condições demonstrativos, sem validade comercial. Não constitui oferta, reserva, aprovação de crédito ou proposta oficial. Sujeito à validação comercial futura.",
  ].join("\n");
}

export function getWhatsAppUrl(number: string, message: string) {
  // Exige formato internacional explícito. Nenhum contato padrão é utilizado.
  if (!/^55[1-9]{2}\d{8,9}$/.test(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
