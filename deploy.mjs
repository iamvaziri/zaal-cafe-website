import { writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
const password = process.env.ADMIN_PASSWORD;
if (!password) throw new Error("ADMIN_PASSWORD is missing from the Cloudflare build environment.");
const secretsFile = `/tmp/zaal-runtime-secrets-${process.pid}.json`;
await writeFile(secretsFile, JSON.stringify({ ADMIN_PASSWORD: password }), { mode: 0o600 });
try {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["wrangler", "deploy", "--secrets-file", secretsFile], { stdio: "inherit", env: process.env });
    child.on("error", reject); child.on("close", resolve);
  });
  if (code !== 0) process.exitCode = code;
} finally { await rm(secretsFile, { force: true }); }
