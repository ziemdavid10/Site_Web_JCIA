/**
 * Assistant de mise en place TIKORA (fonctionne sous Windows, macOS, Linux).
 * Utilise TIKORA_API_URL et TIKORA_API_KEY du fichier .env.
 *
 *   npm run tikora -- check          vérifie la clé, les frais et les catégories d'événement acceptées
 *   npm run tikora -- create         crée l'événement JCIA 2027 décrit dans scripts/tikora-event.json
 *   npm run tikora -- events         liste vos événements TIKORA (statut, identifiant)
 *   npm run tikora -- env <eventId>  affiche TIKORA_EVENT_ID et TIKORA_CATEGORY_MAP à coller dans .env
 *   npm run tikora -- orders         commandes de l'événement vues par l'API (achats faits sur la page TIKORA compris ?)
 *   npm run tikora -- forms          e-mails « formulaire participant » envoyés / en attente
 *   npm run tikora -- sync           repère tout de suite les achats payés et envoie les formulaires
 *   npm run tikora -- resend <ORD-…> renvoie le formulaire à l'acheteur d'une commande
 *
 * « create » est idempotent : relancé avec le même fichier, il ne crée pas de doublon.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONFIG } from '../src/config/env.js'
import { tikora } from '../src/services/tikoraClient.js'
import { getTicketPricing, PROMOTION } from '../src/utils/pricing.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const EVENT_FILE = path.join(here, 'tikora-event.json')
const TIERS = ['etudiant', 'standard', 'en-ligne', 'vip']

const ok = (m) => console.log(`  ✓ ${m}`)
const ko = (m) => console.log(`  ✗ ${m}`)
const info = (m) => console.log(`    ${m}`)

/** Tarif JCIA et période (promo/default) déduits du nom de la catégorie TIKORA. */
export function tierOfCategoryName(name) {
  const n = String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
  const tier = /etudiant|student/.test(n)
    ? 'etudiant'
    : /en ligne|en-ligne|online/.test(n)
      ? 'en-ligne'
      : /vip/.test(n)
        ? 'vip'
        : /standard/.test(n)
          ? 'standard'
          : null
  return tier ? { tier, period: /lancement|promo|launch/.test(n) ? 'promo' : 'default' } : null
}

/** Appel non indispensable : en cas d'échec, avertit et continue (TIKORA revalidera). */
async function optional(label, fn) {
  try {
    return await fn()
  } catch (error) {
    console.log(`  ⚠ ${label} : TIKORA ne répond pas (${error.code ?? error.message}) — étape non bloquante`)
    return null
  }
}

async function check() {
  console.log('\nVérification du compte TIKORA')
  info(`URL de l'API : ${CONFIG.payment.apiUrl} · délai : ${CONFIG.payment.timeoutMs / 1000} s`)
  const me = await tikora.me()
  ok(`Clé valide — compte « ${me.name} » (${me.status})`)
  if (me.status !== 'active') ko('Compte suspendu : contactez TIKORA')

  const c = await optional('Commissions (GET /commissions)', () => tikora.commissions())
  if (c) ok(`Frais acheteur : ${c.buyerFee.value} % (min ${c.minimumFeeAmount} ${c.currency}) · commission TIKORA : ${c.partnerCommission.value} %`)

  const cats = await optional("Catégories d'événement (GET /event-categories)", () => tikora.eventCategories())
  const wanted = JSON.parse(fs.readFileSync(EVENT_FILE, 'utf8')).category
  if (cats) {
    const sellable = cats.filter((x) => x.ticketsForSale).map((x) => x.name)
    ok(`Catégories d'événement acceptant la vente : ${sellable.join(', ')}`)
    if (sellable.includes(wanted)) ok(`La catégorie « ${wanted} » de tikora-event.json est valide`)
    else ko(`« ${wanted} » n'est pas dans la liste : modifiez "category" dans scripts/tikora-event.json`)
  } else info(`Catégorie « ${wanted} » non vérifiée : TIKORA la contrôlera à la création.`)
  console.log('\nPrêt pour : npm run tikora -- create')
}

async function create() {
  const event = JSON.parse(fs.readFileSync(EVENT_FILE, 'utf8'))
  console.log('\nContrôle de scripts/tikora-event.json')

  // 1. Prix conformes à la grille JCIA (promo jusqu'au 31/12/2026, puis plein tarif)
  let errors = 0
  const promoDate = new Date(PROMOTION.start.getTime() + 1000)
  const fullDate = new Date(PROMOTION.end.getTime() + 60_000)
  for (const cat of event.ticketCategories) {
    const t = tierOfCategoryName(cat.name)
    if (!t) {
      ko(`« ${cat.name} » : nom non reconnu (doit contenir Étudiant, Standard, En ligne ou VIP)`)
      errors += 1
      continue
    }
    const expected = getTicketPricing(t.tier, t.period === 'promo' ? promoDate : fullDate).price
    if (Number(cat.price) !== expected) {
      ko(`« ${cat.name} » : ${cat.price} XAF, attendu ${expected} XAF`)
      errors += 1
    } else ok(`« ${cat.name} » : ${cat.price} XAF · ${cat.totalQuantity} places`)
  }
  for (const tier of TIERS) {
    for (const period of ['promo', 'default']) {
      if (!event.ticketCategories.some((c) => JSON.stringify(tierOfCategoryName(c.name)) === JSON.stringify({ tier, period }))) {
        ko(`Catégorie manquante : ${tier} (${period === 'promo' ? 'lancement' : 'plein tarif'})`)
        errors += 1
      }
    }
  }
  const seats = event.ticketCategories.reduce((n, c) => n + Number(c.totalQuantity || 0), 0)
  if (seats > event.maxParticipants) {
    ko(`Total des places (${seats}) supérieur à maxParticipants (${event.maxParticipants})`)
    errors += 1
  }
  const cats = await optional("Catégories d'événement (GET /event-categories)", () => tikora.eventCategories())
  if (cats && !cats.some((x) => x.name === event.category && x.ticketsForSale)) {
    ko(`Catégorie d'événement « ${event.category} » refusée par TIKORA. Valeurs possibles : ${cats.filter((x) => x.ticketsForSale).map((x) => x.name).join(', ')}`)
    errors += 1
  }
  if (errors) {
    console.log(`\n✗ ${errors} problème(s) : corrigez scripts/tikora-event.json puis relancez.`)
    process.exit(1)
  }

  // 2. Création (clé d'idempotence = empreinte du fichier : aucun doublon si relancé)
  const body = { ...event, ticketCategories: JSON.stringify(event.ticketCategories) }
  const key = `jcia-event-${crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 32)}`
  console.log('\nCréation de l\'événement sur TIKORA…')
  const created = await tikora.createEvent(body, key)
  ok(`Événement créé : ${created.id} — statut « ${created.status} »`)
  if (created.status === 'pending_review') {
    info('TIKORA doit valider l\'événement avant l\'ouverture des ventes.')
    info(`Suivez le statut avec : npm run tikora -- events`)
  }
  printEnv(created)
}

async function events() {
  const list = await tikora.listEvents()
  console.log('\nVos événements TIKORA')
  if (!list.length) info('(aucun)')
  for (const e of list) {
    console.log(`  • ${e.title}\n    id : ${e.id}\n    statut : ${e.status}${e.rejectionReason ? ` (motif : ${e.rejectionReason})` : ''} · vente ${e.ticketsOnSale ? 'ouverte' : 'fermée'}`)
  }
}

function printEnv(event) {
  const map = {}
  for (const cat of event.ticketCategories ?? []) {
    const t = tierOfCategoryName(cat.name)
    if (!t) continue
    map[t.tier] ??= {}
    map[t.tier][t.period] = cat.id
  }
  const missing = TIERS.filter((t) => !map[t]?.default)
  console.log('\nÀ copier dans backend/.env (ou deploy/backend.env sur le serveur) :\n')
  console.log(`TIKORA_EVENT_ID=${event.id}`)
  console.log(`TIKORA_CATEGORY_MAP=${JSON.stringify(Object.fromEntries(TIERS.filter((t) => map[t]).map((t) => [t, map[t]])))}`)
  if (missing.length) console.log(`\n⚠ Catégorie plein tarif introuvable pour : ${missing.join(', ')}`)
  console.log('\nPuis vérifiez avec : npm run check:config')
}

async function env(eventId) {
  if (!eventId) {
    console.log('Usage : npm run tikora -- env <identifiant de l\'événement>   (voir : npm run tikora -- events)')
    process.exit(1)
  }
  const event = await tikora.getEvent(eventId)
  ok(`« ${event.title} » — statut « ${event.status} »`)
  for (const c of event.ticketCategories) info(`${c.name} : ${c.price} XAF · ${c.available} places · ${c.onSale ? 'en vente' : 'hors vente'}`)
  printEnv(event)
}

const mask = (email) => String(email ?? '').replace(/^(.)[^@]*(@.*)$/, '$1•••$2')

async function orders() {
  const { isWebOrderToNotify } = await import('../src/services/webOrders.js')
  console.log(`\nCommandes TIKORA de l'événement ${CONFIG.payment.eventId || '(TIKORA_EVENT_ID absent)'}`)
  let count = 0
  for (let page = 1; page <= 20; page += 1) {
    const res = await tikora.listOrders({ page, limit: 100 })
    const items = Array.isArray(res?.items) ? res.items : []
    for (const o of items.filter((x) => x.eventId === CONFIG.payment.eventId)) {
      count += 1
      const source = /^JCIA27-/.test(o.reference ?? '') ? `site JCIA (${o.reference})` : 'page TIKORA'
      console.log(
        `  ${String(o.orderNumber).padEnd(14)} ${String(o.status).padEnd(17)} ${String(o.total).padStart(9)} XAF  ${String(o.createdAt ?? '').slice(0, 16).replace('T', ' ')}  ${source.padEnd(24)} ${mask(o.buyer?.email)}${isWebOrderToNotify(o) ? '  → formulaire' : ''}`,
      )
    }
    if (items.length < 100 || page >= (Number(res?.meta?.totalPages) || 1)) break
  }
  if (!count) info('(aucune commande)')
  console.log('\nUn achat fait sur la page TIKORA doit apparaître ici avec « page TIKORA ».')
  console.log('Sinon, TIKORA ne transmet pas ces achats à l\'API : à demander au support TIKORA.')
}

async function forms() {
  const { webOrdersReport } = await import('../src/services/webOrders.js')
  const rows = await webOrdersReport()
  console.log(`\nFormulaire participant — ${rows.length} achat(s) repéré(s) sur la page TIKORA`)
  for (const r of rows) {
    const state = r.form_sent_at ? `✓ envoyé ${r.form_sent_at.slice(0, 16).replace('T', ' ')}` : `✗ non envoyé (${r.form_attempts} essai(s)${r.last_error ? ` : ${r.last_error}` : ''})`
    console.log(`  ${String(r.order_number).padEnd(14)} ${String(r.buyer_name).padEnd(26).slice(0, 26)} ${mask(r.buyer_email).padEnd(28)} ${state}`)
  }
}

async function sync() {
  const { syncWebOrders } = await import('../src/services/webOrders.js')
  const stats = await syncWebOrders()
  ok(`${stats.scanned} commande(s) lue(s) · ${stats.sent} formulaire(s) envoyé(s) · ${stats.failed} échec(s)`)
}

async function resend(orderNumber) {
  const { resetWebOrder, syncWebOrders } = await import('../src/services/webOrders.js')
  if (!orderNumber || !(await resetWebOrder(orderNumber))) {
    ko(`Commande « ${orderNumber ?? ''} » inconnue (voir : npm run tikora -- forms)`)
    process.exit(1)
  }
  await syncWebOrders()
  ok(`Formulaire renvoyé pour ${orderNumber} (voir : npm run tikora -- forms)`)
}

const [command = 'check', arg] = process.argv.slice(2)
const commands = { check, create, events, env: () => env(arg), orders, forms, sync, resend: () => resend(arg) }

if (!CONFIG.payment.apiKey) {
  console.error('TIKORA_API_KEY absent de backend/.env')
  process.exit(1)
}
if (!/\/api\/v1\/partner$/.test(CONFIG.payment.apiUrl)) {
  console.error(`⚠ TIKORA_API_URL = ${CONFIG.payment.apiUrl}`)
  console.error('  L\'adresse attendue se termine par /api/v1/partner, par exemple :')
  console.error('  TIKORA_API_URL=https://tikoraapi.totiokamdem.uk/api/v1/partner')
}
if (!commands[command]) {
  console.error(`Commande inconnue « ${command} ». Commandes : check, create, events, env <eventId>, orders, forms, sync, resend <ORD-…>`)
  process.exit(1)
}
try {
  await commands[command]()
} catch (error) {
  console.error(`\n✗ TIKORA a répondu : ${error.message}${error.code ? ` (${error.code})` : ''}`)
  if (error.code === 'INVALID_API_KEY' || error.code === 'MISSING_API_KEY') console.error('  Vérifiez TIKORA_API_KEY (la clé seule, sans « Bearer »).')
  if (error.code === 'IP_NOT_ALLOWED') console.error('  Votre adresse IP doit être autorisée par TIKORA.')
  process.exit(1)
}
