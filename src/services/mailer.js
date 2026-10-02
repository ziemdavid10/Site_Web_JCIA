import nodemailer from 'nodemailer'
import { CONFIG } from '../config/env.js'

const transporter = nodemailer.createTransport({
  host: CONFIG.smtp.host,
  port: CONFIG.smtp.port,
  secure: CONFIG.smtp.secure,
  auth: {
    user: CONFIG.smtp.user,
    pass: CONFIG.smtp.pass,
  },
})

export async function sendReceiptEmail({ email, orderId, lang }) {
  const subject = lang === 'en' 
    ? `Order Confirmation - ${orderId}` 
    : `Récapitulatif de commande - ${orderId}`

  const html = lang === 'en'
    ? `<p>Thank you for your order <strong>${orderId}</strong>. Your payment has been confirmed.</p>`
    : `<p>Merci pour votre commande <strong>${orderId}</strong>. Votre paiement a été confirmé.</p>`

  const mailOptions = {
    from: `"Billetterie" <${CONFIG.smtp.user}>`,
    to: email,
    subject,
    html,
  }

  await transporter.sendMail(mailOptions)
  return true
}