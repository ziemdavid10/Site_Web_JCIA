/**
 * Tests de montée en charge — k6 (https://k6.io).
 *
 * Trafic simulé (proportions observées sur une billetterie d'événement) :
 *   • 70 % « visiteurs »   : page billetterie (GET /tickets) + liste des participants
 *   • 25 % « acheteurs »   : POST /payments puis sondage GET /payments/:id toutes les
 *                            secondes jusqu'à confirmation (comme le site)
 *   •  5 % « inscriptions gratuites » : POST /orders/free
 *   Environ 5 % des acheteurs utilisent un numéro refusé (…0000) pour exercer
 *   aussi le chemin d'échec.
 *
 * Profils (-e PROFILE=…) :
 *   smoke   2 VU, 30 s         vérification rapide (CI à chaque push)
 *   load    0→50 VU, 5 min     charge nominale attendue à l'ouverture des ventes
 *   stress  0→200 VU, 8 min    recherche du point de rupture
 *   spike   10→300 VU en 10 s  afflux soudain (annonce sur les réseaux sociaux)
 *   soak    30 VU, 30 min      endurance (fuites mémoire, verrous SQLite)
 *
 * Cible : -e BASE_URL=http://127.0.0.1:5000 (backend branché sur le FAUX TIKORA ;
 * ne JAMAIS viser la production : chaque achat déclencherait une demande réelle).
 *
 * Lancement local tout-en-un : npm run test:load:stack -- smoke
 */
import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Counter, Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:5000'
const PROFILE = __ENV.PROFILE || 'load'
const ORIGIN = __ENV.ORIGIN || 'http://localhost:5173'

const PROFILES = {
  smoke: { executor: 'constant-vus', vus: 2, duration: '30s' },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 20 },
      { duration: '3m', target: 50 },
      { duration: '1m', target: 0 },
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },
      { duration: '2m', target: 100 },
      { duration: '2m', target: 200 },
      { duration: '2m', target: 0 },
    ],
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 10,
    stages: [
      { duration: '30s', target: 10 },
      { duration: '10s', target: 300 },
      { duration: '1m', target: 300 },
      { duration: '20s', target: 10 },
      { duration: '30s', target: 0 },
    ],
  },
  soak: { executor: 'constant-vus', vus: 30, duration: '30m' },
}

const lenient = PROFILE === 'stress' || PROFILE === 'spike'

export const options = {
  scenarios: { traffic: { ...PROFILES[PROFILE], gracefulStop: '30s' } },
  thresholds: {
    // Moins de 1 % d'erreurs HTTP (5 % tolérés en stress/spike)
    http_req_failed: [`rate<${lenient ? 0.05 : 0.01}`],
    'http_req_duration{kind:read}': [`p(95)<${lenient ? 1500 : 500}`],
    'http_req_duration{kind:create}': [`p(95)<${lenient ? 3000 : 1500}`],
    'http_req_duration{kind:poll}': [`p(95)<${lenient ? 1500 : 400}`],
    checks: [`rate>${lenient ? 0.95 : 0.99}`],
    payment_success: ['rate>0.9'],
    payment_e2e_ms: [`p(95)<${lenient ? 15000 : 6000}`],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
}

const paymentSuccess = new Rate('payment_success')
const paymentE2E = new Trend('payment_e2e_ms', true)
const paymentsCreated = new Counter('payments_created')
const expectedRefusals = new Counter('payments_refused_expected')

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const randomOrderId = () => `JCIA27-${Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')}`
const randomPhone = (refused) => {
  let tail = refused ? '0000' : String(Math.floor(1000 + Math.random() * 7000))
  if (tail === '1111') tail = '1112' // …1111 = paiement laissé en attente par le faux TIKORA
  return `67${Math.floor(100 + Math.random() * 899)}${tail}`
}
const headers = { 'Content-Type': 'application/json', Accept: 'application/json', Origin: ORIGIN }

export function setup() {
  const res = http.get(`${BASE_URL}/tickets`, { headers })
  if (res.status !== 200) throw new Error(`Backend injoignable ou catalogue indisponible (HTTP ${res.status})`)
  const catalog = res.json()
  const prices = Object.fromEntries(catalog.tiers.map((t) => [t.id, t.price]))
  return { prices, mode: catalog.mode }
}

function browse() {
  group('visiteur', () => {
    const t = http.get(`${BASE_URL}/tickets`, { headers, tags: { kind: 'read', name: 'GET /tickets' } })
    check(t, { 'catalogue 200': (r) => r.status === 200 })
    sleep(Math.random() * 2)
    const a = http.get(`${BASE_URL}/attendees`, { headers, tags: { kind: 'read', name: 'GET /attendees' } })
    check(a, { 'participants 200': (r) => r.status === 200 && Array.isArray(r.json()) })
  })
}

function buy(prices) {
  group('acheteur', () => {
    const tiers = ['etudiant', 'standard', 'en-ligne', 'vip']
    const tierId = tiers[Math.floor(Math.random() * tiers.length)]
    const quantity = 1 + Math.floor(Math.random() * 3)
    const refused = Math.random() < 0.05
    const phone = randomPhone(refused)
    const body = {
      orderId: randomOrderId(),
      amount: prices[tierId] * quantity,
      currency: 'XAF',
      method: 'momo',
      operator: 'mtn',
      phone,
      tierId,
      quantity,
      customer: { name: 'Client Charge', email: `load+${__VU}-${__ITER}@example.com`, phone, org: 'k6' },
      attendees: Array.from({ length: quantity }, (_, i) => `Participant ${ALPHABET[i]} Charge`),
      publicListing: Math.random() < 0.5,
      lang: 'fr',
    }
    const started = Date.now()
    const created = http.post(`${BASE_URL}/payments`, JSON.stringify(body), {
      headers: { ...headers, 'Idempotency-Key': body.orderId },
      tags: { kind: 'create', name: 'POST /payments' },
    })
    const ok = check(created, { 'paiement créé 200': (r) => r.status === 200 && typeof r.json('paymentId') === 'string' })
    if (!ok) {
      paymentSuccess.add(false)
      return
    }
    paymentsCreated.add(1)
    const paymentId = created.json('paymentId')

    let status = created.json('status')
    for (let i = 0; i < 20 && status === 'PENDING'; i += 1) {
      sleep(1) // le site interroge toutes les 3 s ; 1 s ici pour charger davantage
      const poll = http.get(`${BASE_URL}/payments/${paymentId}`, { headers, tags: { kind: 'poll', name: 'GET /payments/:id' } })
      check(poll, { 'statut 200': (r) => r.status === 200 })
      if (poll.status === 200) status = poll.json('status')
    }
    paymentE2E.add(Date.now() - started)
    if (refused) {
      expectedRefusals.add(1)
      check(status, { 'refus attendu FAILED': (s) => s === 'FAILED' })
    } else {
      paymentSuccess.add(status === 'SUCCESSFUL')
      check(status, { 'paiement confirmé': (s) => s === 'SUCCESSFUL' })
    }
  })
}

function registerFree() {
  group('gratuit', () => {
    const body = {
      orderId: randomOrderId(),
      tierId: 'gratuit',
      quantity: 1,
      customer: { name: 'Etudiant Libre', email: `free+${__VU}-${__ITER}-${Date.now()}@example.com`, phone: randomPhone(false) },
      publicListing: false,
      lang: 'fr',
    }
    const res = http.post(`${BASE_URL}/orders/free`, JSON.stringify(body), { headers, tags: { kind: 'create', name: 'POST /orders/free' } })
    check(res, { 'gratuit 201': (r) => r.status === 201 })
  })
}

export default function (data) {
  const dice = Math.random()
  if (dice < 0.7) browse()
  else if (dice < 0.95) buy(data.prices)
  else registerFree()
  sleep(1 + Math.random() * 2)
}

export function handleSummary(summary) {
  const out = __ENV.SUMMARY_FILE || 'load-summary.json'
  return {
    [out]: JSON.stringify(summary, null, 2),
    stdout: textSummary(summary),
  }
}

function textSummary(s) {
  const m = s.metrics
  const v = (name, stat) => (m[name]?.values?.[stat] ?? 0).toFixed(stat === 'rate' ? 4 : 1)
  const lines = [
    `\n=== JCIA — test de charge (${PROFILE}) ===`,
    `Requêtes            : ${m.http_reqs?.values?.count ?? 0} (${v('http_reqs', 'rate')} req/s)`,
    `Erreurs HTTP        : ${(Number(v('http_req_failed', 'rate')) * 100).toFixed(2)} %`,
    `Lecture p95         : ${v('http_req_duration{kind:read}', 'p(95)')} ms`,
    `Création p95        : ${v('http_req_duration{kind:create}', 'p(95)')} ms`,
    `Sondage p95         : ${v('http_req_duration{kind:poll}', 'p(95)')} ms`,
    `Paiements créés     : ${m.payments_created?.values?.count ?? 0}`,
    `Taux de succès      : ${(Number(v('payment_success', 'rate')) * 100).toFixed(2)} %`,
    `Paiement complet p95: ${v('payment_e2e_ms', 'p(95)')} ms`,
    `Seuils              : ${Object.entries(m).filter(([, x]) => x.thresholds).every(([, x]) => Object.values(x.thresholds).every((t) => t.ok)) ? 'TOUS RESPECTÉS' : 'NON RESPECTÉS'}`,
    '',
  ]
  return lines.join('\n')
}
