import { supabase } from "../config/supabase.js";
import { AppError } from "../utils/appError.js";
import {
  accountExistsByEmail as accountExistsWithLookups,
  normalizeAccountEmail,
  type AccountExistenceLookups,
} from "./accountExistenceRule.js";

const AUTH_USER_PAGE_SIZE = 1_000;

export type { AccountExistenceLookups } from "./accountExistenceRule.js";

async function findApplicationUserByEmail(email: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new AppError("Unable to inspect invitation account status.", 500, true, {
      cause: error,
    });
  }

  return Boolean(data);
}

async function findAuthUserByEmail(email: string) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_USER_PAGE_SIZE,
    });

    if (error) {
      throw new AppError("Unable to inspect invitation account status.", 500, true, {
        cause: error,
      });
    }

    const users = data?.users ?? [];
    if (users.some((user) => normalizeAccountEmail(user.email ?? "") === email)) {
      return true;
    }
    if (users.length < AUTH_USER_PAGE_SIZE) {
      return false;
    }
  }
}

export async function accountExistsByEmail(
  email: string,
  lookups: AccountExistenceLookups = {
    findApplicationUserByEmail,
    findAuthUserByEmail,
  }
) {
  return accountExistsWithLookups(email, lookups);
}
