import { spawn } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";

const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error("Missing ADMIN_PASSWORD build secret.");
  process.exit(1);
}

const secretsFile = "/tmp/zaal-runtime-secrets.json";

await writeFile(
  secretsFile,
  JSON.stringify({ ADMIN_PASSWORD: password }),
  { mode: 0o600 },
);

let exitCode = 1;

try {
  exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["wrangler", "deploy", "--secrets-file", secretsFile],
      { stdio: "inherit" },
    );

    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
} finally {
  await rm(secretsFile, { force: true });
}

process.exit(exitCode);
