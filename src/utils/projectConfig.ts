import path from "node:path";
import fs from "fs-extra";
import type { ProjectConfig } from "../types/index.js";

const CONFIG_NAMES = ["packvault.config.js", ".packvaultrc.json"] as const;

/**
 * Function loadProjectConfig.
 * @param dir - The dir parameter.
 */
export async function loadProjectConfig(dir: string = process.cwd()): Promise<ProjectConfig | undefined> {
  for (const name of CONFIG_NAMES) {
    const full = path.join(dir, name);
    if (!(await fs.pathExists(full))) continue;

    if (name.endsWith(".json")) {
      return fs.readJson(full) as ProjectConfig;
    }

    const { pathToFileURL } = await import("node:url");
    const mod = await import(pathToFileURL(full).href);
    return (mod.default ?? mod) as ProjectConfig;
  }
  return undefined;
}

/**
 * Function scaffoldProjectConfig.
 * @param dir - The dir parameter.
 */
export async function scaffoldProjectConfig(dir: string = process.cwd()): Promise<string> {
  const target = path.join(dir, "packvault.config.js");
  const content = `export default {
  bundle: 'frontend',
  packages: ['react', 'vite', 'tailwindcss'],
  registry: 'https://registry.npmjs.org',
  concurrency: 5,
};
`;
  await fs.writeFile(target, content);
  return target;
}

/**
 * Function readPackageJsonDeps.
 * @param projectPath - The projectPath parameter.
 */
export async function readPackageJsonDeps(projectPath: string): Promise<Record<string, string>> {
  const pkgPath = path.join(projectPath, "package.json");
  if (!(await fs.pathExists(pkgPath))) {
    throw new Error(`No package.json found at ${projectPath}`);
  }
  const pkg = await fs.readJson(pkgPath) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
  return {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
    ...pkg.optionalDependencies
  };
}
