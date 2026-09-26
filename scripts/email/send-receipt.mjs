#!/usr/bin/env node
/**
 * Envoi RÉEL, par SMTP, du récapitulatif d'une commande JCIA 2027.
 *
 * ─── Utilisation ─────────────────────────────────────────────────────────────
 *   node scripts/email/send-receipt.mjs --order commande.json
 *   node scripts/email/send-receipt.mjs --demo --to moi@exemple.cm
 *   node scripts/email/send-receipt.mjs --demo --dry-run     (aucun envoi)
 *
 * ─── Réglages (variables d'environnement uniquement) ─────────────────────────
 *   SMTP_HOST      serveur d'envoi                    (obligatoire)
 *   SMTP_PORT      465 (TLS direct) ou 587 (STARTTLS)  défaut 587
 *   SMTP_SECURE    'true' pour du TLS direct           défaut : port === 465
 *   SMTP_USER      identifiant                         (facultatif)
 *   SMTP_PASS      mot de passe / clé d'application    (facultatif)
 *   MAIL_FROM      expéditeur   ex. "JCIA 2027 <contact@jciacm.com>"
 *   MAIL_REPLY_TO  adresse de réponse                  (facultatif)
 *   MAIL_TO        destinataire de secours si la commande n'en a pas
 *   MAIL_BCC       copie cachée (archivage billetterie) (facultatif)
 *   SITE_URL       adresse du site pour le lien billet  défaut https://www.jcia.cm
 *
 * ⚠️ Aucun identifiant n'est écrit dans le dépôt : tout vient de
 * l'environnement (fichier .env non versionné, ou secrets du CI). Le script
 * refuse de partir si SMTP_HOST manque, et n'affiche jamais SMTP_PASS.
 *
 * ⚠️ Le script refuse aussi toute commande qui contiendrait ce qui ressemble à
 * un numéro de carte (voir validateOrder) : un reçu ne transporte que le réseau
 * et les quatre derniers chiffres.
 */

import { writeFile } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { buildReceipt, validateOrder } from './receipt-template.mjs'

// --- Petite lecture des arguments (pas de dépendance) ------------------------
export function parseArgs(argv = process.argv.slice(2)) {
  const opts = { demo: false, dryRun: false, order: '', to: '', out: '' }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--demo') opts.demo = true
    else if (a === '--dry-run') opts.dryRun = true
    else if (a === '--order') opts.order = argv[(i += 1)] ?? ''
    else if (a === '--to') opts.to = argv[(i += 1)] ?? ''
    else if (a === '--out') opts.out = argv[(i += 1)] ?? ''
  }
  return opts
}

/**
 * Commande d'exemple : sert à essayer l'envoi sans passer par la billetterie.
 * Elle a exactement la forme produite par src/services/orders.js.
 */
export const DEMO_ORDER = {
  id: 'JCIA27-4T7WQK',
  createdAt: '2027-03-14T09:24:00.000Z',
  lang: 'fr',
  tierId: 'standard',
  quantity: 2,
  unitPrice: 5000,
  total: 10000,
  currency: 'XAF',
  customer: {
    name: 'Amina Nkodo',
    email: 'amina.nkodo@exemple.cm',
    phone: '699089937',
    org: 'Université de Yaoundé I',
  },
  attendees: ['Amina Nkodo', 'Serge Mbarga'],
  publicListing: true,
  payment: {
    status: 'paid',
    method: 'card',
    brand: 'visa',
    last4: '4242',
    mode: 'live',
    transactionId: 'TX-2027-0031947',
    paidAt: '2027-03-14T09:25:11.000Z',
  },
}

/** Nom lisible du tarif, pour le corps du message */
const TIER_NAMES = {
  etudiant: 'Tarif étudiant',
  standard: 'Tarif standard',
  'en-ligne': 'Participation en ligne',
  professionnel: 'Tarif professionnel',
}

/** Réglages SMTP lus dans l'environnement, jamais dans le code */
export function smtpConfigFromEnv(env = process.env) {
  const port = Number(env.SMTP_PORT ?? 587)
  return {
    host: env.SMTP_HOST ?? '',
    port,
    // Port 465 : TLS dès la connexion. Port 587 : STARTTLS (négocié ensuite).
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : port === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } : undefined,
    // On refuse un certificat invalide : mieux vaut ne pas envoyer que d'envoyer en clair.
    requireTLS: port === 587,
    tls: { rejectUnauthorized: env.SMTP_INSECURE !== 'true' },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  }
}

/**
 * Construit le message prêt pour nodemailer, à partir d'une commande.
 * Exporté pour être réutilisé par le test (test-receipt.mjs).
 */
export function buildMessage(order, env = process.env) {
  const problems = validateOrder(order)
  if (problems.length) throw new Error(`Commande refusée : ${problems.join(' ; ')}`)

  const { subject, text, html } = buildReceipt(order, {
    siteUrl: env.SITE_URL || 'https://www.jcia.cm',
    tierName: TIER_NAMES[order.tierId] ?? order.tierId,
  })

  return {
    from: env.MAIL_FROM || 'JCIA 2027 <contact@jciacm.com>',
    to: order.customer.email,
    replyTo: env.MAIL_REPLY_TO || undefined,
    bcc: env.MAIL_BCC || undefined,
    subject,
    text,
    html,
    // Aide les clients à regrouper les messages d'une même commande
    headers: { 'X-JCIA-Order': order.id },
  }
}

/**
 * Envoie réellement le message.
 * @param {object} order
 * @param {object} options { env, dryRun, out }
 * @returns {Promise<object>} { dryRun } ou le résultat de nodemailer
 */
export async function sendReceipt(order, { env = process.env, dryRun = false, out = '' } = {}) {
  const message = buildMessage(order, env)

  if (dryRun) {
    const file = out || `apercu-${order.id}.html`
    await writeFile(file, message.html, 'utf8')
    return { dryRun: true, file, subject: message.subject, to: message.to }
  }

  const config = smtpConfigFromEnv(env)
  if (!config.host) {
    throw new Error("SMTP_HOST n'est pas défini : renseignez l'environnement, ou utilisez --dry-run.")
  }

  // Import différé : le mode --dry-run fonctionne même sans nodemailer installé.
  const { createTransport } = await import('nodemailer')
  const transport = createTransport(config)
  await transport.verify() // échoue tôt et clairement si les réglages sont faux
  const info = await transport.sendMail(message)
  transport.close()
  return { dryRun: false, subject: message.subject, to: message.to, messageId: info.messageId, response: info.response }
}

// --- Exécution en ligne de commande -----------------------------------------
const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href

if (isMain) {
  const opts = parseArgs()
  try {
    let order = DEMO_ORDER
    if (opts.order) order = JSON.parse(await readFile(opts.order, 'utf8'))
    else if (!opts.demo) {
      console.error('Indiquez --order <fichier.json> ou --demo. Voir l’en-tête du script.')
      process.exit(2)
    }
    if (opts.to) order = { ...order, customer: { ...order.customer, email: opts.to } }
    if (!order.customer?.email && process.env.MAIL_TO) {
      order = { ...order, customer: { ...order.customer, email: process.env.MAIL_TO } }
    }

    const result = await sendReceipt(order, { dryRun: opts.dryRun, out: opts.out })
    if (result.dryRun) console.log(`Aperçu écrit dans ${result.file}\nObjet : ${result.subject}\nÀ : ${result.to}`)
    else console.log(`Envoyé à ${result.to}\nObjet : ${result.subject}\nid : ${result.messageId}\n${result.response ?? ''}`)
  } catch (error) {
    console.error(`Échec : ${error.message}`)
    process.exit(1)
  }
}
