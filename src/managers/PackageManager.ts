import path from "node:path";
import fs from "fs-extra";
import * as tar from "tar";
import semver from "semver";
import chalk from "chalk";
import type { CachedPackage, InstallResult, SyncOptions, SyncResult, SyncSummary } from "../types/index.js";
import { PackVaultDatabase } from "../db/database.js";
import { CacheManager } from "./CacheManager.js";
import { RegistryManager } from "./RegistryManager.js";
import { runPool } from "../utils/concurrency.js";
import { loadVaultConfig, getRegistryForPackage } from "../utils/config.js";
import { enforcePolicy } from "../utils/policy.js";
import { PackVaultError } from "../utils/errors.js";
import { parseLockfile } from "../utils/lockfile.js";
import { readPackageJsonDeps } from "../utils/projectConfig.js";

export class PackageManager {
  constructor(
    private readonly database: PackVaultDatabase,
    private readonly registry: RegistryManager,
    private readonly cache: CacheManager
  ) {}

  async syncFromLockfile(lockfilePath?: string, options: SyncOptions = {}): Promise<SyncSummary> {
    const entries = await parseLockfile(lockfilePath);
    console.log(`Found ${entries.length} packages in lockfile. Syncing...`);
    const specs = entries.map((e) => `${e.name}@${e.version}`);
    return this.sync(specs, { ...options, dependencies: false });
  }

  async sync(packages: string[], options: SyncOptions = {}): Promise<SyncSummary> {
    const config = await loadVaultConfig();
    const concurrency = Math.min(Math.max(options.concurrency ?? 5, 1), 20);
    const specs = packages.map((s) => this.parsePackageSpec(s));
    const toSync: Array<{ name: string; version: string }> = [];
    let skipped = 0;

    for (const spec of specs) {
      enforcePolicy(spec.name, config, "sync");
      const resolved = await this.resolveSpec(spec, options);
      const key = `${resolved.name}@${resolved.version}`;
      if (await this.isFullyCached(resolved.name, resolved.version)) {
        console.log(chalk.dim(`→ ${key} already cached, skipping`));
        skipped++;
        continue;
      }
      toSync.push(resolved);
    }

    const visited = new Set<string>();
    const results: SyncResult[] = [];
    const queue = [...toSync];

    while (queue.length > 0) {
      const batch = queue.splice(0, concurrency);
      const batchResults = await runPool(batch, concurrency, async (spec) => {
        const key = `${spec.name}@${spec.version}`;
        if (visited.has(key)) return null;
        visited.add(key);

        if (await this.isFullyCached(spec.name, spec.version)) {
          console.log(chalk.dim(`→ ${key} already cached, skipping`));
          skipped++;
          return { name: spec.name, version: spec.version, cachePath: "", size: 0, dependencyCount: 0, skipped: true };
        }

        const reg = getRegistryForPackage(spec.name, config, options);
        const registry = new RegistryManager(reg.url, reg.token ?? options.token);
        const metadata = await registry.resolveVersion(spec.name, spec.version);
        const stream = await registry.downloadTarball(metadata.dist.tarball);
        const cached = await this.cache.writeTarball(metadata, stream);

        const advisories = await registry.fetchAdvisories([cached.name]);
        await this.database.clearAdvisoriesForPackage(cached.name);
        for (const adv of advisories) {
          await this.database.upsertAdvisory({ ...adv, createdAt: new Date().toISOString() });
        }

        const deps = options.dependencies === false ? [] : Object.entries(cached.dependencies);
        for (const [depName, depRange] of deps) {
          const depKey = `${depName}@${depRange}`;
          if (!visited.has(depKey)) {
            queue.push({ name: depName, version: depRange });
          }
        }

        await this.database.upsertPackage(cached);
        await this.database.addLog("sync", `${cached.name}@${cached.version}`, "cli");

        return {
          name: cached.name,
          version: cached.version,
          cachePath: cached.cachePath,
          size: cached.size,
          dependencyCount: deps.length
        };
      });

      for (const r of batchResults) {
        if (r && !r.skipped) results.push(r);
      }
    }

    const synced = results.length;
    if (synced > 0 || skipped > 0) {
      console.log(chalk.green(`Synced ${synced} new package${synced === 1 ? "" : "s"}, skipped ${skipped} already cached.`));
    }

    return { results, synced, skipped };
  }

  async install(name: string, targetProject: string = process.cwd(), version?: string): Promise<InstallResult> {
    const config = await loadVaultConfig();
    enforcePolicy(name, config, "install");

    const range = version ?? await this.getDepRange(name, targetProject);
    const cached = version
      ? this.database.findPackage(name, version)
      : this.resolveForInstall(name, targetProject, range);

    if (!cached) {
      const range = version ?? await this.getDepRange(name, targetProject);
      throw new PackVaultError(
        "install",
        `${name}@${range ?? version ?? "latest"} — no cached version satisfies this range.`,
        `Run: packvault sync ${name}`
      );
    }

    if (!(await this.cache.hasTarball(cached))) {
      throw new PackVaultError("install", `Tarball missing for ${name}@${cached.version}.`, `Run: packvault sync ${name}`);
    }

    const valid = await this.cache.verifyCached(cached);
    if (!valid) {
      throw new PackVaultError("install", `Integrity check failed for ${name}@${cached.version}.`, `Run: packvault sync ${name} to re-download.`);
    }

    const installed = await this.installPackageTree(cached, targetProject, new Set());
    await this.database.updateAccessedAt(cached.name, cached.version);
    await this.database.addLog("install", `${cached.name}@${cached.version} → ${targetProject}`, "cli");

    return { installed, rootPath: path.join(targetProject, "node_modules", name) };
  }

  async installFromPackageJson(projectPath: string = process.cwd()): Promise<InstallResult[]> {
    const deps = await readPackageJsonDeps(projectPath);
    const results: InstallResult[] = [];
    for (const name of Object.keys(deps)) {
      results.push(await this.install(name, projectPath));
    }
    return results;
  }

  async syncBundle(bundleName: string, options: SyncOptions = {}): Promise<SyncSummary> {
    const bundle = this.database.listBundles().find((b) => b.name === bundleName);
    if (!bundle) throw new PackVaultError("bundle", `Unknown bundle "${bundleName}".`, "Run packvault bundle list.");
    return this.sync(bundle.packages, options);
  }

  resolveForInstall(name: string, targetProject: string, range?: string): CachedPackage | undefined {
    const candidates = this.database.listPackages().filter((p) => p.name === name);
    if (candidates.length === 0) return undefined;

    if (range) {
      const satisfying = semver.maxSatisfying(
        candidates.map((p) => p.version).filter((v) => semver.valid(v)),
        range
      );
      return satisfying ? candidates.find((p) => p.version === satisfying) : undefined;
    }

    return candidates.at(-1);
  }

  private async getDepRange(name: string, projectPath: string): Promise<string | undefined> {
    try {
      const deps = await readPackageJsonDeps(projectPath);
      return deps[name];
    } catch {
      return undefined;
    }
  }

  private async resolveSpec(
    spec: { name: string; version: string },
    options: SyncOptions
  ): Promise<{ name: string; version: string }> {
    if (spec.version !== "latest" && semver.valid(spec.version)) {
      return spec;
    }
    const config = await loadVaultConfig();
    const reg = getRegistryForPackage(spec.name, config, options);
    const registry = new RegistryManager(reg.url, reg.token ?? options.token);
    const meta = await registry.resolveVersion(spec.name, spec.version);
    return { name: meta.name, version: meta.version };
  }

  private async isFullyCached(name: string, version: string): Promise<boolean> {
    const cached = this.database.findPackage(name, version);
    if (!cached) return false;
    if (!(await this.cache.hasTarball(cached))) return false;
    return this.cache.verifyCached(cached);
  }

  private parsePackageSpec(spec: string): { name: string; version: string } {
    if (spec.startsWith("@")) {
      const index = spec.lastIndexOf("@");
      if (index > 0) return { name: spec.slice(0, index), version: spec.slice(index + 1) };
      return { name: spec, version: "latest" };
    }
    const [name, version = "latest"] = spec.split("@");
    return { name, version };
  }

  private async installPackageTree(
    cached: CachedPackage,
    targetProject: string,
    installed: Set<string>
  ): Promise<string[]> {
    const key = `${cached.name}@${cached.version}`;
    if (installed.has(key)) return [];
    installed.add(key);

    await this.extractCachedPackage(cached, targetProject);
    const names = [key];

    for (const [depName, depRange] of Object.entries(cached.dependencies)) {
      const dep = this.findCachedDependency(depName, depRange);
      if (!dep) {
        throw new PackVaultError(
          "install",
          `${cached.name}@${cached.version} depends on ${depName}@${depRange}, but it is not cached.`,
          `Run: packvault sync ${cached.name}`
        );
      }
      const valid = await this.cache.verifyCached(dep);
      if (!valid) {
        throw new PackVaultError("install", `Integrity check failed for ${depName}@${dep.version}.`, `Run: packvault sync ${depName}`);
      }
      names.push(...await this.installPackageTree(dep, targetProject, installed));
    }
    return names;
  }

  private async extractCachedPackage(cached: CachedPackage, targetProject: string): Promise<void> {
    const packageRoot = path.join(targetProject, "node_modules", cached.name);
    await fs.remove(packageRoot);
    await fs.ensureDir(packageRoot);
    await tar.x({ file: cached.cachePath, cwd: packageRoot, strip: 1 });
  }

  private findCachedDependency(name: string, range: string): CachedPackage | undefined {
    const candidates = this.database.listPackages().filter((p) => p.name === name);
    const exact = candidates.find((p) => p.version === range);
    if (exact) return exact;

    const satisfying = semver.maxSatisfying(
      candidates.map((p) => p.version).filter((v) => semver.valid(v)),
      range
    );
    return satisfying ? candidates.find((p) => p.version === satisfying) : undefined;
  }
}
