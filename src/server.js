import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONFIG, validateConfig } from './config/env.js'
import { closeDb, dbReady, dbPath } from './database/db.js'
import { reconcilePending } from './services/orders.js'
import { logger } from './utils/logger.js'

/**
 * Démarrage du serveur :
 *   1. validation de la configuration (refus de démarrer en production si
 *      un réglage est dangereux) ;
 *   2. ouverture de la base ;
 *   3. écoute HTTP + tâche de rattrapage des paiements en attente ;
 *   4. arrêt propre sur SIGTERM/SIGINT (déploiement sans coupure).
 */
export async function start() {
  const { errors, warnings } = validateConfig(CONFIG)
  warnings.forEach((w) => logger.warn('config.warning', { detail: w }))
  if (errors.length) {
    errors.forEach((e) => logger.error('config.error', { detail: e }))
    if (CONFIG.isProduction || CONFIG.payment.mode === 'live') {
      throw new Error(`Configuration invalide (${errors.length} erreur(s)) — voir les logs`)
    }
  }

  await dbReady
  const { default: app } = await import('./app.js')

  const server = app.listen(CONFIG.port, CONFIG.host, () => {
    logger.info('server.started', {
      port: CONFIG.port,
      mode: CONFIG.payment.mode,
      env: CONFIG.nodeEnv,
      origins: CONFIG.allowedOrigins.join(','),
      db: path.basename(dbPath),
    })
  })
  server.headersTimeout = 20_000
  server.requestTimeout = 30_000
  server.keepAliveTimeout = 65_000

  let timer = null
  if (CONFIG.payment.reconcileIntervalMs > 0) {
    timer = setInterval(() => {
      reconcilePending().catch((error) => logger.warn('reconcile.error', { error }))
    }, CONFIG.payment.reconcileIntervalMs)
    timer.unref()
  }

  const shutdown = (signal) => {
    logger.info('server.stopping', { signal })
    if (timer) clearInterval(timer)
    server.close(() => closeDb().then(() => process.exit(0)))
    setTimeout(() => process.exit(1), 10_000).unref()
  }
  process.once('SIGTERM', () => shutdown('SIGTERM'))
  process.once('SIGINT', () => shutdown('SIGINT'))
  return server
}

const isMainModule = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  : false

if (isMainModule) {
  start().catch((error) => {
    process.stderr.write(`Impossible de démarrer le serveur : ${error.message}\n`)
    process.exit(1)
  })
}
