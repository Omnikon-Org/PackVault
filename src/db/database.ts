import path from "node:path";
import fs from "fs-extra";
import initSqlJs, { type Database, type QueryExecResult, type SqlJsStatic } from "sql.js";
import { ensureVaultLayout, vaultPaths } from "../config/paths.js";
import { schema } from "./schema.js";
import { runMigrations } from "./migrations.js";
import type {
  AdvisoryRecord,
  BundleDefinition,
  CachedPackage,
  LogEntry,
  PackageRecord,
  PeerRecord
} from "../types/index.js";

/** Represents the PackVaultDatabase class. */
export class PackVaultDatabase {
  private sql?: SqlJsStatic;
  private db?: Database;
  private databasePath = path.join(vaultPaths.database, "packvault.sqlite");

  /**
     * Executes initialize operation.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.initialize();
     * ```
     */
    async initialize(): Promise<void> {
    await ensureVaultLayout();
    this.sql = await initSqlJs();
    this.db = await fs.pathExists(this.databasePath)
      ? new this.sql.Database(await fs.readFile(this.databasePath))
      : new this.sql.Database();
    this.db.exec(schema);
    runMigrations(this.connection);
    await this.persist();
  }

  /**
     * Executes close operation.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.close();
     * ```
     */
    close(): void {
    this.db?.close();
  }

  /**
     * Executes upsertPackage operation.
     * @param pkg - The pkg parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.upsertPackage();
     * ```
     */
    async upsertPackage(pkg: CachedPackage): Promise<void> {
    this.connection.run(
      `INSERT INTO packages (name, version, size, cache_path, dependencies, dist_tarball, integrity, shasum, accessed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(name, version) DO UPDATE SET
         size = excluded.size,
         cache_path = excluded.cache_path,
         dependencies = excluded.dependencies,
         dist_tarball = excluded.dist_tarball,
         integrity = excluded.integrity,
         shasum = excluded.shasum,
         accessed_at = COALESCE(excluded.accessed_at, packages.accessed_at),
         created_at = excluded.created_at`,
      [
        pkg.name,
        pkg.version,
        pkg.size,
        pkg.cachePath,
        JSON.stringify(pkg.dependencies),
        pkg.distTarball ?? null,
        pkg.integrity ?? null,
        pkg.shasum ?? null,
        pkg.accessedAt ?? null,
        pkg.createdAt
      ]
    );
    await this.persist();
  }

  /**
     * Executes updateAccessedAt operation.
     * @param name - The name parameter.
     * @param version - The version parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.updateAccessedAt();
     * ```
     */
    async updateAccessedAt(name: string, version: string): Promise<void> {
    this.connection.run(
      "UPDATE packages SET accessed_at = ? WHERE name = ? AND version = ?",
      [new Date().toISOString(), name, version]
    );
    await this.persist();
  }

  /**
     * Executes deletePackage operation.
     * @param name - The name parameter.
     * @param version - The version parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.deletePackage();
     * ```
     */
    async deletePackage(name: string, version: string): Promise<void> {
    this.connection.run("DELETE FROM packages WHERE name = ? AND version = ?", [name, version]);
    await this.persist();
  }

  /**
     * Executes findPackage operation.
     * @param name - The name parameter.
     * @param version - The version parameter.
     * @returns The findPackage result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.findPackage();
     * ```
     */
    findPackage(name: string, version?: string): CachedPackage | undefined {
    const result = version
      ? this.connection.exec("SELECT * FROM packages WHERE name = ? AND version = ?", [name, version])
      : this.connection.exec("SELECT * FROM packages WHERE name = ? ORDER BY created_at DESC LIMIT 1", [name]);

    const row = this.firstRow<PackageRecord>(result);
    return row ? this.toCachedPackage(row) : undefined;
  }

  /**
     * Executes findPackagesByName operation.
     * @param name - The name parameter.
     * @returns The findPackagesByName result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.findPackagesByName();
     * ```
     */
    findPackagesByName(name: string): CachedPackage[] {
    return this.rows<PackageRecord>(
      this.connection.exec("SELECT * FROM packages WHERE name LIKE ? ORDER BY version ASC", [`%${name}%`])
    ).map((row) => this.toCachedPackage(row));
  }

  /**
     * Executes listPackages operation.
     * @returns The listPackages result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.listPackages();
     * ```
     */
    listPackages(): CachedPackage[] {
    return this.rows<PackageRecord>(this.connection.exec("SELECT * FROM packages ORDER BY name ASC, version ASC"))
      .map((row) => this.toCachedPackage(row));
  }

  /**
     * Executes upsertBundle operation.
     * @param bundle - The bundle parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.upsertBundle();
     * ```
     */
    async upsertBundle(bundle: BundleDefinition): Promise<void> {
    this.connection.run(
      `INSERT INTO bundles (name, packages) VALUES (?, ?)
       ON CONFLICT(name) DO UPDATE SET packages = excluded.packages`,
      [bundle.name, JSON.stringify(bundle.packages)]
    );
    await this.persist();
  }

  /**
     * Executes deleteBundle operation.
     * @param name - The name parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.deleteBundle();
     * ```
     */
    async deleteBundle(name: string): Promise<void> {
    this.connection.run("DELETE FROM bundles WHERE name = ?", [name]);
    await this.persist();
  }

  /**
     * Executes listBundles operation.
     * @returns The listBundles result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.listBundles();
     * ```
     */
    listBundles(): BundleDefinition[] {
    return this.rows<{ name: string; packages: string }>(
      this.connection.exec("SELECT name, packages FROM bundles ORDER BY name ASC")
    ).map((row) => ({ name: row.name, packages: JSON.parse(row.packages) as string[] }));
  }

  /**
     * Executes upsertPeer operation.
     * @param peer - The peer parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.upsertPeer();
     * ```
     */
    async upsertPeer(peer: PeerRecord): Promise<void> {
    this.connection.run(
      `INSERT INTO peers (ip, hostname, last_seen) VALUES (?, ?, ?)
       ON CONFLICT(ip) DO UPDATE SET hostname = excluded.hostname, last_seen = excluded.last_seen`,
      [peer.ip, peer.hostname, peer.lastSeen]
    );
    await this.persist();
  }

  /**
     * Executes listPeers operation.
     * @returns The listPeers result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.listPeers();
     * ```
     */
    listPeers(): PeerRecord[] {
    return this.rows<{ ip: string; hostname: string; last_seen: string }>(
      this.connection.exec("SELECT ip, hostname, last_seen FROM peers ORDER BY last_seen DESC")
    ).map((row) => ({ ip: row.ip, hostname: row.hostname, lastSeen: row.last_seen }));
  }

  /**
     * Executes addLog operation.
     * @param action - The action parameter.
     * @param detail - The detail parameter.
     * @param source - The source parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.addLog();
     * ```
     */
    async addLog(action: string, detail?: string, source?: string): Promise<void> {
    this.connection.run(
      "INSERT INTO logs (action, detail, source) VALUES (?, ?, ?)",
      [action, detail ?? null, source ?? null]
    );
    await this.persist();
  }

  /**
     * Executes listLogs operation.
     * @param options - The options parameter.
     * @returns The listLogs result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.listLogs();
     * ```
     */
    listLogs(options: { last?: number; action?: string } = {}): LogEntry[] {
    const limit = options.last ?? 20;
    const query = options.action
      ? "SELECT * FROM logs WHERE action = ? ORDER BY id DESC LIMIT ?"
      : "SELECT * FROM logs ORDER BY id DESC LIMIT ?";
    const params = options.action ? [options.action, limit] : [limit];

    return this.rows<{ id: number; action: string; detail: string; source: string; created_at: string }>(
      this.connection.exec(query, params)
    ).map((row) => ({
      id: row.id,
      action: row.action,
      detail: row.detail,
      source: row.source,
      createdAt: row.created_at
    }));
  }

  /**
     * Executes clearLogs operation.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.clearLogs();
     * ```
     */
    async clearLogs(): Promise<void> {
    this.connection.run("DELETE FROM logs");
    await this.persist();
  }

  /**
     * Executes upsertAdvisory operation.
     * @param advisory - The advisory parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.upsertAdvisory();
     * ```
     */
    async upsertAdvisory(advisory: AdvisoryRecord): Promise<void> {
    this.connection.run(
      `INSERT INTO advisories (package_name, version_range, severity, title, url)
       VALUES (?, ?, ?, ?, ?)`,
      [advisory.packageName, advisory.versionRange, advisory.severity, advisory.title, advisory.url ?? null]
    );
    await this.persist();
  }

  /**
     * Executes clearAdvisoriesForPackage operation.
     * @param name - The name parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.clearAdvisoriesForPackage();
     * ```
     */
    async clearAdvisoriesForPackage(name: string): Promise<void> {
    this.connection.run("DELETE FROM advisories WHERE package_name = ?", [name]);
    await this.persist();
  }

  /**
     * Executes listAdvisories operation.
     * @param packageNames - The packageNames parameter.
     * @returns The listAdvisories result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.listAdvisories();
     * ```
     */
    listAdvisories(packageNames?: string[]): AdvisoryRecord[] {
    const query = packageNames?.length
      ? `SELECT * FROM advisories WHERE package_name IN (${packageNames.map(() => "?").join(",")})`
      : "SELECT * FROM advisories";
    const params = packageNames ?? [];

    return this.rows<{
      package_name: string;
      version_range: string;
      severity: string;
      title: string;
      url: string;
      created_at: string;
    }>(this.connection.exec(query, params)).map((row) => ({
      packageName: row.package_name,
      versionRange: row.version_range,
      severity: row.severity,
      title: row.title,
      url: row.url,
      createdAt: row.created_at
    }));
  }

  private get connection(): Database {
    if (!this.db) throw new Error("Database has not been initialized.");
    return this.db;
  }

  private async persist(): Promise<void> {
    if (!this.db) return;
    await fs.writeFile(this.databasePath, Buffer.from(this.db.export()));
  }

  private rows<T>(results: QueryExecResult[]): T[] {
    const [result] = results;
    if (!result) return [];
    return result.values.map((values) =>
      Object.fromEntries(result.columns.map((column, index) => [column, values[index]])) as T
    );
  }

  private firstRow<T>(results: QueryExecResult[]): T | undefined {
    return this.rows<T>(results)[0];
  }

  private toCachedPackage(row: PackageRecord): CachedPackage {
    return {
      name: row.name,
      version: row.version,
      size: row.size,
      cachePath: row.cache_path,
      createdAt: row.created_at,
      dependencies: row.dependencies ? JSON.parse(row.dependencies) as Record<string, string> : {},
      distTarball: row.dist_tarball,
      integrity: row.integrity,
      shasum: row.shasum,
      accessedAt: row.accessed_at
    };
  }
}
