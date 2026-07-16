export class AppError extends Error {
  public readonly statusCode: number;
  public readonly expose: boolean;
  public readonly cause: unknown;

  constructor(
    message: string,
    statusCode = 500,
    expose = true,
    options?: { cause?: unknown }
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.expose = expose;
    this.cause = options?.cause;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
