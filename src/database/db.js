import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sqlite3 from 'sqlite3'
import { CONFIG } from '../config/env.js'

/**
 * Base SQLite de la billetterie.
 *
 * Emplacement : DB_PATH (recommandé : en dehors du dossier de l'application,
 * sur un volume sauvegardé), sinon ./data/database.sqlite.
 * Mode WAL + busy_timeout : lectures concurrentes pendant les écritures et
 * pas d'erreur SQLITE_BUSY sous charge.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = CONFIG.dbPath
  ? path.resolve(CONFIG.dbPath)
  : path.resolve(__dirname, '../../data/database.sqlite')

if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true })

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

// Noms de tables/colonnes : liste blanche (jamais de valeur venue d'une requête)
const IDENT = /^[a-z_]+$/

async function ensureColumn(table, column, definition) {
  if (!IDENT.test(table) || !IDENT.test(column)) throw new Error('Identifiant SQL invalide')
  const columns = await all(`PRAGMA table_info(${table})`)
  if (!columns.some((item) => item.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

async function initializeDatabase() {
  await run('PRAGMA journal_mode = WAL')
  await run('PRAGMA busy_timeout = 5000')
  // En mode WAL, NORMAL reste sans risque de corruption et réduit fortement le coût
  // des écritures (moins de synchronisations disque, très coûteuses sous Windows).
  // Seules les toutes dernières transactions peuvent être perdues en cas de coupure
  // électrique ; l'état des paiements est de toute façon relu chez TIKORA.
  await run('PRAGMA synchronous = NORMAL')
  await run('PRAGMA foreign_keys = ON')

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
      public_listing INTEGER DEFAULT 0,
      attendees_json TEXT,
      lang TEXT DEFAULT 'fr',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      ticket_code TEXT,
      qr_token TEXT NOT NULL,
      qr_image_url TEXT,
      holder_name TEXT,
      category TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      event_key TEXT PRIMARY KEY,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      tikora_order_id TEXT,
      result TEXT
    )
  `)

  // Photos des participants (liste publique et visuel « J'y serai ») : voir services/photos.js
  await run(`
    CREATE TABLE IF NOT EXISTS attendee_photos (
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 50),
      data BLOB NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      bytes INTEGER NOT NULL,
      version TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (order_id, position)
    )
  `)

  // Achats faits directement sur la page TIKORA de l'événement : voir services/webOrders.js
  await run(`
    CREATE TABLE IF NOT EXISTS tikora_web_orders (
      tikora_order_id TEXT PRIMARY KEY,
      order_number TEXT,
      buyer_name TEXT,
      buyer_email TEXT,
      total REAL,
      tikora_created_at TEXT,
      seen_at TEXT NOT NULL,
      form_sent_at TEXT,
      sending_at INTEGER,
      form_attempts INTEGER DEFAULT 0,
      last_error TEXT
    )
  `)

  await ensureColumn('tikora_web_orders', 'jcia_order_id', 'TEXT')

  // Migration des bases créées par les versions précédentes.
  await ensureColumn('payments', 'operator', 'TEXT')
  await ensureColumn('payments', 'redirect_url', 'TEXT')
  await ensureColumn('payments', 'attempt', 'INTEGER DEFAULT 1')
  await ensureColumn('payments', 'phone_masked', 'TEXT')
  await ensureColumn('payments', 'tikora_deposit_id', 'TEXT')
  await ensureColumn('payments', 'last_checked_at', 'INTEGER')
  await ensureColumn('payments', 'updated_at', 'DATETIME')

  await ensureColumn('orders', 'customer_org', 'TEXT')
  await ensureColumn('orders', 'tier_id', 'TEXT')
  await ensureColumn('orders', 'quantity', 'INTEGER DEFAULT 1')
  await ensureColumn('orders', 'attendees_json', 'TEXT')
  await ensureColumn('orders', 'lang', "TEXT DEFAULT 'fr'")
  await ensureColumn('orders', 'unit_price', 'REAL')
  await ensureColumn('orders', 'subtotal', 'REAL')
  await ensureColumn('orders', 'fees', 'REAL DEFAULT 0')
  await ensureColumn('orders', 'currency', "TEXT DEFAULT 'XAF'")
  await ensureColumn('orders', 'tikora_order_id', 'TEXT')
  await ensureColumn('orders', 'tikora_order_number', 'TEXT')
  await ensureColumn('orders', 'tikora_expires_at', 'TEXT')
  await ensureColumn('orders', 'tikora_order_seq', 'INTEGER DEFAULT 0')
  await ensureColumn('orders', 'paid_at', 'TEXT')
  await ensureColumn('orders', 'receipt_sent_at', 'TEXT')
  await ensureColumn('orders', 'receipt_count', 'INTEGER DEFAULT 0')
  await ensureColumn('orders', 'receipt_last_at', 'INTEGER')
  await ensureColumn('orders', 'payment_mode', 'TEXT')
  await ensureColumn('orders', 'updated_at', 'DATETIME')
  // Fiche participant (formulaire d'inscription, tous tarifs) : prénom, nom, rôle.
  // customer_phone = numéro WhatsApp ; customer_org = organisation / établissement.
  await ensureColumn('orders', 'first_name', 'TEXT')
  await ensureColumn('orders', 'last_name', 'TEXT')
  await ensureColumn('orders', 'customer_role', 'TEXT')
  // Billet payant : e-mail « finalisez votre paiement sur TIKORA » envoyé (une fois)
  await ensureColumn('orders', 'registration_mail_at', 'TEXT')

  // Anciennes bases : plusieurs paiements par commande avaient tous attempt = 1.
  // On les renumérote (1, 2, 3… par ordre de création) avant de créer l'index unique.
  await run(`
    UPDATE payments SET attempt = (
      SELECT COUNT(*) FROM payments p2
      WHERE p2.order_id = payments.order_id
        AND (p2.created_at < payments.created_at
             OR (p2.created_at = payments.created_at AND p2.rowid <= payments.rowid))
    )
    WHERE order_id IN (SELECT order_id FROM payments GROUP BY order_id, attempt HAVING COUNT(*) > 1)
  `)
  await run('CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_order_attempt ON payments(order_id, attempt)')
  await run('CREATE INDEX IF NOT EXISTS ix_payments_status ON payments(status)')
  await run('CREATE INDEX IF NOT EXISTS ix_orders_status ON orders(status, public_listing)')
  await run('CREATE INDEX IF NOT EXISTS ix_orders_tikora ON orders(tikora_order_id)')
  await run('CREATE INDEX IF NOT EXISTS ix_orders_email ON orders(customer_email)')
  await run('CREATE INDEX IF NOT EXISTS ix_tickets_order ON tickets(order_id)')
}

export const dbReady = initializeDatabase().catch((error) => {
  process.stderr.write(`Erreur d’initialisation SQLite : ${error.message}\n`)
  throw error
})

export function closeDb() {
  return new Promise((resolve) => db.close(() => resolve()))
}

export { run, get, all, dbPath }
export default db
