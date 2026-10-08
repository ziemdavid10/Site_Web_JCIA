/**
 * Test d'intégration — achats faits sur la page TIKORA de l'événement.
 * Le serveur les repère (sondage GET /orders, webhook order.paid) et envoie
 * UNE fois à chaque acheteur le lien du formulaire participant.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { startStack, paymentBody } from '../helpers/harness.js'
import { MOCK_EVENT_ID, MOCK_WEBHOOK_SECRET } from '../helpers/mock-tikora-server.js'

let stack
let web

test.before(async () => {
  stack = await startStack()
  web = await import('../../src/services/webOrders.js')
})

test.after(async () => {
  await stack.close()
})

const webOrder = async (body = {}) =>
  (await fetch(`${stack.mock.base}/__mock/web-order`, { method: 'POST', body: JSON.stringify({ eventId: MOCK_EVENT_ID, ...body }) })).json()

test('PAGE TIKORA - un achat payé reçoit le formulaire une seule fois', async () => {
  const o = await webOrder({ name: 'Ada Web', email: 'ada.web@example.com' })
  const first = await web.syncWebOrders()
  assert.equal(first.sent, 1)
  const mail = stack.formsSent.find((m) => m.email === 'ada.web@example.com')
  assert.equal(mail.orderNumber, o.orderNumber)
  assert.equal(mail.name, 'Ada Web')
  assert.equal((await web.syncWebOrders()).sent, 0, 'jamais deux fois')
})

test('PAGE TIKORA - ignorés : non payé, autre événement, commande de test, achat passé par notre site', async () => {
  const before = stack.formsSent.length
  await webOrder({ status: 'awaiting_payment', email: 'pending@example.com' })
  await webOrder({ eventId: 'autre-evenement-0000', email: 'other@example.com' })
  await webOrder({ livemode: false, email: 'test@example.com' })
  // Achat fait sur notre site (référence JCIA27-…) : il a déjà son propre récapitulatif
  const { getTicketPricing } = await import('../../src/utils/pricing.js')
  const created = await stack.request('POST', '/payments', paymentBody({}, getTicketPricing('standard').price))
  await stack.waitForStatus(created.body.paymentId, 'SUCCESSFUL')
  await web.syncWebOrders()
  assert.equal(stack.formsSent.length, before)
})

test('PAGE TIKORA - échec SMTP : nouvelle tentative au passage suivant', async () => {
  await webOrder({ email: 'retry@example.com' })
  stack.failNextForms(1)
  assert.equal((await web.syncWebOrders()).failed, 1)
  assert.equal((await web.syncWebOrders()).sent, 1)
  assert.equal(stack.formsSent.filter((m) => m.email === 'retry@example.com').length, 1)
  const row = (await web.webOrdersReport()).find((r) => r.buyer_email === 'retry@example.com')
  assert.ok(row.form_sent_at)
  assert.equal(row.form_attempts, 2)
})

test('PAGE TIKORA - webhook order.paid d’une commande inconnue : formulaire envoyé aussitôt', async () => {
  const o = await webOrder({ email: 'hook@example.com' })
  const body = JSON.stringify({ event: 'order.paid', data: { id: o.id, status: 'paid' } })
  const signature = `sha256=${crypto.createHmac('sha256', MOCK_WEBHOOK_SECRET).update(body).digest('hex')}`
  const res = await fetch(`${stack.api}/webhooks/tikora`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tikora-Signature': signature }, body })
  assert.equal(res.status, 200)
  assert.equal(stack.formsSent.filter((m) => m.email === 'hook@example.com').length, 1)
  await web.syncWebOrders()
  assert.equal(stack.formsSent.filter((m) => m.email === 'hook@example.com').length, 1, 'pas de doublon après le sondage')
})

test('PAGE TIKORA - l’e-mail contient le lien du formulaire et échappe le nom', async () => {
  const { buildFormEmail } = await import('../../src/services/formEmailTemplate.js')
  const url = 'https://docs.google.com/forms/d/abc/viewform'
  const m = buildFormEmail({ name: '<b>Eve</b>', orderNumber: 'ORD-1', total: 7140, formUrl: url })
  assert.ok(m.html.includes(url) && m.text.includes(url))
  assert.equal(m.html.includes('<b>Eve</b>'), false)
  assert.match(m.subject, /ORD-1/)
})

test('RATTACHEMENT - billet payé sur TIKORA vérifié : visuel, photo et liste des participants', async () => {
  const o = await webOrder({ name: 'Bella Tikora', email: 'Bella@Example.com', tier: 'vip' })
  // Mauvais e-mail ou numéro inconnu : même réponse
  const wrong = await stack.request('POST', '/orders/tikora-claim', { orderNumber: o.orderNumber, email: 'autre@example.com', publicListing: true })
  assert.equal(wrong.status, 404)
  const unknown = await stack.request('POST', '/orders/tikora-claim', { orderNumber: 'ORD-00000000', email: 'bella@example.com' })
  assert.equal(unknown.status, 404)
  assert.equal(wrong.body.code, unknown.body.code)

  // Bon numéro (casse indifférente) + e-mail utilisé sur TIKORA
  const ok = await stack.request('POST', '/orders/tikora-claim', { orderNumber: o.orderNumber.toLowerCase(), email: 'bella@example.com', publicListing: true, lang: 'fr' })
  assert.equal(ok.status, 200)
  assert.match(ok.body.orderId, /^JCIA27-[A-Z0-9]{6}$/)
  assert.equal(ok.body.order.status, 'paid')
  assert.equal(ok.body.order.tierId, 'vip')
  assert.deepEqual(ok.body.order.attendees, ['Bella Tikora'])

  // Même achat rattaché depuis un autre appareil : même commande JCIA
  const again = await stack.request('POST', '/orders/tikora-claim', { orderNumber: o.orderNumber, email: 'bella@example.com', publicListing: true })
  assert.equal(again.body.orderId, ok.body.orderId)

  // Photo envoyée avec le jeton → publiée dans la liste des participants
  const fs = await import('node:fs')
  const path = await import('node:path')
  const jpeg = fs.readFileSync(path.resolve(import.meta.dirname, '../fixtures/photo.jpg'))
  const put = await fetch(`${stack.api}/orders/${ok.body.orderId}/attendees/1/photo`, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg', 'X-Order-Token': ok.body.accessToken },
    body: jpeg,
  })
  assert.equal(put.status, 200)
  const list = (await stack.request('GET', '/attendees')).body
  const me = list.find((a) => a.id === `cmd-${ok.body.orderId}-1`)
  assert.equal(me.name, 'Bella Tikora')
  assert.equal(me.tier, 'vip')
  assert.ok(me.photo)
})

test('RATTACHEMENT - commande non payée refusée', async () => {
  const o = await webOrder({ status: 'awaiting_payment', email: 'unpaid@example.com' })
  const res = await stack.request('POST', '/orders/tikora-claim', { orderNumber: o.orderNumber, email: 'unpaid@example.com' })
  assert.equal(res.status, 409)
  assert.equal(res.body.code, 'ORDER_NOT_PAID')
})
