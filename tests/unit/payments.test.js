import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import paymentRoutes from '../../src/routes/payments.js'
import { dbReady, run, get } from '../../src/database/db.js'
import { getTicketPricing } from '../../src/utils/pricing.js'

// Prix calculés à la date du test : la promotion (-30 %) rend les montants
// codés en dur (10000, 20000) faux une partie de l'année.
const STANDARD = getTicketPricing('standard').price

const app = express()
app.use(express.json())
app.use('/payments', paymentRoutes)
let server
const base = {
  currency: 'XAF', method: 'momo', operator: 'mtn', phone: '677123456',
  customer: { name: 'Alice', email: 'alice@example.com' },
  tierId: 'standard', quantity: 1,
}
let counter = 0
// Correction : l'ancienne version tronquait le compteur (.slice(0, 13)) et
// produisait le MÊME identifiant pour plusieurs tests.
const orderId = (prefix = 'PA') => `JCIA27-${prefix.slice(0, 2)}${String(++counter).padStart(4, '0')}`

async function post(payload, headers = {}) {
  return fetch('http://localhost:5001/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  })
}

async function create(overrides = {}) {
  return post({
    orderId: orderId(), amount: STANDARD, ...base, ...overrides,
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

// Ancien test : « accepte le montant zéro ». Un paiement de 0 FCFA n'a pas de
// sens et laissait passer un montant falsifié : le serveur le refuse désormais
// (le tarif gratuit passe par POST /orders/free).
test('POST /payments - refuse un montant nul ou différent du tarif', async () => {
  for (const amount of [0, 1, STANDARD - 1]) {
    const response = await create({ orderId: orderId(), amount })
    assert.equal(response.status, 400)
  }
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

// Ancien test : « la carte est acceptée ». TIKORA n'encaisse que Mobile Money
// et recevoir un numéro de carte imposerait la conformité PCI-DSS (SAQ D) :
// le serveur refuse donc toute demande par carte, sans jamais stocker la carte.
test('POST /payments - refuse la carte bancaire et ne conserve aucune donnée de carte', async () => {
  const id = orderId()
  const response = await create({
    orderId: id, method: 'card', operator: undefined,
    card: { number: '4111111111111111', name: 'Alice', exp: '1228', cvc: '123' },
  })
  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, 'CARD_NOT_SUPPORTED')
  assert.equal(await get('SELECT * FROM orders WHERE id = ?', [id]), null)
})

test('POST /payments - rejette un e-mail invalide', async () => {
  for (const email of [undefined, '', 'abc', 'a@', '@example.com']) {
    const response = await create({ orderId: orderId(), customer: { name: 'Alice', email } })
    assert.equal(response.status, 400)
  }
})

test('POST /payments - valide le tarif si tierId et quantity sont fournis', async () => {
  const good = await create({ orderId: orderId(), tierId: 'standard', quantity: 2, amount: STANDARD * 2, attendees: ['Alice', 'Bob Martin'] })
  assert.equal(good.status, 200)

  const bad = await create({ orderId: orderId(), tierId: 'standard', quantity: 2, amount: STANDARD })
  assert.equal(bad.status, 400)
})

test('POST /payments - rejette quantité invalide lorsqu’un tier est fourni', async () => {
  for (const quantity of [0, -1, 1.5, 11, 'abc']) {
    const response = await create({ orderId: orderId(), tierId: 'standard', quantity, amount: STANDARD })
    assert.equal(response.status, 400)
  }
})

test('POST /payments - persiste commande et participants', async () => {
  const id = orderId()
  const response = await create({
    orderId: id, amount: STANDARD * 2, tierId: 'standard', quantity: 2,
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
  const payload = { orderId: id, amount: STANDARD, ...base }
  const first = await post(payload, { 'Idempotency-Key': id })
  const second = await post(payload, { 'Idempotency-Key': id })
  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  assert.deepEqual(await second.json(), await first.json())
  const rows = await new Promise((resolve, reject) => {
    import('../../src/database/db.js').then(({ all }) => all('SELECT * FROM payments WHERE order_id = ?', [id]).then(resolve).catch(reject))
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

/** Statut final d'un paiement (le faux TIKORA répond en quelques millisecondes). */
async function finalStatus(paymentId) {
  for (let i = 0; i < 50; i += 1) {
    const body = await (await fetch(`http://localhost:5001/payments/${paymentId}`)).json()
    if (body.status !== 'PENDING') return body
    await new Promise((r) => setTimeout(r, 20))
  }
  return { status: 'PENDING' }
}

// Le statut vient toujours du fournisseur (ici le faux TIKORA des tests) :
// le paiement est créé par POST /payments, puis interrogé.
test('GET /payments/:id - un paiement PENDING passe à SUCCESSFUL une fois confirmé par TIKORA', async () => {
  const id = 'JCIA27-GET003'
  const created = await (await create({ orderId: id })).json()
  assert.equal(created.status, 'PENDING')
  const body = await finalStatus(created.paymentId)
  assert.equal(body.status, 'SUCCESSFUL')
  const order = await get('SELECT status FROM orders WHERE id = ?', [id])
  assert.equal(order.status, 'paid')
})

test('GET /payments/:id - paiement refusé par l’opérateur : FAILED avec le motif TIKORA', async () => {
  const created = await (await create({ orderId: 'JCIA27-GET004', phone: '670000000' })).json()
  // Faux TIKORA : un numéro finissant par 0000 → solde insuffisant
  const body = await finalStatus(created.paymentId)
  assert.equal(body.status, 'FAILED')
  assert.equal(body.reason, 'INSUFFICIENT_BALANCE')
})

test('POST /payments - rejette explicitement un montant absent ou nul', async () => {
  for (const amount of [undefined, null, '']) {
    const response = await create({ orderId: orderId(), amount })
    assert.equal(response.status, 400)
  }
})
