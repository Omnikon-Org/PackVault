/** Interface for CachedPackage */
export interface CachedPackage {
  name: string;
  version: string;
  size: number;
  cachePath: string;
  createdAt: string;
  dependencies: Record<string, string>;
  distTarball?: string;
  integrity?: string;
  shasum?: string;
  accessedAt?: string;
}

/** Interface for PackageRecord */
export interface PackageRecord {
  name: string;
  version: string;
  size: number;
  cache_path: string;
  created_at: string;
  dependencies?: string;
  dist_tarball?: string;
  integrity?: string;
  shasum?: string;
  accessed_at?: string;
}

/** Interface for BundleRecord */
export interface BundleRecord {
  name: string;
  packages: string;
}

/** Interface for BundleDefinition */
export interface BundleDefinition {
  name: string;
  packages: string[];
  builtIn?: boolean;
}

/** Interface for PeerRecord */
export interface PeerRecord {
  ip: string;
  hostname: string;
  lastSeen: string;
}

/** Interface for LogEntry */
export interface LogEntry {
  id: number;
  action: string;
  detail?: string;
  source?: string;
  createdAt: string;
}

/** Interface for AdvisoryRecord */
export interface AdvisoryRecord {
  packageName: string;
  versionRange: string;
  severity: string;
  title: string;
  url?: string;
  createdAt: string;
}

/** Interface for LockfileEntry */
export interface LockfileEntry {
  name: string;
  version: string;
}

/** Interface for VaultConfig */
export interface VaultConfig {
  schedule?: { enabled: boolean; every: string; nextRun?: string };
  registries?: Record<string, { url: string; token?: string }>;
  scopedRegistries?: Record<string, string>;
  trustedPeerTokens?: Record<string, string>;
  policy?: { allow?: string[]; block?: string[] };
}

/** Interface for ProjectConfig */
export interface ProjectConfig {
  bundle?: string;
  packages?: string[];
  registry?: string;
  concurrency?: number;
}

/** Interface for NpmDist */
export interface NpmDist {
  tarball: string;
  shasum?: string;
  integrity?: string;
  unpackedSize?: number;
}

/** Interface for NpmVersionMetadata */
export interface NpmVersionMetadata {
  name: string;
  version: string;
  dist: NpmDist;
  dependencies?: Record<string, string>;
}

/** Interface for NpmPackageMetadata */
export interface NpmPackageMetadata {
  name: string;
  "dist-tags": Record<string, string>;
  versions: Record<string, NpmVersionMetadata>;
  time?: Record<string, string>;
}

/** Interface for SyncResult */
export interface SyncResult {
  name: string;
  version: string;
  cachePath: string;
  size: number;
  dependencyCount: number;
  skipped?: boolean;
}

/** Interface for SyncSummary */
export interface SyncSummary {
  results: SyncResult[];
  synced: number;
  skipped: number;
}

/** Interface for InstallResult */
export interface InstallResult {
  installed: string[];
  rootPath: string;
}

/** Interface for DoctorReport */
export interface DoctorReport {
  packages: CachedPackage[];
  storageBytes: number;
  missingFromBundles: string[];
  healthScore: number;
  bundleBreakdown?: Record<string, { cached: number; total: number; bytes: number }>;
  oldest?: CachedPackage;
  newest?: CachedPackage;
  orphanedFiles?: string[];
  orphanedRows?: CachedPackage[];
}

/** Interface for ProjectDoctorEntry */
export interface ProjectDoctorEntry {
  spec: string;
  name: string;
  range: string;
  cached: boolean;
  resolvedVersion?: string;
}

/** Interface for VaultPaths */
export interface VaultPaths {
  root: string;
  cache: string;
  templates: string;
  bundles: string;
  database: string;
  exports: string;
}

/** Interface for SyncOptions */
export interface SyncOptions {
  dependencies?: boolean;
  concurrency?: number;
  registry?: string;
  token?: string;
  onProgress?: (info: ProgressInfo) => void;
}

/** Interface for ProgressInfo */
export interface ProgressInfo {
  name: string;
  version: string;
  percent: number;
  transferred: number;
  total: number;
  overallPercent: number;
  overallEta?: number;
}
