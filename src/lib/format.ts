const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
export function formatMoney(cents: number) { return currency.format(cents / 100); }
export function formatPercent(basisPoints: number) { return `${(basisPoints / 100).toLocaleString("pt-BR")}%`; }
