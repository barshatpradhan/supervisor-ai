import {
  getResetSafetyErrors,
  printResetSummary,
  resetDevelopmentDatabase,
} from "./developmentDatabaseReset.js";
import type { DevelopmentResetClient } from "./developmentDatabaseReset.js";

const logger = console;
const safetyErrors = getResetSafetyErrors(process.env, process.argv.slice(2));

if (safetyErrors.length > 0) {
  logger.error("Database reset aborted.");
  for (const error of safetyErrors) {
    logger.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  void (async () => {
    const { supabase } = await import("../config/supabase.js");
    const summary = await resetDevelopmentDatabase(
      supabase as unknown as DevelopmentResetClient,
      logger
    );
    printResetSummary(logger, summary);
  })().catch((error: unknown) => {
    logger.error("Database reset aborted.");
    logger.error(error instanceof Error ? error.message : "Database reset failed.");
    process.exitCode = 1;
  });
}
