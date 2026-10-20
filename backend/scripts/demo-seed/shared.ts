/**
 * Shared pieces of the dev-only demo seed: safety checks, the markers that identify
 * seeded data, and the cleanup that removes it. Nothing here touches unmarked records.
 */
import { supabase } from "../../src/config/supabase.js";
import { PROJECT_DOCUMENT_BUCKET } from "../../src/middleware/uploadMiddleware.js";

export const DEMO_ORG_NAME = "Demo Org [SEED]";
export const DEMO_ORG_SLUG = "demo-org-seed";

/** Stamped on the org, app users, Auth users and teams. Cleanup requires it plus the name or email marker. */
export const SEED_METADATA = { seed: "demo" } as const;

/** Every seeded login and invitation uses this reserved, non-routable pattern. */
const SEED_EMAIL_PATTERN = /^seed\+[a-z0-9.-]+@example\.test$/;

export function seedEmail(key: string) {
  const email = `seed+${key}@example.test`;
  if (!SEED_EMAIL_PATTERN.test(email)) throw new Error(`Invalid seed email key: ${key}`);
  return email;
}

export function isSeedEmail(email: string | null | undefined) {
  return Boolean(email && SEED_EMAIL_PATTERN.test(email.toLowerCase()));
}

/**
 * Refuses production, prints the target project, and requires --confirm before any write.
 * Returns only when it is safe to continue.
 */
export function assertSafeToRun(action: string) {
  if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production") {
    console.error(`Refusing to ${action}: NODE_ENV/APP_ENV is production.`);
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  let host = "<unset>";
  try {
    host = new URL(supabaseUrl).host;
  } catch {
    // Reported below as <unset>.
  }

  console.log(`\nTarget Supabase project: ${host}`);
  console.log(`Action: ${action}`);

  if (!process.argv.includes("--confirm")) {
    console.log("\nNothing was written. Re-run with --confirm to proceed, e.g.:");
    console.log("  npm run seed:demo -- --confirm\n");
    process.exit(1);
  }
}

/** The shared demo password comes only from the environment and is never printed. */
export function readDemoPassword() {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 8) {
    console.error("SEED_DEMO_PASSWORD must be set in backend/.env (at least 8 characters). It is never printed or committed.");
    process.exit(1);
  }
  return password;
}

async function findDemoOrganization() {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, metadata")
    .eq("slug", DEMO_ORG_SLUG)
    .maybeSingle<{ id: string; name: string; slug: string; metadata: Record<string, unknown> | null }>();

  if (error) throw new Error(`Unable to look up the demo organization: ${error.message}`);
  if (!data) return null;
  if (data.name !== DEMO_ORG_NAME || data.metadata?.seed !== SEED_METADATA.seed) {
    throw new Error(
      `Organization with slug ${DEMO_ORG_SLUG} is not marked as seeded (name "${data.name}", metadata.seed "${String(data.metadata?.seed ?? "")}"). Refusing to touch it.`
    );
  }
  return data;
}

async function removeDocumentFiles(projectIds: string[]) {
  let removed = 0;
  for (const projectId of projectIds) {
    const { data: files } = await supabase.storage.from(PROJECT_DOCUMENT_BUCKET).list(projectId, { limit: 1000 });
    const paths = (files ?? []).map((file) => `${projectId}/${file.name}`);
    if (paths.length === 0) continue;
    const { error } = await supabase.storage.from(PROJECT_DOCUMENT_BUCKET).remove(paths);
    if (error) throw new Error(`Unable to remove stored documents for project ${projectId}: ${error.message}`);
    removed += paths.length;
  }
  return removed;
}

async function listSeedAuthUsers() {
  const users: { email: string; id: string }[] = [];
  for (let page = 1; page < 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Unable to list Auth users: ${error.message}`);
    for (const user of data.users) {
      // Both markers: the reserved email pattern and the seed flag set at creation.
      if (isSeedEmail(user.email) && user.user_metadata?.seed === SEED_METADATA.seed) {
        users.push({ email: user.email as string, id: user.id });
      }
    }
    if (data.users.length < 200) break;
  }
  return users;
}

export interface CleanupReport {
  appUsers: number;
  pendingSkills: number;
  authUsers: number;
  documentFiles: number;
  organization: boolean;
}

/**
 * Deletes only seeded data, in an order the foreign keys allow:
 * stored files, then the demo org (projects, tasks, members and invitations cascade with it),
 * then pending skills the seed created that nobody else uses, then seeded app users and Auth users.
 */
export async function cleanDemoData(): Promise<CleanupReport> {
  const report: CleanupReport = { appUsers: 0, authUsers: 0, documentFiles: 0, organization: false, pendingSkills: 0 };
  const organization = await findDemoOrganization();

  if (organization) {
    const { data: projects } = await supabase.from("projects").select("id").eq("organization_id", organization.id);
    report.documentFiles = await removeDocumentFiles((projects ?? []).map((project) => project.id as string));

    const { error } = await supabase.from("organizations").delete().eq("id", organization.id);
    if (error) throw new Error(`Unable to delete the demo organization: ${error.message}`);
    report.organization = true;
  }

  const { data: appUsers, error: appUsersError } = await supabase
    .from("users")
    .select("id, email")
    .like("email", "seed+%@example.test")
    .eq("metadata->>seed", SEED_METADATA.seed);
  if (appUsersError) throw new Error(`Unable to list seeded app users: ${appUsersError.message}`);

  const seededAppUserIds = (appUsers ?? []).filter((user) => isSeedEmail(user.email as string)).map((user) => user.id as string);

  // Pending skills the seed created. Skills are shared app-wide, so keep any that a
  // non-seeded employee now uses; the org deletion above already removed seeded links.
  if (seededAppUserIds.length > 0) {
    const { data: seededSkills, error: seededSkillsError } = await supabase
      .from("skills")
      .select("id, employee_skills (id)")
      .in("created_by", seededAppUserIds)
      .eq("is_approved", false);
    if (seededSkillsError) throw new Error(`Unable to list seeded pending skills: ${seededSkillsError.message}`);
    const unusedIds = (seededSkills ?? [])
      .filter((skill) => ((skill.employee_skills as unknown[] | null) ?? []).length === 0)
      .map((skill) => skill.id as string);
    if (unusedIds.length > 0) {
      const { error } = await supabase.from("skills").delete().in("id", unusedIds);
      if (error) throw new Error(`Unable to delete seeded pending skills: ${error.message}`);
      report.pendingSkills = unusedIds.length;
    }
  }

  if (seededAppUserIds.length > 0) {
    const { error } = await supabase.from("users").delete().in("id", seededAppUserIds);
    if (error) throw new Error(`Unable to delete seeded app users: ${error.message}`);
    report.appUsers = seededAppUserIds.length;
  }

  for (const user of await listSeedAuthUsers()) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`Unable to delete Auth user ${user.email}: ${error.message}`);
    report.authUsers += 1;
  }

  return report;
}
