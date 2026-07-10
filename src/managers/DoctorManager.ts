import chalk from "chalk";
import semver from "semver";
import { vaultPaths } from "../config/paths.js";
import { builtInBundles } from "../config/bundles.js";
import { PackVaultDatabase } from "../db/database.js";
import { CacheManager } from "./CacheManager.js";
import { readPackageJsonDeps } from "../utils/projectConfig.js";
import type { DoctorReport, ProjectDoctorEntry } from "../types/index.js";
import path from "node:path";
import fs from "fs-extra";

/** Represents the DoctorManager class. */
export class DoctorManager {
  /**
     * Creates a new instance.
     * @param database - The database parameter.
     * @param cache - The cache parameter.
     */
    constructor(
    private readonly database: PackVaultDatabase,
    private readonly cache: CacheManager
  ) {}

  /**
     * Executes inspect operation.
     * @param options - The options parameter.
     * @returns The inspect result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.inspect();
     * ```
     */
    async inspect(options: { fix?: boolean } = {}): Promise<DoctorReport> {
    const packages = this.database.listPackages();
    const cachedNames = new Set(packages.map((p) => p.name));
    const requiredNames = new Set(builtInBundles.flatMap((b) => b.packages));
    const missingFromBundles = [...requiredNames].filter((n) => !cachedNames.has(n));
    const storageBytes = await this.cache.storageUsage(vaultPaths.cache);

    const bundleBreakdown: Record<string, { cached: number; total: number; bytes: number }> = {};
    for (const bundle of builtInBundles) {
      const cached = bundle.packages.filter((p) => cachedNames.has(p)).length;
      const bytes = packages
        .filter((p) => bundle.packages.includes(p.name))
        .reduce((sum, p) => sum + p.size, 0);
      bundleBreakdown[bundle.name] = { cached, total: bundle.packages.length, bytes };
    }

    const sorted = [...packages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const dbPaths = new Set(packages.map((p) => p.cachePath));
    const diskFiles = await this.cache.listCacheFiles(vaultPaths.cache);
    const orphanedFiles = diskFiles.filter((f) => !dbPaths.has(f));
    const orphanedRows = packages.filter((p) => !diskFiles.includes(p.cachePath));

    if (options.fix) {
      for (const file of orphanedFiles) await fs.remove(file);
      for (const row of orphanedRows) await this.database.deletePackage(row.name, row.version);
    }

    const healthScore = requiredNames.size === 0
      ? 100
      : Math.round(((requiredNames.size - missingFromBundles.length) / requiredNames.size) * 100);

    return {
      packages,
      storageBytes,
      missingFromBundles,
      healthScore,
      bundleBreakdown,
      oldest: sorted[0],
      newest: sorted.at(-1),
      orphanedFiles,
      orphanedRows
    };
  }

  /**
     * Executes inspectProject operation.
     * @param projectPath - The projectPath parameter.
     * @returns The inspectProject result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.inspectProject();
     * ```
     */
    async inspectProject(projectPath: string): Promise<ProjectDoctorEntry[]> {
    const deps = await readPackageJsonDeps(path.resolve(projectPath));
    const entries: ProjectDoctorEntry[] = [];

    for (const [name, range] of Object.entries(deps)) {
      const candidates = this.database.listPackages().filter((p) => p.name === name);
      const satisfying = semver.maxSatisfying(
        candidates.map((p) => p.version).filter((v) => semver.valid(v)),
        range
      );
      entries.push({
        spec: `${name}@${range}`,
        name,
        range,
        cached: !!satisfying,
        resolvedVersion: satisfying ?? undefined
      });
    }
    return entries;
  }

  /**
     * Executes printReport operation.
     * @param report - The report parameter.
     * @param fix - The fix parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.printReport();
     * ```
     */
    printReport(report: DoctorReport, fix = false): void {
    console.log(chalk.bold("\nVault Health Report"));
    console.log("─".repeat(40));

    const healthColor = report.healthScore >= 80 ? chalk.green : report.healthScore >= 50 ? chalk.yellow : chalk.red;
    console.log(`Health Score: ${healthColor(`${report.healthScore}%`)}`);
    console.log(`Packages: ${report.packages.length}`);
    console.log(`Storage: ${report.storageBytes}`);

    if (report.bundleBreakdown) {
      console.log(chalk.bold("\nBundle Coverage:"));
      for (const [name, data] of Object.entries(report.bundleBreakdown)) {
        const pct = Math.round((data.cached / data.total) * 100);
        const color = pct === 100 ? chalk.green : pct >= 50 ? chalk.yellow : chalk.red;
        console.log(`  ${name.padEnd(12)} ${color(`${data.cached}/${data.total}`)} (${pct}%)`);
      }
    }

    if (report.oldest) console.log(`\nOldest: ${report.oldest.name}@${report.oldest.version} (${report.oldest.createdAt})`);
    if (report.newest) console.log(`Newest: ${report.newest.name}@${report.newest.version} (${report.newest.createdAt})`);

    if (report.orphanedFiles?.length) {
      console.log(chalk.yellow(`\n⚠ ${report.orphanedFiles.length} orphaned tarball(s) on disk`));
    }
    if (report.orphanedRows?.length) {
      console.log(chalk.yellow(`⚠ ${report.orphanedRows.length} DB row(s) with missing tarballs`));
    }
    if (fix) console.log(chalk.green("\n✓ Orphans cleaned."));
  }

  /**
     * Executes printProjectReport operation.
     * @param projectPath - The projectPath parameter.
     * @param entries - The entries parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.printProjectReport();
     * ```
     */
    printProjectReport(projectPath: string, entries: ProjectDoctorEntry[]): void {
    console.log(`\nProject: ${projectPath}`);
    console.log("─".repeat(40));
    const cached = entries.filter((e) => e.cached).length;

    for (const entry of entries) {
      const status = entry.cached
        ? chalk.green(`✓ ${entry.resolvedVersion} cached`)
        : chalk.red("✗ NOT CACHED");
      console.log(`${entry.spec.padEnd(22)} ${status}`);
    }

    const pct = entries.length ? Math.round((cached / entries.length) * 100) : 100;
    console.log("─".repeat(40));
    console.log(`Offline readiness: ${pct}% (${cached}/${entries.length} packages cached)`);
    const missing = entries.filter((e) => !e.cached).map((e) => e.name);
    if (missing.length) {
      console.log(`Missing: run \`packvault sync ${missing.join(" ")}\``);
    }
  }
}
