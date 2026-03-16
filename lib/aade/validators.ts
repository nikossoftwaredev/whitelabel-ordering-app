import { AadeValidationError } from "./errors"
import type { AadeInvoiceInput } from "./types"

export const validateInvoice = (
  invoice: AadeInvoiceInput
): AadeValidationError[] => {
  const errors: AadeValidationError[] = []

  if (!invoice.issuer.vatNumber || !/^\d{9}$/.test(invoice.issuer.vatNumber)) {
    errors.push(
      new AadeValidationError({
        field: "issuer.vatNumber",
        constraint: "Must be exactly 9 digits",
      })
    )
  }

  if (!invoice.invoiceHeader.series) {
    errors.push(
      new AadeValidationError({
        field: "invoiceHeader.series",
        constraint: "Series is required",
      })
    )
  }

  if (!invoice.invoiceHeader.aa) {
    errors.push(
      new AadeValidationError({
        field: "invoiceHeader.aa",
        constraint: "Sequential number is required",
      })
    )
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoice.invoiceHeader.issueDate)) {
    errors.push(
      new AadeValidationError({
        field: "invoiceHeader.issueDate",
        constraint: "Must be in YYYY-MM-DD format",
      })
    )
  }

  if (invoice.invoiceDetails.length === 0) {
    errors.push(
      new AadeValidationError({
        field: "invoiceDetails",
        constraint: "At least one detail row is required",
      })
    )
  }

  const totalGross = invoice.invoiceDetails.reduce(
    (sum, row) => sum + row.netValue + row.vatAmount,
    0
  )
  const paymentTotal = invoice.paymentMethods.reduce(
    (sum, pm) => sum + pm.amount,
    0
  )

  if (Math.abs(totalGross - paymentTotal) > 0.01) {
    errors.push(
      new AadeValidationError({
        field: "paymentMethods",
        constraint: `Payment total (${paymentTotal.toFixed(2)}) must equal gross total (${totalGross.toFixed(2)})`,
      })
    )
  }

  return errors
}
