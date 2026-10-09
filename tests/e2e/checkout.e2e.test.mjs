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

const SHOTS = process.env.E2E_SHOTS // dossier de captures d'écran (vérification visuelle), facultatif
async function shot(page, name) {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true })
}

/** Formulaire d'inscription (le même pour tous les billets) : fiche + photo + conditions. */
async function fillRegistration(page, { firstName, lastName, email, whatsapp, org, role, photo = true }) {
  await page.getByLabel('Prénom *').fill(firstName)
  await page.getByLabel('Nom *', { exact: true }).fill(lastName)
  await page.getByLabel('E-mail *').fill(email)
  await page.getByLabel('Numéro WhatsApp *').fill(whatsapp)
  await page.locator('input[autocomplete="organization"]').fill(org)
  await page.locator('input[autocomplete="organization-title"]').fill(role)
  if (photo) {
    await page.getByRole('button', { name: 'Ajouter ma photo' }).click()
    const dialog = page.locator('dialog.photo-dialog')
    await dialog.locator('input[type=file]').setInputFiles(path.join(BACK, 'tests/fixtures/photo.jpg'))
    await dialog.locator('canvas').waitFor()
    await dialog.getByRole('button', { name: 'Utiliser cette photo' }).click()
    await dialog.waitFor({ state: 'detached' })
    await page.getByText('Belle photo !').waitFor()
  }
  // Conditions obligatoires : déjà cochées, impossibles à décocher
  const terms = page.getByLabel(/J’accepte les/)
  assert.equal(await terms.isChecked(), true)
  assert.equal(await terms.isDisabled(), true)
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
      TIKORA_LOOKUP_MIN_INTERVAL_MS: '0', // recherche du paiement à chaque vérification de la page
      // Page de réservation de chaque billet chez TIKORA (modèle avec l'identifiant de catégorie)
      TIKORA_CHECKOUT_URL: 'https://tikora.proditech.online/evenements/jcia-2027-journees-camerounaises-de-l-intelligence-artificielle/reserver?categorie={categoryId}',
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

test('E2E - billetterie : tous les billets mènent au même formulaire d’inscription', async () => {
  const { context, page } = await newPage()
  try {
    await page.goto(`${WEB}/billetterie`)
    await page.getByText('Un seul parcours pour tous les billets').waitFor()
    const links = page.getByRole('link', { name: /^Choisir ce billet — / })
    await links.nth(4).waitFor() // le temps que le catalogue du serveur soit lu
    assert.equal(await links.count(), 5)
    for (const link of await links.all()) assert.match(await link.getAttribute('href'), /^\/billetterie\/commande\/[a-z-]+$/)
    await shot(page, '01-billetterie')
  } finally {
    await context.close()
  }
})

test('E2E - billet payant : inscription avec photo, paiement TIKORA détecté automatiquement, liste des participants', async () => {
  const TIKORA = 'https://tikora.proditech.online/evenements/jcia-2027-journees-camerounaises-de-l-intelligence-artificielle'
  const { MOCK_EVENT_ID } = await import(path.join(BACK, 'tests/helpers/mock-tikora-server.js'))
  const { context, page } = await newPage()
  try {
    await page.goto(`${WEB}/billetterie/commande/standard`)
    // Formulaire incomplet : erreurs, dont la photo
    await page.getByRole('button', { name: 'Continuer vers le paiement' }).click()
    await page.getByText('Ajoutez votre photo : elle compose votre visuel « J’y serai ».').waitFor()

    await fillRegistration(page, {
      firstName: 'Serge', lastName: 'Atangana', email: 'serge.e2e@example.com', whatsapp: '677 11 22 33', org: 'Orange Digital Center', role: 'Ingénieur données',
    })
    // Aperçu du visuel en direct : nom, rôle et organisation saisis
    await page.locator('.co-summary .visual-preview__name', { hasText: 'Serge Atangana' }).waitFor()
    await page.locator('.co-summary .visual-preview__role', { hasText: 'Ingénieur données · Orange Digital Center' }).waitFor()
    await shot(page, '02-formulaire-payant')
    await page.getByRole('button', { name: 'Continuer vers le paiement' }).click()

    // Inscription enregistrée : il reste à payer sur TIKORA, avec la même adresse
    await page.waitForURL(/\/billetterie\/confirmation\/JCIA27-[A-Z0-9]{6}$/, { timeout: 15_000 })
    const orderId = page.url().split('/').pop()
    await page.getByRole('heading', { name: /Plus qu’une étape/ }).waitFor()
    // « Payer sur TIKORA » mène directement à la réservation du billet choisi
    const { MOCK_CATEGORIES } = await import(path.join(BACK, 'tests/helpers/mock-tikora-server.js'))
    const pay = page.getByRole('link', { name: 'Payer sur TIKORA' })
    assert.equal(await pay.getAttribute('href'), `${TIKORA}/reserver?categorie=${MOCK_CATEGORIES.standard}`)
    await page.getByText('ouvre directement la réservation du billet').waitFor()
    assert.equal(await pay.getAttribute('target'), '_blank')
    await page.locator('.th-email__value', { hasText: 'serge.e2e@example.com' }).waitFor()
    await shot(page, '03-attente-paiement')
    let list = await (await fetch(`${API}/attendees`)).json()
    assert.equal(list.some((a) => a.id === `cmd-${orderId}-1`), false, 'pas dans la liste avant le paiement')

    // Paiement fait sur la page TIKORA (même adresse, casse différente)
    await fetch(`${mock.base}/__mock/web-order`, {
      method: 'POST',
      body: JSON.stringify({ eventId: MOCK_EVENT_ID, tier: 'standard', name: 'Serge A.', email: 'Serge.E2E@example.com' }),
    })
    // Retour sur l'onglet du site : la page vérifie et confirme d'elle-même
    await page.getByRole('button', { name: 'Vérifier maintenant' }).click()
    await page.getByRole('heading', { name: /C’est confirmé/ }).waitFor({ timeout: 20_000 })
    await page.getByText('QR code envoyé par TIKORA').waitFor()
    await page.getByRole('link', { name: 'Remplir le formulaire' }).waitFor()
    await shot(page, '04-confirme-payant')

    // Liste publique : photo, nom, rôle, organisation, billet
    list = await (await fetch(`${API}/attendees`)).json()
    const me = list.find((a) => a.id === `cmd-${orderId}-1`)
    assert.equal(me.name, 'Serge Atangana')
    assert.equal(me.role, 'Ingénieur données')
    assert.equal(me.org, 'Orange Digital Center')
    assert.equal(me.tier, 'standard')
    assert.match(me.photo ?? '', new RegExp(`^/attendees/cmd-${orderId}-1/photo\\?v=`))

    // Visuel « J'y serai » : charte du billet, photo, rôle · organisation déjà remplis
    await page.getByRole('link', { name: 'Créer mon visuel' }).click()
    await page.getByText('Couleurs du billet Standard').waitFor()
    assert.equal(await page.getByLabel('Titre (facultatif)').inputValue(), 'Ingénieur données · Orange Digital Center')
    await page.locator('.fx-actions > button.btn:not([disabled])').first().waitFor({ timeout: 10_000 })
    await shot(page, '05-visuel-payant')
  } finally {
    await context.close()
  }
})

test('E2E - billet payant réglé avec une autre adresse : rattachement par numéro de commande TIKORA', async () => {
  const { MOCK_EVENT_ID } = await import(path.join(BACK, 'tests/helpers/mock-tikora-server.js'))
  const { context, page } = await newPage()
  try {
    await page.goto(`${WEB}/billetterie/commande/etudiant`)
    await page.getByLabel('Filière et niveau *').waitFor() // libellés adaptés au billet étudiant
    await fillRegistration(page, {
      firstName: 'Linda', lastName: 'Ewane', email: 'linda.e2e@example.com', whatsapp: '+33 6 12 34 56 78', org: 'ENSPY', role: 'Master 1 IA',
    })
    await page.getByRole('button', { name: 'Continuer vers le paiement' }).click()
    await page.getByRole('heading', { name: /Plus qu’une étape/ }).waitFor({ timeout: 15_000 })

    const web = await (
      await fetch(`${mock.base}/__mock/web-order`, {
        method: 'POST',
        body: JSON.stringify({ eventId: MOCK_EVENT_ID, tier: 'etudiant', name: 'Papa Ewane', email: 'papa.ewane@example.com' }),
      })
    ).json()
    // Code du billet reçu de TIKORA, collé sur la page ; paiement fait avec une autre adresse
    await page.getByLabel('Code de votre billet TIKORA').fill(web.orderNumber)
    await page.getByRole('button', { name: 'Vous avez payé avec une autre adresse e-mail ?' }).click()
    await page.getByLabel('Adresse e-mail utilisée sur TIKORA').fill('papa.ewane@example.com')
    await shot(page, '06-autre-adresse')
    await page.getByRole('button', { name: 'Valider mon code' }).click()
    await page.getByRole('heading', { name: /C’est confirmé/ }).waitFor({ timeout: 20_000 })
  } finally {
    await context.close()
  }
})

test('E2E - billet payé sur TIKORA : vérifié, visuel aux couleurs du billet, photo dans la liste', async () => {
  // Achat fait directement sur la page TIKORA de l'événement
  const { MOCK_EVENT_ID } = await import(path.join(BACK, 'tests/helpers/mock-tikora-server.js'))
  const web = await (
    await fetch(`${mock.base}/__mock/web-order`, {
      method: 'POST',
      body: JSON.stringify({ eventId: MOCK_EVENT_ID, tier: 'vip', name: 'Awa Tikora', email: 'awa.tikora@example.com' }),
    })
  ).json()

  const { context, page } = await newPage()
  try {
    // Lien de l'e-mail : numéro de commande prérempli
    await page.goto(`${WEB}/mon-flyer?commande=${web.orderNumber}`)
    assert.equal(await page.getByLabel('Numéro de commande TIKORA').inputValue(), web.orderNumber)
    // Mauvaise adresse : refus
    await page.getByLabel('Adresse e-mail utilisée sur TIKORA').fill('pirate@example.com')
    await page.getByRole('button', { name: 'Vérifier mon billet' }).click()
    await page.getByText('Aucune commande ne correspond à ce numéro').waitFor({ timeout: 15_000 })
    // Bonne adresse : billet vérifié chez TIKORA → visuel VIP
    await page.getByLabel('Adresse e-mail utilisée sur TIKORA').fill('awa.tikora@example.com')
    await page.getByRole('button', { name: 'Vérifier mon billet' }).click()
    await page.getByText('Couleurs du billet VIP').waitFor({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Ajouter une photo' }).click()
    const dialog = page.locator('dialog.photo-dialog')
    await dialog.locator('input[type=file]').setInputFiles(path.join(BACK, 'tests/fixtures/photo.jpg'))
    await dialog.locator('canvas').waitFor()
    await dialog.getByRole('button', { name: 'Enregistrer la photo' }).click()
    await dialog.waitFor({ state: 'detached', timeout: 15_000 })
    await page.locator('.fx-actions > button.btn:not([disabled])').first().waitFor({ timeout: 10_000 })

    // La photo figure dans la liste publique des participants
    const list = await (await fetch(`${API}/attendees`)).json()
    const me = list.find((a) => a.name === 'Awa Tikora')
    assert.equal(me.tier, 'vip')
    assert.match(me.photo ?? '', /^\/attendees\/cmd-JCIA27-[A-Z0-9]{6}-1\/photo\?v=/)
  } finally {
    await context.close()
  }
})

test('E2E - billet gratuit : même formulaire, photo, QR signé, liste publique et visuel', async () => {
  const { context, page } = await newPage()
  try {
    await page.goto(`${WEB}/billetterie/commande/gratuit`)
    await fillRegistration(page, {
      firstName: 'Nadia', lastName: 'Fotso', email: 'nadia.e2e@example.com', whatsapp: '699000002', org: 'CRTV', role: 'Journaliste',
    })
    const listing = page.getByLabel('Je figurerai dans la liste publique des participants')
    assert.equal(await listing.isChecked(), true)
    assert.equal(await listing.isDisabled(), true)
    await shot(page, '07-formulaire-gratuit')
    await page.getByRole('button', { name: 'Confirmer ma présence' }).click()
    await page.waitForURL(/\/billetterie\/confirmation\/JCIA27-[A-Z0-9]{6}$/, { timeout: 15_000 })
    const orderId = page.url().split('/').pop()
    await page.locator('.e-ticket__official').first().waitFor({ timeout: 15_000 })
    assert.match(await page.locator('.e-ticket__id').first().textContent(), /^JCIA27-[A-Z0-9]{6}-1$/)
    await page.getByRole('link', { name: 'Remplir le formulaire' }).waitFor()
    await shot(page, '08-confirme-gratuit')

    // Liste publique : la fiche porte la photo du formulaire, servie sans métadonnées
    const list = await (await fetch(`${API}/attendees`)).json()
    const me = list.find((a) => a.id === `cmd-${orderId}-1`)
    assert.equal(me.role, 'Journaliste')
    assert.match(me.photo, new RegExp(`^/attendees/cmd-${orderId}-1/photo\\?v=`))
    const img = Buffer.from(await (await fetch(`${API}${me.photo}`)).arrayBuffer())
    assert.deepEqual([...img.subarray(0, 2)], [0xff, 0xd8])
    assert.equal(img.includes('TestCam'), false)

    // Un autre visiteur voit la fiche : photo, rôle · organisation
    const { context: c2, page: p2 } = await newPage()
    await p2.goto(`${WEB}/participants`)
    const card = p2.locator('.attendee-card', { hasText: 'Nadia Fotso' }).first()
    await card.waitFor({ timeout: 10_000 })
    assert.equal(await card.locator('img').getAttribute('src'), `${API}${me.photo}`)
    await card.getByText('Journaliste').waitFor()
    if (SHOTS) {
      await card.scrollIntoViewIfNeeded()
      await p2.waitForTimeout(800)
      await p2.screenshot({ path: path.join(SHOTS, '09-liste-participants.png') })
    }
    await c2.close()

    // Visuel « J'y serai » : ouvert au billet gratuit, photo de la fiche
    await page.getByRole('link', { name: 'Créer mon visuel' }).click()
    await page.getByText('Couleurs du billet Gratuit').waitFor()
    await page.locator('.fx-actions > button.btn:not([disabled])').first().waitFor({ timeout: 10_000 })
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Télécharger le visuel' }).click()])
    assert.match(download.suggestedFilename(), /^JCIA-2027-jy-serai-Nadia-Fotso-portrait\.png$/)
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

test('E2E - téléphone : formulaire et attente du paiement (captures)', { skip: !SHOTS }, async () => {
  const context = await browser.newContext({ locale: 'fr-FR', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await context.addInitScript(() => {
    localStorage.setItem('jcia-consent', JSON.stringify({ version: 1, date: new Date().toISOString(), choices: { necessary: true, media: false } }))
    localStorage.setItem('jcia-lang', 'fr')
  })
  const page = await context.newPage()
  try {
    await page.goto(`${WEB}/billetterie/commande/vip`)
    await fillRegistration(page, {
      firstName: 'Grâce', lastName: 'Nkoulou', email: 'grace.e2e@example.com', whatsapp: '655 44 33 22', org: 'Banque Atlantique', role: 'Directrice de l’innovation',
    })
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(SHOTS, '10-mobile-formulaire.png'), fullPage: true })
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()
    await page.getByRole('heading', { name: /Plus qu’une étape/ }).waitFor({ timeout: 15_000 })
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(SHOTS, '11-mobile-attente.png'), fullPage: true })
  } finally {
    await context.close()
  }
})
