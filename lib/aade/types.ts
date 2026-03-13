export interface AadeConfig {
  userId: string
  subscriptionKey: string
  environment: "dev" | "production"
}

export interface AadeIssuer {
  vatNumber: string
  country: "GR"
  branch: number
  name?: string
  address?: AadeAddress
}

export interface AadeAddress {
  street?: string
  number?: string
  postalCode?: string
  city?: string
}

export interface AadeCounterpart {
  vatNumber?: string
  country?: string
  branch?: number
  name?: string
  address?: AadeAddress
}

export interface AadeInvoiceHeader {
  series: string
  aa: string
  issueDate: string
  invoiceType: string
  currency: "EUR"
}

export interface AadeInvoiceRow {
  lineNumber: number
  netValue: number
  vatCategory: number
  vatAmount: number
  incomeClassification?: AadeIncomeClassification
}

export interface AadeIncomeClassification {
  classificationType: string
  classificationCategory: string
  amount: number
}

export interface AadePaymentMethod {
  type: number
  amount: number
  paymentMethodInfo?: string
}

export interface AadeInvoiceInput {
  issuer: AadeIssuer
  counterpart?: AadeCounterpart
  invoiceHeader: AadeInvoiceHeader
  invoiceDetails: AadeInvoiceRow[]
  paymentMethods: AadePaymentMethod[]
}

export interface AadeSubmissionResponse {
  success: boolean
  mark?: string
  uid?: string
  authenticationCode?: string
  qrUrl?: string
  errors?: AadeResponseError[]
  statusCode?: string
}

export interface AadeResponseError {
  code: string
  message: string
}

export interface AadeCancellationResponse {
  success: boolean
  cancellationMark?: string
  errors?: AadeResponseError[]
}

export interface AadeTransmittedDocsResponse {
  success: boolean
  continuationToken?: {
    nextPartitionKey: string
    nextRowKey: string
  }
  invoices?: Array<{
    mark: string
    uid: string
    invoiceType: string
    issueDate: string
    grossValue: number
  }>
}
