import crypto from 'node:crypto'
import dotenv from 'dotenv'

/**
 * Configuration du serveur de billetterie JCIA.
 *
 * Toutes les valeurs viennent de l'environnement (fichier .env en local,
 * secrets du gestionnaire de déploiement en production). Le module :
 *   • lit et normalise chaque variable ;
 *   • VALIDE la configuration et refuse de démarrer en production si un
 *     réglage dangereux est détecté (mode démo, CORS ouvert, clé absente…).
 *
 * Voir .env.example pour la liste commentée des variables.
 */

// SKIP_DOTENV=1 : tests qui démarrent le serveur avec une configuration maîtrisée
// (le .env du poste — vraie clé, vrai SMTP — ne doit pas s'y mêler)
if (process.env.NODE_ENV !== 'test' && process.env.SKIP_DOTENV !== '1') dotenv.config({ quiet: true })

const DEFAULT_TIKORA_URL = 'https://tikoraapi.totiokamdem.uk/api/v1/partner'

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

function parseBool(value, fallback = false) {
  if (value === undefined || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function parseIntSafe(value, fallback) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : fallback
}

/**
 * TIKORA_CATEGORY_MAP : correspondance tarif JCIA → catégorie de billet TIKORA.
 *   {"etudiant":"<uuid>","standard":"<uuid>","en-ligne":"<uuid>","vip":"<uuid>"}
 * Un tarif peut aussi distinguer la période promotionnelle :
 *   {"standard":{"default":"<uuid>","promo":"<uuid>"}}
 */
function parseCategoryMap(value) {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return { __invalid: true }
  }
}

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development'
  const isProduction = nodeEnv === 'production'
  const allowedOrigins = parseList(env.ALLOWED_ORIGIN)
  // Le paiement passe TOUJOURS par TIKORA : l'ancien mode « demo » (paiements validés
  // sans débit) a été retiré. La variable n'est plus lue que pour signaler un .env périmé.
  const requestedMode = String(env.PAYMENT_PROVIDER_MODE || 'live').trim().toLowerCase()

  return {
    nodeEnv,
    isProduction,
    isTest: nodeEnv === 'test',
    host: env.HOST || '0.0.0.0',
    port: parseIntSafe(env.PORT, 5000),
    // Nombre de proxys de confiance (Nginx, load balancer) devant le serveur :
    // indispensable pour que la limitation de débit voie la vraie IP du client.
    trustProxy: parseIntSafe(env.TRUST_PROXY, isProduction ? 1 : 0),
    allowedOrigins: allowedOrigins.length ? allowedOrigins : isProduction ? [] : ['*'],
    publicSiteUrl: (env.PUBLIC_SITE_URL || 'https://www.jcia.cm').replace(/\/$/, ''),
    dbPath: env.DB_PATH || '',
    logLevel: env.LOG_LEVEL || (nodeEnv === 'test' ? 'silent' : 'info'),

    // Secret serveur : dérive les jetons d'accès aux billets et signe les QR des
    // billets gratuits. Obligatoire en production (sinon les jetons changeraient
    // à chaque redémarrage).
    appSecret: env.APP_SECRET || '',
    appSecretGenerated: !env.APP_SECRET,

    smtp: {
      host: env.SMTP_HOST,
      port: parseIntSafe(env.SMTP_PORT, 465),
      secure: parseBool(env.SMTP_SECURE, true),
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from: env.MAIL_FROM || (env.SMTP_USER ? `"Billetterie JCIA 2027" <${env.SMTP_USER}>` : ''),
      replyTo: env.MAIL_REPLY_TO || 'contact@jciacm.com',
    },

    payment: {
      mode: 'live',
      requestedMode,
      // L'ancienne variable PAYMENT_PROVIDER_URL n'est reprise que si elle désigne bien
      // l'API (…/api/…) : l'ancien .env pointait vers la page « développeurs » du site.
      apiUrl: String(
        env.TIKORA_API_URL || (/\/api\//.test(env.PAYMENT_PROVIDER_URL ?? '') ? env.PAYMENT_PROVIDER_URL : '') || DEFAULT_TIKORA_URL,
      ).trim().replace(/\/$/, ''),
      apiKey: String(env.TIKORA_API_KEY || env.PAYMENT_PROVIDER_KEY || '').trim(),
      eventId: String(env.TIKORA_EVENT_ID || '').trim(),
      categoryMap: parseCategoryMap(env.TIKORA_CATEGORY_MAP),
      timeoutMs: parseIntSafe(env.TIKORA_TIMEOUT_MS, 15_000),
      // Le prix TIKORA d'une catégorie doit être égal au prix JCIA attendu
      priceCheck: (env.TIKORA_PRICE_CHECK || 'strict').toLowerCase() !== 'off',
      webhookSecret: env.TIKORA_WEBHOOK_SECRET || '',
      webhookSignatureHeader: (env.TIKORA_WEBHOOK_SIGNATURE_HEADER || 'x-tikora-signature').toLowerCase(),
      webhookRequireSignature: parseBool(env.TIKORA_WEBHOOK_REQUIRE_SIGNATURE, false),
      // Délai minimal entre deux interrogations TIKORA d'une même commande
      statusCacheMs: parseIntSafe(env.TIKORA_STATUS_CACHE_MS, 2_000),
      catalogCacheMs: parseIntSafe(env.TIKORA_CATALOG_CACHE_MS, 60_000),
      reconcileIntervalMs: parseIntSafe(env.RECONCILE_INTERVAL_MS, 60_000),
    },

    rateLimit: {
      enabled: parseBool(env.RATE_LIMIT_ENABLED, nodeEnv !== 'test'),
      // Multiplie toutes les limites (tests de charge depuis une seule IP)
      multiplier: Math.max(1, parseIntSafe(env.RATE_LIMIT_MULTIPLIER, 1)),
    },

    // Achats faits sur la page TIKORA de l'événement (hors de notre site) : le serveur
    // les repère via l'API Partenaire et envoie à chaque acheteur le lien du formulaire.
    webOrders: {
      formUrl: String(env.ATTENDEE_FORM_URL || 'https://docs.google.com/forms/d/1jpOGg8oab-88-x19JbFD2-s9IMjPXvjN2XXoOQH-7v8/previewResponse').trim(),
      syncIntervalMs: parseIntSafe(env.TIKORA_WEB_SYNC_INTERVAL_MS, 120_000), // 0 = désactivé
      // Commandes antérieures à cette date ignorées (évite d'écrire aux achats de test)
      since: Date.parse(env.TIKORA_WEB_SYNC_SINCE || '') || 0,
      maxPages: parseIntSafe(env.TIKORA_WEB_SYNC_MAX_PAGES, 20),
      // Page TIKORA de l'événement (lien des e-mails « finalisez votre paiement »)
      eventUrl: String(env.TIKORA_EVENT_URL || 'https://tikora.proditech.online/evenements/jcia-2027-journees-camerounaises-de-l-intelligence-artificielle').trim(),
      // Page de RÉSERVATION TIKORA d'un billet (bouton « Payer sur TIKORA ») :
      //  • TIKORA_CHECKOUT_URLS : adresse copiée pour chaque tarif, format de TIKORA_CATEGORY_MAP
      //    ({"vip":"https://…"} ou {"vip":{"promo":"https://…","default":"https://…"}}) ;
      //  • sinon TIKORA_CHECKOUT_URL : modèle commun, {categoryId} remplacé par la catégorie
      //    TIKORA du tarif (ex. https://…/evenements/<slug>/reserver?categorie={categoryId}) ;
      //  • sinon : page de l'événement (le participant y choisit son billet).
      checkoutUrls: parseCategoryMap(env.TIKORA_CHECKOUT_URLS),
      checkoutUrlTemplate: String(env.TIKORA_CHECKOUT_URL || '').trim(),
      // Recherche du paiement quand le participant attend sur la page du site (au plus 1 parcours / N ms)
      lookupMinIntervalMs: parseIntSafe(env.TIKORA_LOOKUP_MIN_INTERVAL_MS, 20_000),
      // Inscriptions payantes en attente de paiement par adresse e-mail (anti-abus)
      maxPendingPerEmail: parseIntSafe(env.REGISTRATION_MAX_PENDING_PER_EMAIL, 5),
    },

    receipt: {
      // Délai minimal entre deux envois manuels du reçu d'une même commande
      minIntervalMs: parseIntSafe(env.RECEIPT_MIN_INTERVAL_MS, 60_000),
    },

    freeOrders: {
      maxSeatsPerEmail: parseIntSafe(env.FREE_MAX_SEATS_PER_EMAIL, 10),
    },
  }
}

const KEY_RE = /^tk_(live|test)_[A-Za-z0-9_-]{8,}$/
const UUIDISH_RE = /^[A-Za-z0-9-]{8,64}$/

/**
 * Vérifie la configuration. Renvoie { errors, warnings }.
 * En production, la moindre erreur empêche le démarrage (fail-fast).
 */
export function validateConfig(config) {
  const errors = []
  const warnings = []
  const p = config.payment

  if (p.requestedMode !== 'live') {
    errors.push(
      `PAYMENT_PROVIDER_MODE=${p.requestedMode} n’existe plus : le serveur passe toujours par TIKORA. Mettez PAYMENT_PROVIDER_MODE=live (ou retirez la ligne).`,
    )
  }

  if (config.isProduction) {
    if (!config.allowedOrigins.length || config.allowedOrigins.includes('*')) {
      errors.push('ALLOWED_ORIGIN doit lister explicitement les origines du site en production (pas de « * »).')
    }
    if (config.appSecretGenerated || config.appSecret.length < 32) {
      errors.push('APP_SECRET (≥ 32 caractères aléatoires) est obligatoire en production.')
    }
    if (!config.dbPath) warnings.push('DB_PATH non défini : base créée dans ./data/database.sqlite')
  }

  // TIKORA (toujours obligatoire)
  if (!p.apiKey) errors.push('TIKORA_API_KEY (clé tk_live_…) est obligatoire.')
  else if (/\s|authorization|bearer/i.test(p.apiKey)) {
    errors.push('TIKORA_API_KEY doit contenir la clé seule (tk_live_…), sans « Authorization: Bearer ».')
  } else if (!KEY_RE.test(p.apiKey)) {
    warnings.push('TIKORA_API_KEY ne ressemble pas à une clé tk_live_… / tk_test_….')
  }
  if (config.isProduction && p.apiKey.startsWith('tk_test_')) warnings.push('Clé TIKORA de TEST utilisée en production.')
  try {
    const u = new URL(p.apiUrl)
    if (u.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(u.hostname)) {
      errors.push('TIKORA_API_URL doit être en HTTPS.')
    }
    if (/developpeurs|\/docs/.test(u.pathname)) {
      errors.push('TIKORA_API_URL pointe vers une page de documentation, pas vers l’API (…/api/v1/partner).')
    }
  } catch {
    errors.push('TIKORA_API_URL invalide.')
  }
  if (!UUIDISH_RE.test(p.eventId)) errors.push('TIKORA_EVENT_ID (identifiant de l’événement TIKORA) est obligatoire.')
  if (p.categoryMap.__invalid) errors.push('TIKORA_CATEGORY_MAP n’est pas un JSON valide.')
  else {
    for (const tier of ['etudiant', 'standard', 'en-ligne', 'vip']) {
      const entry = p.categoryMap[tier]
      const ids = typeof entry === 'string' ? [entry] : entry && typeof entry === 'object' ? Object.values(entry) : []
      if (!ids.length || !ids.every((id) => UUIDISH_RE.test(String(id)))) {
        errors.push(`TIKORA_CATEGORY_MAP : catégorie TIKORA manquante pour le tarif « ${tier} ».`)
      }
    }
  }
  if (!p.webhookSecret) {
    warnings.push('TIKORA_WEBHOOK_SECRET absent : les webhooks sont acceptés comme simple signal et re-vérifiés auprès de TIKORA.')
  }

  // Pages de réservation TIKORA : HTTPS, même site que la page de l'événement
  {
    const w = config.webOrders
    const host = (() => {
      try {
        return new URL(w.eventUrl).host
      } catch {
        return ''
      }
    })()
    const urls = [
      ...(w.checkoutUrlTemplate ? [w.checkoutUrlTemplate.replaceAll('{categoryId}', 'x')] : []),
      ...Object.values(w.checkoutUrls).flatMap((e) => (typeof e === 'string' ? [e] : e && typeof e === 'object' ? Object.values(e) : [])),
    ]
    if (w.checkoutUrls.__invalid) errors.push('TIKORA_CHECKOUT_URLS n’est pas un JSON valide.')
    for (const u of urls) {
      try {
        const x = new URL(String(u))
        if (x.protocol !== 'https:' || x.host !== host) errors.push(`Page de réservation TIKORA refusée (HTTPS, site ${host} attendu) : ${u}`)
      } catch {
        if (u !== true) errors.push(`Page de réservation TIKORA invalide : ${u}`)
      }
    }
  }
  try {
    if (new URL(config.webOrders.eventUrl).protocol !== 'https:') errors.push('TIKORA_EVENT_URL doit être en HTTPS.')
  } catch {
    errors.push('TIKORA_EVENT_URL invalide.')
  }
  try {
    const f = new URL(config.webOrders.formUrl)
    if (f.protocol !== 'https:') errors.push('ATTENDEE_FORM_URL doit être en HTTPS.')
  } catch {
    errors.push('ATTENDEE_FORM_URL invalide.')
  }

  {
    const { host = '', port, secure, user = '', from = '' } = config.smtp
    const h = String(host).trim().toLowerCase()
    if (/^(email|imap|pop|pop3)\.secureserver\.net$/.test(h)) {
      errors.push(`SMTP_HOST=${host} n’est pas le serveur d’ENVOI GoDaddy : mettez SMTP_HOST=smtpout.secureserver.net (ou smtp.office365.com pour Microsoft 365).`)
    }
    if ((port === 465 && !secure) || ([587, 25, 2525].includes(port) && secure)) {
      warnings.push(`SMTP_PORT=${port} et SMTP_SECURE=${secure} sont incohérents : le chiffrement est réglé d’après le port (465 → SSL, 587 → STARTTLS).`)
    }
    const fromAddress = (String(from).match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase()
    if (from && !fromAddress.includes('@')) {
      warnings.push('MAIL_FROM sans adresse e-mail (mettez la valeur entre apostrophes : MAIL_FROM=\'"Billetterie JCIA 2027" <contact@jciacm.com>\') : l’adresse SMTP_USER sera utilisée.')
    } else if (user && fromAddress && fromAddress !== String(user).trim().toLowerCase()) {
      warnings.push(`MAIL_FROM (${fromAddress}) diffère de SMTP_USER : l’adresse du compte SMTP sera utilisée comme expéditeur.`)
    }
  }
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    ;(config.isProduction ? errors : warnings).push('SMTP_HOST / SMTP_USER / SMTP_PASS incomplets : aucun reçu ne pourra être envoyé.')
  }
  return { errors, warnings }
}

export const CONFIG = loadConfig()

// Secret de développement éphémère (jamais utilisé en production : refusé ci-dessus)
if (!CONFIG.appSecret) CONFIG.appSecret = crypto.randomBytes(32).toString('hex')
