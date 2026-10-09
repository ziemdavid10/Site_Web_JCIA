/**
 * Test d'intégration — même parcours pour TOUS les billets :
 *   1. le participant remplit le formulaire du site (prénom, nom, WhatsApp,
 *      organisation, rôle, photo) ;
 *   2. billet payant : il paie sur la page TIKORA de l'événement, avec la même
 *      adresse e-mail ; le serveur retrouve le paiement et confirme l'inscription ;
 *   3. e-mails : « finalisez votre paiement » puis confirmation, avec le lien du
 *      formulaire participant ; liste publique avec rôle et organisation.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { startStack, newOrderId } from '../helpers/harness.js'
import { MOCK_EVENT_ID } from '../helpers/mock-tikora-server.js'

let stack
let web

test.before(async () => {
  // Recherche du paiement à chaque consultation (pas d'intervalle minimal en test)
  stack = await startStack({ env: { TIKORA_LOOKUP_MIN_INTERVAL_MS: '0' } })
  web = await import('../../src/services/webOrders.js')
})

test.after(async () => {
  await stack.close()
})

const webOrder = async (body = {}) =>
  (await fetch(`${stack.mock.base}/__mock/web-order`, { method: 'POST', body: JSON.stringify({ eventId: MOCK_EVENT_ID, ...body }) })).json()

const profile = (over = {}) => ({
  firstName: 'Aïcha',
  lastName: 'Mbarga',
  email: 'aicha.mbarga@example.com',
  whatsapp: '6 77 12 34 56',
  org: 'Université de Yaoundé I',
  role: 'Doctorante en IA',
  ...over,
})

const register = (tierId, customer, extra = {}) =>
  stack.request('POST', '/orders/register', { orderId: newOrderId(), tierId, quantity: 1, customer, publicListing: true, lang: 'fr', ...extra })

const getOrder = (id, token) => stack.request('GET', `/orders/${id}`, undefined, { 'X-Order-Token': token })

test('INSCRIPTION - billet payant : fiche complète obligatoire, un participant par inscription', async () => {
  const bad = [
    [{ role: '' }, 'INVALID_ROLE'],
    [{ org: '' }, 'INVALID_ORG'],
    [{ whatsapp: '12' }, 'INVALID_PHONE'],
    [{ firstName: '' }, 'INVALID_NAME'],
    [{ email: 'pas-un-email' }, 'INVALID_EMAIL'],
  ]
  for (const [over, code] of bad) {
    const res = await register('standard', profile({ email: `v${code.toLowerCase()}@example.com`, ...over }))
    assert.equal(res.status, 400, code)
    assert.equal(res.body.code, code)
  }
  assert.equal((await register('standard', profile(), { quantity: 2 })).body.code, 'INVALID_QUANTITY')
  assert.equal((await register('gratuit', profile())).body.code, 'INVALID_TIER')
})

test('INSCRIPTION - enregistrée, e-mail « payez sur TIKORA », absente de la liste tant que non payée', async () => {
  const res = await register('standard', profile({ email: 'attente@example.com' }))
  assert.equal(res.status, 201)
  assert.equal(res.body.status, 'registered')
  await new Promise((r) => setTimeout(r, 50)) // envoi en arrière-plan
  const mail = stack.registrationsSent.find((m) => m.email === 'attente@example.com')
  assert.ok(mail, 'e-mail d’inscription envoyé')
  assert.equal(mail.order.customer.firstName, 'Aïcha')
  assert.equal(mail.order.customer.role, 'Doctorante en IA')

  const view = await getOrder(res.body.orderId, res.body.accessToken)
  assert.equal(view.body.status, 'registered')
  const list = (await stack.request('GET', '/attendees')).body
  assert.equal(list.some((a) => a.id === `cmd-${res.body.orderId}-1`), false)

  // Double clic : même inscription, pas de second e-mail
  const again = await stack.request('POST', '/orders/register', {
    orderId: res.body.orderId, tierId: 'standard', quantity: 1, customer: profile({ email: 'attente@example.com' }), publicListing: true,
  })
  assert.equal(again.status, 201)
  assert.equal(stack.registrationsSent.filter((m) => m.email === 'attente@example.com').length, 1)
})

test('PAIEMENT TIKORA - même adresse e-mail : inscription confirmée automatiquement, au tarif réellement acheté', async () => {
  const email = 'paul.essomba@example.com'
  const reg = await register('standard', profile({ firstName: 'Paul', lastName: 'Essomba', email, role: 'CTO', org: 'Kamer Data' }))
  // Photo envoyée juste après l'inscription (avant le paiement)
  const jpeg = fs.readFileSync(path.resolve(import.meta.dirname, '../fixtures/photo.jpg'))
  const put = await fetch(`${stack.api}/orders/${reg.body.orderId}/attendees/1/photo`, {
    method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'X-Order-Token': reg.body.accessToken }, body: jpeg,
  })
  assert.equal(put.status, 200)

  const formsBefore = stack.formsSent.length
  const receiptsBefore = stack.sent.length
  await webOrder({ name: 'Paul E.', email: 'Paul.Essomba@Example.com', tier: 'vip' }) // casse différente, autre tarif

  // Le participant attend sur la page du site : la consultation déclenche la recherche
  const view = await getOrder(reg.body.orderId, reg.body.accessToken)
  assert.equal(view.body.status, 'paid')
  assert.equal(view.body.tierId, 'vip', 'le tarif suit le billet acheté chez TIKORA')
  assert.match(view.body.payment.tikoraOrderNumber, /^ORD-/)
  assert.equal(view.body.customer.role, 'CTO')

  // Confirmation envoyée (récapitulatif avec le formulaire) ; pas d'e-mail générique en double
  await new Promise((r) => setTimeout(r, 50))
  assert.equal(stack.sent.length, receiptsBefore + 1)
  assert.equal(stack.sent.at(-1).email, email)
  assert.equal(stack.formsSent.length, formsBefore)

  // Liste publique : nom, rôle, organisation, photo
  const me = (await stack.request('GET', '/attendees')).body.find((a) => a.id === `cmd-${reg.body.orderId}-1`)
  assert.equal(me.name, 'Paul Essomba')
  assert.equal(me.role, 'CTO')
  assert.equal(me.org, 'Kamer Data')
  assert.equal(me.tier, 'vip')
  assert.ok(me.photo)

  // Sondages suivants : rien de plus
  await web.syncWebOrders()
  assert.equal(stack.sent.length, receiptsBefore + 1)
})

test('PAIEMENT TIKORA - autre adresse e-mail : rattachement manuel par numéro de commande, vérifié', async () => {
  const reg = await register('etudiant', profile({ email: 'inscrit@example.com', role: 'Master 2 IA' }))
  const o = await webOrder({ email: 'payeur@example.com', tier: 'etudiant' })
  await web.syncWebOrders()
  // Aucune inscription avec cette adresse : e-mail générique (formulaire + retour sur le site)
  assert.ok(stack.formsSent.some((m) => m.email === 'payeur@example.com'))
  assert.equal((await getOrder(reg.body.orderId, reg.body.accessToken)).body.status, 'registered')

  const link = (body, token = reg.body.accessToken) => stack.request('POST', `/orders/${reg.body.orderId}/tikora-link`, body, { 'X-Order-Token': token })
  assert.equal((await link({ orderNumber: o.orderNumber, email: 'payeur@example.com' }, 'mauvais-jeton-000000000000')).status, 404)
  const wrong = await link({ orderNumber: o.orderNumber, email: 'inscrit@example.com' })
  assert.equal(wrong.status, 404)
  assert.equal(wrong.body.code, 'ORDER_NOT_FOUND')

  const ok = await link({ orderNumber: o.orderNumber.toLowerCase(), email: 'PAYEUR@example.com' })
  assert.equal(ok.status, 200)
  assert.equal(ok.body.status, 'paid')
  assert.equal(ok.body.tierId, 'etudiant')

  // Un billet TIKORA = une inscription : une seconde inscription ne peut pas le réutiliser
  const other = await register('etudiant', profile({ email: 'second@example.com' }))
  const reuse = await stack.request('POST', `/orders/${other.body.orderId}/tikora-link`, { orderNumber: o.orderNumber, email: 'payeur@example.com' }, {
    'X-Order-Token': other.body.accessToken,
  })
  assert.equal(reuse.status, 409)
  assert.equal(reuse.body.code, 'ORDER_ALREADY_USED')
})

test('PAIEMENT TIKORA - achat de groupe : autant d’inscriptions confirmées que de billets', async () => {
  const email = 'groupe@example.com'
  const a = await register('standard', profile({ firstName: 'Alain', email }))
  const b = await register('standard', profile({ firstName: 'Brice', email }))
  const c = await register('standard', profile({ firstName: 'Carine', email }))
  await webOrder({ email, tier: 'standard', quantity: 2 })
  await web.syncWebOrders()
  const statuses = await Promise.all([a, b, c].map((r) => getOrder(r.body.orderId, r.body.accessToken).then((v) => v.body.status)))
  assert.deepEqual(statuses, ['paid', 'paid', 'registered'], 'les deux plus anciennes, dans la limite des billets achetés')
})

test('PAIEMENT TIKORA - commande non payée : l’inscription reste en attente', async () => {
  const email = 'pas-encore@example.com'
  const reg = await register('standard', profile({ email }))
  await webOrder({ email, status: 'awaiting_payment' })
  assert.equal((await getOrder(reg.body.orderId, reg.body.accessToken)).body.status, 'registered')
})

test('GRATUIT - même fiche (prénom, nom, WhatsApp, organisation, rôle) : liste et récapitulatif', async () => {
  const before = stack.sent.length
  const res = await stack.request('POST', '/orders/free', {
    orderId: newOrderId(), tierId: 'gratuit', quantity: 1, publicListing: true, lang: 'en',
    customer: profile({ firstName: 'Nadia', lastName: 'Fouda', email: 'nadia@example.com', whatsapp: '+33 6 12 34 56 78', role: 'Journaliste', org: 'CRTV' }),
  })
  assert.equal(res.status, 201)
  const view = await getOrder(res.body.orderId, res.body.accessToken)
  assert.equal(view.body.customer.firstName, 'Nadia')
  assert.equal(view.body.customer.role, 'Journaliste')
  const me = (await stack.request('GET', '/attendees')).body.find((a) => a.id === `cmd-${res.body.orderId}-1`)
  assert.equal(me.name, 'Nadia Fouda')
  assert.equal(me.role, 'Journaliste')
  await new Promise((r) => setTimeout(r, 50))
  assert.equal(stack.sent.length, before + 1)
})

test('E-MAILS - lien du formulaire participant pour tous les billets, retour sur le site, contenu échappé', async () => {
  const form = 'https://docs.google.com/forms/d/1jpOGg8oab-88-x19JbFD2-s9IMjPXvjN2XXoOQH-7v8/previewResponse'
  const { buildReceipt } = await import('../../src/services/receiptTemplate.js')
  const base = { id: 'JCIA27-ABCDEF', quantity: 1, unitPrice: 0, fees: 0, total: 0, customer: { name: 'Eve <script>' }, attendees: ['Eve <script>'] }
  const free = buildReceipt({ ...base, tierId: 'gratuit', free: true, payment: {} }, { formUrl: form, accessToken: 'tok' })
  assert.ok(free.html.includes(form) && free.text.includes(form))
  assert.equal(free.html.includes('<script>'), false)
  const paid = buildReceipt(
    { ...base, tierId: 'vip', unitPrice: 50000, total: 50000, payment: { mode: 'tikora_page', tikoraOrderNumber: 'ORD-1234ABCD' } },
    { formUrl: form, accessToken: 'tok' },
  )
  assert.ok(paid.html.includes('ORD-1234ABCD') && paid.html.includes(form))
  assert.match(paid.text, /TIKORA/)

  const { buildRegistrationEmail } = await import('../../src/services/registrationEmailTemplate.js')
  const event = 'https://tikora.proditech.online/evenements/jcia-2027'
  const m = buildRegistrationEmail(
    { id: 'JCIA27-ABCDEF', tierId: 'standard', unitPrice: 35000, customer: { firstName: '<b>Ana</b>', email: 'ana@example.com' } },
    { accessToken: 'tok_123', siteUrl: 'https://www.jcia.cm', eventUrl: event, formUrl: form },
  )
  assert.ok(m.html.includes(event) && m.html.includes(form))
  assert.ok(m.html.includes('/billetterie/confirmation/JCIA27-ABCDEF#t=tok_123'), 'lien de retour sur le site')
  assert.equal(m.html.includes('<b>Ana</b>'), false)
  assert.match(m.text, /ana@example\.com/)
})
