import Database from 'better-sqlite3';
import path from 'path';

// Define a stable path for the database file
// Avoid using only process.cwd() as it can vary. 
// Using __dirname (transpiled) or a fixed subfolder in the workspace.
const DB_PATH = path.join(process.cwd(), 'paper_trading.db');

interface GlobalWithDb {
  _sqliteDb?: any;
}

const globalWithDb = global as unknown as GlobalWithDb;

let db: any;

if (process.env.NODE_ENV === 'production') {
  db = new Database(DB_PATH);
} else {
  // In development mode, use a global variable so the database connection
  // is preserved across HMR (Hot Module Replacement) updates.
  if (!globalWithDb._sqliteDb) {
    globalWithDb._sqliteDb = new Database(DB_PATH);
    console.log(`[DB] Database initialized at: ${path.resolve(DB_PATH)}`);
  }
  db = globalWithDb._sqliteDb;
}

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS account (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    cash_balance REAL DEFAULT 10000000.0,
    total_wealth REAL DEFAULT 10000000.0
  );

  CREATE TABLE IF NOT EXISTS holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT UNIQUE,
    quantity INTEGER,
    avg_price REAL,
    ai_verdict TEXT,
    buy_date TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT,
    type TEXT,
    quantity INTEGER,
    price REAL,
    timestamp TEXT
  );

  -- Insert initial account if not exists
  INSERT OR IGNORE INTO account (id, cash_balance, total_wealth) VALUES (1, 10000000.0, 10000000.0);
`);

export default db;
