import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONFIG, validateConfig } from './config/env.js'
import { closeDb, dbReady, dbPath } from './database/db.js'
import { reconcilePending } from './services/orders.js'
import { reconcileRegistrations } from './services/cardCheckout.js'
import { syncWebOrders } from './services/webOrders.js'
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
    // Motif dans le message : lisible même dans les consoles qui n'affichent que « msg »
  // Diagnostic : NOMS des réglages reçus (jamais les valeurs)
  const received = Object.keys(process.env).filter((k) => /^(NODE_ENV|TIKORA_|SMTP_|MAIL_|ALLOWED_ORIGIN|APP_SECRET|PUBLIC_SITE_URL|DB_PATH|ATTENDEE_FORM_URL)/.test(k))
  logger.info(`config.received : ${received.length ? received.sort().join(', ') : 'AUCUN réglage reçu (secrets non transmis à l’application)'}`)
  warnings.forEach((w) => logger.warn(`config.warning : ${w}`))
  if (errors.length) {
    errors.forEach((e) => logger.error(`config.error : ${e}`))
    throw new Error(`Configuration invalide (${errors.length} erreur(s)) — voir les logs`)
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
      reconcileRegistrations().catch((error) => logger.warn('reconcile.registrations_error', { error }))
    }, CONFIG.payment.reconcileIntervalMs)
    timer.unref()
  }

  // Achats faits sur la page TIKORA : envoi du lien du formulaire participant
  let webTimer = null
  let webFirst = null
  if (CONFIG.webOrders.syncIntervalMs > 0) {
    const tick = () => syncWebOrders().catch((error) => logger.warn('web_orders.error', { code: error.code, error }))
    webFirst = setTimeout(tick, 10_000)
    webFirst.unref()
    webTimer = setInterval(tick, CONFIG.webOrders.syncIntervalMs)
    webTimer.unref()
  }

  const shutdown = (signal) => {
    logger.info('server.stopping', { signal })
    if (timer) clearInterval(timer)
    if (webTimer) clearInterval(webTimer)
    if (webFirst) clearTimeout(webFirst)
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
