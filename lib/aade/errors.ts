export class AadeApiError extends Error {
  code: string
  statusCode: number
  responseBody?: string

  constructor({
    message,
    code,
    statusCode,
    responseBody,
  }: {
    message: string
    code: string
    statusCode: number
    responseBody?: string
  }) {
    super(message)
    this.name = "AadeApiError"
    this.code = code
    this.statusCode = statusCode
    this.responseBody = responseBody
  }
}

export class AadeValidationError extends Error {
  field: string
  constraint: string

  constructor({ field, constraint }: { field: string; constraint: string }) {
    super(`Validation failed for ${field}: ${constraint}`)
    this.name = "AadeValidationError"
    this.field = field
    this.constraint = constraint
  }
}

export class AadeTimeoutError extends Error {
  endpoint: string

  constructor(endpoint: string) {
    super(`AADE API timeout on ${endpoint}`)
    this.name = "AadeTimeoutError"
    this.endpoint = endpoint
  }
}

export class AadeNetworkError extends Error {
  constructor(message: string, cause?: Error) {
    super(message)
    this.name = "AadeNetworkError"
    this.cause = cause
  }
}
