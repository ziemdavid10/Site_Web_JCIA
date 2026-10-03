import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import paymentRoutes from '../src/routes/payments.js'
import { dbReady, run, get } from '../src/database/db.js'

const app = express()
app.use(express.json())
app.use('/payments', paymentRoutes)
let server
const base = {
  currency: 'XAF', method: 'momo', operator: 'mtn', phone: '670000000',
  customer: { name: 'Alice', email: 'alice@example.com' },
}
let counter = 0
const orderId = (prefix = 'PAY') => `JCIA27-${prefix}${String(++counter).padStart(4, '0')}`.slice(0, 13)

async function post(payload, headers = {}) {
  return fetch('http://localhost:5001/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  })
}

async function create(overrides = {}) {
  return post({
    orderId: orderId(), amount: 10000, ...base, ...overrides,
  })
}

test.before(async () => {
  await dbReady
  server = app.listen(5001)
})

test.after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

test('POST /payments - rejette un corps vide', async () => {
  const response = await post({})
  assert.equal(response.status, 400)
})

test('POST /payments - rejette un identifiant absent ou mal formé', async () => {
  for (const value of [undefined, '', 'ORDER-1', 'jcia27-ABC123', 'JCIA27-ABC']) {
    const response = await create({ orderId: value })
    assert.equal(response.status, 400)
  }
})

test('POST /payments - accepte les identifiants valides', async () => {
  const response = await create({ orderId: 'JCIA27-VAL001' })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.match(body.paymentId, /^PAY-/)
})

test('POST /payments - rejette montant absent, NaN et négatif', async () => {
  for (const amount of [undefined, 'abc', NaN, -1]) {
    const response = await create({ orderId: orderId(), amount })
    assert.equal(response.status, 400)
  }
})

test('POST /payments - accepte le montant zéro au niveau technique mais le contrôle métier doit se faire avec le tarif', async () => {
  const response = await create({ orderId: orderId(), amount: 0 })
  assert.equal(response.status, 200)
})

test('POST /payments - rejette une devise inconnue', async () => {
  const response = await create({ orderId: orderId(), currency: 'EUR' })
  assert.equal(response.status, 400)
})

test('POST /payments - accepte XAF quelle que soit la casse', async () => {
  const response = await create({ orderId: orderId(), currency: 'xaf' })
  assert.equal(response.status, 200)
})

test('POST /payments - rejette une méthode inconnue', async () => {
  for (const method of [undefined, 'cash', 'paypal', 'MOMO']) {
    const response = await create({ orderId: orderId(), method })
    assert.equal(response.status, 400)
  }
})

test('POST /payments - Mobile Money exige un opérateur valide', async () => {
  for (const operator of [undefined, '', 'm-pesa', 'MTN']) {
    const response = await create({ orderId: orderId(), operator })
    assert.equal(response.status, 400)
  }
})

test('POST /payments - Orange Money est accepté', async () => {
  const response = await create({ orderId: orderId(), operator: 'orange' })
  assert.equal(response.status, 200)
})

test('POST /payments - carte bancaire ne nécessite pas d’opérateur Mobile Money', async () => {
  const response = await create({
    orderId: orderId(), amount: 10000, method: 'card', operator: undefined,
    card: { number: '4111111111111111', name: 'Alice', exp: '1228', cvc: '123' },
  })
  assert.equal(response.status, 200)
})

test('POST /payments - rejette un e-mail invalide', async () => {
  for (const email of [undefined, '', 'abc', 'a@', '@example.com']) {
    const response = await create({ orderId: orderId(), customer: { name: 'Alice', email } })
    assert.equal(response.status, 400)
  }
})

test('POST /payments - valide le tarif si tierId et quantity sont fournis', async () => {
  const good = await create({ orderId: orderId(), tierId: 'standard', quantity: 2, amount: 20000 })
  assert.equal(good.status, 200)

  const bad = await create({ orderId: orderId(), tierId: 'standard', quantity: 2, amount: 10000 })
  assert.equal(bad.status, 400)
})

test('POST /payments - rejette quantité invalide lorsqu’un tier est fourni', async () => {
  for (const quantity of [0, -1, 1.5, 11, 'abc']) {
    const response = await create({ orderId: orderId(), tierId: 'standard', quantity, amount: 10000 })
    assert.equal(response.status, 400)
  }
})

test('POST /payments - persiste commande et participants', async () => {
  const id = orderId()
  const response = await create({
    orderId: id, amount: 20000, tierId: 'standard', quantity: 2,
    customer: { name: 'Alice', email: 'alice@example.com', org: 'JCIA' },
    publicListing: true, attendees: [' Alice ', '', 'Bob'], lang: 'en',
  })
  assert.equal(response.status, 200)
  const order = await get('SELECT * FROM orders WHERE id = ?', [id])
  assert.equal(order.customer_org, 'JCIA')
  assert.equal(order.public_listing, 1)
  assert.deepEqual(JSON.parse(order.attendees_json), ['Alice', 'Bob'])
  assert.equal(order.lang, 'en')
})

test('POST /payments - rejoue une requête sans créer un second paiement', async () => {
  const id = orderId()
  const payload = { orderId: id, amount: 10000, ...base }
  const first = await post(payload, { 'Idempotency-Key': id })
  const second = await post(payload, { 'Idempotency-Key': id })
  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  assert.deepEqual(await second.json(), await first.clone().json())
  const rows = await new Promise((resolve, reject) => {
    import('../src/database/db.js').then(({ all }) => all('SELECT * FROM payments WHERE order_id = ?', [id]).then(resolve).catch(reject))
  })
  assert.equal(rows.length, 1)
})

test('GET /payments/:id - renvoie 404 pour un paiement inconnu', async () => {
  const response = await fetch('http://localhost:5001/payments/PAY-INCONNU')
  assert.equal(response.status, 404)
})

test('GET /payments/:id - renvoie SUCCESSFUL avec transactionId', async () => {
  await run(`INSERT OR REPLACE INTO payments (payment_id, order_id, amount, currency, method, status, transaction_id)
    VALUES ('PAY-SUCCESS-TEST', 'JCIA27-GET001', 10000, 'XAF', 'momo', 'SUCCESSFUL', 'TX123')`)
  const response = await fetch('http://localhost:5001/payments/PAY-SUCCESS-TEST')
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'SUCCESSFUL', transactionId: 'TX123' })
})

test('GET /payments/:id - renvoie FAILED avec raison', async () => {
  await run(`INSERT OR REPLACE INTO payments (payment_id, order_id, amount, currency, method, status, reason)
    VALUES ('PAY-FAILED-TEST', 'JCIA27-GET002', 10000, 'XAF', 'momo', 'FAILED', 'declined')`)
  const response = await fetch('http://localhost:5001/payments/PAY-FAILED-TEST')
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'FAILED', reason: 'declined' })
})

test('GET /payments/:id - un paiement PENDING passe à SUCCESSFUL en mode démo', async () => {
  await run(`INSERT OR REPLACE INTO orders (id, status) VALUES ('JCIA27-GET003', 'pending')`)
  await run(`INSERT OR REPLACE INTO payments (payment_id, order_id, amount, currency, method, status)
    VALUES ('PAY-PENDING-TEST', 'JCIA27-GET003', 10000, 'XAF', 'momo', 'PENDING')`)
  const response = await fetch('http://localhost:5001/payments/PAY-PENDING-TEST')
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.status, 'SUCCESSFUL')
  const order = await get('SELECT status FROM orders WHERE id = ?', ['JCIA27-GET003'])
  assert.equal(order.status, 'paid')
})
