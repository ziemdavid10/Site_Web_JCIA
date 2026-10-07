/**
 * Environnement des tests UNITAIRES (chargé par `node --test --import`).
 * Chaque fichier de test tourne dans son propre processus et reçoit sa
 * propre base SQLite temporaire : aucun test ne touche data/database.sqlite.
 */
import os from 'node:os'
import path from 'node:path'

process.env.NODE_ENV = 'test'
process.env.PAYMENT_PROVIDER_MODE ??= 'demo'
process.env.ALLOWED_ORIGIN ??= 'http://localhost:5173,https://www.jcia.cm'
process.env.DB_PATH ??= path.join(os.tmpdir(), `jcia-test-${process.pid}-${Date.now()}.sqlite`)
process.env.APP_SECRET ??= 'test-secret-0123456789abcdef0123456789abcdef'
process.env.RATE_LIMIT_ENABLED ??= 'false'
process.env.RECEIPT_MIN_INTERVAL_MS ??= '0'
process.env.RECONCILE_INTERVAL_MS ??= '0'
process.env.TIKORA_STATUS_CACHE_MS ??= '0'
process.env.LOG_LEVEL ??= 'silent'
