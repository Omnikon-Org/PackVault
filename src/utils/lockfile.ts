import path from "node:path";
import fs from "fs-extra";
import type { LockfileEntry } from "../types/index.js";

const LOCKFILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"] as const;

/**
 * Function detectLockfile.
 * @param dir - The dir parameter.
 */
export function detectLockfile(dir = process.cwd()): string | undefined {
  for (const name of LOCKFILES) {
    const full = path.join(dir, name);
    if (fs.existsSync(full)) return full;
  }
  return undefined;
}

/**
 * Function parseLockfile.
 * @param filePath - The filePath parameter.
 */
export async function parseLockfile(filePath?: string): Promise<LockfileEntry[]> {
  const resolved = filePath ?? detectLockfile();
  if (!resolved) {
    throw new Error("No lockfile found. Expected package-lock.json, yarn.lock, or pnpm-lock.yaml.");
  }

  const base = path.basename(resolved);
  const content = await fs.readFile(resolved, "utf8");

  if (base === "package-lock.json") return parseNpmLock(content);
  if (base === "yarn.lock") return parseYarnLock(content);
  if (base === "pnpm-lock.yaml") return parsePnpmLock(content);

  throw new Error(`Unsupported lockfile: ${base}`);
}

function parseNpmLock(content: string): LockfileEntry[] {
  const data = JSON.parse(content) as {
    packages?: Record<string, { name?: string; version?: string }>;
    dependencies?: Record<string, { version: string }>;
  };

  const entries = new Map<string, LockfileEntry>();

  if (data.packages) {
    for (const [key, pkg] of Object.entries(data.packages)) {
      if (!pkg.version || key === "") continue;
      const name = pkg.name ?? key.replace(/^node_modules\//, "");
      if (name && !name.startsWith("node_modules")) {
        entries.set(`${name}@${pkg.version}`, { name, version: pkg.version });
      }
    }
  }

  if (data.dependencies) {
    for (const [name, dep] of Object.entries(data.dependencies)) {
      const version = dep.version.replace(/^npm:/, "");
      entries.set(`${name}@${version}`, { name, version });
    }
  }

  return [...entries.values()];
}

function parseYarnLock(content: string): LockfileEntry[] {
  const entries = new Map<string, LockfileEntry>();
  const blocks = content.split(/\n\n+/);

  for (const block of blocks) {
    if (!block.trim() || block.startsWith("#")) continue;
    const header = block.split("\n")[0] ?? "";
    const versionMatch = block.match(/^\s+version\s+"([^"]+)"/m);
    if (!versionMatch) continue;

    const version = versionMatch[1];
    const names = header.split(",").map((s) => s.trim().replace(/"/g, "").replace(/@$/, ""));

    for (const spec of names) {
      const atIdx = spec.lastIndexOf("@");
      const name = atIdx > 0 ? spec.slice(0, atIdx) : spec;
      if (name && version) {
        entries.set(`${name}@${version}`, { name, version });
      }
    }
  }

  return [...entries.values()];
}

function parsePnpmLock(content: string): LockfileEntry[] {
  const entries = new Map<string, LockfileEntry>();
  const lines = content.split("\n");
  let currentKey = "";

  for (const line of lines) {
    const pkgMatch = line.match(/^  \/(@?[^@/][^@]*|@[^/]+\/[^@]+)@([^:]+):/);
    if (pkgMatch) {
      currentKey = pkgMatch[1];
      const version = pkgMatch[2].split("(")[0];
      entries.set(`${currentKey}@${version}`, { name: currentKey, version });
      continue;
    }

    const verMatch = line.match(/^\s+version:\s+([^\s(]+)/);
    if (verMatch && currentKey) {
      const version = verMatch[1];
      entries.set(`${currentKey}@${version}`, { name: currentKey, version });
    }
  }

  return [...entries.values()];
}
