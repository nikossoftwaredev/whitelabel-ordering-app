import type { AadeInvoiceInput } from "./types"

const fmt = (n: number) => n.toFixed(2)

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const buildIssuerXml = (issuer: AadeInvoiceInput["issuer"]) => {
  let xml = `<issuer>`
  xml += `<vatNumber>${escapeXml(issuer.vatNumber)}</vatNumber>`
  xml += `<country>${issuer.country}</country>`
  xml += `<branch>${issuer.branch}</branch>`
  xml += `</issuer>`
  return xml
}

const buildCounterpartXml = (
  counterpart: NonNullable<AadeInvoiceInput["counterpart"]>
) => {
  let xml = `<counterpart>`
  if (counterpart.vatNumber)
    xml += `<vatNumber>${escapeXml(counterpart.vatNumber)}</vatNumber>`
  if (counterpart.country)
    xml += `<country>${escapeXml(counterpart.country)}</country>`
  if (counterpart.branch !== undefined)
    xml += `<branch>${counterpart.branch}</branch>`
  xml += `</counterpart>`
  return xml
}

const buildHeaderXml = (header: AadeInvoiceInput["invoiceHeader"]) => {
  let xml = `<invoiceHeader>`
  xml += `<series>${escapeXml(header.series)}</series>`
  xml += `<aa>${escapeXml(header.aa)}</aa>`
  xml += `<issueDate>${header.issueDate}</issueDate>`
  xml += `<invoiceType>${escapeXml(header.invoiceType)}</invoiceType>`
  xml += `<currency>${header.currency}</currency>`
  xml += `</invoiceHeader>`
  return xml
}

const buildPaymentMethodsXml = (methods: AadeInvoiceInput["paymentMethods"]) => {
  let xml = `<paymentMethods>`
  for (const method of methods) {
    xml += `<paymentMethodDetails>`
    xml += `<type>${method.type}</type>`
    xml += `<amount>${fmt(method.amount)}</amount>`
    if (method.paymentMethodInfo)
      xml += `<paymentMethodInfo>${escapeXml(method.paymentMethodInfo)}</paymentMethodInfo>`
    xml += `</paymentMethodDetails>`
  }
  xml += `</paymentMethods>`
  return xml
}

const buildDetailsXml = (rows: AadeInvoiceInput["invoiceDetails"]) => {
  let xml = ``
  for (const row of rows) {
    xml += `<invoiceDetails>`
    xml += `<lineNumber>${row.lineNumber}</lineNumber>`
    xml += `<netValue>${fmt(row.netValue)}</netValue>`
    xml += `<vatCategory>${row.vatCategory}</vatCategory>`
    xml += `<vatAmount>${fmt(row.vatAmount)}</vatAmount>`
    if (row.incomeClassification) {
      xml += `<incomeClassification>`
      xml += `<icls:classificationType>${escapeXml(row.incomeClassification.classificationType)}</icls:classificationType>`
      xml += `<icls:classificationCategory>${escapeXml(row.incomeClassification.classificationCategory)}</icls:classificationCategory>`
      xml += `<icls:amount>${fmt(row.incomeClassification.amount)}</icls:amount>`
      xml += `</incomeClassification>`
    }
    xml += `</invoiceDetails>`
  }
  return xml
}

const buildSummaryXml = (rows: AadeInvoiceInput["invoiceDetails"]) => {
  const totalNetValue = rows.reduce((sum, r) => sum + r.netValue, 0)
  const totalVatAmount = rows.reduce((sum, r) => sum + r.vatAmount, 0)
  const totalGrossValue = totalNetValue + totalVatAmount

  let xml = `<invoiceSummary>`
  xml += `<totalNetValue>${fmt(totalNetValue)}</totalNetValue>`
  xml += `<totalVatAmount>${fmt(totalVatAmount)}</totalVatAmount>`
  xml += `<totalWithheldAmount>0.00</totalWithheldAmount>`
  xml += `<totalFeesAmount>0.00</totalFeesAmount>`
  xml += `<totalStampDutyAmount>0.00</totalStampDutyAmount>`
  xml += `<totalOtherTaxesAmount>0.00</totalOtherTaxesAmount>`
  xml += `<totalDeductionsAmount>0.00</totalDeductionsAmount>`
  xml += `<totalGrossValue>${fmt(totalGrossValue)}</totalGrossValue>`

  for (const row of rows) {
    if (row.incomeClassification) {
      xml += `<incomeClassification>`
      xml += `<icls:classificationType>${escapeXml(row.incomeClassification.classificationType)}</icls:classificationType>`
      xml += `<icls:classificationCategory>${escapeXml(row.incomeClassification.classificationCategory)}</icls:classificationCategory>`
      xml += `<icls:amount>${fmt(row.incomeClassification.amount)}</icls:amount>`
      xml += `</incomeClassification>`
    }
  }

  xml += `</invoiceSummary>`
  return xml
}

export const buildInvoiceXml = (invoices: AadeInvoiceInput[]): string => {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>`
  xml += `<InvoicesDoc xmlns="http://www.aade.gr/myDATA/invoice/v1.0" xmlns:icls="https://www.aade.gr/myDATA/incomeClassificaton/v1.0" xmlns:ecls="https://www.aade.gr/myDATA/expensesClassificaton/v1.0">`

  for (const invoice of invoices) {
    xml += `<invoice>`
    xml += buildIssuerXml(invoice.issuer)
    if (invoice.counterpart) xml += buildCounterpartXml(invoice.counterpart)
    xml += buildHeaderXml(invoice.invoiceHeader)
    xml += buildPaymentMethodsXml(invoice.paymentMethods)
    xml += buildDetailsXml(invoice.invoiceDetails)
    xml += buildSummaryXml(invoice.invoiceDetails)
    xml += `</invoice>`
  }

  xml += `</InvoicesDoc>`
  return xml
}
