import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export const initDB = async () => {
  const filename = process.env.DB_PATH || './slack.db'; // ← use env
  const db = await open({ filename, driver: sqlite3.Database });

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

  const columns = await db.all(`PRAGMA table_info(tokens)`);
  const colNames = columns.map((c: any) => c.name);
  if (!colNames.includes('refresh_token')) await db.exec(`ALTER TABLE tokens ADD COLUMN refresh_token TEXT;`);
  if (!colNames.includes('token_type'))    await db.exec(`ALTER TABLE tokens ADD COLUMN token_type TEXT;`);
  if (!colNames.includes('expires_at'))    await db.exec(`ALTER TABLE tokens ADD COLUMN expires_at DATETIME;`);

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
