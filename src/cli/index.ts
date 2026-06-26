#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import ora from "ora";
import { PackVaultDatabase } from "../db/database.js";
import { CacheManager } from "../managers/CacheManager.js";
import { PackageManager } from "../managers/PackageManager.js";
import { RegistryManager } from "../managers/RegistryManager.js";
import { BundleManager } from "../managers/BundleManager.js";
import { TemplateManager } from "../managers/TemplateManager.js";
import { DoctorManager } from "../managers/DoctorManager.js";
import { PeerManager } from "../managers/PeerManager.js";
import { LocalRegistryServer } from "../server/LocalRegistryServer.js";
import { SearchManager } from "../managers/SearchManager.js";
import { PruneManager } from "../managers/PruneManager.js";
import { ExportManager } from "../managers/ExportManager.js";
import { AuditManager } from "../managers/AuditManager.js";
import { PolicyManager } from "../managers/PolicyManager.js";
import { DiffManager } from "../managers/DiffManager.js";
import { ScheduleManager } from "../managers/ScheduleManager.js";
import { SnapshotManager } from "../managers/SnapshotManager.js";
import { formatBytes } from "../utils/format.js";
import { handleCommandError } from "../utils/errors.js";
import { loadProjectConfig, scaffoldProjectConfig } from "../utils/projectConfig.js";
import { activateLicense, requireLicense } from "../utils/license.js";
import { generateCompletion } from "./completion.js";
import { isKnownFramework, isKnownTemplate, knownTemplates, normalizeTemplateName, runCreateWizard } from "./createWizard.js";

async function createServices() {
  const database = new PackVaultDatabase();
  await database.initialize();
  const cache = new CacheManager();
  const registry = new RegistryManager();
  const bundles = new BundleManager(database);
  await bundles.seedBuiltIns();
  const packages = new PackageManager(database, registry, cache);

  return {
    database, cache, registry, packages, bundles,
    templates: new TemplateManager(),
    doctor: new DoctorManager(database, cache),
    peers: new PeerManager(database, cache),
    server: new LocalRegistryServer(database, cache, registry),
    search: new SearchManager(database),
    prune: new PruneManager(database),
    export: new ExportManager(database),
    audit: new AuditManager(database),
    policy: new PolicyManager(),
    diff: new DiffManager(database),
    schedule: new ScheduleManager(database, packages),
    snapshot: new SnapshotManager(database, packages)
  };
}

const program = new Command();
program.name("packvault").description("Offline-first package caching and LAN distribution.").version("0.2.0");

program
  .command("sync [packages...]")
  .option("--from-lockfile [path]", "sync all packages from a lockfile")
  .option("--no-dependencies", "cache only requested package roots")
  .option("--concurrency <n>", "parallel downloads", "5")
  .option("--registry <url>", "custom npm registry URL")
  .option("--token <token>", "registry auth token")
  .description("Download package metadata and tarballs into the local vault.")
  .action(async (pkgs: string[], opts: Record<string, string | boolean | undefined>) => {
    const services = await createServices();
    try {
      const concurrency = Number(opts.concurrency);
      const syncOpts = {
        dependencies: opts.dependencies !== false,
        concurrency,
        registry: opts.registry as string | undefined,
        token: opts.token as string | undefined
      };

      if (opts.fromLockfile !== undefined) {
        const lockPath = typeof opts.fromLockfile === "string" ? opts.fromLockfile : undefined;
        const summary = await services.packages.syncFromLockfile(lockPath, syncOpts);
        for (const r of summary.results) {
          console.log(`${chalk.green("cached")} ${r.name}@${r.version} ${chalk.dim(formatBytes(r.size))}`);
        }
        return;
      }

      let targets = pkgs;
      if (targets.length === 0) {
        const config = await loadProjectConfig();
        targets = config?.packages ?? [];
        if (targets.length === 0) {
          throw new Error("No packages specified. Pass package names, use --from-lockfile, or add packages to packvault.config.js.");
        }
      }

      const summary = await services.packages.sync(targets, syncOpts);
      for (const r of summary.results) {
        console.log(`${chalk.green("cached")} ${r.name}@${r.version} ${chalk.dim(formatBytes(r.size))}`);
      }
    } catch (e) { handleCommandError("sync", e); }
    finally { services.database.close(); }
  });

program
  .command("install [package]")
  .option("-v, --version <version>", "specific cached version")
  .option("-d, --directory <path>", "target project directory", process.cwd())
  .option("--from-package-json", "install all deps from package.json")
  .description("Install cached packages into node_modules.")
  .action(async (pkg: string | undefined, opts: { version?: string; directory: string; fromPackageJson?: boolean }) => {
    const services = await createServices();
    const spinner = ora("Installing from cache").start();
    try {
      if (opts.fromPackageJson || !pkg) {
        spinner.stop();
        const results = await services.packages.installFromPackageJson(opts.directory);
        console.log(chalk.green(`Installed ${results.reduce((s, r) => s + r.installed.length, 0)} packages into ${opts.directory}`));
      } else {
        const target = await services.packages.install(pkg, opts.directory, opts.version);
        spinner.succeed(`Installed ${target.installed.length} package(s) into ${target.rootPath}`);
      }
    } catch (e) {
      spinner.fail(e instanceof Error ? e.message : String(e));
      handleCommandError("install", e);
    } finally { services.database.close(); }
  });

program
  .command("create")
  .argument("[target]", "project name or template")
  .argument("[project-name]", "directory name when first arg is a template")
  .option("-i, --install", "install cached template dependencies")
  .description("Create a new project from a template.")
  .action(async (target: string | undefined, projectName: string | undefined, opts: { install?: boolean }) => {
    const services = await createServices();
    let spinner: ReturnType<typeof ora> | undefined;
    try {
      const selection = await resolveCreateSelection(target, projectName);
      const template = normalizeTemplateName(selection.templateName);
      spinner = ora(`Creating ${selection.projectName} from ${template}`).start();
      const created = await services.templates.create(template, selection.projectName);
      spinner.succeed(`Created ${created}`);
      if (opts.install) {
        const deps = await readTemplateDependencies(created);
        if (deps.length) {
          spinner = ora(`Installing ${deps.length} dependencies`).start();
          for (const dep of deps) await services.packages.install(dep, created);
          spinner.succeed(`Installed cached dependencies into ${created}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (spinner) spinner.fail(msg); else console.error(chalk.red(msg));
      process.exitCode = 1;
    } finally { services.database.close(); }
  });

program
  .command("doctor")
  .option("--project [path]", "check offline readiness for a project")
  .option("--fix", "auto-clean orphaned files and DB rows")
  .description("Inspect vault health and project offline readiness.")
  .action(async (opts: { project?: string; fix?: boolean }) => {
    const services = await createServices();
    try {
      if (opts.project !== undefined) {
        const projectPath = typeof opts.project === "string" ? opts.project : ".";
        const entries = await services.doctor.inspectProject(projectPath);
        services.doctor.printProjectReport(projectPath, entries);
      } else {
        const report = await services.doctor.inspect({ fix: opts.fix });
        services.doctor.printReport(report, !!opts.fix);
      }
    } finally { services.database.close(); }
  });

const bundleCmd = program.command("bundle").description("Manage and sync package bundles.");

bundleCmd
  .command("save <name> <packages...>")
  .description("Save a custom bundle.")
  .action(async (name: string, packages: string[]) => {
    const services = await createServices();
    try { await services.bundles.save(name, packages); }
    catch (e) { handleCommandError("bundle", e); }
    finally { services.database.close(); }
  });

bundleCmd
  .command("delete <name>")
  .description("Delete a custom bundle.")
  .action(async (name: string) => {
    const services = await createServices();
    try { await services.bundles.remove(name); }
    catch (e) { handleCommandError("bundle", e); }
    finally { services.database.close(); }
  });

bundleCmd
  .command("list")
  .description("List all bundles.")
  .action(async () => {
    const services = await createServices();
    try { services.bundles.printList(services.database); }
    finally { services.database.close(); }
  });

bundleCmd
  .command("sync <name>")
  .option("--concurrency <n>", "parallel downloads", "5")
  .description("Sync a bundle.")
  .action(async (name: string, opts: { concurrency: string }) => {
    const services = await createServices();
    try {
      const summary = await services.packages.syncBundle(name, { concurrency: Number(opts.concurrency) });
      for (const r of summary.results) console.log(`${chalk.green("cached")} ${r.name}@${r.version}`);
    } catch (e) { handleCommandError("bundle", e); }
    finally { services.database.close(); }
  });

bundleCmd
  .argument("[name]", "bundle name to sync")
  .option("--concurrency <n>", "parallel downloads", "5")
  .action(async (name: string | undefined, opts: { concurrency: string }) => {
    if (!name) return;
    const services = await createServices();
    try {
      const summary = await services.packages.syncBundle(name, { concurrency: Number(opts.concurrency) });
      for (const r of summary.results) console.log(`${chalk.green("cached")} ${r.name}@${r.version}`);
    } catch (e) { handleCommandError("bundle", e); }
    finally { services.database.close(); }
  });

program
  .command("activate <key>")
  .description("Activate PackVault license to unlock paid features.")
  .action(async (key: string) => {
    try {
      await activateLicense(key);
    } catch (e) {
      handleCommandError("activate", e);
    }
  });

program
  .command("serve")
  .option("-p, --port <port>", "port", "4873")
  .option("--token <token>", "auth token")
  .description("Serve cached packages as an npm registry with proxy mode.")
  .action(async (opts: { port: string; token?: string }) => {
    await requireLicense();
    const services = await createServices();
    await services.server.start(Number(opts.port), { token: opts.token, proxy: true });
  });

program
  .command("share")
  .option("-p, --port <port>", "port", "4873")
  .option("--token <token>", "auth token")
  .description("Share vault on LAN with mDNS discovery.")
  .action(async (opts: { port: string; token?: string }) => {
    await requireLicense();
    const services = await createServices();
    console.log(chalk.bold("Sharing PackVault cache on your local network."));
    await services.server.start(Number(opts.port), { token: opts.token, proxy: true });
  });

program
  .command("connect [ip]")
  .option("-p, --port <port>", "remote port", "4873")
  .option("--token <token>", "auth token")
  .option("--bidirectional", "sync both directions")
  .description("Connect to another PackVault node.")
  .action(async (ip: string | undefined, opts: { port: string; token?: string; bidirectional?: boolean }) => {
    await requireLicense();
    const services = await createServices();
    const spinner = ora("Connecting").start();
    try {
      const imported = ip
        ? await services.peers.connect(ip, Number(opts.port), { token: opts.token, bidirectional: opts.bidirectional })
        : await services.peers.interactiveConnect({ token: opts.token });
      spinner.succeed(`Imported ${imported.length} package(s).`);
    } catch (e) {
      spinner.fail(e instanceof Error ? e.message : String(e));
      handleCommandError("connect", e);
    } finally { services.database.close(); }
  });

program
  .command("discover")
  .description("Scan LAN for PackVault nodes via mDNS.")
  .action(async () => {
    await requireLicense();
    const services = await createServices();
    try {
      const peers = await services.peers.discover();
      if (!peers.length) { console.log("No PackVault nodes found."); return; }
      console.log(`Found ${peers.length} PackVault node(s):`);
      for (const p of peers) {
        console.log(`→ ${p.hostname}  ${p.ip}:${p.port}  ${p.packages} packages`);
      }
    } finally { services.database.close(); }
  });

program
  .command("search [query]")
  .option("--all", "list all cached packages")
  .option("--versions", "show all versions")
  .description("Search cached packages.")
  .action(async (query: string | undefined, opts: { all?: boolean; versions?: boolean }) => {
    const services = await createServices();
    try { services.search.search(query ?? "", { all: opts.all, versions: opts.versions }); }
    finally { services.database.close(); }
  });

program
  .command("prune")
  .option("--older-than <days>", "remove packages not accessed in N days (e.g. 90d)")
  .option("--keep-latest", "keep only latest version per package")
  .option("--dry-run", "preview without removing")
  .description("Remove unused cached packages.")
  .action(async (opts: { olderThan?: string; keepLatest?: boolean; dryRun?: boolean }) => {
    const services = await createServices();
    try {
      await services.prune.prune({
        olderThan: opts.olderThan,
        keepLatest: opts.keepLatest,
        dryRun: opts.dryRun,
        interactive: !opts.dryRun && !opts.olderThan && !opts.keepLatest
      });
    } catch (e) { handleCommandError("prune", e); }
    finally { services.database.close(); }
  });

program
  .command("export")
  .requiredOption("-o, --output <path>", "output archive path")
  .option("--bundle <name>", "export a single bundle")
  .option("--packages <list>", "comma-separated package names")
  .description("Export vault or subset as tar.gz.")
  .action(async (opts: { output: string; bundle?: string; packages?: string }) => {
    const services = await createServices();
    try {
      await services.export.export({
        output: opts.output,
        bundle: opts.bundle,
        packages: opts.packages?.split(",")
      });
    } catch (e) { handleCommandError("export", e); }
    finally { services.database.close(); }
  });

program
  .command("import <archive>")
  .description("Import packages from an export archive.")
  .action(async (archive: string) => {
    const services = await createServices();
    try { await services.export.import(archive); }
    catch (e) { handleCommandError("import", e); }
    finally { services.database.close(); }
  });

program
  .command("log")
  .option("--last <n>", "number of entries", "20")
  .option("--action <type>", "filter by action")
  .option("--clear", "clear all logs")
  .description("View audit log.")
  .action(async (opts: { last: string; action?: string; clear?: boolean }) => {
    const services = await createServices();
    try {
      if (opts.clear) { await services.database.clearLogs(); console.log("Logs cleared."); return; }
      const entries = services.database.listLogs({ last: Number(opts.last), action: opts.action });
      for (const e of entries) {
        console.log(`${chalk.dim(e.createdAt)} ${chalk.bold(e.action)} ${e.detail ?? ""}`);
      }
    } finally { services.database.close(); }
  });

program
  .command("audit")
  .option("--project <path>", "audit packages used in a project")
  .option("--fix", "show recommended updates")
  .description("Offline vulnerability audit of cached packages.")
  .action(async (opts: { project?: string; fix?: boolean }) => {
    const services = await createServices();
    try { await services.audit.audit(opts); }
    finally { services.database.close(); }
  });

const policyCmd = program.command("policy").description("Manage package allow/block policy.");

policyCmd.command("allow <packages...>").action(async (packages: string[]) => {
  const services = await createServices();
  try { await services.policy.allow(packages); } finally { services.database.close(); }
});

policyCmd.command("block <packages...>").action(async (packages: string[]) => {
  const services = await createServices();
  try { await services.policy.block(packages); } finally { services.database.close(); }
});

policyCmd.command("list").action(async () => {
  const services = await createServices();
  try { await services.policy.list(); } finally { services.database.close(); }
});

policyCmd.command("clear").action(async () => {
  const services = await createServices();
  try { await services.policy.clear(); } finally { services.database.close(); }
});

program
  .command("diff")
  .option("--since <period>", "time period e.g. 7d", "7d")
  .option("--bundle <name>", "filter by bundle")
  .description("Show vault changes since a time period.")
  .action(async (opts: { since: string; bundle?: string }) => {
    const services = await createServices();
    try { services.diff.diff(opts); } finally { services.database.close(); }
  });

program
  .command("schedule")
  .option("--every <interval>", "auto-sync interval e.g. 24h")
  .option("--status", "show schedule status")
  .option("--disable", "disable scheduled sync")
  .description("Configure automatic sync schedule.")
  .action(async (opts: { every?: string; status?: boolean; disable?: boolean }) => {
    const services = await createServices();
    try {
      if (opts.status) await services.schedule.status();
      else if (opts.disable) await services.schedule.disable();
      else if (opts.every) await services.schedule.enable(opts.every);
      else await services.schedule.status();
    } catch (e) { handleCommandError("schedule", e); }
    finally { services.database.close(); }
  });

const snapshotCmd = program.command("snapshot").description("Create or restore project snapshots.");

snapshotCmd
  .command("restore <archive>")
  .description("Restore a snapshot archive.")
  .action(async (archive: string) => {
    const services = await createServices();
    try { await services.snapshot.restore(archive); }
    catch (e) { handleCommandError("snapshot", e); }
    finally { services.database.close(); }
  });

snapshotCmd
  .argument("[project]", "project directory", ".")
  .option("-o, --output <path>", "output path", "snapshot.vault")
  .action(async (project: string, opts: { output: string }) => {
    const services = await createServices();
    try { await services.snapshot.create(project, opts.output); }
    catch (e) { handleCommandError("snapshot", e); }
    finally { services.database.close(); }
  });

program
  .command("init")
  .description("Scaffold packvault.config.js in current directory.")
  .action(async () => {
    const target = await scaffoldProjectConfig();
    console.log(chalk.green(`Created ${target}`));
  });

program
  .command("completion")
  .requiredOption("--shell <shell>", "shell type: bash, zsh, or fish")
  .description("Generate shell completion script.")
  .action(async (opts: { shell: string }) => {
    const services = await createServices();
    try { console.log(generateCompletion(opts.shell, services.database)); }
    finally { services.database.close(); }
  });

program
  .command("classroom")
  .option("--host", "start as classroom host")
  .option("--join", "join classroom host")
  .description("Workshop mode for sharing packages with students.")
  .action(async (opts: { host?: boolean; join?: boolean }) => {
    const services = await createServices();
    try {
      if (opts.host) {
        const count = services.database.listPackages().length;
        console.log(chalk.bold("🎓 PackVault Classroom Host"));
        console.log(`Sharing ${count} packages with your students`);
        await services.server.start(4873, { proxy: true });
      } else if (opts.join) {
        const peers = await services.peers.discover();
        if (!peers.length) throw new Error("No classroom host found.");
        const host = peers[0];
        console.log(chalk.bold("🎓 Joining classroom host"));
        console.log(`Connecting to ${host.hostname} (${host.ip}:${host.port})`);
        const imported = await services.peers.connect(host.ip, host.port);
        console.log(chalk.green(`Synced ${imported.length} packages. Complete!`));
        services.database.close();
      } else {
        console.log("Use --host or --join.");
        services.database.close();
      }
    } catch (e) {
      handleCommandError("classroom", e);
      services.database.close();
    }
  });

program
  .command("bundles")
  .description("List available bundles (alias).")
  .action(async () => {
    const services = await createServices();
    try { services.bundles.printList(services.database); }
    finally { services.database.close(); }
  });

program.parseAsync(process.argv).catch((e: unknown) => {
  handleCommandError("packvault", e);
});

async function resolveCreateSelection(target?: string, projectName?: string) {
  if (!target) return runCreateWizard();
  if (isKnownTemplate(target)) return { templateName: target, projectName: projectName ?? target };
  if (isKnownFramework(target)) return runCreateWizard(projectName ?? `my-${target}-app`, target);
  if (projectName) throw new Error(`Unknown template "${target}". Available: ${knownTemplates().join(", ")}.`);
  return runCreateWizard(target);
}

async function readTemplateDependencies(projectPath: string): Promise<string[]> {
  const pkgPath = path.join(projectPath, "package.json");
  if (!(await fs.pathExists(pkgPath))) return [];
  const pkg = await fs.readJson(pkgPath) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  return [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
}
