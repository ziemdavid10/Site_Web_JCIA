/**
 * Tests de bout en bout (E2E) — intégration frontend ↔ backend ↔ TIKORA.
 *
 * Démarre, sur la machine de test :
 *   • le faux TIKORA (backend/tests/helpers/mock-tikora-server.js) ;
 *   • le VRAI backend (node backend/src/server.js) en mode live, branché dessus ;
 *   • le site (Vite) avec VITE_PAYMENT_API_URL pointant vers ce backend ;
 * puis pilote un vrai navigateur Chromium (Playwright) comme un visiteur.
 *
 *   npm run test:e2e        (depuis frontend/, le backend doit avoir ses dépendances)
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const FRONT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
// Serveur à côté du site (backend/ ou Serveur_backend_jcia/) ou rangé dans le dossier du site
const BACK =
  ['../backend', '../Serveur_backend_jcia', 'Serveur_backend_jcia']
    .map((dir) => path.resolve(FRONT, dir))
    .find((dir) => fs.existsSync(path.join(dir, 'src/server.js'))) ?? path.resolve(FRONT, '../backend')
const API_PORT = Number(process.env.E2E_API_PORT || 5099)
const WEB_PORT = Number(process.env.E2E_WEB_PORT || 5173)
const WEB = `http://localhost:${WEB_PORT}`
const API = `http://localhost:${API_PORT}`

const { createMockTikora, mockEnv } = await import(path.join(BACK, 'tests/helpers/mock-tikora-server.js'))

let mock
let backend
let vite
let browser
const logs = []

function startProcess(cmd, args, options) {
  const child = spawn(cmd, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.on('data', (d) => logs.push(String(d)))
  child.stderr.on('data', (d) => logs.push(String(d)))
  return child
}

async function waitFor(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.status < 500) return
    } catch {
      /* pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`${url} injoignable.\n${logs.slice(-30).join('')}`)
}

async function newPage() {
  const context = await browser.newContext({ locale: 'fr-FR' })
  // Bandeau cookies déjà accepté, langue française
  await context.addInitScript(() => {
    localStorage.setItem('jcia-consent', JSON.stringify({ version: 1, date: new Date().toISOString(), choices: { necessary: true, media: false } }))
    localStorage.setItem('jcia-lang', 'fr')
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n`))
  return { context, page }
}

async function fillBuyer(page, { name, email, phone }) {
  await page.getByLabel('Nom et prénom *').fill(name)
  await page.getByLabel('E-mail *').fill(email)
  await page.getByLabel('Téléphone *').fill(phone)
  await page.getByLabel(/J’accepte les/).check()
}

test.before(async () => {
  mock = await createMockTikora({ payDelayMs: 300 }).listen()
  backend = startProcess(process.execPath, ['src/server.js'], {
    cwd: BACK,
    env: {
      PATH: process.env.PATH,
      SKIP_DOTENV: '1', // jamais le .env du poste : aucun vrai e-mail, aucune vraie clé
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: String(API_PORT),
      DB_PATH: path.join(os.tmpdir(), `jcia-e2e-${Date.now()}.sqlite`),
      APP_SECRET: 'e2e-secret-0123456789abcdef0123456789abcdef',
      ALLOWED_ORIGIN: WEB,
      PUBLIC_SITE_URL: WEB,
      RATE_LIMIT_MULTIPLIER: '50',
      ...mockEnv(mock.url),
    },
  })
  await waitFor(`${API}/health`)
  vite = startProcess(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(WEB_PORT), '--strictPort'], {
    cwd: FRONT,
    env: { ...process.env, VITE_PAYMENT_API_URL: API },
  })
  await waitFor(WEB)
  // CHROMIUM_PATH : navigateur déjà installé (sinon celui de « npx playwright install chromium »)
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
})

test.after(async () => {
  if (process.env.E2E_DEBUG) process.stdout.write(logs.join(''))
  await browser?.close()
  vite?.kill('SIGTERM')
  backend?.kill('SIGTERM')
  await mock?.close()
})

test('E2E - achat Mobile Money : frais TIKORA affichés, paiement confirmé, QR officiel', async () => {
  const { context, page } = await newPage()
  try {
    await page.goto(`${WEB}/billetterie/commande/standard`)
    // TIKORA n'encaisse pas la carte : le choix « Carte bancaire » est masqué en mode réel
    await page.getByText('MTN Mobile Money ou Orange Money').waitFor()
    assert.equal(await page.getByText('Visa ou Mastercard', { exact: true }).count(), 0)
    // Frais de service estimés (2 %, plancher 100 FCFA) dans le récapitulatif
    await page.getByText(/Frais de service de la plateforme de paiement/).waitFor()
    assert.equal(await page.getByText('Mode démonstration').count(), 0)

    await fillBuyer(page, { name: 'Awa Diallo', email: 'awa.e2e@example.com', phone: '677123456' })
    await page.getByLabel('Afficher mon nom dans la liste publique des participants').check()
    await page.locator('.co-summary__submit').click()

    await page.getByRole('dialog').waitFor()
    await page.waitForURL(/\/billetterie\/confirmation\/JCIA27-[A-Z0-9]{6}$/, { timeout: 30_000 })
    const orderId = page.url().split('/').pop()

    await page.locator('.e-ticket__official').first().waitFor({ timeout: 20_000 })
    const code = await page.locator('.e-ticket__id').first().textContent()
    assert.match(code, /^TKT-/)
    assert.match(await page.locator('.e-ticket__qr').first().getAttribute('src'), /^data:image\/png/)

    // Côté TIKORA : commande payée, référencée par notre numéro
    const state = await (await fetch(`${mock.base}/__mock/state`)).json()
    const tk = state.orders.find((o) => o.reference === orderId)
    assert.equal(tk.status, 'paid')
    assert.equal(tk.buyer.email, 'awa.e2e@example.com')

    // Liste publique : le participant consentant apparaît
    await page.goto(`${WEB}/participants`)
    await page.getByText('Awa Diallo').first().waitFor({ timeout: 10_000 })
  } finally {
    await context.close()
  }
})

test('E2E - paiement refusé : motif précis affiché, aucune confirmation', async () => {
  const { context, page } = await newPage()
  try {
    await page.goto(`${WEB}/billetterie/commande/vip`)
    await fillBuyer(page, { name: 'Jean Kamga', email: 'jean.e2e@example.com', phone: '677120000' })
    await page.locator('.co-summary__submit').click()
    await page.getByText('Solde Mobile Money insuffisant', { exact: false }).waitFor({ timeout: 20_000 })
    assert.match(page.url(), /\/billetterie\/commande\/vip$/)
  } finally {
    await context.close()
  }
})

test('E2E - inscription gratuite : enregistrée par le serveur avec QR signé', async () => {
  const { context, page } = await newPage()
  try {
    await page.goto(`${WEB}/billetterie/commande/gratuit`)
    await fillBuyer(page, { name: 'Marie Ngo', email: 'marie.e2e@example.com', phone: '699000001' })
    await page.locator('.co-summary__submit').click()
    await page.waitForURL(/\/billetterie\/confirmation\/JCIA27-/, { timeout: 15_000 })
    await page.locator('.e-ticket__official').first().waitFor({ timeout: 15_000 })
    const code = await page.locator('.e-ticket__id').first().textContent()
    assert.match(code, /^JCIA27-[A-Z0-9]{6}-1$/)
  } finally {
    await context.close()
  }
})

test('E2E - lien du reçu sur un autre appareil : billets retrouvés, jeton retiré de l’URL', async () => {
  // Achat via l'API (comme le site), puis ouverture du lien du reçu dans un navigateur vierge
  const { getTicketPricing } = await import(path.join(BACK, 'src/utils/pricing.js'))
  const price = getTicketPricing('etudiant').price
  const orderId = `JCIA27-${'E2EABC'}`
  const created = await (
    await fetch(`${API}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: WEB },
      body: JSON.stringify({
        orderId, amount: price, currency: 'XAF', method: 'momo', operator: 'mtn', phone: '677123456', tierId: 'etudiant', quantity: 1,
        customer: { name: 'Lien Recu', email: 'lien.e2e@example.com', phone: '677123456', org: 'ENSPY' }, lang: 'fr',
      }),
    })
  ).json()
  for (let i = 0; i < 30; i += 1) {
    const s = await (await fetch(`${API}/payments/${created.paymentId}`)).json()
    if (s.status === 'SUCCESSFUL') break
    await new Promise((r) => setTimeout(r, 200))
  }

  const { context, page } = await newPage()
  page.on('console', (m) => logs.push(`[console] ${m.text()}\n`))
  page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}\n`))
  try {
    assert.ok(created.accessToken, JSON.stringify(created))
    await page.goto(`${WEB}/billetterie/confirmation/${orderId}#t=${created.accessToken}`)
    await page.locator('.e-ticket__official').first().waitFor({ timeout: 15_000 })
    assert.equal(new URL(page.url()).hash, '', 'jeton retiré de la barre d’adresse')
    // Sans jeton, un autre visiteur ne voit rien
    const { context: c2, page: p2 } = await newPage()
    await p2.goto(`${WEB}/billetterie/confirmation/${orderId}`)
    await p2.getByText('Commande introuvable').waitFor()
    await c2.close()
  } finally {
    await context.close()
  }
})

test('E2E - photo de participant : liste publique et visuel « J’y serai » ouvert au billet gratuit', async () => {
  const { context, page } = await newPage()
  try {
    await page.goto(`${WEB}/billetterie/commande/gratuit`)
    await fillBuyer(page, { name: 'Nadia Fotso', email: 'nadia.e2e@example.com', phone: '699000002' })
    await page.getByLabel('Afficher mon nom dans la liste publique des participants').check()
    await page.locator('.co-summary__submit').click()
    await page.waitForURL(/\/billetterie\/confirmation\/JCIA27-[A-Z0-9]{6}$/, { timeout: 15_000 })
    const orderId = page.url().split('/').pop()

    // Photo ajoutée depuis la confirmation : recadrée dans le navigateur, envoyée au serveur
    await page.getByRole('button', { name: 'Ajouter une photo — Nadia Fotso' }).click()
    const dialog = page.locator('dialog.photo-dialog')
    await dialog.locator('input[type=file]').setInputFiles(path.join(BACK, 'tests/fixtures/photo.jpg'))
    await dialog.locator('canvas').waitFor()
    await dialog.getByRole('button', { name: 'Enregistrer la photo' }).click()
    await dialog.waitFor({ state: 'detached', timeout: 15_000 })
    await page.getByText('Photo enregistrée.').waitFor()

    // Liste publique : la fiche porte la photo, servie sans métadonnées
    const list = await (await fetch(`${API}/attendees`)).json()
    const me = list.find((a) => a.id === `cmd-${orderId}-1`)
    assert.match(me.photo, new RegExp(`^/attendees/cmd-${orderId}-1/photo\\?v=`))
    const img = Buffer.from(await (await fetch(`${API}${me.photo}`)).arrayBuffer())
    assert.deepEqual([...img.subarray(0, 2)], [0xff, 0xd8])
    assert.equal(img.includes('TestCam'), false)

    // Même billet ouvert sur un AUTRE appareil (lien du reçu) : la photo est relue sur le serveur
    const token = await page.evaluate((id) => JSON.parse(localStorage.getItem('jcia-orders')).find((o) => o.id === id).accessToken, orderId)
    const { context: c3, page: p3 } = await newPage()
    await p3.goto(`${WEB}/billetterie/confirmation/${orderId}#t=${token}`)
    const avatar = p3.locator('.pp-row__avatar').first()
    await p3.waitForFunction(() => document.querySelector('.pp-row__avatar')?.tagName === 'IMG', null, { timeout: 15_000 })
    assert.match(await avatar.getAttribute('src'), /^data:image\/jpeg;base64,/)
    await c3.close()

    // Un autre visiteur voit la photo dans la liste des participants
    const { context: c2, page: p2 } = await newPage()
    await p2.goto(`${WEB}/participants`)
    const card = p2.locator('.attendee-card', { hasText: 'Nadia Fotso' }).first()
    await card.waitFor({ timeout: 10_000 })
    assert.equal(await card.locator('img').getAttribute('src'), `${API}${me.photo}`)
    await c2.close()

    // Visuel « J’y serai » : ouvert au billet gratuit, charte du billet, photo de la fiche
    await page.getByRole('link', { name: 'Créer mon visuel' }).click()
    await page.getByText('Couleurs du billet Gratuit').waitFor()
    await page.locator('.fx-actions > button.btn:not([disabled])').first().waitFor({ timeout: 10_000 })
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Télécharger le visuel' }).click()])
    assert.match(download.suggestedFilename(), /^JCIA-2027-jy-serai-Nadia-Fotso-portrait\.png$/)
  } finally {
    await context.close()
  }
})
