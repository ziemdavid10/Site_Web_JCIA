/**
 * Aligne les en-têtes de sécurité de vercel.json sur security/headers.mjs.
 *
 * Pourquoi : Vercel lit vercel.json AVANT le build. La CSP de vercel.json
 * doit donc déjà autoriser l'API de paiement (connect-src), sinon le
 * navigateur bloque tous les appels au serveur de billetterie — même si la
 * balise <meta> générée au build, elle, l'autorise (la règle la plus stricte
 * l'emporte).
 *
 *   VITE_PAYMENT_API_URL=https://api.jciacm.com node scripts/sync-vercel-headers.mjs          → réécrit vercel.json
 *   VITE_PAYMENT_API_URL=https://api.jciacm.com node scripts/sync-vercel-headers.mjs --check  → échoue si désaligné (CI)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { allHeaders } from '../security/headers.mjs'

const check = process.argv.includes('--check')
const apiUrl = process.env.VITE_PAYMENT_API_URL || ''
const file = 'vercel.json'
const vercel = JSON.parse(readFileSync(file, 'utf8'))
const expected = allHeaders({ paymentApiUrl: apiUrl })

const block = vercel.headers.find((h) => h.source === '/(.*)')
if (!block) throw new Error('vercel.json : bloc d’en-têtes « /(.*) » introuvable')
const before = JSON.stringify(block.headers)
block.headers = Object.entries(expected).map(([key, value]) => ({ key, value }))
const changed = before !== JSON.stringify(block.headers)

if (check) {
  if (changed) {
    console.error(`✗ vercel.json n'est pas aligné sur security/headers.mjs (API : ${apiUrl || 'aucune'}).`)
    console.error('  Lancer : VITE_PAYMENT_API_URL=<url> npm run sync:vercel')
    process.exit(1)
  }
  console.log(`✓ vercel.json aligné (connect-src inclut ${apiUrl ? new URL(apiUrl).origin : "'self' seulement"})`)
} else {
  writeFileSync(file, `${JSON.stringify(vercel, null, 2)}\n`)
  console.log(changed ? '✓ vercel.json mis à jour' : '✓ vercel.json déjà à jour')
}
