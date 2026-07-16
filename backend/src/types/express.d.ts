import type { User } from "@supabase/supabase-js";
import type { AuthenticatedAppUser } from "./auth.js";
import type { Organization, OrganizationMembership } from "./organization.js";

declare global {
  namespace Express {
    interface Request {
      appUser?: AuthenticatedAppUser;
      membership?: OrganizationMembership;
      organization?: Organization;
      user?: User;
    }
  }
}

export {};
