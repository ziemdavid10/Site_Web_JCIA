/**
 * Lance un test de charge complet en local ou en CI :
 *   1. démarre le faux TIKORA (tests/helpers/mock-tikora-server.js) ;
 *   2. démarre le VRAI serveur (node src/server.js) en mode live, branché dessus,
 *      avec une base SQLite jetable ;
 *   3. exécute k6 (tests/load/k6-load.js) avec le profil demandé ;
 *   4. arrête tout et renvoie le code de sortie de k6 (≠ 0 si un seuil échoue).
 *
 *   node tests/load/run-stack.js [smoke|load|stress|spike|soak]
 *   K6_BIN=/chemin/vers/k6  (par défaut : « k6 » dans le PATH)
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMockTikora, mockEnv } from '../helpers/mock-tikora-server.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const profile = process.argv[2] || process.env.PROFILE || 'smoke'
const port = Number(process.env.LOAD_PORT || 5055)

const mock = await createMockTikora({ payDelayMs: Number(process.env.MOCK_PAY_DELAY_MS || 800) }).listen()
const dbPath = path.join(os.tmpdir(), `jcia-load-${Date.now()}.sqlite`)

const server = spawn(process.execPath, ['src/server.js'], {
  cwd: ROOT,
  stdio: ['ignore', 'ignore', 'inherit'],
  env: {
    PATH: process.env.PATH,
    SKIP_DOTENV: '1', // le .env du poste (vraie clé, vrai SMTP) n'est pas utilisé
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: String(port),
    DB_PATH: dbPath,
    APP_SECRET: 'load-test-secret-0123456789abcdef0123456789',
    ALLOWED_ORIGIN: 'http://localhost:5173',
    SMTP_HOST: '127.0.0.1', // aucun SMTP : l'envoi échoue immédiatement (non mesuré ici)
    SMTP_PORT: '9',
    SMTP_SECURE: 'false',
    SMTP_USER: 'load@example.com',
    SMTP_PASS: 'not-used',
    // Les limites anti-abus restent ACTIVES mais relevées : tout le trafic vient d'une IP
    RATE_LIMIT_MULTIPLIER: process.env.RATE_LIMIT_MULTIPLIER || '1000',
    LOG_LEVEL: 'error',
    ...mockEnv(mock.url),
  },
})

async function waitHealthy() {
  for (let i = 0; i < 100; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`)
      if (r.ok) return
    } catch {
      /* pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('Le backend ne démarre pas')
}

let code
try {
  await waitHealthy()
  code = await new Promise((resolve) => {
    const k6 = spawn(process.env.K6_BIN || 'k6', ['run', '-e', `PROFILE=${profile}`, '-e', `BASE_URL=http://127.0.0.1:${port}`, '-e', `SUMMARY_FILE=${process.env.SUMMARY_FILE || 'load-summary.json'}`, 'tests/load/k6-load.js'], {
      cwd: ROOT,
      stdio: 'inherit',
    })
    k6.on('exit', (c) => resolve(c ?? 1))
    k6.on('error', (e) => {
      process.stderr.write(`k6 introuvable (${e.message}). Installer k6 ou définir K6_BIN.\n`)
      resolve(1)
    })
  })
} catch (error) {
  process.stderr.write(`${error.message}\n`)
  code = 1
} finally {
  server.kill('SIGTERM')
  await mock.close()
}
process.exit(code ?? 1)
