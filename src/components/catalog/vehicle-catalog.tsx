"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, X, SlidersHorizontal } from "lucide-react";
import { brands } from "@/config/brands";
import { VehicleCard } from "@/components/vehicle-card";
import { defaultFilters, filterVehicles, type CatalogFilters } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";
import type { BrandId, Category, Vehicle } from "@/types/domain";
import { useCatalogCategory } from "@/hooks/use-catalog-category";

const categories: (Category | "all")[] = ["all", "Hatch", "Sedã", "SUV", "Picape", "7 lugares", "Comercial"];

export function VehicleCatalog({ brand, vehicles }: { brand: BrandId; vehicles: Vehicle[] }) {
  const initialCategory = useCatalogCategory();
  const [filterOverrides, setFilters] = useState<Partial<CatalogFilters>>({});
  const filters: CatalogFilters = { ...defaultFilters, category: initialCategory, ...filterOverrides };
  const results = filterVehicles(vehicles, filters);
  const update = (values: Partial<CatalogFilters>) => setFilters((current) => ({ ...current, ...values }));
  return <main id="conteudo" className="catalog-page"><section className="catalog-heading"><div className="container"><nav className="breadcrumb" aria-label="Caminho da página"><Link href="/">Início</Link><ArrowRight size={12} /><Link href={`/${brand}`}>{brands[brand].name}</Link><ArrowRight size={12} /><span aria-current="page">Modelos</span></nav><h1>Encontre o <em>{brands[brand].name}</em> ideal para você</h1><p>Compare os modelos disponíveis e escolha o que mais combina<br className="desktop-only" /> com a sua rotina empresarial.</p></div></section>
    <section className="container catalog-section" aria-label="Catálogo de veículos"><div className="catalog-controls">
      <div className="search-control"><Search size={20} aria-hidden="true" /><label className="sr-only" htmlFor="vehicle-search">Buscar modelo ou versão</label><input id="vehicle-search" type="search" placeholder="Buscar modelo ou versão..." value={filters.search} onChange={(event) => update({ search: event.target.value })} />{filters.search && <button type="button" className="icon-button" onClick={() => update({ search: "" })} aria-label="Limpar busca"><X size={17} /></button>}</div>
      <div className="category-filters" role="group" aria-label="Categoria">{categories.map((category) => <button type="button" key={category} aria-pressed={filters.category === category} className={filters.category === category ? "selected" : ""} onClick={() => update({ category })}>{category === "all" ? "Todos" : category}</button>)}</div>
      <div className="sort-control"><label htmlFor="vehicle-sort">Ordenar</label><select id="vehicle-sort" value={filters.sort} onChange={(event) => update({ sort: event.target.value as CatalogFilters["sort"] })}><option value="featured">Destaques</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="name">Ordem alfabética</option></select></div>
    </div>
    <div className="catalog-source-filters"><label>Família<select aria-label="Família" value={filters.family ?? "all"} onChange={(e) => update({ family: e.target.value })}><option value="all">Todas as famílias</option>{vehicles.map((v) => <option key={v.id} value={v.slug}>{v.name}</option>)}</select></label><label>Ano/modelo<select aria-label="Ano/modelo" value={filters.modelYear ?? "all"} onChange={(e) => update({ modelYear: e.target.value })}><option value="all">Todos os anos</option>{[...new Set(vehicles.flatMap((v) => v.versions.map((x) => x.modelYear)))].sort().map((year) => <option key={year} value={year}>MY{String(year).slice(2)}</option>)}</select></label><label>Combustível<select aria-label="Combustível" value={filters.fuel ?? "all"} onChange={(e) => update({ fuel: e.target.value })}><option value="all">Todos</option>{[...new Set(vehicles.flatMap((v) => v.versions.map((x) => x.fuel)))].filter(Boolean).sort().map((fuel) => <option key={fuel} value={fuel}>{fuel}</option>)}</select></label></div>
    <details className="additional-filters"><summary><SlidersHorizontal size={15} />Mais filtros: ano, família, combustível, câmbio e valor</summary><div className="additional-filter-fields"><label htmlFor="filter-transmission">Câmbio<select id="filter-transmission" value={filters.transmission} onChange={(event) => update({ transmission: event.target.value as CatalogFilters["transmission"] })}><option value="all">Todos os câmbios</option><option value="Manual">Manual</option><option value="Automático">Automático</option></select></label><div><label htmlFor="filter-price">Valor de referência até <output htmlFor="filter-price">{formatMoney(filters.maxPriceCents)}</output></label><input id="filter-price" type="range" min={8000000} max={60000000} step={500000} value={filters.maxPriceCents} onChange={(event) => update({ maxPriceCents: Number(event.target.value) })} /></div><button type="button" className="text-link" onClick={() => setFilters(defaultFilters)}>Limpar filtros<X size={14} /></button></div><p>O limite considera versões compatíveis com seus filtros. Consulte o Emerson ECAR para confirmar a sua condição.</p></details>
    <div className="catalog-results-line"><p role="status" aria-live="polite"><strong>{results.length}</strong> {results.length === 1 ? "veículo encontrado" : "veículos encontrados"}</p><span>Consulte o Emerson ECAR</span></div>
    {results.length ? <div className="vehicle-grid">{results.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}</div> : <div className="empty-state"><Search size={38} /><h2>Nenhum veículo por aqui.</h2><p>Tente outro modelo, versão ou categoria.</p><button type="button" className="button button-primary" onClick={() => setFilters(defaultFilters)}>Limpar filtros<X size={16} /></button></div>}
    <p className="section-disclaimer">Imagens ilustrativas. Valores, condições e disponibilidade: consulte o Emerson ECAR · (11) 98926-6321.</p></section></main>;
}
