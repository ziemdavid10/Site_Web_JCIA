import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import attendeesRoutes from '../src/routes/attendees.js'
import { dbReady, run } from '../src/database/db.js'

const app = express()
app.use('/attendees', attendeesRoutes)
let server

test.before(async () => {
  await dbReady
  server = app.listen(5003)
  await run(`DELETE FROM orders WHERE id IN ('JCIA27-ATT001','JCIA27-ATT002','JCIA27-ATT003','JCIA27-ATT004','JCIA27-ATT005')`)
  await run(`INSERT INTO orders (id, customer_name, customer_email, status, public_listing, tier_id, attendees_json, customer_org)
    VALUES ('JCIA27-ATT001', 'Alice Dev', 'alice@test.com', 'paid', 1, 'etudiant', '["Alice Dev","Bob Dev"]', 'ACME')`)
  await run(`INSERT INTO orders (id, customer_name, customer_email, status, public_listing, tier_id, attendees_json)
    VALUES ('JCIA27-ATT002', 'Bob Secret', 'bob@test.com', 'paid', 0, 'standard', '["Bob Secret"]')`)
  await run(`INSERT INTO orders (id, customer_name, customer_email, status, public_listing, tier_id, attendees_json)
    VALUES ('JCIA27-ATT003', 'Pending User', 'pending@test.com', 'pending', 1, 'vip', '["Pending User"]')`)
  await run(`INSERT INTO orders (id, customer_name, customer_email, status, public_listing, tier_id, attendees_json)
    VALUES ('JCIA27-ATT004', 'Free User', 'free@test.com', 'free', 1, 'enligne', '[]')`)
  await run(`INSERT INTO orders (id, customer_name, customer_email, status, public_listing, tier_id, attendees_json)
    VALUES ('JCIA27-ATT005', 'Broken JSON', 'broken@test.com', 'paid', 1, 'vip', '{bad json')`)
})

test.after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

test('PARTICIPANTS - renvoie HTTP 200 et un tableau', async () => {
  const response = await fetch('http://localhost:5003/attendees')
  assert.equal(response.status, 200)
  assert.ok(Array.isArray(await response.json()))
})

test('PARTICIPANTS - exclut les commandes sans consentement', async () => {
  const data = await (await fetch('http://localhost:5003/attendees')).json()
  assert.equal(data.some((x) => x.name === 'Bob Secret'), false)
})

test('PARTICIPANTS - exclut les commandes non confirmées', async () => {
  const data = await (await fetch('http://localhost:5003/attendees')).json()
  assert.equal(data.some((x) => x.name === 'Pending User'), false)
})

test('PARTICIPANTS - accepte les commandes gratuites consenties', async () => {
  const data = await (await fetch('http://localhost:5003/attendees')).json()
  assert.ok(data.some((x) => x.name === 'Free User'))
})

test('PARTICIPANTS - retourne tous les participants déclarés', async () => {
  const data = await (await fetch('http://localhost:5003/attendees')).json()
  assert.ok(data.some((x) => x.name === 'Alice Dev'))
  assert.ok(data.some((x) => x.name === 'Bob Dev'))
})

test('PARTICIPANTS - ne casse pas sur un JSON corrompu', async () => {
  const response = await fetch('http://localhost:5003/attendees')
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.ok(Array.isArray(data))
})

test('PARTICIPANTS - expose les champs attendus par le frontend', async () => {
  const data = await (await fetch('http://localhost:5003/attendees')).json()
  const item = data.find((x) => x.name === 'Alice Dev')
  assert.ok(item)
  for (const field of ['id', 'name', 'org', 'city', 'profile', 'example']) assert.ok(field in item)
})
