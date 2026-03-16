import { XMLParser } from "fast-xml-parser"

import type {
  AadeCancellationResponse,
  AadeResponseError,
  AadeSubmissionResponse,
} from "./types"

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
})

const toArray = <T>(value: T | T[] | undefined): T[] => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export const parseSubmissionResponse = (
  xml: string
): AadeSubmissionResponse[] => {
  const parsed = parser.parse(xml)
  const responseDoc = parsed.ResponseDoc || parsed.responseDoc
  if (!responseDoc) {
    return [{ success: false, errors: [{ code: "PARSE_ERROR", message: "Invalid response format" }] }]
  }

  const responses = toArray(responseDoc.response)

  return responses.map((resp: Record<string, unknown>) => {
    const errorsObj = resp.errors as Record<string, unknown> | undefined
    const errors = toArray(
      errorsObj?.error as Record<string, string> | Record<string, string>[] | undefined
    ).map(
      (e): AadeResponseError => ({
        code: String(e.code || ""),
        message: String(e.message || ""),
      })
    )

    const hasErrors = errors.length > 0
    const statusCode = String(resp.statusCode || "")

    return {
      success: !hasErrors && statusCode !== "Error",
      mark: resp.invoiceMark ? String(resp.invoiceMark) : undefined,
      uid: resp.invoiceUid ? String(resp.invoiceUid) : undefined,
      authenticationCode: resp.authenticationCode
        ? String(resp.authenticationCode)
        : undefined,
      qrUrl: resp.qrUrl ? String(resp.qrUrl) : undefined,
      errors: hasErrors ? errors : undefined,
      statusCode,
    }
  })
}

export const parseCancellationResponse = (
  xml: string
): AadeCancellationResponse => {
  const parsed = parser.parse(xml)
  const responseDoc = parsed.ResponseDoc || parsed.responseDoc
  if (!responseDoc) {
    return { success: false, errors: [{ code: "PARSE_ERROR", message: "Invalid response format" }] }
  }

  const resp = toArray(responseDoc.response)[0] as Record<string, unknown> | undefined
  if (!resp) {
    return { success: false, errors: [{ code: "PARSE_ERROR", message: "No response in document" }] }
  }

  const cancellationErrorsObj = resp.errors as Record<string, unknown> | undefined
  const errors = toArray(
    cancellationErrorsObj?.error as Record<string, string> | Record<string, string>[] | undefined
  ).map(
    (e): AadeResponseError => ({
      code: String(e.code || ""),
      message: String(e.message || ""),
    })
  )

  return {
    success: errors.length === 0,
    cancellationMark: resp.cancellationMark
      ? String(resp.cancellationMark)
      : undefined,
    errors: errors.length > 0 ? errors : undefined,
  }
}
