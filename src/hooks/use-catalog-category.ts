"use client";

import { useSyncExternalStore } from "react";
import type { Category } from "@/types/domain";

const categories: Category[] = ["SUV", "Picape", "Sedã", "Hatch", "7 lugares", "Comercial"];
function subscribe(onChange: () => void) { window.addEventListener("popstate", onChange); return () => window.removeEventListener("popstate", onChange); }
function getQuery() { return window.location.search; }
function getServerQuery() { return ""; }

/** Inicializa os links de categoria dos rodapés, mantendo os catálogos estáticos. */
export function useCatalogCategory(): Category | "all" {
  const query = useSyncExternalStore(subscribe, getQuery, getServerQuery);
  const category = new URLSearchParams(query).get("categoria");
  return categories.find((item) => item === category) ?? "all";
}
