import { CONFIG } from '@/data/config'

/**
 * Envoi du récapitulatif de commande par e-mail.
 *
 * ─── Qui envoie quoi ─────────────────────────────────────────────────────────
 * Le navigateur N'ENVOIE PAS l'e-mail : il ne peut pas parler à un serveur SMTP,
 * et s'il le pouvait il faudrait lui confier le mot de passe d'envoi — ce qui
 * reviendrait à le publier. Le site se contente donc de DEMANDER au serveur de
 * billetterie d'envoyer le message :
 *
 *   POST {API}/orders/:id/receipt   → { status: 'sent' | 'queued' }
 *        corps : { email, lang }
 *
 * Le serveur retrouve la commande par son identifiant, vérifie qu'elle est
 * bien payée, construit le message (scripts/email/receipt-template.mjs, repris
 * tel quel côté serveur) et l'envoie (scripts/email/send-receipt.mjs).
 * C'est pour cela que le corps de la requête ne contient ni montant, ni tarif,
 * ni participants : un visiteur ne doit pas pouvoir dicter le contenu d'un
 * e-mail parti de notre nom de domaine.
 *
 * Le test d'envoi réel se lance avec `npm run test:email`.
 *
 * ─── Mode démonstration ──────────────────────────────────────────────────────
 * Sans VITE_PAYMENT_API_URL, aucun serveur n'existe : la fonction renvoie
 * 'demo' sans appel réseau. L'interface affiche alors « un récapitulatif vous
 * a été envoyé » uniquement si l'envoi a réellement eu lieu.
 */

/** L'API doit être en HTTPS (sauf localhost en développement) */
function secureApiUrl(url) {
  try {
    const u = new URL(url)
    const local = ['localhost', '127.0.0.1'].includes(u.hostname) && import.meta.env.DEV
    return u.protocol === 'https:' || local ? u.href.replace(/\/$/, '') : ''
  } catch {
    return ''
  }
}

const API = secureApiUrl(CONFIG.payment.apiUrl)
export const EMAIL_MODE = API ? 'live' : 'demo'

const ORDER_ID_RE = /^JCIA27-[A-Z0-9]{6}$/

/**
 * Demande l'envoi du récapitulatif d'une commande confirmée.
 * @param {object} order commande enregistrée (voir src/services/orders.js)
 * @returns {Promise<'sent'|'queued'|'demo'|'failed'>}
 */
export async function requestOrderReceipt(order) {
  if (!order || !ORDER_ID_RE.test(order.id ?? '') || !order.customer?.email) return 'failed'
  if (!['paid', 'free'].includes(order.payment?.status)) return 'failed'
  if (!API) return 'demo'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)
  try {
    const res = await fetch(`${API}/orders/${encodeURIComponent(order.id)}/receipt`, {
      method: 'POST',
      signal: controller.signal,
      credentials: 'omit', // aucun cookie envoyé à l'API
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        // Un double clic ou une reprise de connexion n'envoie pas deux e-mails
        'Idempotency-Key': `receipt-${order.id}`,
      },
      body: JSON.stringify({ email: order.customer.email, lang: order.lang === 'en' ? 'en' : 'fr' }),
    })
    if (!res.ok) return 'failed'
    const data = (await res.json().catch(() => null)) ?? {}
    return data.status === 'queued' ? 'queued' : 'sent'
  } catch {
    return 'failed'
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Lien « mailto: » de secours — si l'envoi automatique échoue, le visiteur peut
 * écrire au secrétariat en un clic, avec son numéro de commande déjà rempli.
 */
export function receiptFallbackHref(order, subjectLabel = 'Récapitulatif de commande') {
  const to = CONFIG.contact.emails[0]
  return `mailto:${to}?subject=${encodeURIComponent(`${subjectLabel} ${order?.id ?? ''}`.trim())}`
}
