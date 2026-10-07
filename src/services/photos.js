import { CONFIG } from '@/data/config'
import { storage } from '@/utils/storage'
import { API, PAYMENT_MODE } from './payment'

/**
 * Photos des participants — champ « photo » de la liste « Ils y seront » et
 * photo du visuel « J'y serai » : UNE SEULE photo par participant, la même
 * partout.
 *
 * Chaque participant d'une commande confirmée (payée ou gratuite) est repéré par
 * sa position dans la commande (1 = premier nom). Identifiant : cmd-<commande>-<n>,
 * identique à celui de la liste publique servie par le serveur.
 *
 *  • Mode réel : la photo est envoyée au serveur (PUT /orders/:id/attendees/:n/photo,
 *    jeton de la commande). Le serveur la publie dans la liste UNIQUEMENT si la
 *    personne a accepté d'y figurer ; sinon elle ne sert qu'au visuel.
 *  • Démonstration : elle reste sur cet appareil.
 *  • Dans les deux cas, une copie est gardée sur l'appareil (affichage immédiat,
 *    hors ligne) ; sur un autre appareil, elle est relue sur le serveur.
 *
 * La photo est recadrée au carré et ré-encodée en JPEG dans le navigateur
 * (métadonnées EXIF/GPS retirées) ; le serveur la contrôle à nouveau.
 */

export const PHOTO_SIZE = 720 // px — net sur le visuel (cercle de 580 px au plus) et dans la liste
const KEY = CONFIG.storage.photos
const MAX_LOCAL = 12 // photos gardées sur l'appareil (~100 Ko chacune)
const DATA_URL_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/
const VERSION_RE = /^[\w-]{1,40}$/

export const attendeeKey = (orderId, position) => `cmd-${orderId}-${position}`

// --- Copie locale -------------------------------------------------------------------------------
let parsed = { raw: null, value: {} } // évite de relire ~1 Mo de JSON à chaque appel

function readCache() {
  const raw = storage.get(KEY)
  if (raw !== parsed.raw) {
    let value
    try {
      value = JSON.parse(raw ?? '{}')
    } catch {
      value = null
    }
    parsed = { raw, value: value && typeof value === 'object' && !Array.isArray(value) ? value : {} }
  }
  return { ...parsed.value }
}

function writeCache(cache) {
  // Plus récentes d'abord ; en cas de stockage plein, on retire les plus anciennes
  let entries = Object.entries(cache)
    .filter(([, v]) => DATA_URL_RE.test(v?.src ?? ''))
    .sort((a, b) => (b[1].at ?? 0) - (a[1].at ?? 0))
    .slice(0, MAX_LOCAL)
  while (entries.length) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)))
      return
    } catch {
      entries = entries.slice(0, -1)
    }
  }
  storage.remove(KEY)
}

/** Photo gardée sur l'appareil : { src, version } ou null. */
export function localPhoto(orderId, position) {
  const hit = readCache()[attendeeKey(orderId, position)]
  return hit && DATA_URL_RE.test(hit.src ?? '') ? { src: hit.src, version: String(hit.version ?? '') } : null
}

function remember(orderId, position, src, version) {
  const cache = readCache()
  cache[attendeeKey(orderId, position)] = { src, version, at: Date.now() }
  writeCache(cache)
}

function forget(orderId, position) {
  const cache = readCache()
  delete cache[attendeeKey(orderId, position)]
  writeCache(cache)
}

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('decode'))
    reader.readAsDataURL(blob)
  })

// --- Recadrage ----------------------------------------------------------------------------------
/**
 * Décalage exprimé en « demi-côtés » (−1…1 environ) : indépendant de la taille
 * d'affichage. Limité pour que l'image couvre toujours tout le carré.
 */
export function clampCrop(img, zoom, offset) {
  if (!img) return { x: 0, y: 0 }
  const scale = Math.max(2 / img.naturalWidth, 2 / img.naturalHeight) * zoom
  const maxX = (img.naturalWidth * scale - 2) / 2
  const maxY = (img.naturalHeight * scale - 2) / 2
  return { x: Math.max(-maxX, Math.min(maxX, offset.x)), y: Math.max(-maxY, Math.min(maxY, offset.y)) }
}

/** Dessine l'image recadrée dans un carré de `size` px (aperçu et export). */
export function drawCrop(ctx, img, zoom, offset, size) {
  const o = clampCrop(img, zoom, offset)
  const half = size / 2
  const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight) * zoom
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  ctx.drawImage(img, half - w / 2 + o.x * half, half - h / 2 + o.y * half, w, h)
}

/** Photo recadrée, au format d'envoi (JPEG carré PHOTO_SIZE × PHOTO_SIZE). */
export async function cropToBlob(img, zoom, offset) {
  const canvas = document.createElement('canvas')
  canvas.width = PHOTO_SIZE
  canvas.height = PHOTO_SIZE
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff' // fond des images transparentes (PNG)
  ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE)
  ctx.imageSmoothingQuality = 'high'
  drawCrop(ctx, img, zoom, offset, PHOTO_SIZE)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
  if (!blob) throw new Error('decode')
  return blob
}

// --- Serveur ------------------------------------------------------------------------------------
const isLive = (order) => PAYMENT_MODE === 'live' && order?.payment?.mode === 'live'
const photoPath = (order, position) => `${API}/orders/${encodeURIComponent(order.id)}/attendees/${position}/photo`

/** Appel à l'API photo (jeton de la commande). Le corps est lu par l'appelant, dans le même délai. */
async function call(order, position, init, read = async () => null) {
  if (!order.accessToken) throw new Error('server')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const res = await fetch(photoPath(order, position), {
      ...init,
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
      headers: { ...init.headers, 'X-Order-Token': order.accessToken },
    })
    if (res.status === 429) throw new Error('rate')
    if (res.status === 400 || res.status === 413 || res.status === 415) throw new Error('invalid')
    return { res, data: res.ok ? await read(res) : null }
  } catch (error) {
    throw new Error(['rate', 'invalid'].includes(error.message) ? error.message : 'network', { cause: error })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Enregistre la photo d'un participant.
 * @returns {Promise<{ src: string, version: string, public: boolean }>}
 * @throws {Error} 'network' | 'rate' | 'invalid' | 'server'
 */
export async function saveAttendeePhoto(order, position, blob) {
  const src = await blobToDataUrl(blob)
  if (!isLive(order)) {
    const version = `local-${Date.now().toString(36)}`
    remember(order.id, position, src, version)
    return { src, version, public: order.publicListing }
  }
  const { data } = await call(order, position, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob }, (res) =>
    res.json().catch(() => null),
  )
  if (!data || !VERSION_RE.test(data.version ?? '')) throw new Error('server')
  remember(order.id, position, src, data.version)
  return { src, version: data.version, public: data.public === true }
}

/** Retire la photo d'un participant (serveur et appareil). */
export async function removeAttendeePhoto(order, position) {
  if (isLive(order)) {
    const { res } = await call(order, position, { method: 'DELETE', headers: {} })
    if (!res.ok && res.status !== 404) throw new Error('server')
  }
  forget(order.id, position)
}

/**
 * Photo d'un participant pour l'affichage (fiche, visuel) : copie locale si elle
 * est à jour, sinon relue sur le serveur (autre appareil, photo changée ailleurs).
 * @param {string} [serverVersion]  version connue du serveur (commande relue), si disponible
 * @returns {Promise<string|null>} data:URL JPEG, ou null s'il n'y a pas de photo
 */
export async function loadAttendeePhoto(order, position, serverVersion) {
  const local = localPhoto(order.id, position)
  if (!isLive(order)) return local?.src ?? null
  if (local && (!serverVersion || local.version === serverVersion)) return local.src
  if (!serverVersion) return null
  try {
    const { res, data: blob } = await call(order, position, { method: 'GET', headers: { Accept: 'image/jpeg' } }, (r) => r.blob())
    if (!res.ok || !blob || !(res.headers.get('content-type') ?? '').startsWith('image/jpeg')) return local?.src ?? null
    const src = await blobToDataUrl(blob)
    if (!DATA_URL_RE.test(src)) return null
    remember(order.id, position, src, serverVersion)
    return src
  } catch {
    return local?.src ?? null
  }
}

/** Chemin public renvoyé par GET /attendees → URL absolue de l'API (liste blanche du format). */
const PUBLIC_PATH_RE = /^\/attendees\/cmd-JCIA27-[A-Z0-9]{6}-\d{1,2}\/photo\?v=[\w-]{1,40}$/
export function publicPhotoUrl(path) {
  return API && PUBLIC_PATH_RE.test(String(path ?? '')) ? `${API}${path}` : null
}
