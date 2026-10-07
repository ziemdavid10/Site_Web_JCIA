import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import { CONFIG } from './config/env.js'
import { dbReady } from './database/db.js'
import { limiters, noStore, requestId, requireJson, securityHeaders } from './middleware/security.js'
import paymentRoutes from './routes/payments.js'
import receiptRoutes from './routes/receipt.js'
import orderRoutes from './routes/orders.js'
import attendeesRoutes from './routes/attendees.js'
import ticketRoutes from './routes/tickets.js'
import webhookRoutes from './routes/webhooks.js'
import photoRoutes from './routes/photos.js'
import { logger } from './utils/logger.js'

const app = express()

app.disable('x-powered-by')
app.set('trust proxy', CONFIG.trustProxy)
app.use(requestId)
app.use(securityHeaders)
app.use(cors({
  origin(origin, callback) {
    // Appels sans Origin (curl, webhooks TIKORA, sondes) : autorisés, CORS ne
    // concerne que les navigateurs.
    if (!origin || CONFIG.allowedOrigins.includes('*') || CONFIG.allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true)
    }
    return callback(new Error('Origin non autorisée par CORS'))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Idempotency-Key', 'X-Order-Token', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id', 'Retry-After'],
  credentials: false,
  maxAge: 600,
}))
// Photos des participants : corps binaire (avant le parseur JSON) et limites dédiées
app.use(photoRoutes)
app.use(limiters.global)
app.use(requireJson)
app.use(express.json({
  limit: '20kb',
  strict: true,
  // Corps brut conservé pour vérifier la signature HMAC des webhooks
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/webhooks') || req.originalUrl.startsWith('/payments/callback')) req.rawBody = Buffer.from(buf)
  },
}))
app.use(noStore)

app.get('/', async (req, res) => {
  await dbReady
  res.json({ status: 'API de billetterie opérationnelle' })
})

app.get('/health', async (req, res) => {
  try {
    await dbReady
    res.json({ status: 'ok' })
  } catch {
    res.status(503).json({ status: 'error' })
  }
})

app.use('/payments', paymentRoutes)
app.use('/orders', receiptRoutes)
app.use('/orders', orderRoutes)
app.use('/attendees', attendeesRoutes)
app.use('/tickets', ticketRoutes)
app.use('/webhooks', webhookRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable', code: 'NOT_FOUND' })
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.message === 'Origin non autorisée par CORS') {
    return res.status(403).json({ error: 'Origin non autorisée', code: 'CORS_FORBIDDEN' })
  }
  if (err?.type === 'entity.too.large' || err?.status === 413 || err?.statusCode === 413) {
    return res.status(413).json({ error: 'Corps de requête trop volumineux', code: 'PAYLOAD_TOO_LARGE' })
  }
  // body-parser : la forme de l'erreur varie selon la version d'Express/Node
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError || err?.status === 400 || err?.statusCode === 400) {
    return res.status(400).json({ error: 'JSON invalide', code: 'INVALID_JSON' })
  }
  logger.error('api.unhandled', { requestId: req.id, error: err })
  return res.status(500).json({ error: 'Erreur interne du serveur', code: 'INTERNAL_ERROR' })
})

export default app

// `app` est importable sans effet de bord réseau (tests, scripts). Le serveur
// n'est démarré que lorsque ce fichier est le programme principal.
const isMainModule = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  : false

if (isMainModule) {
  const { start } = await import('./server.js')
  start().catch((error) => {
    process.stderr.write(`Impossible de démarrer le serveur : ${error.message}\n`)
    process.exitCode = 1
  })
}
