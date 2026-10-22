import { supabase } from "../config/supabase.js";
import { incrementMetric } from "../middleware/observabilityMiddleware.js";
import { readStoredAvatarVariant } from "../utils/avatarVariant.js";
import { logger } from "../utils/logger.js";

/** Most user ids in one `in()` filter. PostgREST puts the list in the URL, so longer lists are split. */
export const AVATAR_LOOKUP_CHUNK = 200;

/**
 * The one way to read other people's avatars: user id -> avatar ID, or null for initials.
 *
 * Callers pass only the people whose names their response already shows, so an avatar never
 * appears where a name doesn't. One query for up to 200 ids (chunks run in parallel beyond that);
 * no query at all for an empty list. Every requested id is in the result, null when the user has
 * no avatar, doesn't exist, or has a stored value that is no longer valid.
 *
 * Avatars are decoration: if the lookup fails, everyone shows initials and the failure is logged,
 * rather than failing the request (messaging polls, recommendations) that asked for them.
 */
export async function getAvatarVariants(userIds: Iterable<string | null | undefined>): Promise<Map<string, string | null>> {
  const ids = [...new Set([...userIds].filter((id): id is string => typeof id === "string" && id.length > 0))];
  const variants = new Map<string, string | null>(ids.map((id) => [id, null]));
  if (ids.length === 0) return variants;

  const chunks: string[][] = [];
  for (let start = 0; start < ids.length; start += AVATAR_LOOKUP_CHUNK) chunks.push(ids.slice(start, start + AVATAR_LOOKUP_CHUNK));

  const results = await Promise.all(
    chunks.map((chunk) =>
      supabase.from("users").select("id, avatar_variant").in("id", chunk).returns<Array<{ id: string; avatar_variant: string | null }>>()
    )
  );

  for (const { data, error } of results) {
    if (error) {
      logger.warn("avatar_lookup_failed", { error: error.message, users: ids.length });
      incrementMetric("avatar_lookup_failures_total");
      return new Map(ids.map((id) => [id, null]));
    }
    for (const row of data ?? []) variants.set(row.id, readStoredAvatarVariant(row.avatar_variant));
  }

  return variants;
}

/** The avatar for one person from a lookup; null for a missing person. */
export function avatarFor(variants: ReadonlyMap<string, string | null>, userId: string | null | undefined) {
  return userId ? variants.get(userId) ?? null : null;
}
