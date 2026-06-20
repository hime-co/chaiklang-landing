// Build/deploy stamp — captured at build time (works locally and in CI).
// Shown in the footer so we can debug "which commit/when is live".
import { execSync } from "node:child_process";

function sh(cmd: string): string {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

const envCommit = process.env.GITHUB_SHA || process.env.CF_PAGES_COMMIT_SHA || "";
const envBranch = process.env.GITHUB_REF_NAME || process.env.CF_PAGES_BRANCH || "";

const commit = (envCommit || sh("git rev-parse HEAD")).slice(0, 7) || "unknown";
const branch = envBranch || sh("git rev-parse --abbrev-ref HEAD") || "main";
const tag = sh("git describe --tags --exact-match 2>/dev/null") || sh("git describe --tags --abbrev=0 2>/dev/null") || "";

let builtAt = "unknown";
try {
  builtAt =
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Bangkok",
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date()) + " GMT+7";
} catch {
  /* keep fallback */
}

export const BUILD = { commit, branch, tag, builtAt };
