export interface AccountExistenceLookups {
  findApplicationUserByEmail(email: string): Promise<boolean>;
  findAuthUserByEmail(email: string): Promise<boolean>;
}

export function normalizeAccountEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * The shared invitation-account rule. An application user is sufficient; when
 * none exists we also check Supabase Auth so registration cannot create a
 * duplicate identity.
 */
export async function accountExistsByEmail(
  email: string,
  lookups: AccountExistenceLookups
) {
  const normalizedEmail = normalizeAccountEmail(email);

  if (await lookups.findApplicationUserByEmail(normalizedEmail)) {
    return true;
  }

  return lookups.findAuthUserByEmail(normalizedEmail);
}
