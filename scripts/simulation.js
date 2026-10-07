/**
 * SIMULATION DU PAIEMENT EN MODE RÉEL, entièrement en local, sans aucun débit.
 *
 *   npm run simulation                     démarre la simulation (Ctrl+C pour arrêter)
 *   npm run simulation -- --reset          repart d'une base de simulation vide
 *   npm run simulation -- --delai=4        validation du paiement au bout de 4 s (8 s par défaut)
 *   npm run simulation -- --sans-email     reçus préparés mais non envoyés
 *
 * Ce qui tourne :
 *   1. un faux TIKORA fidèle à l'API Partenaire (montants « 3500.00 », réservation
 *      15 min, frais 2 % avec minimum 100 FCFA, billets + QR, webhooks signés) ;
 *   2. le VRAI serveur de billetterie (src/server.js) en mode live, branché sur ce
 *      faux TIKORA, avec sa propre base (data/simulation.sqlite) : la base réelle
 *      et la configuration TIKORA de backend/.env ne sont pas touchées.
 * Le site n'a rien de particulier à faire : il appelle http://localhost:5000 comme
 * d'habitude (VITE_PAYMENT_API_URL dans .env.development.local).
 *
 * Fonctionne sous Windows, macOS et Linux (options passées après « -- »).
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { createMockTikora, mockEnv } from '../tests/helpers/mock-tikora-server.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const option = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}

// Réglages du .env lus SANS les appliquer (port, origines) : la clé TIKORA réelle n'est jamais utilisée
const fileEnv = fs.existsSync(path.join(ROOT, '.env')) ? dotenv.parse(fs.readFileSync(path.join(ROOT, '.env'))) : {}
const port = Number(option('port', fileEnv.PORT || 5000))
const site = option('site', 'http://localhost:5173').replace(/\/$/, '')
const delaySeconds = Math.max(1, Math.min(60, Number(option('delai', 8)) || 8))
const dbPath = path.join(ROOT, 'data', 'simulation.sqlite')
const api = `http://localhost:${port}`

const color = (code) => (text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text)
const green = color('32')
const red = color('31')
const yellow = color('33')
const dim = color('2')
const bold = color('1')
const time = () => new Date().toLocaleTimeString('fr-FR', { hour12: false })
const xaf = (n) => `${new Intl.NumberFormat('fr-FR').format(Number(n)).replace(/[\u202f\u00a0]/g, ' ')} FCFA`
const log = (text) => process.stdout.write(`${dim(time())}  ${text}\n`)
const masked = (phone) => `${String(phone).slice(3, 4)}•• ••• •${String(phone).slice(-2)}`
const operatorOf = (phone) => (/^2376(9|5[5-9]|40)/.test(String(phone)) ? 'Orange Money' : 'MTN MoMo')

// --- 1. Port libre ? (un « npm run dev » déjà lancé occuperait le même port) -----------------
try {
  await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1500) })
  process.stderr.write(red(`✗ Le port ${port} est déjà utilisé (serveur de billetterie déjà lancé ?).\n`))
  process.stderr.write('  Arrêtez-le (Ctrl+C dans sa fenêtre), puis relancez : npm run simulation\n')
  process.exit(1)
} catch {
  /* port libre */
}

if (flag('reset')) {
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(`${dbPath}${suffix}`, { force: true })
}

// --- 2. Faux TIKORA ----------------------------------------------------------------------------
const mock = createMockTikora({
  payDelayMs: delaySeconds * 1000,
  decimalStrings: true,
  webhookUrl: `http://127.0.0.1:${port}/webhooks/tikora`,
  onEvent(type, d) {
    const ref = d.reference ? bold(d.reference) : ''
    if (type === 'order.created') {
      log(`Commande ${ref} · ${d.tier} × ${d.quantity} · ${xaf(d.subtotal)} + ${xaf(d.buyerFee)} de frais = ${bold(xaf(d.total))}`)
    } else if (type === 'payment.requested') {
      const who = `${masked(d.phone)} (${operatorOf(d.phone)})`
      if (d.outcome === 'rejected') log(red(`✗ ${who} : demande refusée immédiatement (numéro …9999)`))
      else if (d.outcome === 'never') log(yellow(`… ${who} : demande envoyée, restera sans réponse (numéro …1111)`))
      else log(`→ Demande de ${xaf(d.total)} envoyée au ${who} · réponse simulée dans ${delaySeconds} s`)
    } else if (type === 'payment.confirmed') {
      log(green(`✓ ${ref} payé — billets émis (${d.orderNumber})`))
    } else if (type === 'payment.failed') {
      log(red(`✗ ${ref} refusé : ${d.reason} (numéro …0000)`))
    } else if (type === 'webhook') {
      log(dim(`  webhook « ${d.event} » → serveur : ${d.status ? `HTTP ${d.status}` : 'injoignable (rattrapage par sondage)'}`))
    } else if (type === 'order.expired') {
      log(yellow(`⌛ ${ref || d.orderNumber} : réservation expirée (15 min sans paiement)`))
    }
  },
})
await mock.listen(0)

// --- 3. Vrai serveur de billetterie, en mode live sur le faux TIKORA ------------------------
const origins = new Set(String(fileEnv.ALLOWED_ORIGIN || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean))
origins.add(site)
const server = spawn(process.execPath, ['src/server.js'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    ...mockEnv(mock.url),
    NODE_ENV: 'development',
    PORT: String(port),
    DB_PATH: dbPath,
    ALLOWED_ORIGIN: [...origins].join(','),
    PUBLIC_SITE_URL: site, // liens des reçus e-mail vers le site local
    TIKORA_WEBHOOK_REQUIRE_SIGNATURE: 'true', // comme en production
    RECONCILE_INTERVAL_MS: '15000',
    RATE_LIMIT_MULTIPLIER: '10', // essais répétés avec le même numéro sans blocage
    LOG_LEVEL: 'warn',
    ...(flag('sans-email') ? { SMTP_DRY_RUN: 'true' } : {}),
  },
})

// Journaux du serveur : seuls les avertissements et erreurs, en clair (affichés après la bannière)
let held = []
const emit = (text) => (held ? held.push(text) : log(text))
const relay = (stream) => {
  let buffer = ''
  stream.on('data', (chunk) => {
    buffer += chunk
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines.filter(Boolean)) {
      try {
        const entry = JSON.parse(line)
        const detail = entry.detail ?? entry.code ?? entry.error?.message ?? ''
        emit(yellow(`  serveur · ${entry.msg ?? entry.message ?? 'journal'}${detail ? ` · ${detail}` : ''}`))
      } catch {
        emit(yellow(`  serveur · ${line}`))
      }
    }
  })
}
relay(server.stdout)
relay(server.stderr)

let stopping = false
const stop = async (code = 0) => {
  if (stopping) return
  stopping = true
  server.kill('SIGTERM')
  await mock.close()
  process.exit(code)
}
server.on('exit', (code) => {
  if (stopping) return
  process.stderr.write(red(`\n✗ Le serveur de billetterie s'est arrêté (code ${code}).\n`))
  stop(code || 1)
})
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))

// --- 4. Prêt -----------------------------------------------------------------------------------
let ready = false
for (let i = 0; i < 100 && !ready; i += 1) {
  try {
    ready = (await fetch(`http://127.0.0.1:${port}/health`)).ok
  } catch {
    await new Promise((r) => setTimeout(r, 150))
  }
}
if (!ready) {
  process.stderr.write(red('✗ Le serveur de billetterie ne répond pas.\n'))
  await stop(1)
}

const w = (label, value) => `  ${label.padEnd(24)} ${value}`
process.stdout.write(
  [
    '',
    bold('Simulation du paiement en mode réel — aucun débit, aucun appel au vrai TIKORA'),
    w('Serveur de billetterie', `${api}   ${dim(`(base : data/simulation.sqlite${flag('reset') ? ', remise à zéro' : ''})`)}`),
    w('Faux TIKORA', mock.url),
    w('Site', `${site}/billetterie   ${dim('(lancez « npm run dev » dans le dossier du site)')}`),
    w('Reçus e-mail', flag('sans-email') ? 'préparés, non envoyés (--sans-email)' : 'envoyés avec le SMTP de backend/.env'),
    '',
    bold('Numéros Mobile Money de test') + dim('  (MTN : 67…, 650–654… · Orange : 69…, 655–659…)'),
    w('… se terminant par 0000', `paiement refusé au bout de ${delaySeconds} s (solde insuffisant)`),
    w('… se terminant par 9999', 'refus immédiat'),
    w('… se terminant par 1111', 'aucune réponse (la réservation expire au bout de 15 min)'),
    w('tout autre numéro', `paiement validé au bout de ${delaySeconds} s (comme après saisie du code secret)`),
    '',
    dim('Ctrl+C pour arrêter.'),
    '',
  ].join('\n'),
)
const pending = held
held = null
pending.forEach(log)
