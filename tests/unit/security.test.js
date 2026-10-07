import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { loadConfig, validateConfig } from '../../src/config/env.js'
import { freeTicketQrToken, orderAccessToken, verifyOrderAccessToken, verifyWebhookSignature } from '../../src/services/security.js'
import { redact, maskEmail, maskPhone } from '../../src/utils/logger.js'
import { normalizeTikoraOrder } from '../../src/services/paymentApi.js'
import { parseOrderRequest } from '../../src/services/orders.js'
import { getTicketPricing } from '../../src/utils/pricing.js'
import { esc, buildReceipt } from '../../src/services/receiptTemplate.js'

const LIVE_ENV = {
  NODE_ENV: 'production',
  PAYMENT_PROVIDER_MODE: 'live',
  TIKORA_API_KEY: 'tk_live_abcdefgh12345678',
  TIKORA_EVENT_ID: '7d3c1e8a-0000-4000-8000-00000000e027',
  TIKORA_CATEGORY_MAP: JSON.stringify({ etudiant: 'aaaaaaaa-1', standard: 'aaaaaaaa-2', 'en-ligne': 'aaaaaaaa-3', vip: { default: 'aaaaaaaa-4', promo: 'aaaaaaaa-5' } }),
  ALLOWED_ORIGIN: 'https://www.jcia.cm',
  APP_SECRET: 'z'.repeat(40),
  SMTP_HOST: 'smtp.example.com',
  SMTP_USER: 'a@b.cm',
  SMTP_PASS: 'x',
}

test('CONFIG - une configuration de production complète est acceptée', () => {
  const { errors } = validateConfig(loadConfig(LIVE_ENV))
  assert.deepEqual(errors, [])
})

test('CONFIG - erreurs bloquantes en production', () => {
  const cases = [
    [{ PAYMENT_PROVIDER_MODE: 'demo' }, /interdit en production/],
    [{ ALLOWED_ORIGIN: '*' }, /ALLOWED_ORIGIN/],
    [{ APP_SECRET: 'court' }, /APP_SECRET/],
    [{ TIKORA_API_KEY: '' }, /TIKORA_API_KEY est obligatoire/],
    [{ TIKORA_API_KEY: 'Bearer tk_live_abcdefgh12345678' }, /sans « Authorization: Bearer »/],
    [{ TIKORA_API_URL: 'http://tikora.example/api/v1/partner' }, /HTTPS/],
    [{ TIKORA_EVENT_ID: '' }, /TIKORA_EVENT_ID/],
    [{ TIKORA_CATEGORY_MAP: '{pas du json' }, /JSON valide/],
    [{ TIKORA_CATEGORY_MAP: '{"standard":"aaaaaaaa-2"}' }, /tarif « etudiant »/],
    [{ SMTP_PASS: '' }, /SMTP/],
  ]
  for (const [override, re] of cases) {
    const { errors } = validateConfig(loadConfig({ ...LIVE_ENV, ...override }))
    assert.ok(errors.some((e) => re.test(e)), `attendu ${re} pour ${JSON.stringify(override)}`)
  }
})

test('CONFIG - hors production, le mode démo et CORS ouvert sont tolérés', () => {
  const config = loadConfig({ NODE_ENV: 'development' })
  assert.equal(config.payment.mode, 'demo')
  assert.deepEqual(config.allowedOrigins, ['*'])
  assert.equal(loadConfig({ NODE_ENV: 'production' }).payment.mode, 'live')
})

test('JETON - accès commande déterministe, lié à l’identifiant, comparaison sûre', () => {
  const t = orderAccessToken('JCIA27-ABCDEF')
  assert.equal(t, orderAccessToken('JCIA27-ABCDEF'))
  assert.notEqual(t, orderAccessToken('JCIA27-ABCDEG'))
  assert.equal(verifyOrderAccessToken('JCIA27-ABCDEF', t), true)
  assert.equal(verifyOrderAccessToken('JCIA27-ABCDEG', t), false)
  assert.equal(verifyOrderAccessToken('JCIA27-ABCDEF', ''), false)
  assert.equal(verifyOrderAccessToken('JCIA27-ABCDEF', undefined), false)
  assert.match(freeTicketQrToken('JCIA27-ABCDEF', 1), /^JCIA27F\.JCIA27-ABCDEF\.1\.[\w-]{22}$/)
})

test('WEBHOOK - signature HMAC : formats acceptés, falsifications refusées', () => {
  const secret = 'whsec_test'
  const raw = Buffer.from('{"event":"order.paid","data":{"id":"x"}}')
  const hex = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  const b64 = crypto.createHmac('sha256', secret).update(raw).digest('base64')
  assert.equal(verifyWebhookSignature(raw, hex, secret), true)
  assert.equal(verifyWebhookSignature(raw, `sha256=${hex}`, secret), true)
  assert.equal(verifyWebhookSignature(raw, b64, secret), true)
  const ts = Math.floor(Date.now() / 1000)
  const v1 = crypto.createHmac('sha256', secret).update(`${ts}.`).update(raw).digest('hex')
  assert.equal(verifyWebhookSignature(raw, `t=${ts},v1=${v1}`, secret), true)
  // Rejeu d'une signature horodatée trop ancienne
  assert.equal(verifyWebhookSignature(raw, `t=${ts - 3600},v1=${v1}`, secret), false)
  assert.equal(verifyWebhookSignature(Buffer.from('{"event":"order.paid","data":{"id":"y"}}'), hex, secret), false)
  assert.equal(verifyWebhookSignature(raw, hex, 'autre-secret'), false)
  assert.equal(verifyWebhookSignature(raw, '', secret), false)
})

test('LOGS - aucune donnée sensible ne fuit', () => {
  const out = JSON.stringify(
    redact({
      card: { number: '4242424242424242' },
      cvc: '123',
      apiKey: 'tk_live_secret',
      email: 'awa@example.com',
      phone: '677123456',
      message: 'Clé tk_live_abcdefgh123 refusée pour awa@example.com, carte 4242424242424242',
      error: new Error('Bearer tk_test_zzzzzzzzzz'),
    }),
  )
  assert.equal(/4242424242424242|tk_live_abc|tk_live_secret|tk_test_zzz|awa@example|677123456|"cvc"/.test(out), false, out)
  assert.equal(maskEmail('awa@example.com'), 'aw***@example.com')
  assert.equal(maskPhone('677123456'), '***456')
})

test('TIKORA - normalisation des statuts de commande', () => {
  const base = { id: 'o1', status: 'awaiting_payment', subtotal: 7000, buyerFee: 140, total: 7140, currency: 'XAF', tickets: [] }
  assert.equal(normalizeTikoraOrder(base).status, 'PENDING')
  assert.equal(normalizeTikoraOrder({ ...base, status: 'paid' }).status, 'SUCCESSFUL')
  for (const s of ['failed', 'cancelled', 'expired', 'refunded']) assert.equal(normalizeTikoraOrder({ ...base, status: s }).status, 'FAILED')
  const refused = normalizeTikoraOrder({ ...base, payment: { status: 'failed', method: 'mtn_momo', failureCode: 'INSUFFICIENT_BALANCE' } })
  assert.equal(refused.status, 'FAILED')
  assert.equal(refused.reason, 'INSUFFICIENT_BALANCE')
  const paid = normalizeTikoraOrder({
    ...base,
    status: 'paid',
    tickets: [{ id: 't1', ticketCode: 'TKT-1', qrToken: 'qr', qrCodeImageUrl: 'javascript:alert(1)', holderFullName: 'A', status: 'valid' }],
  })
  assert.equal(paid.tickets[0].qrImageUrl, null, 'URL d’image non HTTPS ignorée')
  assert.throws(() => normalizeTikoraOrder({ foo: 1 }), /illisible/)
})

test('VALIDATION - requête de commande : données minimales et refus', () => {
  const price = getTicketPricing('vip').price
  const ok = parseOrderRequest({
    orderId: 'JCIA27-ABCDEF', amount: price * 2, method: 'momo', operator: 'orange', phone: '+237 699 00 00 01',
    tierId: 'vip', quantity: 2, customer: { name: 'Awa Diallo', email: 'awa@example.com', org: '<b>IAC</b>' },
    attendees: ['Awa Diallo', 'Jean Kamga'],
  })
  assert.equal(ok.payPhone, '699000001')
  assert.equal(ok.publicListing, false, 'consentement non présumé')
  assert.equal(ok.subtotal, price * 2)
  assert.throws(() => parseOrderRequest({ ...ok, orderId: 'JCIA27-ABCDEF', amount: price * 2, method: 'momo', operator: 'mtn', phone: '612', customer: ok.customer }), /Numéro/)
  assert.throws(() => parseOrderRequest(null), /Corps/)
})

test('E-MAIL - le gabarit échappe tout contenu injecté', () => {
  assert.equal(esc('<script>"\'&'), '&lt;script&gt;&quot;&#39;&amp;')
  const { html, subject } = buildReceipt(
    { id: 'JCIA27-ABCDEF', tierId: 'vip', quantity: 1, unitPrice: 17500, fees: 350, total: 17850, customer: { name: '<img src=x onerror=alert(1)>' }, attendees: ['<script>x</script>'], payment: { operator: 'mtn', transactionId: 'CMD-1' } },
    { lang: 'en', accessToken: 'tok"en', tickets: [{ code: '<b>TKT</b>' }] },
  )
  assert.match(subject, /order summary/)
  assert.equal(/<img src=x|<script>x|<b>TKT/.test(html), false)
  assert.match(html, /#t=tok%22en/)
})
