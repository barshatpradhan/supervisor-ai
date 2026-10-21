/**
 * Integration tests create and delete real users, organizations and rows through the configured
 * Supabase project. Call this at the top of such a test file so it refuses to run unless
 * SUPABASE_URL points at a local, disposable database. Set INTEGRATION_TESTS_ALLOW_REMOTE=true
 * only when you really mean to run against a remote project.
 */
export function requireDisposableDatabase(suite: string) {
  const host = new URL(process.env.SUPABASE_URL ?? "http://invalid").hostname;
  if (["127.0.0.1", "localhost"].includes(host) || process.env.INTEGRATION_TESTS_ALLOW_REMOTE === "true") return;

  throw new Error(
    `Refusing to run ${suite} against ${host}: it writes real data. Point SUPABASE_URL at a disposable ` +
      "local database, or set INTEGRATION_TESTS_ALLOW_REMOTE=true if you really mean it."
  );
}
