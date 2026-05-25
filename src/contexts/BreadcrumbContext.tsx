"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface BreadcrumbItem {
  title: string;
  href?: string;
}

interface BreadcrumbContextType {
  items: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BreadcrumbItem[]>([]);

  return (
    <BreadcrumbContext.Provider value={{ items, setBreadcrumbs: setItems }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export const useBreadcrumb = () => {
  const context = useContext(BreadcrumbContext);
  if (!context) throw new Error("useBreadcrumb must be used within BreadcrumbProvider");
  return context;
};
