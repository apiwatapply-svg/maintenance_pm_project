const { readdirSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const testsDir = resolve(__dirname, "../../tests/unit");
const testFiles = readdirSync(testsDir)
  .filter((file) => file.endsWith(".test.js"))
  .map((file) => join(testsDir, file));

if (testFiles.length === 0) {
  console.error(`No unit tests found in ${testsDir}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
