import { AppError } from "./appError.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireBody(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new AppError("Request body is required.", 400);
  }

  return value;
}

export function requireString(
  body: Record<string, unknown>,
  field: string,
  label = field
) {
  const value = body[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(`${label} is required.`, 400);
  }

  return value.trim();
}

export function optionalString(body: Record<string, unknown>, field: string) {
  const value = body[field];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AppError(`${field} must be a string.`, 400);
  }

  return value.trim();
}

export function optionalStringArray(
  body: Record<string, unknown>,
  field: string
) {
  const value = body[field];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new AppError(`${field} must be an array of strings.`, 400);
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

export function requireUuid(value: unknown, label: string) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new AppError(`${label} must be a valid UUID.`, 400);
  }

  return value;
}

export function optionalUuid(
  body: Record<string, unknown>,
  field: string,
  label = field
) {
  const value = body[field];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return requireUuid(value, label);
}

export function requireEmail(body: Record<string, unknown>, field: string) {
  const value = requireString(body, field, "A valid email");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new AppError("A valid email is required.", 400);
  }

  return value;
}

export function requirePassword(body: Record<string, unknown>, field: string) {
  const value = requireString(body, field, "Password");

  if (value.length < 8) {
    throw new AppError("Password must be at least 8 characters.", 400);
  }

  return value;
}

export function optionalNumber(
  body: Record<string, unknown>,
  field: string,
  options: { min?: number; max?: number } = {}
) {
  const value = body[field];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AppError(`${field} must be a number.`, 400);
  }

  if (options.min !== undefined && value < options.min) {
    throw new AppError(`${field} must be at least ${options.min}.`, 400);
  }

  if (options.max !== undefined && value > options.max) {
    throw new AppError(`${field} must be at most ${options.max}.`, 400);
  }

  return value;
}

export function optionalEnum<T extends string>(
  body: Record<string, unknown>,
  field: string,
  allowedValues: readonly T[]
) {
  const value = body[field];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string" || !allowedValues.includes(value as T)) {
    throw new AppError(`${field} must be one of: ${allowedValues.join(", ")}.`, 400);
  }

  return value as T;
}
