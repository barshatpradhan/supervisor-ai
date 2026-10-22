export class AppError extends Error {
  public readonly statusCode: number;
  public readonly expose: boolean;
  public readonly cause: unknown;
  /** Sent as a Retry-After header (seconds) by the error handler, for 429 and 503 responses. */
  public readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    statusCode = 500,
    expose = true,
    options?: { cause?: unknown; retryAfterSeconds?: number }
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.expose = expose;
    this.cause = options?.cause;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
