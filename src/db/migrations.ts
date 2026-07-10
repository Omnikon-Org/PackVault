import type { Database } from "sql.js";

/** Interface for Migration */
export interface Migration {
  version: number;
  up: (db: Database) => void;
}

const migrations: Migration[] = [
  {
    version: 2,
    up(db) {
      addColumnIfMissing(db, "packages", "shasum", "TEXT");
    }
  },
  {
    version: 3,
    up(db) {
      addColumnIfMissing(db, "packages", "accessed_at", "TEXT");
    }
  },
  {
    version: 4,
    up(db) {
      db.run(`
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          detail TEXT,
          source TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
  },
  {
    version: 5,
    up(db) {
      db.run(`
        CREATE TABLE IF NOT EXISTS advisories (
          package_name TEXT NOT NULL,
          version_range TEXT NOT NULL,
          severity TEXT NOT NULL,
          title TEXT NOT NULL,
          url TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
  }
];

/**
 * Function runMigrations.
 * @param db - The db parameter.
 */
export function runMigrations(db: Database): void {
  db.run(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)`);

  const current = getSchemaVersion(db);

  for (const migration of migrations) {
    if (migration.version > current) {
      migration.up(db);
      db.run("INSERT OR REPLACE INTO schema_version (version) VALUES (?)", [migration.version]);
    }
  }
}

function getSchemaVersion(db: Database): number {
  const result = db.exec("SELECT MAX(version) as v FROM schema_version");
  const value = result[0]?.values[0]?.[0];
  return typeof value === "number" ? value : 1;
}

function addColumnIfMissing(db: Database, table: string, column: string, type: string): void {
  const info = db.exec(`PRAGMA table_info(${table})`);
  const columns = new Set(
    (info[0]?.values ?? []).map((row) => row[1] as string)
  );
  if (!columns.has(column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}
