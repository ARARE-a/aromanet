import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apply = process.argv.includes("--apply");
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");

const showcaseEmails = [
  process.env.AROMANET_SHOWCASE_STORE_EMAIL || "showcase-store@aromanet.club",
  process.env.AROMANET_SHOWCASE_THERAPIST_EMAIL || "showcase-therapist@aromanet.club",
  process.env.AROMANET_SHOWCASE_CUSTOMER_EMAIL || "showcase-customer@aromanet.club",
];

function runScript(scriptName, args, env = process.env) {
  const result = spawnSync(process.execPath, [path.join(scriptDir, scriptName), ...args], {
    cwd: rootDir,
    env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${scriptName} failed with exit code ${result.status}`);
  }
}

if (!apply) {
  console.log(JSON.stringify({
    mode: "dry-run",
    targetAccounts: showcaseEmails,
    steps: [
      "Delete showcase-linked reservations, messages, notifications, posts, shifts, sales, payrolls, and accounts.",
      "Recreate the showcase store, therapist, customer, menus, shifts, reservations, messages, post, story, review, sales, and payroll.",
    ],
    note: "Pass --apply to reset production showcase data. DATABASE_URL is required when applying.",
  }, null, 2));
  process.exit(0);
}

try {
  const cleanupEnv = {
    ...process.env,
    QA_ACCOUNT_PATTERNS: showcaseEmails.join(","),
  };

  console.log("==> Cleaning current showcase data...");
  runScript("cleanup-smoke-data.mjs", ["--apply"], cleanupEnv);

  console.log("==> Recreating showcase data...");
  runScript("setup-showcase-data.mjs", ["--apply"], process.env);

  console.log("==> Showcase reset complete.");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
