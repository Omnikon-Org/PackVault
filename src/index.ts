/**
 * @module
 *
 * PackVault
 *
 * Offline-first package caching library for JavaScript and TypeScript.
 *
 * Features:
 * - Offline package cache
 * - LAN sharing
 * - Package integrity
 * - Templates
 *
 * @example
 * ```ts
 * import { CacheManager } from "@omnikon-org/packvault";
 *
 * const cache = new CacheManager();
 * await cache.syncPackages(["vite"]);
 * ```
 */

export * from "./db/database.js";
export * from "./managers/AuditManager.js";
export * from "./managers/BundleManager.js";
export * from "./managers/CacheManager.js";
export * from "./managers/DiffManager.js";
export * from "./managers/DoctorManager.js";
export * from "./managers/ExportManager.js";
export * from "./managers/PackageManager.js";
export * from "./managers/PeerManager.js";
export * from "./managers/PolicyManager.js";
export * from "./managers/PruneManager.js";
export * from "./managers/RegistryManager.js";
export * from "./managers/ScheduleManager.js";
export * from "./managers/SearchManager.js";
export * from "./managers/SnapshotManager.js";
export * from "./managers/TemplateManager.js";
export * from "./server/LocalRegistryServer.js";
export * from "./types/index.js";
