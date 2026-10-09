import nodemailer from 'nodemailer'
import { CONFIG } from '../config/env.js'
import { buildReceipt } from './receiptTemplate.js'
import { buildFormEmail } from './formEmailTemplate.js'
import { buildRegistrationEmail } from './registrationEmailTemplate.js'
import { checkoutUrlFor } from './catalog.js'

/**
 * Envoi des e-mails (SMTP) : inscription, confirmation / récapitulatif, formulaire.
 * Le transport est créé à la première utilisation : importer ce module (tests,
 * scripts) n'ouvre aucune connexion et n'exige pas de configuration SMTP.
 *
 * GoDaddy (messagerie « Professional Email ») : smtpout.secureserver.net, port 465
 * (SSL direct) ou 587 (STARTTLS) ; l'expéditeur DOIT être l'adresse du compte
 * (SMTP_USER). Microsoft 365 acheté chez GoDaddy : smtp.office365.com, port 587.
 */

let transporter = null

/**
 * Paramètres de connexion effectifs. Le chiffrement suit le PORT, quelle que soit
 * la valeur de SMTP_SECURE : 465 = SSL dès la connexion (secure: true) ;
 * 587 / 25 / 2525 = connexion simple puis STARTTLS obligatoire (secure: false).
 * Une incohérence (ex. 465 + SMTP_SECURE=false) faisait échouer l'envoi.
 */
export function smtpOptions(smtp = CONFIG.smtp) {
  const port = Number(smtp.port) || 465
  const secure = port === 465 ? true : [587, 25, 2525].includes(port) ? false : Boolean(smtp.secure)
  return {
    host: String(smtp.host ?? '').trim(),
    port,
    secure,
    auth: { user: String(smtp.user ?? '').trim(), pass: smtp.pass },
    // Refuse toute connexion SMTP non chiffrée / certificat invalide
    requireTLS: !secure,
    tls: { minVersion: 'TLSv1.2', servername: String(smtp.host ?? '').trim() },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  }
}

/** Expéditeur : l'adresse du compte SMTP (GoDaddy refuse toute autre adresse). */
export function senderAddress(smtp = CONFIG.smtp) {
  const user = String(smtp.user ?? '').trim()
  const from = String(smtp.from ?? '').trim()
  const address = (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase()
  if (from && (!user || address === user.toLowerCase())) return from
  // MAIL_FROM sans adresse (guillemets mal lus) : il sert de nom affiché
  const name = from && !from.includes('@') ? from.replace(/["<>]/g, '').trim() : 'Billetterie JCIA 2027'
  return user ? `"${name}" <${user}>` : from
}

function getTransporter() {
  if (transporter) return transporter
  if (!CONFIG.smtp.host || !CONFIG.smtp.user || !CONFIG.smtp.pass) {
    throw new Error('Configuration SMTP incomplète (SMTP_HOST, SMTP_USER, SMTP_PASS)')
  }
  transporter ??= nodemailer.createTransport(smtpOptions())
  return transporter
}

/** Remplace le transport (tests : nodemailer « jsonTransport », aucun envoi réel). */
export function setTransportForTests(transport) {
  transporter = transport
}

/** Vérifie la connexion et l'identification SMTP (npm run email:test). */
export async function verifySmtp() {
  await getTransporter().verify()
  return true
}

async function send({ to, subject, text, html }) {
  return getTransporter().sendMail({ from: senderAddress(), replyTo: CONFIG.smtp.replyTo, to, subject, text, html })
}

/**
 * @param {{ email: string, orderId: string, lang?: 'fr'|'en', order?: object, tickets?: object[], accessToken?: string }} params
 *        `order` : commande au format du site (voir services/orders.js#toPublicOrder)
 */
export async function sendReceiptEmail({ email, orderId, lang = 'fr', order, tickets = [], accessToken = '' }) {
  const mailOrder = order?.customer
    ? order
    : {
        id: orderId,
        tierId: order?.tier_id ?? 'standard',
        quantity: order?.quantity ?? 1,
        unitPrice: order?.unit_price ?? order?.total ?? 0,
        fees: order?.fees ?? 0,
        total: order?.total ?? 0,
        free: order?.status === 'free',
        customer: { name: order?.customer_name || email },
        attendees: [],
        payment: {},
      }
  const { subject, text, html } = buildReceipt(mailOrder, {
    lang,
    tickets,
    accessToken,
    siteUrl: CONFIG.publicSiteUrl,
    // Lien du formulaire participant : dans le récapitulatif de TOUS les billets
    formUrl: CONFIG.webOrders.formUrl,
    ...(CONFIG.smtp.replyTo ? { contactEmail: CONFIG.smtp.replyTo } : {}),
  })

  await send({ to: email, subject, text, html })
  return true
}

/** Lien du formulaire participant après un achat sur la page TIKORA de l'événement. */
export async function sendAttendeeFormEmail({ email, name, orderNumber, total }) {
  const { subject, text, html } = buildFormEmail({ name, orderNumber, total, formUrl: CONFIG.webOrders.formUrl, siteUrl: CONFIG.publicSiteUrl, contactEmail: CONFIG.smtp.replyTo })
  await send({ to: email, subject, text, html })
  return true
}

/** Billet payant : inscription enregistrée → paiement sur TIKORA, puis retour sur le site. */
export async function sendRegistrationEmail({ email, lang = 'fr', order, accessToken }) {
  const { subject, text, html } = buildRegistrationEmail(order, {
    lang,
    accessToken,
    siteUrl: CONFIG.publicSiteUrl,
    eventUrl: checkoutUrlFor(order.tierId), // page de réservation du billet choisi
    formUrl: CONFIG.webOrders.formUrl,
    ...(CONFIG.smtp.replyTo ? { contactEmail: CONFIG.smtp.replyTo } : {}),
  })
  await send({ to: email, subject, text, html })
  return true
}

export const mailerService = { sendReceiptEmail, sendAttendeeFormEmail, sendRegistrationEmail }
