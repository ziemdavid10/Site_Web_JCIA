import dotenv from 'dotenv'
dotenv.config()

export const CONFIG = {
  port: process.env.PORT || 5000,
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  payment: {
    apiUrl: process.env.PAYMENT_PROVIDER_URL,
    apiKey: process.env.PAYMENT_PROVIDER_KEY,
  },
}