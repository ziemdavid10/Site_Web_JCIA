import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.resolve(__dirname, '../../data/database.sqlite')

const db = new sqlite3.Database(dbPath)

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err)
      else resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row || null)
    })
  })
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows || [])
    })
  })
}

async function ensureColumn(table, column, definition) {
  const columns = await all(`PRAGMA table_info(${table})`)
  if (!columns.some((item) => item.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

async function initializeDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      method TEXT NOT NULL,
      operator TEXT,
      redirect_url TEXT,
      status TEXT NOT NULL,
      transaction_id TEXT,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      customer_org TEXT,
      tier_id TEXT,
      quantity INTEGER DEFAULT 1,
      total REAL,
      status TEXT,
      public_listing INTEGER DEFAULT 1,
      attendees_json TEXT,
      lang TEXT DEFAULT 'fr',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Migration des bases créées par les versions précédentes.
  await ensureColumn('payments', 'operator', 'TEXT')
  await ensureColumn('payments', 'redirect_url', 'TEXT')
  await ensureColumn('orders', 'customer_org', 'TEXT')
  await ensureColumn('orders', 'tier_id', 'TEXT')
  await ensureColumn('orders', 'quantity', 'INTEGER DEFAULT 1')
  await ensureColumn('orders', 'attendees_json', 'TEXT')
  await ensureColumn('orders', 'lang', "TEXT DEFAULT 'fr'")
}

export const dbReady = initializeDatabase().catch((error) => {
  console.error('Erreur d’initialisation SQLite :', error)
  throw error
})

export { run, get, all }
export default db
