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

Create an offline starter app with a Vite-style wizard:

```bash
packvault create
```

Example wizard:

```text
Project name (my-packvault-app):
Select a framework
  1. React
  2. Vue
  3. Svelte
  4. Solid
  5. Preact
  6. Qwik
  7. Angular
  8. Next.js
  9. Nuxt
  10. SvelteKit
  11. Astro
  12. Remix
  13. Express API
  14. Fastify API
  15. NestJS API
  16. Node.js
Choose a number: 1
Select a variant
  1. TypeScript + Vite
  2. JavaScript + Vite
Choose a number: 1
```

You can also pass the project name first:

```bash
packvault create my-app
```

Or start directly with a framework:

```bash
packvault create react
packvault create react my-react-app
packvault create vue my-vue-app
packvault create svelte my-svelte-app
packvault create next web-app
packvault create astro docs-site
packvault create fastify api-server
```

Or skip the wizard by choosing a template directly:

```bash
packvault create react-vite my-app
packvault create react-vite-js my-js-app
packvault create vue-vite vue-app
packvault create svelte-vite svelte-app
packvault create solid-vite solid-app
packvault create preact-vite preact-app
packvault create qwik qwik-app
packvault create angular angular-app
packvault create nextjs web-app
packvault create nuxt nuxt-app
packvault create sveltekit sveltekit-app
packvault create astro astro-site
packvault create remix remix-app
packvault create express-api api-server
packvault create fastify-api fast-api
packvault create nest-api nest-api
packvault create node-ts worker
```

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
packvault bundle frameworks
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
packvault share
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
- `react-vite-js`
- `react-app` alias for `react-vite`
- `vue-vite`
- `vue-vite-js`
- `svelte-vite`
- `svelte-vite-js`
- `solid-vite`
- `solid-vite-js`
- `preact-vite`
- `preact-vite-js`
- `qwik`
- `angular`
- `nextjs`
- `nuxt`
- `sveltekit`
- `astro`
- `remix`
- `express-api`
- `fastify-api`
- `nest-api`
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

- `frontend`: react, react-dom, vite, tailwindcss, eslint, prettier
- `backend`: express, prisma, dotenv
- `fullstack`: react, vite, express, prisma
- `frameworks`: popular frontend, meta-framework, and API framework packages

### `packvault serve`

Starts a local Express registry server on port `4873` by default and prints local LAN addresses.

```bash
packvault serve --port 4873
```

### `packvault share`

Shares your cached packages with nearby machines on the same Wi-Fi/LAN. This does not require internet access after packages are cached.

On the machine with cached packages:

```bash
packvault share
```

On another machine connected to the same LAN:

```bash
packvault connect <your-ip>
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
