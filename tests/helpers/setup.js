/**
 * Environnement des tests (chargé par `node --test --import`).
 * Chaque fichier de test tourne dans son propre processus et reçoit sa
 * propre base SQLite temporaire : aucun test ne touche data/database.sqlite.
 *
 * Le serveur passe toujours par TIKORA : pour les tests, un FAUX TIKORA local
 * (tests/helpers/mock-tikora-server.js) est démarré ici, sur un port libre. Il
 * n'existe que le temps des tests et n'est jamais utilisé par le site.
 */
import os from 'node:os'
import path from 'node:path'
import { createMockTikora, mockEnv } from './mock-tikora-server.js'

process.env.NODE_ENV = 'test'
if (!process.env.TIKORA_API_URL) {
  const mock = await createMockTikora({ payDelayMs: 0 }).listen()
  mock.server.unref() // ne retient pas le processus de test à la fin
  Object.assign(process.env, mockEnv(mock.url))
}
process.env.ALLOWED_ORIGIN ??= 'http://localhost:5173,https://www.jcia.cm'
process.env.DB_PATH ??= path.join(os.tmpdir(), `jcia-test-${process.pid}-${Date.now()}.sqlite`)
process.env.APP_SECRET ??= 'test-secret-0123456789abcdef0123456789abcdef'
process.env.RATE_LIMIT_ENABLED ??= 'false'
process.env.RECEIPT_MIN_INTERVAL_MS ??= '0'
process.env.RECONCILE_INTERVAL_MS ??= '0'
process.env.TIKORA_STATUS_CACHE_MS ??= '0'
process.env.LOG_LEVEL ??= 'silent'
