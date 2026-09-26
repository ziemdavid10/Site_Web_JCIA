#!/usr/bin/env node
/**
 * TEST D'ENVOI RÉEL du récapitulatif de commande (JCIA 2027).
 *
 *   npm run test:email
 *
 * Ce test ne simule pas l'envoi : il démarre un vrai serveur SMTP sur la machine
 * (127.0.0.1, port libre), puis fait partir le message par nodemailer, exactement
 * comme en production — poignée de main SMTP, MAIL FROM, RCPT TO, DATA. Le
 * message reçu est ensuite ouvert et vérifié ligne par ligne.
 *
 * Pourquoi un serveur local plutôt qu'une vraie boîte aux lettres ?
 *   • le test tourne partout (CI compris) sans identifiant ni réseau sortant ;
 *   • il est reproductible : aucun message ne part vers un vrai destinataire ;
 *   • il vérifie tout ce qui compte vraiment — que le message part, qu'il arrive
 *     complet, et qu'il ne transporte AUCUNE donnée de carte.
 *
 * Pour essayer avec un vrai serveur (Gmail, OVH, Brevo, Mailgun…) :
 *   SMTP_HOST=… SMTP_USER=… SMTP_PASS=… MAIL_FROM=… \
 *     node scripts/email/send-receipt.mjs --demo --to vous@exemple.cm
 */

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SMTPServer } from 'smtp-server'
import { createTransport } from 'nodemailer'
import { buildReceipt, formatXAF, paymentLabel, validateOrder } from './receipt-template.mjs'
import { DEMO_ORDER, buildMessage, sendReceipt, smtpConfigFromEnv } from './send-receipt.mjs'

// =============================================================================
// Boîte aux lettres d'essai : un vrai serveur SMTP qui garde ce qu'il reçoit
// =============================================================================
function startSink() {
  const received = []
  const server = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS'], // en local, pas de certificat à présenter
    onData(stream, session, callback) {
      const chunks = []
      stream.on('data', (c) => chunks.push(c))
      stream.on('end', () => {
        received.push({
          raw: Buffer.concat(chunks).toString('utf8'),
          from: session.envelope.mailFrom.address,
          to: session.envelope.rcptTo.map((r) => r.address),
        })
        callback()
      })
    },
  })
  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => resolve({ server, received, port: server.server.address().port }))
  })
}

// =============================================================================
// Lecture du message reçu : en-têtes + parties texte et HTML décodées
// =============================================================================
function decodeQuotedPrintable(body) {
  const joined = body.replace(/=\r?\n/g, '') // retours à la ligne « souples »
  const bytes = []
  for (let i = 0; i < joined.length; i += 1) {
    if (joined[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(joined.slice(i + 1, i + 3))) {
      bytes.push(parseInt(joined.slice(i + 1, i + 3), 16))
      i += 2
    } else {
      bytes.push(...Buffer.from(joined[i], 'utf8'))
    }
  }
  return Buffer.from(bytes).toString('utf8')
}

function decodePart(headers, body) {
  const encoding = (headers.match(/content-transfer-encoding:\s*([\w-]+)/i)?.[1] ?? '7bit').toLowerCase()
  if (encoding === 'base64') return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8')
  if (encoding === 'quoted-printable') return decodeQuotedPrintable(body)
  return body
}

/** Découpe un message MIME et renvoie { headers, text, html } */
export function parseMessage(raw) {
  const split = raw.indexOf('\r\n\r\n')
  const headers = raw.slice(0, split)
  const boundary = headers.match(/boundary="?([^";\r\n]+)"?/i)?.[1]
  if (!boundary) return { headers, text: decodePart(headers, raw.slice(split + 4)), html: '' }

  const parts = raw
    .slice(split + 4)
    .split(`--${boundary}`)
    .slice(1, -1)
    .map((part) => {
      const cut = part.indexOf('\r\n\r\n')
      return { head: part.slice(0, cut), body: part.slice(cut + 4) }
    })

  const pick = (type) => {
    const part = parts.find((p) => p.head.toLowerCase().includes(`content-type: ${type}`))
    return part ? decodePart(part.head, part.body) : ''
  }
  return { headers, text: pick('text/plain'), html: pick('text/html') }
}

/** En-tête dépliée (les en-têtes longs sont coupés sur plusieurs lignes) */
function header(headers, name) {
  const re = new RegExp(`^${name}:\\s*((?:.|\\r\\n[ \\t])*?)\\r\\n(?![ \\t])`, 'im')
  return (headers.match(re)?.[1] ?? '').replace(/\r\n[ \t]+/g, ' ').trim()
}

/**
 * Décode les en-têtes encodés (=?UTF-8?Q?…?= / =?UTF-8?B?…?=).
 * Un objet accentué est coupé en plusieurs « mots encodés » ; selon la norme
 * (RFC 2047), l'espace qui les sépare est un simple séparateur et doit
 * disparaître — sans cela on obtient « récapitulatif d e votre commande ».
 */
function decodeHeader(value) {
  return value.replace(/\?=\s+=\?/g, '?==?').replace(/=\?utf-8\?([qb])\?([^?]*)\?=/gi, (_, kind, data) =>
    kind.toLowerCase() === 'b'
      ? Buffer.from(data, 'base64').toString('utf8')
      : decodeQuotedPrintable(data.replace(/_/g, ' ')),
  )
}

// =============================================================================
// Le test
// =============================================================================
let sink
let env
let tmp

before(async () => {
  sink = await startSink()
  tmp = await mkdtemp(join(tmpdir(), 'jcia-mail-'))
  // Réglages passés au script comme en production : par l'environnement.
  env = {
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: String(sink.port),
    SMTP_SECURE: 'false',
    MAIL_FROM: 'JCIA 2027 <contact@jciacm.com>',
    MAIL_REPLY_TO: 'jcia@iacameroun.com',
    MAIL_BCC: 'billetterie@jciacm.com',
    SITE_URL: 'https://www.jcia.cm',
  }
})

after(async () => {
  await new Promise((resolve) => sink.server.close(resolve))
  await rm(tmp, { recursive: true, force: true })
})

describe('Envoi réel du récapitulatif de commande', () => {
  it('part par SMTP et arrive dans la boîte du destinataire', async () => {
    const before_ = sink.received.length
    const result = await sendReceipt(DEMO_ORDER, { env })

    assert.equal(result.dryRun, false)
    assert.ok(result.messageId, 'nodemailer doit renvoyer un identifiant de message')
    assert.match(result.response ?? '', /^250/, 'le serveur doit accepter le message (250)')
    assert.equal(sink.received.length, before_ + 1, 'exactement un message reçu')
  })

  it('a la bonne enveloppe SMTP : expéditeur, destinataire et copie cachée', () => {
    const mail = sink.received.at(-1)
    assert.equal(mail.from, 'contact@jciacm.com')
    assert.deepEqual(mail.to.sort(), ['amina.nkodo@exemple.cm', 'billetterie@jciacm.com'])
  })

  it('porte les bons en-têtes (objet, À, Répondre à, n° de commande)', () => {
    const { headers } = parseMessage(sink.received.at(-1).raw)
    assert.equal(decodeHeader(header(headers, 'Subject')), `JCIA 2027 — récapitulatif de votre commande ${DEMO_ORDER.id}`)
    assert.match(header(headers, 'To'), /amina\.nkodo@exemple\.cm/)
    assert.match(header(headers, 'Reply-To'), /jcia@iacameroun\.com/)
    assert.equal(header(headers, 'X-JCIA-Order'), DEMO_ORDER.id)
    // La copie cachée ne doit JAMAIS apparaître dans les en-têtes du message.
    assert.doesNotMatch(headers, /^Bcc:/im, 'le Bcc doit rester dans l’enveloppe, pas dans les en-têtes')
  })

  it('contient les deux versions, texte et HTML', () => {
    const { headers, text, html } = parseMessage(sink.received.at(-1).raw)
    assert.match(headers, /content-type:\s*multipart\/alternative/i)
    assert.ok(text.length > 200, 'une version texte est indispensable pour la délivrabilité')
    assert.match(html, /^<!doctype html>/i)
  })

  it('reprend fidèlement les informations de la commande', () => {
    const { text, html } = parseMessage(sink.received.at(-1).raw)
    for (const body of [text, html]) {
      assert.match(body, /Amina Nkodo/)
      assert.match(body, new RegExp(DEMO_ORDER.id))
      assert.match(body, /Tarif standard/)
      assert.match(body, new RegExp(formatXAF(10_000).replace(/\s/g, '\\s')), 'le total doit figurer')
      assert.match(body, /Visa •••• 4242/)
      assert.match(body, new RegExp(DEMO_ORDER.payment.transactionId))
      assert.match(body, /27 (&|&amp;) 28 avril 2027/) // « & » échappé côté HTML
      assert.match(body, /Hilton/)
      assert.match(body, /Serge Mbarga/, 'les deux participants doivent être listés')
      assert.match(body, /contact@jciacm\.com/)
    }
    assert.match(html, new RegExp(`https://www\\.jcia\\.cm/billetterie/confirmation/${DEMO_ORDER.id}`))
  })

  it("ne transporte AUCUNE donnée de carte (numéro, CVC)", () => {
    const mail = sink.received.at(-1)
    const { text, html } = parseMessage(mail.raw)
    for (const body of [mail.raw, text, html]) {
      assert.doesNotMatch(body, /\b\d{13,19}\b/, 'aucune suite de 13 à 19 chiffres : pas de numéro de carte')
      assert.doesNotMatch(body, /\b(cvc|cvv|code de sécurité)\b/i)
      assert.doesNotMatch(body, /4242[\s-]?4242/, 'le numéro complet ne doit jamais apparaître')
    }
    // Seuls les quatre derniers chiffres sont autorisés, et seulement masqués.
    assert.match(html, /•••• 4242/)
  })

  it('échappe le HTML : un nom piégé ne peut pas injecter de balise', async () => {
    const piege = {
      ...DEMO_ORDER,
      customer: { ...DEMO_ORDER.customer, name: '<script>alert(1)</script>', email: 'piege@exemple.cm' },
      attendees: ['<img onerror=alert(2)>', 'Serge Mbarga'],
    }
    await sendReceipt(piege, { env })
    const { html } = parseMessage(sink.received.at(-1).raw)
    // Le texte piégé doit rester du TEXTE : aucune balise ouverte, aucun
    // attribut d'événement interprétable par le client de messagerie.
    assert.doesNotMatch(html, /<script/i)
    assert.doesNotMatch(html, /<img[^>]*onerror/i)
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
    assert.match(html, /&lt;img onerror=alert\(2\)&gt;/)
  })

  it('envoie aussi une commande payée par Mobile Money', async () => {
    const momo = {
      ...DEMO_ORDER,
      id: 'JCIA27-9ZKP2M',
      tierId: 'etudiant',
      quantity: 1,
      unitPrice: 2500,
      total: 2500,
      attendees: ['Amina Nkodo'],
      payment: { status: 'paid', method: 'momo', operator: 'mtn', phone: '699089937', mode: 'live', transactionId: 'MOMO-77412' },
    }
    const result = await sendReceipt(momo, { env })
    assert.match(result.response ?? '', /^250/)
    const { text } = parseMessage(sink.received.at(-1).raw)
    assert.match(text, /MTN Mobile Money \(699089937\)/)
    assert.match(text, /Tarif étudiant/)
  })

  it("écrit un aperçu HTML sans rien envoyer en mode --dry-run", async () => {
    const before_ = sink.received.length
    const out = join(tmp, 'apercu.html')
    const result = await sendReceipt(DEMO_ORDER, { env, dryRun: true, out })
    assert.equal(result.dryRun, true)
    assert.equal(sink.received.length, before_, 'aucun message ne doit partir')
    assert.match(await readFile(out, 'utf8'), /Votre commande est confirmée/)
  })
})

describe('Garde-fous avant l’envoi', () => {
  const cases = [
    ['identifiant de commande invalide', { id: 'X-1' }],
    ['adresse e-mail invalide', { customer: { ...DEMO_ORDER.customer, email: 'pas-une-adresse' } }],
    ['nom du client manquant', { customer: { ...DEMO_ORDER.customer, name: '' } }],
    ['quantité invalide', { quantity: 0 }],
    ['total incohérent', { total: 1 }],
    ['liste des participants incohérente', { attendees: ['Seule'] }],
  ]

  for (const [attendu, patch] of cases) {
    it(`refuse une commande : ${attendu}`, () => {
      const problems = validateOrder({ ...DEMO_ORDER, ...patch })
      assert.ok(problems.includes(attendu), `problèmes trouvés : ${problems.join(', ')}`)
      assert.throws(() => buildMessage({ ...DEMO_ORDER, ...patch }, env), /Commande refusée/)
    })
  }

  it('refuse une commande qui contiendrait un numéro de carte', () => {
    const fuite = { ...DEMO_ORDER, payment: { ...DEMO_ORDER.payment, pan: '4242424242424242' } }
    assert.ok(validateOrder(fuite).includes('la commande contient ce qui ressemble à un numéro de carte'))
    assert.throws(() => buildMessage(fuite, env), /numéro de carte/)
  })

  it('refuse une commande absente', () => {
    assert.deepEqual(validateOrder(null), ['commande absente'])
  })

  it("n'envoie rien si SMTP_HOST n'est pas défini", async () => {
    await assert.rejects(() => sendReceipt(DEMO_ORDER, { env: { ...env, SMTP_HOST: '' } }), /SMTP_HOST/)
  })
})

describe('Réglages SMTP lus dans l’environnement', () => {
  it('port 465 : TLS dès la connexion', () => {
    const c = smtpConfigFromEnv({ SMTP_HOST: 'smtp.exemple.cm', SMTP_PORT: '465' })
    assert.equal(c.secure, true)
    assert.equal(c.requireTLS, false)
  })

  it('port 587 : STARTTLS exigé', () => {
    const c = smtpConfigFromEnv({ SMTP_HOST: 'smtp.exemple.cm', SMTP_PORT: '587' })
    assert.equal(c.secure, false)
    assert.equal(c.requireTLS, true)
  })

  it("n'accepte pas un certificat invalide par défaut", () => {
    assert.equal(smtpConfigFromEnv({ SMTP_HOST: 'x' }).tls.rejectUnauthorized, true)
  })

  it("n'ajoute d'identifiants que si SMTP_USER est fourni", () => {
    assert.equal(smtpConfigFromEnv({ SMTP_HOST: 'x' }).auth, undefined)
    assert.deepEqual(smtpConfigFromEnv({ SMTP_HOST: 'x', SMTP_USER: 'u', SMTP_PASS: 'p' }).auth, { user: 'u', pass: 'p' })
  })

  it('aucun identifiant n’est écrit en dur dans le script', async () => {
    const source = await readFile(new URL('./send-receipt.mjs', import.meta.url), 'utf8')
    assert.doesNotMatch(source, /SMTP_PASS\s*[:=]\s*['"][^'"]+['"]/, 'le mot de passe doit venir de l’environnement')
  })
})

describe('Gabarit du message', () => {
  it('affiche « Mobile Money » ou « Visa •••• 1234 » selon le moyen de paiement', () => {
    assert.equal(paymentLabel({ method: 'card', brand: 'mastercard', last4: '5454' }), 'Mastercard •••• 5454')
    assert.equal(paymentLabel({ method: 'card' }), 'Carte bancaire')
    assert.equal(paymentLabel({ method: 'momo', operator: 'orange', phone: '699000000' }), 'Orange Money (699000000)')
  })

  it('accorde le mot « participant » au pluriel', () => {
    assert.match(buildReceipt(DEMO_ORDER).text, /Participants :/)
    assert.match(buildReceipt({ ...DEMO_ORDER, quantity: 1, total: 5000, attendees: ['Seule'] }).text, /Participant :/)
  })

  it('met les montants en francs CFA', () => {
    assert.match(formatXAF(25_000), /25\s?000 FCFA/)
  })
})
