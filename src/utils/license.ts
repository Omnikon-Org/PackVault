import fs from "fs-extra";
import path from "node:path";
import chalk from "chalk";
import { vaultPaths } from "../config/paths.js";

const LICENSE_FILE = path.join(vaultPaths.root, "license.json");

export async function activateLicense(key: string): Promise<void> {
  if (!key.startsWith("pv_")) {
    throw new Error("Invalid license key. PackVault license keys must start with 'pv_'.");
  }

  await fs.ensureDir(vaultPaths.root);
  await fs.writeJson(LICENSE_FILE, { key, activatedAt: new Date().toISOString() }, { spaces: 2 });
  console.log(chalk.green(`✓ License activated successfully! Paid features unlocked.`));
}

export async function requireLicense(): Promise<void> {
  try {
    const data = await fs.readJson(LICENSE_FILE);
    if (!data || !data.key || !data.key.startsWith("pv_")) {
      throw new Error("Invalid license found.");
    }
  } catch (error) {
    console.error(chalk.red("This is a paid feature."));
    console.error(chalk.yellow("To use LAN sharing, mDNS discovery, and P2P sync, please activate your license."));
    console.error(chalk.dim("Example: packvault activate pv_YOUR_LICENSE_KEY"));
    process.exit(1);
  }
}
