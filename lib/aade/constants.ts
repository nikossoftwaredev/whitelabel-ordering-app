export const AADE_INVOICE_TYPES = {
  RETAIL_SALES_RECEIPT: "11.1",
  SERVICE_PROVISION_RECEIPT: "11.2",
  SIMPLIFIED_INVOICE: "11.3",
  RETAIL_SALES_CREDIT_NOTE: "11.4",
  SALES_INVOICE: "1.1",
  SERVICE_INVOICE: "2.1",
} as const

export const AADE_PAYMENT_METHODS = {
  DOMESTIC_ACCOUNT: 1,
  FOREIGN_ACCOUNT: 2,
  CASH: 3,
  CHECK: 4,
  ON_CREDIT: 5,
  WEB_BANKING: 6,
  POS: 7,
} as const

export const AADE_VAT_CATEGORIES = {
  RATE_24: 1,
  RATE_13: 2,
  RATE_6: 3,
  RATE_17: 4,
  RATE_9: 5,
  RATE_4: 6,
  EXEMPT: 7,
  WITHOUT_VAT: 8,
} as const

export const AADE_VAT_RATES: Record<number, number> = {
  1: 0.24,
  2: 0.13,
  3: 0.06,
  4: 0.17,
  5: 0.09,
  6: 0.04,
  7: 0,
  8: 0,
}

export const AADE_INCOME_CLASSIFICATION = {
  SERVICE_REVENUE_RETAIL: "E3_561_003",
  SERVICE_REVENUE_WHOLESALE: "E3_561_001",
} as const

export const AADE_INCOME_CLASSIFICATION_CATEGORY = {
  SERVICE_PROVISION_REVENUE: "category1_3",
} as const

export const AADE_BASE_URLS = {
  dev: "https://mydataapidev.aade.gr",
  production: "https://mydatapi.aade.gr/myDATA",
} as const

export const AADE_ENDPOINTS = {
  SEND_INVOICES: "/SendInvoices",
  CANCEL_INVOICE: "/CancelInvoice",
  REQUEST_DOCS: "/RequestDocs",
  REQUEST_TRANSMITTED_DOCS: "/RequestTransmittedDocs",
} as const
