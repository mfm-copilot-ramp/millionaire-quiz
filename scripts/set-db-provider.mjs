import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const target = process.argv[2];
const valid = ["sqlite", "postgresql"];

if (!valid.includes(target)) {
  console.error(`Usage: node scripts/set-db-provider.mjs <${valid.join("|")}>`);
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, "..", "prisma", "schema.prisma");
let schema = readFileSync(schemaPath, "utf8");

const providerRegex = /provider\s*=\s*"(sqlite|postgresql)"/;
if (!providerRegex.test(schema)) {
  console.error("Could not find a datasource provider line in prisma/schema.prisma.");
  process.exit(1);
}

schema = schema.replace(providerRegex, `provider = "${target}"`);
writeFileSync(schemaPath, schema);
console.log(`Datasource provider set to "${target}". Run "prisma generate" next.`);
