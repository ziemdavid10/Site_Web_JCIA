import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import { CONFIG } from './config/env.js'
import { dbReady } from './database/db.js'
import paymentRoutes from './routes/payments.js'
import receiptRoutes from './routes/receipt.js'
import attendeesRoutes from './routes/attendees.js'

const app = express()

app.disable('x-powered-by')
app.use(cors({
  origin(origin, callback) {
    // Autorise les appels sans Origin (curl, tests, applications serveur).
    if (!origin || CONFIG.allowedOrigins.includes('*') || CONFIG.allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true)
    }
    return callback(new Error('Origin non autorisée par CORS'))
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Idempotency-Key'],
}))
app.use(express.json({ limit: '100kb' }))

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
app.use('/attendees', attendeesRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable' })
})

app.use((err, req, res, next) => {
  console.error('Erreur API:', err)
  if (err?.message === 'Origin non autorisée par CORS') {
    return res.status(403).json({ error: 'Origin non autorisée' })
  }
  // body-parser / express.json peut produire des erreurs dont la forme varie
  // selon la version d'Express/Node : type, status, statusCode et name
  // doivent donc être pris en compte.
  if (err?.type === 'entity.parse.failed' ||
      err?.status === 400 ||
      err?.statusCode === 400 ||
      err?.name === 'SyntaxError' ||
      err instanceof SyntaxError) {
    return res.status(400).json({ error: 'JSON invalide' })
  }
  if (err?.type === 'entity.too.large' || err?.status === 413 || err?.statusCode === 413) {
    return res.status(413).json({ error: 'Corps de requête trop volumineux' })
  }
  return res.status(500).json({ error: 'Erreur interne du serveur' })
})

export default app

// `app` est importable par les tests, les scripts et d'autres modules sans
// provoquer d'effet de bord réseau. Le serveur n'est démarré que lorsque
// ce fichier est réellement exécuté comme programme principal (`npm start`).
const isMainModule = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  : false

if (isMainModule) {
  const start = async () => {
    await dbReady
    app.listen(CONFIG.port, () => {
      console.log(`Serveur démarré sur http://localhost:${CONFIG.port}`)
      console.log(`Origines autorisées : ${CONFIG.allowedOrigins.join(', ')}`)
    })
  }
  start().catch((error) => {
    console.error('Impossible de démarrer le serveur :', error)
    process.exitCode = 1
  })
}
