import test from 'node:test'
import assert from 'node:assert/strict'
import { dbReady, run, get, all } from '../../src/database/db.js'

test('BASE - initialise les tables nécessaires', async () => {
  await dbReady
  const tables = await all(`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('orders','payments')`)
  assert.deepEqual(new Set(tables.map((x) => x.name)), new Set(['orders', 'payments']))
})

test('BASE - insertion et lecture d’une commande', async () => {
  await dbReady
  const id = 'JCIA27-DB0001'
  await run(`INSERT OR REPLACE INTO orders (id, customer_name, customer_email, customer_phone, total, status, quantity, lang)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, 'Jean Dupont', 'jean@example.com', '690000000', 5000, 'pending', 1, 'fr'])
  const row = await get(`SELECT * FROM orders WHERE id = ?`, [id])
  assert.equal(row.id, id)
  assert.equal(row.customer_email, 'jean@example.com')
  assert.equal(row.total, 5000)
  assert.equal(row.quantity, 1)
})

test('BASE - insertion et lecture d’un paiement', async () => {
  await dbReady
  const id = 'PAY-DB-0001'
  await run(`INSERT OR REPLACE INTO payments (payment_id, order_id, amount, currency, method, status)
    VALUES (?, ?, ?, ?, ?, ?)`, [id, 'JCIA27-DB0002', 10000, 'XAF', 'momo', 'PENDING'])
  const row = await get(`SELECT * FROM payments WHERE payment_id = ?`, [id])
  assert.equal(row.payment_id, id)
  assert.equal(row.status, 'PENDING')
})
