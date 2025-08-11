import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Open connection to SQLite DB
export const initDB = async () => {
  const db = await open({
    filename: './slack.db',
    driver: sqlite3.Database
  });

  // Create tokens table if not exists (with refresh + expiry support)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_type TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure missing columns exist (for old DBs)
  const columns = await db.all(`PRAGMA table_info(tokens)`);
  const colNames = columns.map(c => c.name);

  if (!colNames.includes('refresh_token')) {
    await db.exec(`ALTER TABLE tokens ADD COLUMN refresh_token TEXT;`);
  }
  if (!colNames.includes('token_type')) {
    await db.exec(`ALTER TABLE tokens ADD COLUMN token_type TEXT;`);
  }
  if (!colNames.includes('expires_at')) {
    await db.exec(`ALTER TABLE tokens ADD COLUMN expires_at DATETIME;`);
  }

  // Create scheduled_messages table if not exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      text TEXT NOT NULL,
      send_at DATETIME NOT NULL,
      sent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
};
