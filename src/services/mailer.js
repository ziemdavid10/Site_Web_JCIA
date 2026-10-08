import nodemailer from 'nodemailer'
import { CONFIG } from '../config/env.js'
import { buildReceipt } from './receiptTemplate.js'
import { buildFormEmail } from './formEmailTemplate.js'

/**
 * Envoi du récapitulatif de commande (SMTP).
 * Le transport est créé à la première utilisation : importer ce module (tests,
 * scripts) n'ouvre aucune connexion et n'exige pas de configuration SMTP.
 */

let transporter = null

function getTransporter() {
  if (!CONFIG.smtp.host || !CONFIG.smtp.user || !CONFIG.smtp.pass) {
    throw new Error('Configuration SMTP incomplète')
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: CONFIG.smtp.host,
      port: CONFIG.smtp.port,
      secure: CONFIG.smtp.secure,
      auth: { user: CONFIG.smtp.user, pass: CONFIG.smtp.pass },
      // Refuse toute connexion SMTP non chiffrée / certificat invalide
      requireTLS: !CONFIG.smtp.secure,
      tls: { minVersion: 'TLSv1.2' },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    })
  }
  return transporter
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
  })

  await getTransporter().sendMail({
    from: CONFIG.smtp.from || '"Billetterie JCIA 2027" <billetterie@jciacm.com>',
    replyTo: CONFIG.smtp.replyTo,
    to: email,
    subject,
    text,
    html,
  })
  return true
}

/** Lien du formulaire participant après un achat sur la page TIKORA de l'événement. */
export async function sendAttendeeFormEmail({ email, name, orderNumber, total }) {
  const { subject, text, html } = buildFormEmail({ name, orderNumber, total, formUrl: CONFIG.webOrders.formUrl, siteUrl: CONFIG.publicSiteUrl, contactEmail: CONFIG.smtp.replyTo })
  await getTransporter().sendMail({ from: CONFIG.smtp.from, replyTo: CONFIG.smtp.replyTo, to: email, subject, text, html })
  return true
}

export const mailerService = { sendReceiptEmail, sendAttendeeFormEmail }
