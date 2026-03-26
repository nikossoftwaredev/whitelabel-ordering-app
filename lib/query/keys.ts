export const queryKeys = {
  menu: {
    all: (tenantSlug: string) => ["menu", tenantSlug] as const,
    product: (tenantSlug: string, productId: string) =>
      ["menu", tenantSlug, "product", productId] as const,
  },
  orders: {
    all: (tenantId: string) => ["orders", tenantId] as const,
    detail: (tenantId: string, orderId: string) =>
      ["orders", tenantId, orderId] as const,
    history: (tenantSlug: string) => ["orders", "history", tenantSlug] as const,
  },
  customers: {
    all: (tenantId: string) => ["customers", tenantId] as const,
  },
  favorites: {
    all: (tenantSlug: string) => ["favorites", tenantSlug] as const,
  },
  stats: {
    dashboard: (tenantId: string) => ["stats", tenantId] as const,
  },
  analytics: {
    dashboard: (tenantId: string) => ["analytics", tenantId] as const,
    detailed: (tenantId: string, startDate: string, endDate: string) =>
      ["analytics", tenantId, "detailed", startDate, endDate] as const,
  },
  invoices: {
    all: (tenantId: string) => ["invoices", tenantId] as const,
  },
  promoCodes: {
    all: (tenantId: string) => ["promo-codes", tenantId] as const,
  },
  customerGroups: {
    all: (tenantId: string) => ["customer-groups", tenantId] as const,
  },
  staff: {
    all: (tenantId: string) => ["staff", tenantId] as const,
  },
  settings: {
    all: (tenantId: string) => ["settings", tenantId] as const,
  },
  tenants: {
    all: () => ["tenants"] as const,
    detail: (tenantId: string) => ["tenants", tenantId] as const,
  },
  storeStatus: (tenantSlug: string) => ["store-status", tenantSlug] as const,
};
