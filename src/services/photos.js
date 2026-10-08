import crypto from 'node:crypto'
import { all, get, run, dbReady } from '../database/db.js'
import { HttpError } from '../utils/errors.js'

/**
 * Photos des participants (champ « photo » de la liste « Ils y seront » et du
 * visuel « J'y serai »).
 *
 * Une photo par participant d'une commande confirmée (payée ou gratuite),
 * identifiée par (commande, position) — position 1 = premier nom de la liste
 * des participants de la commande. Identifiant public : cmd-<commande>-<position>,
 * le même que dans GET /attendees.
 *
 * Le site recadre la photo au carré et la ré-encode en JPEG avant l'envoi. Le
 * serveur ne fait confiance à rien : il relit le fichier octet par octet,
 *   • refuse tout ce qui n'est pas un JPEG complet et cohérent ;
 *   • RETIRE les métadonnées (EXIF dont la position GPS, XMP, commentaires…)
 *     et tout ce qui suit la fin de l'image (fichiers « polyglottes ») ;
 *   • borne le poids et les dimensions.
 * Elle est stockée dans la base SQLite (sauvegardée avec elle) et n'est publiée
 * que si la personne a accepté de figurer dans la liste publique.
 */

export const PHOTO_LIMITS = {
  maxBytes: 600 * 1024, // le site envoie ~60–150 Ko (720 × 720)
  minSide: 200,
  maxSide: 2048,
  maxSegments: 500,
}

const invalid = (message = 'Image JPEG invalide') => new HttpError(400, message, 'INVALID_PHOTO')

// Marqueurs JPEG « Start Of Frame » (baseline, progressif, arithmétique…)
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
const isRst = (m) => m >= 0xd0 && m <= 0xd7
// Segments retirés : APP1–APP15 (EXIF, XMP, ICC, Photoshop…) et COM (commentaires)
const isMetadata = (m) => (m >= 0xe1 && m <= 0xef) || m === 0xfe

/** Prochain marqueur après des données compressées (FF 00 et RSTn en font partie). */
function nextMarker(buf, from) {
  for (let j = from; j < buf.length - 1; j += 1) {
    if (buf[j] !== 0xff) continue
    const m = buf[j + 1]
    if (m === 0x00 || isRst(m) || m === 0xff) continue
    return j
  }
  return -1
}

/**
 * Vérifie un JPEG et en renvoie une copie sans métadonnées.
 * @param {Buffer} buf
 * @returns {{ data: Buffer, width: number, height: number }}
 * @throws {HttpError} 400 INVALID_PHOTO
 */
export function sanitizeJpeg(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw invalid('Le fichier n’est pas une image JPEG')
  }
  const out = [buf.subarray(0, 2)]
  let i = 2
  let width = 0
  let height = 0
  let scans = 0
  let segments = 0
  let ended = false

  while (i < buf.length - 1) {
    if ((segments += 1) > PHOTO_LIMITS.maxSegments) throw invalid()
    if (buf[i] !== 0xff) throw invalid('Image JPEG corrompue')
    while (buf[i + 1] === 0xff) i += 1 // octets de remplissage
    const marker = buf[i + 1]
    if (marker === 0xd9) {
      // Fin d'image : tout ce qui suit est ignoré
      out.push(buf.subarray(i, i + 2))
      ended = true
      break
    }
    if (marker === 0xd8 || marker === 0x00 || marker === undefined) throw invalid('Image JPEG corrompue')
    if (isRst(marker) || marker === 0x01) {
      out.push(buf.subarray(i, i + 2))
      i += 2
      continue
    }
    if (i + 4 > buf.length) throw invalid('Image JPEG incomplète')
    const length = buf.readUInt16BE(i + 2)
    const end = i + 2 + length
    if (length < 2 || end > buf.length) throw invalid('Image JPEG incomplète')

    if (SOF.has(marker)) {
      if (length < 8) throw invalid()
      height = buf.readUInt16BE(i + 5)
      width = buf.readUInt16BE(i + 7)
    }
    if (!isMetadata(marker)) out.push(buf.subarray(i, end))
    i = end

    if (marker === 0xda) {
      // Données compressées jusqu'au prochain marqueur (autre balayage, tables, ou fin)
      if (!width || !height) throw invalid()
      scans += 1
      const next = nextMarker(buf, i)
      if (next < 0) throw invalid('Image JPEG incomplète')
      out.push(buf.subarray(i, next))
      i = next
    }
  }

  if (!ended || !scans) throw invalid('Image JPEG incomplète')
  if (Math.min(width, height) < PHOTO_LIMITS.minSide) {
    throw invalid(`Photo trop petite (minimum ${PHOTO_LIMITS.minSide} × ${PHOTO_LIMITS.minSide} pixels)`)
  }
  if (Math.max(width, height) > PHOTO_LIMITS.maxSide) {
    throw invalid(`Photo trop grande (maximum ${PHOTO_LIMITS.maxSide} pixels de côté)`)
  }
  return { data: Buffer.concat(out), width, height }
}

// ─── Identifiants ────────────────────────────────────────────────────────────

const ATTENDEE_ID_RE = /^cmd-(JCIA27-[A-Z0-9]{6})-([1-9]\d?)$/

export const attendeeId = (orderId, position) => `cmd-${orderId}-${position}`

/** cmd-JCIA27-XXXXXX-2 → { orderId, position } ou null */
export function parseAttendeeId(id) {
  const m = ATTENDEE_ID_RE.exec(String(id ?? ''))
  return m ? { orderId: m[1], position: Number(m[2]) } : null
}

/** Chemin public (relatif à l'API) ; la version force le rafraîchissement des caches. */
export const publicPhotoPath = (orderId, position, version) => `/attendees/${attendeeId(orderId, position)}/photo?v=${version}`

// ─── Stockage ────────────────────────────────────────────────────────────────

export async function savePhoto(orderId, position, buffer) {
  if (buffer.length > PHOTO_LIMITS.maxBytes) throw new HttpError(413, 'Photo trop lourde', 'PAYLOAD_TOO_LARGE')
  const { data, width, height } = sanitizeJpeg(buffer)
  const version = crypto.createHash('sha256').update(data).digest('base64url').slice(0, 12)
  await dbReady
  await run(
    `INSERT INTO attendee_photos (order_id, position, data, width, height, bytes, version, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(order_id, position) DO UPDATE SET
       data = excluded.data, width = excluded.width, height = excluded.height,
       bytes = excluded.bytes, version = excluded.version, updated_at = excluded.updated_at`,
    [orderId, position, data, width, height, data.length, version, new Date().toISOString()],
  )
  return { version, width, height, bytes: data.length }
}

export async function getPhoto(orderId, position) {
  await dbReady
  return get('SELECT data, version, updated_at AS updatedAt FROM attendee_photos WHERE order_id = ? AND position = ?', [orderId, position])
}

export async function deletePhoto(orderId, position) {
  await dbReady
  const { changes } = await run('DELETE FROM attendee_photos WHERE order_id = ? AND position = ?', [orderId, position])
  return changes > 0
}

/** Photos d'une commande : [{ position, version }] (sans les octets). */
export async function photoSummaries(orderId) {
  await dbReady
  return all('SELECT position, version FROM attendee_photos WHERE order_id = ? ORDER BY position', [orderId])
}

/** Photo PUBLIABLE : commande confirmée ET consentement à la liste publique. */
export async function getPublicPhoto(orderId, position) {
  await dbReady
  return get(
    `SELECT p.data, p.version FROM attendee_photos p
     JOIN orders o ON o.id = p.order_id
     WHERE p.order_id = ? AND p.position = ? AND o.status IN ('paid', 'free') AND o.public_listing = 1
       AND COALESCE(o.payment_mode, 'live') <> 'demo'`,
    [orderId, position],
  )
}

/** Versions des photos publiables, indexées par « commande|position » (liste publique). */
export async function publicPhotoVersions() {
  await dbReady
  const rows = await all(
    `SELECT p.order_id AS orderId, p.position, p.version FROM attendee_photos p
     JOIN orders o ON o.id = p.order_id
     WHERE o.status IN ('paid', 'free') AND o.public_listing = 1
       AND COALESCE(o.payment_mode, 'live') <> 'demo'`,
  )
  return new Map(rows.map((r) => [`${r.orderId}|${r.position}`, r.version]))
}

/** Noms des participants d'une commande (même règle que GET /attendees). */
export function attendeeNames(order) {
  let parsed
  try {
    parsed = JSON.parse(order?.attendees_json || '[]')
  } catch {
    parsed = []
  }
  const names = Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : []
  return names.length ? names : [order?.customer_name ?? '']
}
