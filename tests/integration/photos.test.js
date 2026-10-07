/**
 * Test d'intégration — photos des participants (serveur réel + faux TIKORA).
 * Envoi par le titulaire (jeton), publication soumise au consentement,
 * lecture privée pour le visuel « J'y serai », retrait, protections.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startStack, paymentBody, newOrderId } from '../helpers/harness.js'

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures')
const JPEG = fs.readFileSync(path.join(FIXTURES, 'photo.jpg'))
const PNG = fs.readFileSync(path.join(FIXTURES, 'photo.png'))

let stack
let price

test.before(async () => {
  stack = await startStack()
  price = (await import('../../src/utils/pricing.js')).getTicketPricing('standard').price
})

test.after(async () => {
  await stack.close()
})

/** Requête binaire (le banc de test ne sait envoyer que du JSON). */
async function raw(method, url, { body, token, type = 'image/jpeg', headers = {} } = {}) {
  const res = await fetch(`${stack.api}${url}`, {
    method,
    headers: { ...(body ? { 'Content-Type': type } : {}), ...(token ? { 'X-Order-Token': token } : {}), ...headers },
    body,
  })
  const buf = Buffer.from(await res.arrayBuffer())
  let json = null
  try {
    json = JSON.parse(buf.toString('utf8'))
  } catch {
    /* image */
  }
  return { status: res.status, headers: res.headers, buf, json }
}

async function paidOrder(overrides = {}) {
  const body = paymentBody({ quantity: 2, ...overrides }, price)
  const created = await stack.request('POST', '/payments', body)
  assert.equal(created.status, 200)
  if (!String(body.phone).endsWith('1111')) await stack.waitForStatus(created.body.paymentId, 'SUCCESSFUL')
  return { orderId: body.orderId, token: created.body.accessToken }
}

const photoUrl = (orderId, position) => `/orders/${orderId}/attendees/${position}/photo`

test('PHOTO - envoi par le titulaire, publication dans la liste, image servie sans métadonnées', async () => {
  const { orderId, token } = await paidOrder()

  const saved = await raw('PUT', photoUrl(orderId, 1), { body: JPEG, token })
  assert.equal(saved.status, 200)
  assert.equal(saved.json.attendeeId, `cmd-${orderId}-1`)
  assert.equal(saved.json.public, true)
  assert.match(saved.json.photo, new RegExp(`^/attendees/cmd-${orderId}-1/photo\\?v=[\\w-]{12}$`))

  // Liste publique : photo du participant 1, aucune pour le participant 2
  const list = (await stack.request('GET', '/attendees')).body
  assert.equal(list.find((a) => a.id === `cmd-${orderId}-1`).photo, saved.json.photo)
  assert.equal(list.find((a) => a.id === `cmd-${orderId}-2`).photo, null)

  // Image publique : JPEG propre, affichable par le site (autre origine), mise en cache courte
  const pub = await raw('GET', saved.json.photo)
  assert.equal(pub.status, 200)
  assert.equal(pub.headers.get('content-type'), 'image/jpeg')
  assert.equal(pub.headers.get('cross-origin-resource-policy'), 'cross-origin')
  assert.equal(pub.headers.get('x-content-type-options'), 'nosniff')
  assert.match(pub.headers.get('cache-control'), /public, max-age=3600/)
  assert.equal(pub.buf.includes('TestCam'), false, 'EXIF retiré')
  assert.equal(pub.buf.includes('commentaire'), false)
  const etag = pub.headers.get('etag')
  assert.equal((await raw('GET', saved.json.photo, { headers: { 'If-None-Match': etag } })).status, 304)

  // La commande (vue titulaire) indique les photos présentes
  const view = await stack.request('GET', `/orders/${orderId}`, undefined, { 'X-Order-Token': token })
  assert.deepEqual(view.body.photos, [{ position: 1, version: saved.json.version }])

  // Lecture privée (visuel « J'y serai ») : jeton obligatoire
  const own = await raw('GET', photoUrl(orderId, 1), { token })
  assert.equal(own.status, 200)
  assert.match(own.headers.get('cache-control'), /no-store/)
  assert.deepEqual(own.buf, pub.buf)
  assert.equal((await raw('GET', photoUrl(orderId, 1))).status, 404)
})

test('PHOTO - accès refusé sans le bon jeton, participant inexistant, mauvais format', async () => {
  const { orderId, token } = await paidOrder()
  const { token: otherToken } = await paidOrder({ quantity: 1 })

  assert.equal((await raw('PUT', photoUrl(orderId, 1), { body: JPEG })).status, 404)
  assert.equal((await raw('PUT', photoUrl(orderId, 1), { body: JPEG, token: otherToken })).status, 404, 'jeton d’une autre commande')
  assert.equal((await raw('PUT', photoUrl('JCIA27-ZZZZZZ', 1), { body: JPEG, token })).status, 404)

  const third = await raw('PUT', photoUrl(orderId, 3), { body: JPEG, token })
  assert.equal(third.status, 404)
  assert.equal(third.json.code, 'ATTENDEE_NOT_FOUND')
  assert.equal((await raw('PUT', photoUrl(orderId, 0), { body: JPEG, token })).status, 404)

  const png = await raw('PUT', photoUrl(orderId, 1), { body: PNG, token, type: 'image/png' })
  assert.equal(png.status, 415)
  const lying = await raw('PUT', photoUrl(orderId, 1), { body: PNG, token })
  assert.equal(lying.status, 400, 'PNG annoncé comme JPEG')
  assert.equal(lying.json.code, 'INVALID_PHOTO')

  const huge = await raw('PUT', photoUrl(orderId, 1), { body: Buffer.concat([JPEG, Buffer.alloc(700 * 1024)]), token })
  assert.equal(huge.status, 413)
})

test('PHOTO - commande non confirmée : refus ; billet gratuit : accepté', async () => {
  const pending = await paidOrder({ phone: '677121111', quantity: 1 })
  const refused = await raw('PUT', photoUrl(pending.orderId, 1), { body: JPEG, token: pending.token })
  assert.equal(refused.status, 409)
  assert.equal(refused.json.code, 'ORDER_NOT_CONFIRMED')

  const orderId = newOrderId()
  const free = await stack.request('POST', '/orders/free', {
    orderId,
    tierId: 'gratuit',
    quantity: 1,
    customer: { name: 'Nadia Fotso', email: 'nadia.photo@example.com', phone: '699000077', org: '' },
    attendees: ['Nadia Fotso'],
    publicListing: true,
    lang: 'fr',
  })
  assert.equal(free.status, 201)
  const saved = await raw('PUT', photoUrl(orderId, 1), { body: JPEG, token: free.body.accessToken })
  assert.equal(saved.status, 200)
  const list = (await stack.request('GET', '/attendees')).body
  assert.equal(list.find((a) => a.id === `cmd-${orderId}-1`).photo, saved.json.photo)
})

test('PHOTO - sans consentement à la liste publique : photo privée (visuel uniquement)', async () => {
  const { orderId, token } = await paidOrder({ quantity: 1, publicListing: false })
  const saved = await raw('PUT', photoUrl(orderId, 1), { body: JPEG, token })
  assert.equal(saved.status, 200)
  assert.equal(saved.json.public, false)
  assert.equal(saved.json.photo, null)
  assert.equal((await raw('GET', `/attendees/cmd-${orderId}-1/photo`)).status, 404)
  assert.equal((await raw('GET', photoUrl(orderId, 1), { token })).status, 200)
})

test('PHOTO - retrait : immédiat dans la liste et la commande', async () => {
  const { orderId, token } = await paidOrder({ quantity: 1 })
  const saved = await raw('PUT', photoUrl(orderId, 1), { body: JPEG, token })
  assert.equal((await raw('DELETE', photoUrl(orderId, 1))).status, 404, 'jeton obligatoire')
  assert.equal((await raw('DELETE', photoUrl(orderId, 1), { token })).status, 204)
  assert.equal((await raw('GET', saved.json.photo)).status, 404)
  const list = (await stack.request('GET', '/attendees')).body
  assert.equal(list.find((a) => a.id === `cmd-${orderId}-1`).photo, null)
  const view = await stack.request('GET', `/orders/${orderId}`, undefined, { 'X-Order-Token': token })
  assert.deepEqual(view.body.photos, [])
})

test('PHOTO - CORS : envoi autorisé depuis le site, refusé depuis une autre origine', async () => {
  const preflight = await fetch(`${stack.api}${photoUrl('JCIA27-ABCDEF', 1)}`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'content-type,x-order-token',
    },
  })
  assert.equal(preflight.status, 204)
  assert.match(preflight.headers.get('access-control-allow-methods'), /PUT/)
  assert.match(preflight.headers.get('access-control-allow-methods'), /DELETE/)
  const evil = await fetch(`${stack.api}/attendees/cmd-JCIA27-ABCDEF-1/photo`, { headers: { Origin: 'https://evil.example' } })
  assert.equal(evil.status, 403)
})
