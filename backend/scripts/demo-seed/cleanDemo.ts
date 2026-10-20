/**
 * Removes everything the demo seed created: the "Demo Org [SEED]" organization and all of
 * its data, its stored documents, and every seed+*@example.test app user and Auth user.
 *
 *   npm run seed:demo:clean -- --confirm
 */
import { assertSafeToRun, cleanDemoData, DEMO_ORG_NAME } from "./shared.js";

async function main() {
  assertSafeToRun(`delete "${DEMO_ORG_NAME}" and all seed+*@example.test accounts`);
  const report = await cleanDemoData();

  console.log("\nDemo data removed:");
  console.log(`  organization deleted: ${report.organization ? "yes" : "none found"}`);
  console.log(`  stored document files: ${report.documentFiles}`);
  console.log(`  app users: ${report.appUsers}`);
  console.log(`  Auth users: ${report.authUsers}\n`);
}

main().catch((error: unknown) => {
  console.error(`\nCleanup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
