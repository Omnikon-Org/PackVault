#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { PackVaultDatabase } from "../db/database.js";
import { CacheManager } from "../managers/CacheManager.js";
import { RegistryManager } from "../managers/RegistryManager.js";
import { PackageManager } from "../managers/PackageManager.js";
import { BundleManager } from "../managers/BundleManager.js";
import { TemplateManager } from "../managers/TemplateManager.js";
import { DoctorManager } from "../managers/DoctorManager.js";
import { PeerManager } from "../managers/PeerManager.js";
import { LocalRegistryServer } from "../server/LocalRegistryServer.js";
import { formatBytes, titleCase } from "../utils/format.js";
import { isKnownFramework, isKnownTemplate, knownTemplates, normalizeTemplateName, runCreateWizard } from "./createWizard.js";

async function createServices(): Promise<{
  database: PackVaultDatabase;
  cache: CacheManager;
  packages: PackageManager;
  bundles: BundleManager;
  templates: TemplateManager;
  doctor: DoctorManager;
  peers: PeerManager;
  server: LocalRegistryServer;
}> {
  const database = new PackVaultDatabase();
  await database.initialize();

  const cache = new CacheManager();
  const registry = new RegistryManager();
  const bundles = new BundleManager(database);
  await bundles.seedBuiltIns();

  return {
    database,
    cache,
    packages: new PackageManager(database, registry, cache),
    bundles,
    templates: new TemplateManager(),
    doctor: new DoctorManager(database, cache),
    peers: new PeerManager(database, cache),
    server: new LocalRegistryServer(database)
  };
}

const program = new Command();

program
  .name("packvault")
  .description("Offline-first package caching and LAN distribution for JavaScript developers.")
  .version("0.1.0");

program
  .command("sync")
  .argument("<packages...>", "npm packages to download and cache")
  .description("Download package metadata and tarballs into the local vault.")
  .action(async (packages: string[]) => {
    const services = await createServices();
    try {
      const results = await services.packages.sync(packages);
      for (const result of results) {
        console.log(`${chalk.green("cached")} ${result.name}@${result.version} ${chalk.dim(formatBytes(result.size))}`);
      }
    } finally {
      services.database.close();
    }
  });

program
  .command("install")
  .argument("<package>", "package name to install from cache")
  .option("-v, --version <version>", "specific cached version")
  .option("-d, --directory <path>", "target project directory", process.cwd())
  .description("Install a cached package into the current project's node_modules.")
  .action(async (packageName: string, options: { version?: string; directory: string }) => {
    const services = await createServices();
    const spinner = ora(`Installing ${packageName} from cache`).start();
    try {
      const target = await services.packages.install(packageName, options.directory, options.version);
      spinner.succeed(`Installed ${packageName} into ${target}`);
    } catch (error) {
      spinner.fail(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    } finally {
      services.database.close();
    }
  });

program
  .command("create")
  .argument("[target]", "project name or template name")
  .argument("[project-name]", "project directory name when the first argument is a template")
  .description("Create a new project from an offline Vite-style wizard or template.")
  .action(async (target?: string, projectName?: string) => {
    const services = await createServices();
    let spinner: ReturnType<typeof ora> | undefined;

    try {
      const selection = await resolveCreateSelection(target, projectName);
      const resolvedTemplate = normalizeTemplateName(selection.templateName);
      const resolvedProject = selection.projectName;
      spinner = ora(`Creating ${resolvedProject} from ${resolvedTemplate}`).start();
      const createdPath = await services.templates.create(resolvedTemplate, resolvedProject);
      spinner.succeed(`Created ${createdPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (spinner) {
        spinner.fail(message);
      } else {
        console.error(chalk.red(message));
      }
      process.exitCode = 1;
    } finally {
      services.database.close();
    }
  });

program
  .command("doctor")
  .description("Inspect cache health, storage usage, and bundle coverage.")
  .action(async () => {
    const services = await createServices();
    try {
      const report = await services.doctor.inspect();
      const cachedNames = new Set(report.packages.map((pkg) => pkg.name));
      const bundlePackages = new Set(services.bundles.list().flatMap((bundle) => bundle.packages));

      for (const packageName of bundlePackages) {
        const status = cachedNames.has(packageName) ? chalk.green("Cached") : chalk.red("Missing");
        console.log(`${titleCase(packageName).padEnd(14)} ${status}`);
      }

      console.log("");
      console.log(`Packages: ${report.packages.length}`);
      console.log(`Storage: ${formatBytes(report.storageBytes)}`);
      console.log(`Vault Health: ${report.healthScore}%`);
    } finally {
      services.database.close();
    }
  });

program
  .command("bundle")
  .argument("<name>", "bundle name: frontend, backend, fullstack")
  .description("Sync a predefined package bundle.")
  .action(async (bundleName: string) => {
    const services = await createServices();
    try {
      const results = await services.packages.syncBundle(bundleName);
      for (const result of results) {
        console.log(`${chalk.green("cached")} ${result.name}@${result.version}`);
      }
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    } finally {
      services.database.close();
    }
  });

program
  .command("serve")
  .option("-p, --port <port>", "local registry port", "4873")
  .description("Serve cached packages over HTTP for local and LAN clients.")
  .action(async (options: { port: string }) => {
    const services = await createServices();
    await services.server.start(Number(options.port));
  });

program
  .command("share")
  .option("-p, --port <port>", "local sharing port", "4873")
  .description("Share this PackVault cache with nearby machines on the same LAN.")
  .action(async (options: { port: string }) => {
    const services = await createServices();
    const port = Number(options.port);
    console.log(chalk.bold("Sharing PackVault cache on your local network."));
    console.log(`Other machines can import packages with: ${chalk.cyan(`packvault connect <your-ip> --port ${port}`)}`);
    await services.server.start(port);
  });

program
  .command("connect")
  .argument("<ip>", "PackVault node IP address")
  .option("-p, --port <port>", "remote node port", "4873")
  .description("Connect to another PackVault node and import missing packages.")
  .action(async (ip: string, options: { port: string }) => {
    const services = await createServices();
    const spinner = ora(`Connecting to ${ip}:${options.port}`).start();

    try {
      const imported = await services.peers.connect(ip, Number(options.port));
      spinner.succeed(`Imported ${imported.length} missing package${imported.length === 1 ? "" : "s"}.`);
    } catch (error) {
      spinner.fail(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    } finally {
      services.database.close();
    }
  });

program
  .command("bundles")
  .description("List available bundles.")
  .action(async () => {
    const services = await createServices();
    try {
      for (const bundle of services.bundles.list()) {
        console.log(`${chalk.bold(bundle.name)}: ${bundle.packages.join(", ")}`);
      }
    } finally {
      services.database.close();
    }
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});

async function resolveCreateSelection(
  target?: string,
  projectName?: string
): Promise<{ templateName: string; projectName: string }> {
  if (!target) {
    return runCreateWizard();
  }

  if (isKnownTemplate(target)) {
    return {
      templateName: target,
      projectName: projectName ?? target
    };
  }

  if (isKnownFramework(target)) {
    return runCreateWizard(projectName ?? `my-${target}-app`, target);
  }

  if (projectName) {
    throw new Error(`Unknown template "${target}". Available templates: ${knownTemplates().join(", ")}.`);
  }

  return runCreateWizard(target);
}
