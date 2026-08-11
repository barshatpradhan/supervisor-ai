export const PROJECT_DOCUMENT_BUCKET = "project-documents";

export const RESET_DELETE_ORDER = [
  "activity_logs",
  "ai_recommendations",
  "task_progress",
  "tasks",
  "project_document_analyses",
  "project_documents",
  "projects",
  "employee_skills",
  "employees",
  "supervisors",
  "skills",
  "organization_invitations",
  "organization_members",
  "organizations",
  "users",
] as const;

interface ResetResult<T> {
  data: T | null;
  error: { message?: string | null } | null;
}

interface ResetTableClient {
  select: (columns: string) => {
    returns: <T>() => Promise<ResetResult<T[]>>;
  };
  delete: () => {
    not: (column: string, operator: string, value: string) => {
      select: (columns: string) => Promise<ResetResult<Array<{ id: string }>>>;
    };
  };
}

interface StorageListEntry {
  id: string | null;
  name: string;
}

export interface DevelopmentResetClient {
  from: (table: string) => ResetTableClient;
  storage: {
    from: (bucket: string) => {
      list: (prefix: string, options: { limit: number; offset: number }) => Promise<ResetResult<StorageListEntry[]>>;
      remove: (paths: string[]) => Promise<ResetResult<unknown>>;
    };
  };
  auth: {
    admin: {
      deleteUser: (authUserId: string) => Promise<ResetResult<unknown>>;
    };
  };
}

export interface ResetEnvironment {
  APP_ENV?: string;
  ALLOW_DATABASE_RESET?: string;
  NODE_ENV?: string;
}

export interface DevelopmentResetSummary {
  authUsers: number;
  storageFiles: number;
  tableRows: Record<string, number>;
}

export interface ResetLogger {
  error: (message: string) => void;
  log: (message: string) => void;
  warn: (message: string) => void;
}

export function getResetSafetyErrors(environment: ResetEnvironment, args: readonly string[]) {
  const errors: string[] = [];

  if (environment.NODE_ENV === "production") {
    errors.push("NODE_ENV=production is not permitted.");
  }
  if (environment.APP_ENV !== "development") {
    errors.push("APP_ENV must be development.");
  }
  if (environment.ALLOW_DATABASE_RESET !== "true") {
    errors.push("ALLOW_DATABASE_RESET must be true.");
  }
  if (!args.includes("--confirm")) {
    errors.push("--confirm is required.");
  }

  return errors;
}

function assertResetResult(error: { message?: string | null } | null, action: string) {
  if (error) {
    throw new Error(`${action} failed.`);
  }
}

async function listStoragePaths(
  client: DevelopmentResetClient,
  prefix = ""
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage
      .from(PROJECT_DOCUMENT_BUCKET)
      .list(prefix, { limit: 1000, offset });
    assertResetResult(error, "Listing project document storage");

    const entries = data ?? [];
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        paths.push(...(await listStoragePaths(client, path)));
      } else {
        paths.push(path);
      }
    }

    if (entries.length < 1000) {
      return paths;
    }
    offset += entries.length;
  }
}

async function deleteStorageFiles(client: DevelopmentResetClient) {
  const paths = await listStoragePaths(client);

  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await client.storage
      .from(PROJECT_DOCUMENT_BUCKET)
      .remove(paths.slice(index, index + 100));
    assertResetResult(error, "Removing project document storage");
  }

  return paths.length;
}

async function readApplicationAuthUserIds(client: DevelopmentResetClient) {
  const { data, error } = await client
    .from("users")
    .select("auth_user_id")
    .returns<{ auth_user_id: string }>();
  assertResetResult(error, "Reading application users");
  return (data ?? []).map((user) => user.auth_user_id);
}

async function deleteTable(client: DevelopmentResetClient, table: string) {
  const { data, error } = await client
    .from(table)
    .delete()
    .not("id", "is", "null")
    .select("id");
  assertResetResult(error, `Deleting ${table}`);
  return (data ?? []).length;
}

async function deleteApplicationAuthUsers(client: DevelopmentResetClient, authUserIds: string[]) {
  for (const authUserId of authUserIds) {
    const { error } = await client.auth.admin.deleteUser(authUserId);
    assertResetResult(error, "Removing linked Supabase Auth user");
  }
  return authUserIds.length;
}

export async function resetDevelopmentDatabase(
  client: DevelopmentResetClient,
  logger: ResetLogger
): Promise<DevelopmentResetSummary> {
  logger.warn("WARNING: This reset will remove any existing platform_admin account.");
  logger.warn("You must recreate a normal user and run:");
  logger.warn("npm run bootstrap:first-platform-admin");

  const authUserIds = await readApplicationAuthUserIds(client);
  const storageFiles = await deleteStorageFiles(client);
  const tableRows: Record<string, number> = {};

  for (const table of RESET_DELETE_ORDER) {
    tableRows[table] = await deleteTable(client, table);
  }

  const authUsers = await deleteApplicationAuthUsers(client, authUserIds);

  return { authUsers, storageFiles, tableRows };
}

export function printResetSummary(logger: ResetLogger, summary: DevelopmentResetSummary) {
  logger.log("Supervisor AI development database reset complete.");
  logger.log("\nRemoved:");
  logger.log(`- ${summary.authUsers} linked Supabase Auth users`);
  logger.log(`- ${summary.storageFiles} project document storage files`);
  logger.log("- application users, organizations, memberships, profiles, invitations, projects, tasks, progress, recommendations, and document data");
  logger.log("\nPreserved:");
  logger.log("- schema, migrations, RLS, functions, triggers, enums, and storage buckets");
  logger.log("\nNext steps:");
  logger.log("1. Create a normal user account for the platform administrator.");
  logger.log("2. Confirm its Supabase Auth email.");
  logger.log("3. Set PLATFORM_ADMIN_BOOTSTRAP_EMAIL.");
  logger.log("4. Set PLATFORM_ADMIN_BOOTSTRAP_CONFIRM=grant-first-platform-admin.");
  logger.log("5. Run npm run bootstrap:first-platform-admin.");
  logger.log("6. Register a separate normal customer through the public frontend.");
}
