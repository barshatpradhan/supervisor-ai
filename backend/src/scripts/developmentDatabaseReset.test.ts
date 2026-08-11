import assert from "node:assert/strict";
import test from "node:test";
import {
  PROJECT_DOCUMENT_BUCKET,
  RESET_DELETE_ORDER,
  getResetSafetyErrors,
  resetDevelopmentDatabase,
} from "./developmentDatabaseReset.js";
import type { DevelopmentResetClient, ResetLogger } from "./developmentDatabaseReset.js";

function createLogger() {
  const warnings: string[] = [];
  const logger: ResetLogger = {
    error: () => undefined,
    log: () => undefined,
    warn: (message) => warnings.push(message),
  };
  return { logger, warnings };
}

function createClient() {
  const deletedTables: string[] = [];
  const authUserIds: string[] = [];
  const storageBuckets: string[] = [];
  const removedStoragePaths: string[][] = [];

  const client: DevelopmentResetClient = {
    from: (table) => ({
      select: () => ({
        returns: async <T>() => ({
          data: (table === "users"
            ? [{ auth_user_id: "auth-user-1" }, { auth_user_id: "auth-user-2" }]
            : []) as T[],
          error: null,
        }),
      }),
      delete: () => ({
        not: () => ({
          select: async () => {
            deletedTables.push(table);
            return { data: [{ id: `${table}-1` }], error: null };
          },
        }),
      }),
    }),
    storage: {
      from: (bucket) => ({
        list: async (prefix) => {
          storageBuckets.push(bucket);
          if (!prefix) return { data: [{ id: null, name: "project-1" }], error: null };
          if (prefix === "project-1") return { data: [{ id: "file-1", name: "brief.pdf" }], error: null };
          return { data: [], error: null };
        },
        remove: async (paths) => {
          storageBuckets.push(bucket);
          removedStoragePaths.push(paths);
          return { data: null, error: null };
        },
      }),
    },
    auth: {
      admin: {
        deleteUser: async (authUserId) => {
          authUserIds.push(authUserId);
          return { data: null, error: null };
        },
      },
    },
  };

  return { authUserIds, client, deletedTables, removedStoragePaths, storageBuckets };
}

test("reset safety requires development opt-in and explicit confirmation", () => {
  assert.deepEqual(
    getResetSafetyErrors(
      { NODE_ENV: "production", APP_ENV: "development", ALLOW_DATABASE_RESET: "true" },
      ["--confirm"]
    ),
    ["NODE_ENV=production is not permitted."]
  );
  assert.deepEqual(getResetSafetyErrors({}, ["--confirm"]), [
    "APP_ENV must be development.",
    "ALLOW_DATABASE_RESET must be true.",
  ]);
  assert.deepEqual(
    getResetSafetyErrors({ APP_ENV: "development" }, ["--confirm"]),
    ["ALLOW_DATABASE_RESET must be true."]
  );
  assert.deepEqual(
    getResetSafetyErrors({ APP_ENV: "development", ALLOW_DATABASE_RESET: "true" }, []),
    ["--confirm is required."]
  );
});

test("development reset removes only application data in dependency order", async () => {
  const { authUserIds, client, deletedTables, removedStoragePaths, storageBuckets } = createClient();
  const { logger, warnings } = createLogger();

  const summary = await resetDevelopmentDatabase(client, logger);

  assert.deepEqual(deletedTables, [...RESET_DELETE_ORDER]);
  assert.deepEqual(authUserIds, ["auth-user-1", "auth-user-2"]);
  assert.deepEqual(removedStoragePaths, [["project-1/brief.pdf"]]);
  assert.deepEqual([...new Set(storageBuckets)], [PROJECT_DOCUMENT_BUCKET]);
  assert.equal(summary.authUsers, 2);
  assert.equal(summary.storageFiles, 1);
  assert.equal(summary.tableRows.users, 1);
  assert.ok(warnings.some((message) => message.includes("platform_admin")));
  assert.ok(!deletedTables.includes("schema_migrations" as never));
  assert.ok(!deletedTables.includes("storage.objects" as never));
});
