import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;

    const key = trimmed.slice(0, idx).trim();
    if (!key || process.env[key] != null) continue;

    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function migrationDatabaseUrl() {
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;

  const url = process.env.DATABASE_URL;
  if (!url) return null;

  // Supabase transaction pooler (6543) cannot run Prisma migrations.
  let migrate = url
    .replace(":6543/", ":5432/")
    .replace(/[?&]pgbouncer=true/g, "")
    .replace(/[?&]$/, "");

  if (!/sslmode=/.test(migrate)) {
    migrate += migrate.includes("?") ? "&sslmode=require" : "?sslmode=require";
  }
  return migrate;
}

loadDotEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Add your Supabase connection string to .env first.");
  process.exit(1);
}

const migrateUrl = migrationDatabaseUrl();
if (!migrateUrl) {
  console.error("Could not derive migration database URL.");
  process.exit(1);
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = migrateUrl;
}

console.log("Turning on Supabase persistence for Agora...");
run("npm", ["run", "prisma:generate"]);
console.log("Applying migrations via session/direct connection (port 5432)...");
run("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: migrateUrl });
run("npm", ["run", "prisma:seed"]);
run("npm", ["run", "db:verify"]);
console.log("Supabase turn-on complete. Re-test /developer: API keys and strategies should persist after reload.");
