"use client";

import { createContext, type ReactNode,useContext } from "react";

interface TenantContextValue {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  logoSmall: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  currency: string;
  timezone: string;
  prepTimeMinutes: number;
  isPaused: boolean;
  deliveryEnabled: boolean;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  minOrderAmount: number;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
};

interface TenantProviderProps {
  children: ReactNode;
  value: TenantContextValue;
}

export const TenantProvider = ({ children, value }: TenantProviderProps) => {
  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
};
