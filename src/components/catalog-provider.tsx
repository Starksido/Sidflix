"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { HomeCatalog, Title } from "@/lib/catalog";

type CatalogContext = Pick<HomeCatalog, "featured" | "topTen"> & {
  /** Undefined for ids no longer in the catalogue, e.g. old watch history. */
  getTitle: (id: string) => Title | undefined;
};

const Context = createContext<CatalogContext | null>(null);

export function CatalogProvider({
  catalog,
  children,
}: {
  catalog: Pick<HomeCatalog, "featured" | "topTen" | "titles">;
  children: ReactNode;
}) {
  const { featured, topTen, titles } = catalog;
  const value = useMemo(() => {
    const byId = new Map(titles.map((t) => [t.id, t]));
    return { featured, topTen, getTitle: (id: string) => byId.get(id) };
  }, [featured, topTen, titles]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCatalog(): CatalogContext {
  const context = useContext(Context);
  if (!context) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return context;
}
