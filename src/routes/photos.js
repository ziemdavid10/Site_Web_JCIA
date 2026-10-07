import express from 'express'
import { getOrderRow } from '../services/orders.js'
import { verifyOrderAccessToken } from '../services/security.js'
import {
  PHOTO_LIMITS,
  attendeeId,
  attendeeNames,
  deletePhoto,
  getPhoto,
  getPublicPhoto,
  parseAttendeeId,
  publicPhotoPath,
  savePhoto,
} from '../services/photos.js'
import { limiters } from '../middleware/security.js'
import { HttpError } from '../utils/errors.js'
import { ORDER_ID_RE } from '../utils/validation.js'
import { sendError } from './payments.js'

/**
 * Photos des participants.
 *
 *   PUT    /orders/:id/attendees/:position/photo   envoi ou remplacement (corps : image/jpeg)
 *   GET    /orders/:id/attendees/:position/photo   lecture par le titulaire (visuel « J'y serai »)
 *   DELETE /orders/:id/attendees/:position/photo   retrait
 *          → en-tête obligatoire X-Order-Token (jeton de la commande), sinon 404
 *   GET    /attendees/:attendeeId/photo            photo PUBLIQUE (liste « Ils y seront ») :
 *          uniquement si la commande est confirmée et que la personne a accepté
 *          de figurer dans la liste publique.
 *
 * Monté AVANT le parseur JSON (corps binaire) et avec ses propres limites de débit.
 */
const router = express.Router()
const OWNER_PATH = '/orders/:id/attendees/:position/photo'

async function authorize(req) {
  const orderId = String(req.params.id || '')
  const token = req.get('x-order-token') || ''
  const notFound = new HttpError(404, 'Commande introuvable', 'ORDER_NOT_FOUND')
  if (!ORDER_ID_RE.test(orderId) || !verifyOrderAccessToken(orderId, token)) throw notFound
  const order = await getOrderRow(orderId)
  if (!order) throw notFound
  const position = Number(req.params.position)
  if (!Number.isInteger(position) || position < 1 || position > attendeeNames(order).length) {
    throw new HttpError(404, 'Participant introuvable', 'ATTENDEE_NOT_FOUND')
  }
  return { order, orderId, position }
}

function sendImage(res, photo, cacheControl) {
  res.set({
    'Content-Type': 'image/jpeg',
    'Content-Length': String(photo.data.length),
    'Cache-Control': cacheControl,
    ETag: `"${photo.version}"`,
    'Content-Disposition': 'inline; filename="photo.jpg"',
    // Affichable par le site (autre origine) ; jamais interprétée autrement qu'en image
    'Cross-Origin-Resource-Policy': 'cross-origin',
  })
  return res.end(photo.data)
}

router.put(
  OWNER_PATH,
  limiters.photoUpload,
  express.raw({ type: 'image/jpeg', limit: PHOTO_LIMITS.maxBytes }),
  async (req, res) => {
    try {
      const { order, orderId, position } = await authorize(req)
      if (!Buffer.isBuffer(req.body) || !req.body.length) {
        throw new HttpError(415, 'Photo au format JPEG attendue', 'UNSUPPORTED_MEDIA_TYPE')
      }
      if (!['paid', 'free'].includes(order.status)) {
        throw new HttpError(409, 'La photo peut être ajoutée une fois la commande confirmée', 'ORDER_NOT_CONFIRMED')
      }
      const saved = await savePhoto(orderId, position, req.body)
      const isPublic = order.public_listing === 1
      return res.json({
        attendeeId: attendeeId(orderId, position),
        position,
        version: saved.version,
        public: isPublic,
        photo: isPublic ? publicPhotoPath(orderId, position, saved.version) : null,
      })
    } catch (error) {
      return sendError(res, error, 'PUT photo')
    }
  },
)

router.get(OWNER_PATH, limiters.photoOwner, async (req, res) => {
  try {
    const { orderId, position } = await authorize(req)
    const photo = await getPhoto(orderId, position)
    if (!photo) throw new HttpError(404, 'Aucune photo', 'PHOTO_NOT_FOUND')
    return sendImage(res, photo, 'private, no-store')
  } catch (error) {
    return sendError(res, error, 'GET photo')
  }
})

router.delete(OWNER_PATH, limiters.photoUpload, async (req, res) => {
  try {
    const { orderId, position } = await authorize(req)
    await deletePhoto(orderId, position)
    res.set('Cache-Control', 'no-store')
    return res.status(204).end()
  } catch (error) {
    return sendError(res, error, 'DELETE photo')
  }
})

router.get('/attendees/:attendeeId/photo', limiters.photoPublic, async (req, res) => {
  try {
    const parsed = parseAttendeeId(req.params.attendeeId)
    const photo = parsed ? await getPublicPhoto(parsed.orderId, parsed.position) : null
    if (!photo) throw new HttpError(404, 'Photo introuvable', 'PHOTO_NOT_FOUND')
    if (req.get('if-none-match') === `"${photo.version}"`) return res.status(304).end()
    // Courte durée : un retrait de photo ou de consentement se propage en moins d'une heure
    return sendImage(res, photo, 'public, max-age=3600')
  } catch (error) {
    return sendError(res, error, 'GET public photo')
  }
})

export default router
