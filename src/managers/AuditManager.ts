import chalk from "chalk";
import semver from "semver";
import { PackVaultDatabase } from "../db/database.js";
import { readPackageJsonDeps } from "../utils/projectConfig.js";
import path from "node:path";

/** Represents the AuditManager class. */
export class AuditManager {
  /**
     * Creates a new instance.
     * @param database - The database parameter.
     */
    constructor(private readonly database: PackVaultDatabase) {}

  /**
     * Executes audit operation.
     * @param options - The options parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.audit();
     * ```
     */
    async audit(options: { project?: string; fix?: boolean } = {}): Promise<void> {
    let packageNames: string[];

    if (options.project) {
      const deps = await readPackageJsonDeps(path.resolve(options.project));
      packageNames = Object.keys(deps);
    } else {
      packageNames = [...new Set(this.database.listPackages().map((p) => p.name))];
    }

    const advisories = this.database.listAdvisories(packageNames);
    const packages = this.database.listPackages();

    const vulns: Array<{ name: string; version: string; severity: string; title: string }> = [];

    for (const adv of advisories) {
      const affected = packages.filter(
        (p) => p.name === adv.packageName && semver.satisfies(p.version, adv.versionRange)
      );
      for (const pkg of affected) {
        vulns.push({ name: pkg.name, version: pkg.version, severity: adv.severity, title: adv.title });
      }
    }

    if (vulns.length === 0) {
      console.log(chalk.green("No vulnerabilities found in cached packages."));
      return;
    }

    console.log("┌─────────────────────────────────────────────────────┐");
    console.log("│ VULNERABILITY REPORT                                │");
    console.log("├──────────────┬─────────┬──────────┬────────────────┤");
    console.log("│ Package      │ Version │ Severity │ Advisory        │");
    console.log("├──────────────┼─────────┼──────────┼────────────────┤");

    for (const v of vulns) {
      const title = v.title.slice(0, 16).padEnd(16);
      console.log(`│ ${v.name.padEnd(12)} │ ${v.version.padEnd(7)} │ ${v.severity.padEnd(8)} │ ${title} │`);
    }

    console.log("└──────────────┴─────────┴──────────┴────────────────┘");
    const names = [...new Set(vulns.map((v) => v.name))];
    console.log(`${vulns.length} vulnerabilities found. Run \`packvault sync ${names.join(" ")}\` to update.`);

    if (options.fix) {
      console.log(chalk.yellow("\nRecommended updates:"));
      for (const name of names) {
        console.log(`  packvault sync ${name}`);
      }
    }
  }
}
