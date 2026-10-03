import nodemailer from 'nodemailer'
import { CONFIG } from '../config/env.js'

const transporter = nodemailer.createTransport({
  host: CONFIG.smtp.host,
  port: CONFIG.smtp.port,
  secure: CONFIG.smtp.secure,
  auth: CONFIG.smtp.user && CONFIG.smtp.pass
    ? { user: CONFIG.smtp.user, pass: CONFIG.smtp.pass }
    : undefined,
})

export async function sendReceiptEmail({ email, orderId, lang }) {
  const subject = lang === 'en'
    ? `Order Confirmation - ${orderId}`
    : `Récapitulatif de commande - ${orderId}`

  const html = lang === 'en'
    ? `<p>Thank you for your order <strong>${orderId}</strong>. Your payment has been confirmed.</p>`
    : `<p>Merci pour votre commande <strong>${orderId}</strong>. Votre paiement a été confirmé.</p>`

  if (!CONFIG.smtp.host || !CONFIG.smtp.user || !CONFIG.smtp.pass) {
    throw new Error('Configuration SMTP incomplète')
  }

  await transporter.sendMail({
    from: `"Billetterie" <${CONFIG.smtp.user}>`,
    to: email,
    subject,
    html,
  })
  return true
}

export const mailerService = { sendReceiptEmail }
