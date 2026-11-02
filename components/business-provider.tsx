"use client";

import { createContext, useContext } from "react";
import { defaultBusiness, type Business } from "@/lib/business-defaults";

// Contact details for client components (menu, floating buttons, chat). Filled by the root layout.
const BusinessContext = createContext<Business>(defaultBusiness);

export function BusinessProvider({ value, children }: { value: Business; children: React.ReactNode }) {
  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  return useContext(BusinessContext);
}
