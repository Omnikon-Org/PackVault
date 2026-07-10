import chalk from "chalk";
import cron from "node-cron";
import { loadVaultConfig, saveVaultConfig } from "../utils/config.js";
import { PackVaultDatabase } from "../db/database.js";
import type { PackageManager } from "./PackageManager.js";

let scheduledTask: cron.ScheduledTask | undefined;

/** Represents the ScheduleManager class. */
export class ScheduleManager {
  /**
     * Creates a new instance.
     * @param database - The database parameter.
     * @param packages - The packages parameter.
     */
    constructor(
    private readonly database: PackVaultDatabase,
    private readonly packages: PackageManager
  ) {}

  /**
     * Executes enable operation.
     * @param every - The every parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.enable();
     * ```
     */
    async enable(every: string): Promise<void> {
    const hours = parseEvery(every);
    const cronExpr = `0 */${hours} * * *`;

    if (scheduledTask) scheduledTask.stop();

    scheduledTask = cron.schedule(cronExpr, async () => {
      await this.runSync();
    });

    const config = await loadVaultConfig();
    config.schedule = { enabled: true, every, nextRun: getNextRun(hours) };
    await saveVaultConfig(config);

    console.log(chalk.green(`Scheduled sync every ${every}.`));
    console.log(`Next run: ${config.schedule.nextRun}`);
  }

  /**
     * Executes status operation.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.status();
     * ```
     */
    async status(): Promise<void> {
    const config = await loadVaultConfig();
    if (!config.schedule?.enabled) {
      console.log("Scheduled sync is disabled.");
      return;
    }
    console.log(`Enabled: every ${config.schedule.every}`);
    console.log(`Next run: ${config.schedule.nextRun ?? "unknown"}`);
  }

  /**
     * Executes disable operation.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.disable();
     * ```
     */
    async disable(): Promise<void> {
    if (scheduledTask) {
      scheduledTask.stop();
      scheduledTask = undefined;
    }
    const config = await loadVaultConfig();
    config.schedule = { enabled: false, every: config.schedule?.every ?? "24h" };
    await saveVaultConfig(config);
    console.log(chalk.yellow("Scheduled sync disabled."));
  }

  private async runSync(): Promise<void> {
    const pkgs = this.database.listPackages();
    const names = [...new Set(pkgs.map((p) => p.name))];
    console.log(chalk.dim(`[schedule] Syncing ${names.length} known packages...`));
    await this.packages.sync(names);
    await this.database.addLog("sync", `scheduled sync of ${names.length} packages`, "schedule");
  }
}

function parseEvery(every: string): number {
  const match = every.match(/^(\d+)h$/);
  if (!match) throw new Error(`Invalid interval "${every}". Use format like 24h.`);
  return parseInt(match[1], 10);
}

function getNextRun(hours: number): string {
  return new Date(Date.now() + hours * 3600000).toISOString();
}
