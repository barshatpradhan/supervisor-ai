import { AppError } from "./appError.js";

/**
 * The stored avatar ID format, for example "p03-s4-c2-a1" (preset 01-12, skin 1-6, colour 1-6,
 * accessory 0-3). It must stay identical to AVATAR_ID_PATTERN in
 * frontend/src/components/ui/avatar/avatar-core.ts; avatarVariant.test.ts fails if they drift.
 * The database only checks length and characters, so this is the real format check.
 */
export const AVATAR_ID_PATTERN = /^p(0[1-9]|1[0-2])-s([1-6])-c([1-6])-a([0-3])$/;

/** Ear accessories (3) are not offered for presets that cover the ears (hijab = preset 3). */
const PRESETS_COVERING_EARS = new Set([3]);

export function isValidAvatarVariant(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = AVATAR_ID_PATTERN.exec(value);
  if (!match) return false;
  return !(Number(match[4]) === 3 && PRESETS_COVERING_EARS.has(Number(match[1])));
}

/** A request's avatar value: a valid ID, or null to go back to initials. Anything else is a 400. */
export function parseAvatarVariantInput(value: unknown): string | null {
  if (value === null) return null;
  if (isValidAvatarVariant(value)) return value;
  throw new AppError("variant must be a valid avatar ID (for example p03-s4-c2-a1) or null.", 400);
}

/** A stored value as the API returns it: unknown or outdated values read as null (initials). */
export function readStoredAvatarVariant(value: unknown): string | null {
  return isValidAvatarVariant(value) ? value : null;
}
