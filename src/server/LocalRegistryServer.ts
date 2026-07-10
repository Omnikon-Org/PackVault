import express from "express";
import fs from "fs-extra";
import semver from "semver";
import chalk from "chalk";
import { PackVaultDatabase } from "../db/database.js";
import { CacheManager } from "../managers/CacheManager.js";
import { RegistryManager } from "../managers/RegistryManager.js";
import { getLanAddresses } from "../utils/network.js";
import { startMdnsBroadcast } from "../utils/discovery.js";
import { webUiHtml } from "./webUi.js";
import type { CachedPackage } from "../types/index.js";

/** Interface for ServerOptions */
export interface ServerOptions {
  port?: number;
  token?: string;
  proxy?: boolean;
}

/** Represents the LocalRegistryServer class. */
export class LocalRegistryServer {
  /**
     * Creates a new instance.
     * @param database - The database parameter.
     * @param cache - The cache parameter.
     * @param registry - The registry parameter.
     */
    constructor(
    private readonly database: PackVaultDatabase,
    private readonly cache: CacheManager = new CacheManager(),
    private readonly registry: RegistryManager = new RegistryManager()
  ) {}

  /**
     * Executes start operation.
     * @param port - The port parameter.
     * @param options - The options parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.start();
     * ```
     */
    async start(port = 4873, options: ServerOptions = {}): Promise<void> {
    const app = express();
    const authToken = options.token;

    if (!authToken) {
      console.log(chalk.yellow("⚠ Server running without authentication. Anyone on your LAN can access your vault."));
    }

    app.use((req, res, next) => {
      if (authToken) {
        const header = req.headers.authorization ?? "";
        if (header !== `Bearer ${authToken}`) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
      }
      next();
    });

    app.get("/ui", (_req, res) => {
      res.type("html").send(webUiHtml);
    });

    app.get("/-/packvault/health", (_req, res) => {
      res.json({ ok: true, packages: this.database.listPackages().length, addresses: getLanAddresses() });
    });

    app.get("/packages", (_req, res) => {
      res.json(this.database.listPackages().map((p) => ({ name: p.name, version: p.version })));
    });

    app.get("/-/packvault/packages", (_req, res) => {
      res.json(this.database.listPackages());
    });

    app.get("/-/packvault/tarball", async (req, res, next) => {
      try {
        const name = String(req.query.name ?? "");
        const version = String(req.query.version ?? "");
        const cached = this.database.findPackage(name, version);
        if (!cached || !(await fs.pathExists(cached.cachePath))) {
          res.status(404).json({ error: "Package tarball not found." });
          return;
        }
        res.download(cached.cachePath);
      } catch (error) {
        next(error);
      }
    });

    app.get(/^\/(@[^/]+)\/([^/]+)$/, (req, res) => {
      this.handlePackageRequest(`${req.params[0]}/${req.params[1]}`, req, res, options);
    });

    app.get("/:name", (req, res) => {
      this.handlePackageRequest(req.params.name, req, res, options);
    });

    app.listen(port, "0.0.0.0", () => {
      console.log(chalk.bold(`PackVault registry running at http://localhost:${port}`));
      console.log(`Set as default: ${chalk.cyan(`npm config set registry http://localhost:${port}`)}`);
      console.log(`Web UI: ${chalk.cyan(`http://localhost:${port}/ui`)}`);
      if (options.proxy !== false) {
        console.log(chalk.dim("Proxy mode: uncached packages will be fetched from npmjs.org"));
      }
      for (const addr of getLanAddresses()) {
        console.log(`LAN: http://${addr}:${port}`);
      }
      startMdnsBroadcast(port, this.database.listPackages().length);
    });
  }

  private async handlePackageRequest(
    name: string,
    req: express.Request,
    res: express.Response,
    options: ServerOptions
  ): Promise<void> {
    const packages = this.database.listPackages().filter((p) => p.name === name);

    if (packages.length > 0) {
      this.sendCachedMetadata(name, packages, req, res);
      return;
    }

    if (options.proxy === false) {
      res.status(404).json({ error: `${name} is not cached.` });
      return;
    }

    const online = await this.registry.isOnline();
    if (!online) {
      res.status(503).json({ error: "offline", message: `Package not cached. Run: packvault sync ${name}` });
      return;
    }

    try {
      const metadata = await this.registry.getPackageMetadata(name);
      res.json(metadata);

      const latest = metadata.versions[metadata["dist-tags"].latest];
      if (latest) {
        this.cacheAndStore(latest).catch(() => {});
      }
    } catch {
      res.status(404).json({ error: `${name} not found.` });
    }
  }

  private async cacheAndStore(metadata: { name: string; version: string; dist: { tarball: string; integrity?: string; shasum?: string }; dependencies?: Record<string, string> }): Promise<void> {
    const existing = this.database.findPackage(metadata.name, metadata.version);
    if (existing && await this.cache.hasTarball(existing)) return;

    const stream = await this.registry.downloadTarball(metadata.dist.tarball);
    const cached = await this.cache.writeTarball(
      { name: metadata.name, version: metadata.version, dist: metadata.dist, dependencies: metadata.dependencies },
      stream
    );
    await this.database.upsertPackage(cached);
    await this.database.addLog("sync", `${cached.name}@${cached.version} (proxy)`, "serve");
  }

  private sendCachedMetadata(
    name: string,
    packages: CachedPackage[],
    req: express.Request,
    res: express.Response
  ): void {
    const sorted = [...packages].sort((a, b) => semver.compare(a.version, b.version));
    const versions = Object.fromEntries(sorted.map((pkg) => [pkg.version, this.toNpmVersion(pkg, req)]));
    res.json({ name, "dist-tags": { latest: sorted.at(-1)?.version }, versions });
  }

  private toNpmVersion(pkg: CachedPackage, req: express.Request): Record<string, unknown> {
    return {
      name: pkg.name,
      version: pkg.version,
      dependencies: pkg.dependencies,
      dist: {
        tarball: `${req.protocol}://${req.get("host")}/-/packvault/tarball?name=${encodeURIComponent(pkg.name)}&version=${encodeURIComponent(pkg.version)}`,
        integrity: pkg.integrity,
        shasum: pkg.shasum
      }
    };
  }
}
