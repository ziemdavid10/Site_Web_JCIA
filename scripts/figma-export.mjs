/**
 * Export de la maquette Figma — `npm run figma:export`
 *
 * 1. Ouvre le site construit (npm run build && npm run preview) dans Chromium.
 * 2. Affiche chaque écran (pages, états : menu ouvert, fiche intervenant,
 *    paiement en cours, confirmation, flyer…) sur desktop (1440 px) et mobile (390 px).
 * 3. Transforme chaque écran en arbre de calques (scripts/figma/extract.js).
 * 4. Convertit toutes les images en PNG/JPEG (formats acceptés par Figma).
 * 5. Écrit figma-plugin/data.json puis figma-plugin/ui.html (plugin prêt à importer).
 *
 * Prérequis : `npm i -D playwright && npx playwright install chromium`
 * Variable : SITE_URL (par défaut http://localhost:4173)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = process.env.SITE_URL ?? 'http://localhost:4173'
const FACE = process.env.FLYER_PHOTO ?? join(ROOT, 'scripts/figma/photo-exemple.jpg')

let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.error('Playwright est requis : npm i -D playwright && npx playwright install chromium')
  process.exit(1)
}

const EXTRACT = readFileSync(join(ROOT, 'scripts/figma/extract.js'), 'utf8')

// Commande d'exemple (valide pour src/services/orders.js) : écrans confirmation et flyer
const DEMO_ORDER = {
  id: 'JCIA27-MAQ7X2',
  createdAt: '2027-03-02T10:24:00.000Z',
  lang: 'fr',
  // ⚠️ Le montant doit correspondre au tarif de CONFIG.tickets (sinon la
  // commande de démonstration est rejetée par sanitizeOrder et les écrans
  // Confirmation / Mon flyer restent vides).
  tierId: 'standard',
  quantity: 1,
  unitPrice: 5000,
  total: 5000,
  method: 'momo',
  currency: 'XAF',
  customer: { name: 'Awa Ngono Mbarga', email: 'awa@example.cm', phone: '677238022', org: 'Data Scientist · ENSPY' },
  attendees: ['Awa Ngono Mbarga'],
  payment: { status: 'paid', method: 'momo', mode: 'demo', operator: 'mtn', phone: '677238022', transactionId: 'DEMO-MTN-MAQ7X2-LX9K2P', paidAt: '2027-03-02T10:25:12.000Z' },
}

// --- Actions sur les écrans ---------------------------------------------------------------
const fillCheckout = async (p) => {
  await p.fill('input[autocomplete="name"]', 'Awa Ngono Mbarga')
  await p.fill('input[type="email"]', 'awa@example.cm')
  await p.fill('input[autocomplete="tel-national"]', '677238022')
  await p.locator('.co-check--terms input').check()
}
const ACTIONS = {
  menu: async (p) => {
    await p.click('.header__burger')
    await p.waitForTimeout(500)
  },
  speakersHome: async (p) => {
    // La liste détaillée peut être volontairement bloquée
    // (CONFIG.features.speakerDirectory = false) : on n'insiste pas.
    const cat = p.locator('#intervenants .speaker-cat').nth(3)
    if (await cat.isEnabled()) {
      await cat.click()
      await p.waitForTimeout(400)
    }
  },
  checkout: async (p) => {
    await fillCheckout(p)
    await p.evaluate(() => {
      document.querySelectorAll('.co-summary__submit, .co-bar .btn').forEach((b) => b.setAttribute('data-proto', 'paiement'))
    })
  },
  payment: async (p) => {
    await fillCheckout(p)
    await p.locator('.co-bar button, .co-summary__submit').filter({ visible: true }).first().click()
    await p.waitForTimeout(1700) // étape « Validation sur votre téléphone »
    await p.evaluate(() => document.querySelector('.pay-dialog__box')?.setAttribute('data-proto', 'confirmation'))
  },
  flyer: async (p) => {
    await p.setInputFiles('.fx-drop input', FACE)
    await p.waitForTimeout(900)
  },
  faq: async (p) => {
    await p.locator('.accordion-item button').first().click()
    await p.waitForTimeout(300)
  },
}

// --- Écrans -----------------------------------------------------------------------------------
// id : nom du cadre ; route : adresse ; action : état à préparer ; views : d = desktop, m = mobile
const SCREENS = [
  { id: '01 Accueil', route: '/', views: 'dm', action: 'speakersHome' },
  { id: '02 Menu mobile', route: '/', views: 'm', action: 'menu' },
  { id: '03 À propos', route: '/a-propos', views: 'd' },
  { id: '04 Programme', route: '/programme', views: 'dm' },
  { id: '05 Intervenants', route: '/intervenants', views: 'dm' },
  { id: '06 Fiche intervenant', route: '/intervenants?intervenant=herve-nkoulou', views: 'dm' },
  { id: '07 Salon 100 % IA', route: '/salon', views: 'd' },
  { id: '08 CAIA Awards', route: '/awards', views: 'd' },
  { id: '09 Catalogue', route: '/catalogue', views: 'd' },
  { id: '10 Partenaires', route: '/partenaires', views: 'd' },
  { id: '11 FAQ', route: '/faq', views: 'dm', action: 'faq' },
  { id: '12 Billetterie', route: '/billetterie', views: 'dm' },
  { id: '13 Commande', route: '/billetterie/commande/standard', views: 'dm', action: 'checkout' },
  { id: '14 Paiement', route: '/billetterie/commande/standard', views: 'dm', action: 'payment' },
  { id: '15 Confirmation', route: `/billetterie/confirmation/${DEMO_ORDER.id}`, views: 'dm' },
  { id: '16 Mon flyer', route: `/mon-flyer?order=${DEMO_ORDER.id}`, views: 'dm', action: 'flyer' },
  { id: '17 Confidentialité', route: '/confidentialite', views: 'd' },
  { id: '18 Erreur 404', route: '/page-introuvable', views: 'dm' },
]
const DARK = ['01 Accueil', '05 Intervenants', '12 Billetterie', '16 Mon flyer']
const VIEWPORTS = { d: { name: 'Desktop', width: 1440, height: 900 }, m: { name: 'Mobile', width: 390, height: 844 } }

// Chemin → écran (prototype) : liens internes du site vers les cadres
const ROUTES = SCREENS.filter((s) => !s.action || ['speakersHome', 'faq'].includes(s.action)).map((s) => ({ path: s.route.split('?')[0], id: s.id }))

const FREEZE = `
  *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
  .reveal { opacity: 1 !important; transform: none !important; }
  .back-to-top { display: none !important; }
  html { scroll-behavior: auto !important; }
`

// --- Images : conversion en PNG / JPEG dans le navigateur -------------------------------------------
async function rasterize(page, url) {
  return page.evaluate(async (src) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    try {
      await img.decode()
    } catch {
      return null
    }
    const max = 2400
    const k = Math.min(1, max / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round((img.naturalWidth || 300) * k))
    c.height = Math.max(1, Math.round((img.naturalHeight || 150) * k))
    const x = c.getContext('2d')
    x.drawImage(img, 0, 0, c.width, c.height)
    // Transparence ? → PNG, sinon JPEG (plus léger)
    let alpha = false
    try {
      const d = x.getImageData(0, 0, c.width, c.height).data
      for (let i = 3; i < d.length; i += 16) if (d[i] < 250) { alpha = true; break }
    } catch {
      alpha = true
    }
    return c.toDataURL(alpha ? 'image/png' : 'image/jpeg', 0.86)
  }, url)
}

// --- Export -------------------------------------------------------------------------------------------
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const imagePool = {} // hash → dataURL
const urlToHash = {}
const frames = []

async function exportScreen(screen, vp, theme) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    colorScheme: theme,
    isMobile: vp.width < 600,
    hasTouch: vp.width < 600,
  })
  await ctx.addInitScript(
    ([order, theme]) => {
      localStorage.setItem('jcia-lang', 'fr')
      localStorage.setItem('jcia-theme', theme)
      localStorage.setItem('jcia-consent', JSON.stringify({ version: 1, date: new Date().toISOString(), choices: { necessary: true, media: false, analytics: false } }))
      localStorage.setItem('jcia-orders', JSON.stringify([order]))
    },
    [DEMO_ORDER, theme],
  )
  const page = await ctx.newPage()
  await page.goto(SITE + screen.route, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: FREEZE })
  await page.waitForTimeout(900)
  // Défilement complet : déclenche compteurs, images et contenus chargés à la demande
  const H = await page.evaluate(() => document.body.scrollHeight)
  for (let y = 0; y < H; y += 600) {
    await page.evaluate((v) => window.scrollTo(0, v), y)
    await page.waitForTimeout(60)
  }
  await page.waitForTimeout(2000)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  if (screen.action) await ACTIONS[screen.action](page)
  // Liens de prototype pour les éléments qui ne sont pas des liens (boutons)
  await page.evaluate((isMenu) => {
    const set = (sel, to) => document.querySelectorAll(sel).forEach((el) => el.setAttribute('data-proto', to))
    set('.header__burger', isMenu ? 'accueil' : 'menu')
    set('.speaker-card__open', 'fiche')
    set('.speaker-dialog__close', 'intervenants')
    set('.tier-card__cta', 'commande')
  }, screen.action === 'menu')
  // Retour en haut de page (les éléments fixes sont mesurés par rapport à l'écran)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(600)
  await page.evaluate(() => document.fonts.ready)

  const data = await page.evaluate(`(${EXTRACT})()`)

  // Images uniques, converties une seule fois
  const keyMap = {}
  for (const [key, url] of Object.entries(data.images)) {
    if (!url) continue
    let hash = urlToHash[url]
    if (!hash) {
      const raster = url.startsWith('data:image/png') && url.length < 200000 ? url : await rasterize(page, url)
      if (!raster) continue
      hash = createHash('sha1').update(raster).digest('hex').slice(0, 16)
      urlToHash[url] = hash
      imagePool[hash] = raster
    }
    keyMap[key] = hash
  }
  const remap = (nodes) =>
    nodes.forEach((n) => {
      if (n.key) n.key = keyMap[n.key] ?? null
      n.fills?.forEach((f) => f.type === 'IMAGE' && (f.key = keyMap[f.key] ?? null))
      if (n.kids) remap(n.kids)
    })
  remap(data.nodes)

  frames.push({
    id: `${screen.id} — ${vp.name}${theme === 'dark' ? ' (sombre)' : ''}`,
    screen: screen.id,
    view: vp.name,
    theme,
    route: screen.route,
    width: vp.width,
    viewportHeight: vp.height,
    height: data.height,
    background: data.background,
    nodes: data.nodes,
  })
  console.log(`  ✓ ${screen.id} — ${vp.name} ${theme} (${data.height}px)`)
  await ctx.close()
}

console.log(`Export depuis ${SITE}`)
for (const screen of SCREENS) {
  for (const v of screen.views) await exportScreen(screen, VIEWPORTS[v], 'light')
}
for (const s of SCREENS.filter((x) => DARK.includes(x.id))) {
  for (const v of s.views) await exportScreen(s, VIEWPORTS[v], 'dark')
}
await browser.close()

const out = { version: 1, generatedAt: new Date().toISOString(), site: 'JCIA 2027', routes: ROUTES, frames, images: imagePool }
const dir = join(ROOT, 'figma-plugin')
mkdirSync(dir, { recursive: true })
const json = JSON.stringify(out)
writeFileSync(join(dir, 'data.json'), json)

// ui.html = interface du plugin + données embarquées (un seul fichier à importer)
const template = readFileSync(join(dir, 'ui.template.html'), 'utf8')
const safeJson = json.replace(/</g, '\\u003c') // aucune balise ne peut « sortir » du bloc de données
writeFileSync(join(dir, 'ui.html'), template.replace('__DATA__', () => safeJson))
console.log(`\n✓ ${frames.length} écrans, ${Object.keys(imagePool).length} images — ${(json.length / 1e6).toFixed(1)} Mo`)
console.log('  → figma-plugin/ui.html prêt (Figma › Plugins › Development › Import plugin from manifest…)')
