/**
 * Envoi des e-mails : transport nodemailer « jsonTransport » (aucun envoi réel),
 * destinataire davidloic10@gmail.com. L'envoi réel se teste avec : npm run email:test
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import nodemailer from 'nodemailer'
import { CONFIG } from '../../src/config/env.js'
import { mailerService, senderAddress, setTransportForTests, smtpOptions } from '../../src/services/mailer.js'

const TO = 'davidloic10@gmail.com'
const FORM = CONFIG.webOrders.formUrl
const sent = []

test.before(() => {
  const json = nodemailer.createTransport({ jsonTransport: true })
  setTransportForTests({
    sendMail: async (mail) => {
      const info = await json.sendMail(mail)
      sent.push(JSON.parse(info.message))
      return info
    },
  })
})
test.after(() => setTransportForTests(null))

const order = {
  id: 'JCIA27-TEST01',
  tierId: 'standard',
  quantity: 1,
  unitPrice: 7000,
  subtotal: 7000,
  total: 7000,
  fees: 0,
  lang: 'fr',
  customer: { name: 'David Test', firstName: 'David', email: TO },
  attendees: ['David Test'],
}

test('E-MAIL - « Bienvenue aux JCIA » : bilingue, TIKORA, code du billet, retour sur le site, formulaire', async () => {
  await mailerService.sendRegistrationEmail({ email: TO, lang: 'fr', order, accessToken: 'tok_test_123' })
  const m = sent.at(-1)
  assert.equal(m.to[0].address, TO)
  assert.match(m.subject, /Bienvenue/)
  assert.match(m.subject, /Complete your registration/)
  for (const part of [m.text, m.html]) {
    assert.ok(part.includes(FORM), 'lien du formulaire participant')
    assert.ok(part.includes('/billetterie/confirmation/JCIA27-TEST01#t=tok_test_123'), 'retour sur le site')
  }
  assert.match(m.text, /Collectez le code de votre billet/)
  assert.match(m.text, /collez-le pour finaliser la procédure/)
  assert.match(m.text, /N’oubliez pas de remplir le formulaire/)
  assert.match(m.text, /Collect your ticket code/)
  assert.match(m.text, /Don’t forget to fill in the attendee form/)
  assert.ok(m.text.indexOf('Français') < m.text.indexOf('English'), 'langue du site en premier')
})

test('E-MAIL - confirmations (billet payé sur TIKORA, billet gratuit) : formulaire et lien du site', async () => {
  await mailerService.sendReceiptEmail({
    email: TO, orderId: order.id, lang: 'fr', accessToken: 'tok',
    order: { ...order, payment: { mode: 'tikora_page', tikoraOrderNumber: 'ORD-TEST0001' } }, tickets: [],
  })
  let m = sent.at(-1)
  assert.equal(m.to[0].address, TO)
  assert.ok(m.html.includes(FORM) && m.html.includes('ORD-TEST0001'))
  await mailerService.sendReceiptEmail({
    email: TO, orderId: 'JCIA27-TEST02', lang: 'en', accessToken: 'tok',
    order: { ...order, id: 'JCIA27-TEST02', tierId: 'gratuit', unitPrice: 0, total: 0, free: true, payment: {} }, tickets: [],
  })
  m = sent.at(-1)
  assert.ok(m.html.includes(FORM))
  assert.match(m.subject, /order summary/)
})

test('SMTP - chiffrement d’après le port (465 SSL, 587 STARTTLS) et expéditeur = compte SMTP', () => {
  const base = { host: 'smtpout.secureserver.net', user: 'contact@jciacm.com', pass: 'x' }
  assert.equal(smtpOptions({ ...base, port: 465, secure: false }).secure, true, '465 + SMTP_SECURE=false corrigé')
  const starttls = smtpOptions({ ...base, port: 587, secure: true })
  assert.equal(starttls.secure, false)
  assert.equal(starttls.requireTLS, true)
  assert.equal(senderAddress({ ...base, from: '"Billetterie JCIA 2027" <contact@jciacm.com>' }), '"Billetterie JCIA 2027" <contact@jciacm.com>')
  assert.equal(senderAddress({ ...base, from: 'Billetterie JCIA 2027' }), '"Billetterie JCIA 2027" <contact@jciacm.com>')
  assert.equal(senderAddress({ ...base, from: 'autre@gmail.com' }), '"Billetterie JCIA 2027" <contact@jciacm.com>')
})

test('SMTP - adresse de webmail GoDaddy refusée comme serveur d’envoi', async () => {
  const { loadConfig, validateConfig } = await import('../../src/config/env.js')
  const errors = validateConfig(loadConfig({ ...process.env, SMTP_HOST: 'email.secureserver.net' })).errors
  assert.ok(errors.some((e) => /smtpout\.secureserver\.net/.test(e)))
})
