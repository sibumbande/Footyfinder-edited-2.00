import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Wrapper that provides a better-sqlite3–compatible API over sql.js ───────
// This lets all route handlers use the familiar:
//   db.prepare('SELECT ...').get(params)
//   db.prepare('INSERT ...').run(params)
//   db.prepare('SELECT ...').all(params)

export class Database {
  constructor(public raw: SqlJsDatabase, private filePath: string) {}

  exec(sql: string): void {
    this.raw.exec(sql);
  }

  prepare(sql: string) {
    const raw = this.raw;

    function bindParams(stmt: any, params: any[]) {
      if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
        stmt.bind(params[0]);
      } else if (params.length > 0) {
        stmt.bind(params);
      }
    }

    return {
      run(...params: any[]) {
        const stmt = raw.prepare(sql);
        try {
          bindParams(stmt, params);
          stmt.step();
        } finally {
          stmt.free();
        }
        return { changes: raw.getRowsModified() };
      },

      get(...params: any[]): Record<string, any> | undefined {
        const stmt = raw.prepare(sql);
        try {
          bindParams(stmt, params);
          if (stmt.step()) {
            return stmt.getAsObject() as Record<string, any>;
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },

      all(...params: any[]): Record<string, any>[] {
        const stmt = raw.prepare(sql);
        try {
          bindParams(stmt, params);
          const results: Record<string, any>[] = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject() as Record<string, any>);
          }
          return results;
        } finally {
          stmt.free();
        }
      },
    };
  }

  pragma(directive: string): void {
    this.raw.exec(`PRAGMA ${directive};`);
  }

  save(): void {
    const data = this.raw.export();
    fs.writeFileSync(this.filePath, Buffer.from(data));
  }

  close(): void {
    this.save();
    this.raw.close();
  }
}

// ── Singleton ───────────────────────────────────────────────────────────────

let database: Database | null = null;

async function initDatabase(): Promise<Database> {
  const dbPath = path.join(__dirname, 'footy.db');
  const schemaPath = path.join(__dirname, 'schema.sql');

  try {
    const SQL = await initSqlJs();

    // Load existing database file or create a fresh one
    let sqlDb: SqlJsDatabase;
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      sqlDb = new SQL.Database(buffer);
    } else {
      sqlDb = new SQL.Database();
    }

    const db = new Database(sqlDb, dbPath);

    // Performance and integrity settings
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Read and execute schema
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    // Run seed data (idempotent — uses INSERT OR IGNORE)
    const seedPath = path.join(__dirname, 'seed.sql');
    if (fs.existsSync(seedPath)) {
      const seed = fs.readFileSync(seedPath, 'utf-8');
      db.exec(seed);
    }

    // Run safe migrations for existing DBs
    const migrations = [
      "ALTER TABLE practice_sessions ADD COLUMN slots_count INTEGER NOT NULL DEFAULT 1",
      "ALTER TABLE practice_sessions ADD COLUMN timetable_ids TEXT",
      "ALTER TABLE teams ADD COLUMN team_layout TEXT",
      "ALTER TABLE teams ADD COLUMN is_recruiting INTEGER NOT NULL DEFAULT 0",
      `CREATE TABLE IF NOT EXISTS team_join_requests (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'JOIN_REQUEST' CHECK (type IN ('JOIN_REQUEST','CAPTAIN_INVITE')),
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','DECLINED')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (team_id, user_id),
        FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,
      "ALTER TABLE team_join_requests ADD COLUMN type TEXT NOT NULL DEFAULT 'JOIN_REQUEST'",
      "ALTER TABLE teams ADD COLUMN motto TEXT",
      // Photo upload & ID verification
      "ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0",
      "ALTER TABLE users ADD COLUMN id_document_url TEXT",
      // DM message requests
      "ALTER TABLE messages ADD COLUMN is_request INTEGER NOT NULL DEFAULT 0",
      // Notifications table (also in schema.sql for fresh DBs)
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        related_entity_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,
      "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read)",
      "CREATE INDEX IF NOT EXISTS idx_messages_dm ON messages (sender_id, receiver_id)",
    ];
    for (const m of migrations) {
      try { db.exec(m); } catch { /* Column already exists — ignore */ }
    }

    // Count tables created
    const tables = db
      .prepare("SELECT count(*) as count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .get() as { count: number };

    console.log(`[FootyFinder DB] Initialized successfully — ${tables.count} tables ready (${dbPath})`);

    // Persist the fresh schema to disk
    db.save();

    database = db;
    return db;
  } catch (error) {
    console.error('[FootyFinder DB] Failed to initialize database:', error);
    throw error;
  }
}

export function getDb(): Database {
  if (!database) {
    throw new Error('Database not initialized. Await initDatabase() first.');
  }
  return database;
}

export function closeDb(): void {
  if (database) {
    database.close();
    database = null;
    console.log('[FootyFinder DB] Connection closed.');
  }
}

// Initialize on import (top-level await — works with ESM + tsx)
const instance = await initDatabase();
export { instance as db };
