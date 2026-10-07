import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import receiptRoutes from '../../src/routes/receipt.js'
import { dbReady, run } from '../../src/database/db.js'
import { mailerService } from '../../src/services/mailer.js'

const app = express()
app.use(express.json())
app.use('/orders', receiptRoutes)
let server

async function receipt(id, body) {
  return fetch(`http://localhost:5002/orders/${id}/receipt`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

test.before(async () => {
  await dbReady
  server = app.listen(5002)
  await run(`INSERT OR REPLACE INTO orders (id, customer_email, status, lang) VALUES ('JCIA27-UNPAID', 'test@example.com', 'pending', 'fr')`)
  await run(`INSERT OR REPLACE INTO orders (id, customer_email, status, lang) VALUES ('JCIA27-PAID01', 'buyer@example.com', 'paid', 'fr')`)
  await run(`INSERT OR REPLACE INTO orders (id, customer_email, status, lang) VALUES ('JCIA27-FREE01', 'free@example.com', 'free', 'en')`)
})

test.after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

test('REÇU - rejette identifiant invalide', async () => {
  const response = await receipt('BAD-ID', { email: 'buyer@example.com', lang: 'fr' })
  assert.equal(response.status, 400)
})

test('REÇU - rejette commande inconnue', async () => {
  const response = await receipt('JCIA27-NOTFND', { email: 'buyer@example.com', lang: 'fr' })
  assert.equal(response.status, 404)
})

test('REÇU - rejette e-mail absent ou invalide', async () => {
  for (const email of [undefined, '', 'abc', 'a@']) {
    const response = await receipt('JCIA27-PAID01', { email, lang: 'fr' })
    assert.equal(response.status, 400)
  }
})

test('REÇU - rejette commande non confirmée', async () => {
  const response = await receipt('JCIA27-UNPAID', { email: 'test@example.com', lang: 'fr' })
  assert.equal(response.status, 400)
})

test('REÇU - rejette une adresse différente de celle de la commande', async () => {
  const response = await receipt('JCIA27-PAID01', { email: 'attacker@example.com', lang: 'fr' })
  assert.equal(response.status, 403)
})

test('REÇU - accepte une adresse avec différence de casse', async (t) => {
  t.mock.method(mailerService, 'sendReceiptEmail', async () => true)
  const response = await receipt('JCIA27-PAID01', { email: 'BUYER@EXAMPLE.COM', lang: 'fr' })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'sent' })
})

test('REÇU - accepte une commande gratuite', async (t) => {
  t.mock.method(mailerService, 'sendReceiptEmail', async () => true)
  const response = await receipt('JCIA27-FREE01', { email: 'free@example.com', lang: 'fr' })
  assert.equal(response.status, 200)
})

test('REÇU - choisit la langue demandée quand elle est valide', async (t) => {
  let captured
  t.mock.method(mailerService, 'sendReceiptEmail', async (args) => { captured = args; return true })
  await receipt('JCIA27-PAID01', { email: 'buyer@example.com', lang: 'en' })
  assert.equal(captured.lang, 'en')
})

test('REÇU - ignore une langue inconnue et utilise fr', async (t) => {
  let captured
  t.mock.method(mailerService, 'sendReceiptEmail', async (args) => { captured = args; return true })
  await receipt('JCIA27-PAID01', { email: 'buyer@example.com', lang: 'xx' })
  assert.equal(captured.lang, 'fr')
})

test('REÇU - transforme une panne SMTP en erreur 502', async (t) => {
  t.mock.method(mailerService, 'sendReceiptEmail', async () => { throw new Error('SMTP down') })
  const response = await receipt('JCIA27-PAID01', { email: 'buyer@example.com', lang: 'fr' })
  assert.equal(response.status, 502)
})
