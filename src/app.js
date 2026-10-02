import express from 'express'
import cors from 'cors'
import { CONFIG } from './config/env.js'
import paymentRoutes from './routes/payments.js'
import receiptRoutes from './routes/receipt.js'

const app = express()

// Middlewares
app.use(cors({ origin: CONFIG.allowedOrigin }))
app.use(express.json())

// Routes API
app.use('/payments', paymentRoutes)
app.use('/orders', receiptRoutes)

// Route de santé
app.get('/', (req, res) => {
  res.json({ status: 'API de billetterie opérationnelle' })
})

// Démarrage du serveur
app.listen(CONFIG.port, () => {
  console.log(`Serveur démarré sur http://localhost:${CONFIG.port}`)
  console.log(`Origine autorisée pour CORS : ${CONFIG.allowedOrigin}`)
  console.log(`Bonjour ZIEM! Bienvenue sur l'API de billetterie. Le serveur est prêt à recevoir des requêtes.`)
})