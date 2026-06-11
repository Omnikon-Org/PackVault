# PackVault

PackVault is an offline-first package caching and distribution CLI for JavaScript developers. It downloads npm package tarballs once, stores them in a durable local vault, installs from that cache without internet access, and can expose the cache to other machines on your LAN.

## Features

- Sync npm metadata and tarballs into `~/.packvault/cache`
- Install cached packages into `node_modules` without internet access
- Create offline starter projects from local templates
- Sync curated bundles for frontend, backend, and full-stack work
- Run a local package registry server for LAN sharing
- Connect to another PackVault node and import missing tarballs
- Track package, bundle, and peer metadata in SQLite

## Install

After PackVault is published to npm:

```bash
npm install -g packvault
```

Install directly from this GitHub repository:

```bash
npm install -g github:Demon-Die/PackVault
```

For local development:

```bash
npm install
npm run build
npm link
```

## Basic Workflow

Cache packages once while online:

```bash
packvault sync react vite tailwindcss
```

Install later without internet:

```bash
packvault install react
packvault install vite
packvault install tailwindcss
```

Cache a full bundle while online:

```bash
packvault bundle frontend
```

Then install cached packages offline:

```bash
packvault install react
packvault install vite
```

Check what is available offline:

```bash
packvault doctor
```

## Usage Examples

```bash
packvault sync react vite tailwindcss
packvault install react
packvault create react-app my-app
packvault doctor
packvault bundle frontend
packvault serve
packvault connect 192.168.1.25
```

## Vault Layout

PackVault stores durable state under:

```text
~/.packvault/
  cache/
  templates/
  bundles/
  database/
  exports/
```

## Commands

### `packvault sync <packages...>`

Downloads package metadata from the npm registry, resolves requested versions, downloads tarballs, stores them locally, and records metadata in SQLite.

Package specs can be plain names or exact versions:

```bash
packvault sync react vite@latest express@4.18.3
```

### `packvault install <package>`

Installs a cached package into the current project's `node_modules` by extracting the cached tarball. This command does not require internet access.

```bash
packvault install react
packvault install express --version 4.18.3
```

### `packvault create <template> [project-name]`

Creates a project from a local template and replaces `__PROJECT_NAME__` tokens.

Available templates:

- `react-vite`
- `react-app` alias for `react-vite`
- `nextjs`
- `express-api`
- `node-ts`

### `packvault doctor`

Reports vault health, cached package count, storage usage, and bundle coverage.

Example:

```text
React          Cached
Vite           Cached
Nextjs         Missing

Packages: 2
Storage: 14 MB
Vault Health: 80%
```

### `packvault bundle <name>`

Syncs a predefined bundle.

- `frontend`: react, vite, tailwindcss, eslint, prettier
- `backend`: express, prisma, dotenv
- `fullstack`: react, vite, express, prisma

### `packvault serve`

Starts a local Express registry server on port `4873` by default and prints local LAN addresses.

```bash
packvault serve --port 4873
```

### `packvault connect <ip>`

Connects to another PackVault server, lists available cached packages, downloads missing tarballs, and records the peer.

```bash
packvault connect 192.168.1.25 --port 4873
```

## Database Schema

```sql
CREATE TABLE packages (
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  size INTEGER NOT NULL,
  cache_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (name, version)
);

CREATE TABLE bundles (
  name TEXT PRIMARY KEY,
  packages TEXT NOT NULL
);

CREATE TABLE peers (
  ip TEXT PRIMARY KEY,
  hostname TEXT NOT NULL,
  last_seen TEXT NOT NULL
);
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).
