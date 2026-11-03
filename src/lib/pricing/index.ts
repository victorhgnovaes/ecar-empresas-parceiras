import type { QuoteCalculation, Vehicle, VehicleSelection, VehicleVersion } from "@/types/domain";

function assertCents(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Valor monetário inválido.");
}

export function versionColors(vehicle: Vehicle, version: VehicleVersion) { return version.colors ?? vehicle.colors; }
export function versionOptions(vehicle: Vehicle, version: VehicleVersion) { return version.options ?? vehicle.options.filter((o) => o.versionIds.includes(version.id)); }
export function selectionForVersion(vehicle: Vehicle, versionId: string, quantity = 1): VehicleSelection {
  const version = vehicle.versions.find((v) => v.id === versionId);
  if (!version) throw new Error("Versão inválida.");
  const color = versionColors(vehicle, version).find((c) => !c.blocked);
  if (!color) throw new Error("Pinturas ainda não verificadas para esta versão.");
  const options = versionOptions(vehicle, version);
  return { versionId, colorId: color.id, optionIds: [...new Set([...options.filter((o) => o.required && !o.blocked).map((o) => o.id), ...(color.requiredOptionIds ?? [])])], quantity, factoryCode: version.configurations?.length === 1 ? version.configurations[0] : undefined };
}
export function optionConflict(vehicle: Vehicle, selection: VehicleSelection, optionId: string): string | null {
  const version = vehicle.versions.find((v) => v.id === selection.versionId)!;
  const options = versionOptions(vehicle, version);
  const option = options.find((o) => o.id === optionId);
  if (!option || option.blocked) return "Compatibilidade ou preço em validação";
  if (option.allowedColorIds?.length && !option.allowedColorIds.includes(selection.colorId)) return "Exige outra pintura";
  if (option.excludedColorIds?.includes(selection.colorId)) return "Incompatível com esta pintura";
  if (option.requiresOptionIds?.some((id) => !selection.optionIds.includes(id))) return "Selecione primeiro os pacotes obrigatórios";
  if (selection.optionIds.some((id) => id !== optionId && (option.excludesOptionIds?.includes(id) || options.find((o) => o.id === id)?.excludesOptionIds?.includes(optionId)))) return "Incompatível com um pacote selecionado";
  return null;
}

/** Cálculo puro: centavos inteiros, pontos-base e bloqueios por versão. */
export function calculateQuote(vehicle: Vehicle, selection: VehicleSelection): QuoteCalculation {
  const version = vehicle.versions.find((item) => item.id === selection.versionId);
  if (!version) throw new Error("Versão ou cor inválida.");
  const color = versionColors(vehicle, version).find((item) => item.id === selection.colorId);
  if (!color || color.blocked) throw new Error("Versão ou cor inválida.");
  if (version.priceCents === null) throw new Error("Preço público não informado; consulte condições.");
  if (!Number.isInteger(selection.quantity) || selection.quantity < 1 || selection.quantity > 999) throw new Error("Informe de 1 a 999 veículos.");
  const groups = new Set<string>();
  const availableOptions = versionOptions(vehicle, version);
  if (availableOptions.some((o) => o.required && !selection.optionIds.includes(o.id)) || color.requiredOptionIds?.some((id) => !selection.optionIds.includes(id))) throw new Error("Opcional obrigatório não selecionado.");
  const options = [...new Set(selection.optionIds)].map((id) => {
    const option = availableOptions.find((item) => item.id === id);
    if (!option || !option.versionIds.includes(version.id)) throw new Error("Opcional incompatível com a versão.");
    const conflict = optionConflict(vehicle, selection, id);
    if (conflict) throw new Error(`Opcional incompatível: ${conflict}.`);
    if (option.exclusiveGroup) {
      if (groups.has(option.exclusiveGroup)) throw new Error("Opcionais mutuamente exclusivos.");
      groups.add(option.exclusiveGroup);
    }
    return option;
  });
  [version.priceCents, color.priceCents, ...options.map((item) => item.priceCents)].forEach(assertCents);
  const rule = version.discount ?? vehicle.discount;
  const pendingReasons: string[] = [];
  if (rule.status && rule.status !== "VALIDADO") pendingReasons.push("Condição comercial em validação");
  if (version.priceStatus && version.priceStatus !== "VALIDADO") pendingReasons.push("Preço público em conciliação");
  if (["PENDENTE_VALIDACAO", "HISTORICO", "DESCONTINUADO"].includes(version.status ?? "")) pendingReasons.push("Configuração sujeita à revisão comercial");
  if (rule.validUntil && new Date().toISOString().slice(0, 10) > rule.validUntil) pendingReasons.push("Vigência encerrada; consulte condições atualizadas");
  if (rule.requiresBillingState && !/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(selection.billingState ?? "")) pendingReasons.push("Informe a UF de faturamento");
  if (selection.factoryCode && version.configurations?.length && !version.configurations.includes(selection.factoryCode)) throw new Error("Código de fábrica inválido.");
  let basisPoints: number | null = rule.basisPoints;
  if (rule.requiresConfiguration) {
    basisPoints = rule.configurationRates?.[selection.factoryCode ?? ""] ?? null;
    if (basisPoints === null) pendingReasons.push("Selecione um código de fábrica com condição documentada");
  } else if (selection.billingState && rule.stateRates?.[selection.billingState] !== undefined) basisPoints = rule.stateRates[selection.billingState];
  if (basisPoints !== null && (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10000)) throw new Error("Percentual de desconto inválido.");
  if (!["vehicle", "configured-total"].includes(rule.appliesTo)) throw new Error("Base de desconto inválida.");
  const optionsCents = options.reduce((total, item) => total + item.priceCents, 0);
  const publicCents = version.priceCents + color.priceCents + optionsCents;
  assertCents(publicCents);
  const eligibleCents = rule.appliesTo === "vehicle" ? version.priceCents : publicCents;
  const finalAvailable = pendingReasons.length === 0 && basisPoints !== null;
  const rate = BigInt(finalAvailable ? basisPoints! : 0);
  // Aurora arredonda o preço final HALF_UP; VW arredonda o abatimento HALF_UP.
  const discountCents = rule.source === "aurora"
    ? eligibleCents - Number((BigInt(eligibleCents) * (10000n - rate) + 5000n) / 10000n)
    : Number((BigInt(eligibleCents) * rate + 5000n) / 10000n);
  const unitCents = publicCents - discountCents;
  const totalCents = unitCents * selection.quantity;
  const totalSavingsCents = discountCents * selection.quantity;
  [optionsCents, unitCents, totalCents, totalSavingsCents].forEach(assertCents);
  return { versionCents: version.priceCents, colorCents: color.priceCents, optionsCents, publicCents, discountCents, unitCents, totalCents, totalSavingsCents, quantity: selection.quantity, finalAvailable, basisPoints: finalAvailable ? basisPoints : null, pendingReasons };
}
export function initialSelection(vehicle: Vehicle): VehicleSelection {
  const photographed = vehicle.versions.find((version) => version.colors?.some((color) => !color.blocked && color.imageStatus?.startsWith("MATCHED")));
  return selectionForVersion(vehicle, photographed?.id ?? vehicle.versions[0].id);
}

/** Contrato reservado à Fase 2. Não há tabela nem taxa oficial nesta fase. */
export interface FutureVolkswagenRuleInput {
  modelYear: "MY26" | "MY27";
  faixa2BasisPoints: number;
  additionalBasisPoints: number;
  source: "approved-commercial-data";
}
