import type {
  AadeConfig,
  AadeInvoiceInput,
  AadeSubmissionResponse,
  AadeCancellationResponse,
} from "./types"
import { AADE_BASE_URLS, AADE_ENDPOINTS } from "./constants"
import { buildInvoiceXml } from "./xml-builder"
import { parseSubmissionResponse, parseCancellationResponse } from "./xml-parser"
import { validateInvoice } from "./validators"
import {
  AadeApiError,
  AadeNetworkError,
  AadeTimeoutError,
  AadeValidationError,
} from "./errors"

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 3000, 9000]
const REQUEST_TIMEOUT = 30000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const createAadeClient = (config: AadeConfig) => {
  const baseUrl = AADE_BASE_URLS[config.environment]

  const request = async (
    endpoint: string,
    { method = "POST", body, params }: {
      method?: string
      body?: string
      params?: Record<string, string>
    }
  ): Promise<string> => {
    const url = new URL(`${baseUrl}${endpoint}`)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value)
      }
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT
        )

        const response = await fetch(url.toString(), {
          method,
          headers: {
            "aade-user-id": config.userId,
            "ocp-apim-subscription-key": config.subscriptionKey,
            "Content-Type": "application/xml",
          },
          body,
          signal: controller.signal,
        })

        clearTimeout(timeout)

        const responseText = await response.text()

        if (response.status >= 500) {
          lastError = new AadeApiError({
            message: `AADE server error: ${response.status}`,
            code: `HTTP_${response.status}`,
            statusCode: response.status,
            responseBody: responseText,
          })
          if (attempt < MAX_RETRIES - 1) {
            await sleep(RETRY_DELAYS[attempt])
            continue
          }
          throw lastError
        }

        if (response.status >= 400) {
          throw new AadeApiError({
            message: `AADE client error: ${response.status}`,
            code: `HTTP_${response.status}`,
            statusCode: response.status,
            responseBody: responseText,
          })
        }

        return responseText
      } catch (error) {
        if (error instanceof AadeApiError) throw error

        if (error instanceof DOMException && error.name === "AbortError") {
          lastError = new AadeTimeoutError(endpoint)
        } else {
          lastError = new AadeNetworkError(
            `Network error on ${endpoint}`,
            error instanceof Error ? error : undefined
          )
        }

        if (attempt < MAX_RETRIES - 1) {
          await sleep(RETRY_DELAYS[attempt])
          continue
        }
      }
    }

    throw lastError || new AadeNetworkError("Unknown error after retries")
  }

  const sendInvoice = async (
    invoice: AadeInvoiceInput
  ): Promise<AadeSubmissionResponse> => {
    const validationErrors = validateInvoice(invoice)
    if (validationErrors.length > 0) {
      throw validationErrors[0]
    }

    const xml = buildInvoiceXml([invoice])
    const responseXml = await request(AADE_ENDPOINTS.SEND_INVOICES, {
      body: xml,
    })
    const responses = parseSubmissionResponse(responseXml)
    return responses[0]
  }

  const sendInvoices = async (
    invoices: AadeInvoiceInput[]
  ): Promise<AadeSubmissionResponse[]> => {
    for (const invoice of invoices) {
      const validationErrors = validateInvoice(invoice)
      if (validationErrors.length > 0) {
        throw new AadeValidationError({
          field: validationErrors[0].field,
          constraint: validationErrors[0].constraint,
        })
      }
    }

    const xml = buildInvoiceXml(invoices)
    const responseXml = await request(AADE_ENDPOINTS.SEND_INVOICES, {
      body: xml,
    })
    return parseSubmissionResponse(responseXml)
  }

  const cancelInvoice = async (
    mark: string
  ): Promise<AadeCancellationResponse> => {
    const responseXml = await request(AADE_ENDPOINTS.CANCEL_INVOICE, {
      method: "POST",
      params: { mark },
    })
    return parseCancellationResponse(responseXml)
  }

  return { sendInvoice, sendInvoices, cancelInvoice }
}
