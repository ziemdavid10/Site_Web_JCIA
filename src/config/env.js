import dotenv from 'dotenv'

dotenv.config()

function parseOrigins(value) {
  return String(value || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

const allowedOrigins = parseOrigins(process.env.ALLOWED_ORIGIN)

export const CONFIG = {
  port: Number(process.env.PORT) || 5000,
  allowedOrigins: allowedOrigins.length ? allowedOrigins : ['*'],
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  payment: {
    apiUrl: String(process.env.PAYMENT_PROVIDER_URL || '').replace(/\/$/, ''),
    apiKey: process.env.PAYMENT_PROVIDER_KEY,
    mode: process.env.PAYMENT_PROVIDER_MODE || 'demo',
  },
}
