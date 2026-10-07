import test from 'node:test'
import assert from 'node:assert/strict'
import app from '../../src/app.js'
import { dbReady } from '../../src/database/db.js'

let server

test.before(async () => {
  await dbReady
  server = app.listen(5004)
})

test.after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

test('APPLICATION - health check', async () => {
  const response = await fetch('http://localhost:5004/health')
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok' })
})

test('APPLICATION - route racine', async () => {
  const response = await fetch('http://localhost:5004/')
  assert.equal(response.status, 200)
  assert.equal((await response.json()).status, 'API de billetterie opérationnelle')
})

test('APPLICATION - route inexistante', async () => {
  const response = await fetch('http://localhost:5004/not-found')
  assert.equal(response.status, 404)
  assert.equal((await response.json()).error, 'Route introuvable')
})

test('APPLICATION - CORS autorise une origine déclarée', async () => {
  const response = await fetch('http://localhost:5004/health', { headers: { Origin: 'http://localhost:5173' } })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173')
})

test('APPLICATION - CORS refuse une origine non déclarée', async () => {
  const response = await fetch('http://localhost:5004/health', { headers: { Origin: 'https://evil.example' } })
  assert.equal(response.status, 403)
})

test('APPLICATION - requête sans Origin autorisée', async () => {
  const response = await fetch('http://localhost:5004/health')
  assert.equal(response.status, 200)
})


test('APPLICATION - JSON mal formé renvoie 400', async () => {
  const response = await fetch('http://localhost:5004/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"orderId":',
  })
  assert.equal(response.status, 400)
  assert.equal((await response.json()).error, 'JSON invalide')
})

test('APPLICATION - pré-vol CORS OPTIONS', async () => {
  const response = await fetch('http://localhost:5004/payments', {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,idempotency-key',
    },
  })
  assert.equal(response.status, 204)
  assert.ok(response.headers.get('access-control-allow-methods')?.includes('POST'))
})
