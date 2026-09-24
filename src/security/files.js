/**
 * Vérification des images choisies par l'utilisateur (générateur de flyer).
 *
 * On ne fait pas confiance à l'extension ni au type annoncé par le navigateur :
 * on lit les premiers octets du fichier (sa « signature ») pour être sûr que
 * c'est bien une image JPEG, PNG ou WebP. On limite aussi le poids et la taille
 * en pixels (une image géante pourrait bloquer le téléphone).
 * L'image est ensuite redessinée sur un canevas : cela retire au passage ses
 * métadonnées (EXIF, position GPS…).
 */

export const IMAGE_LIMITS = {
  maxBytes: 15 * 1024 * 1024, // 15 Mo
  maxSide: 10_000, // px
  maxPixels: 50_000_000, // 50 mégapixels
  workingSide: 2400, // taille de travail après réduction
}

const startsWith = (bytes, sig, offset = 0) => sig.every((b, i) => bytes[offset + i] === b)

/** Type réel d'après la signature binaire, ou null */
export async function sniffImageType(file) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  return null
}

/**
 * Vérifie puis charge une image de façon sûre.
 * @returns {Promise<{ img: HTMLImageElement, url: string }>} image prête (URL d'objet locale)
 * @throws {Error} message : 'type' | 'size' | 'dimensions' | 'decode'
 */
export async function loadSafeImage(file) {
  if (!file || file.size === 0 || file.size > IMAGE_LIMITS.maxBytes) throw new Error('size')
  const type = await sniffImageType(file)
  if (!type) throw new Error('type')

  const srcUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.decoding = 'async'
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('decode'))
      i.src = srcUrl
    })
    const { naturalWidth: w, naturalHeight: h } = img
    if (!w || !h || w > IMAGE_LIMITS.maxSide || h > IMAGE_LIMITS.maxSide || w * h > IMAGE_LIMITS.maxPixels) {
      throw new Error('dimensions')
    }

    // Réduction + nettoyage des métadonnées : on redessine l'image
    const k = Math.min(1, IMAGE_LIMITS.workingSide / Math.max(w, h))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * k)
    canvas.height = Math.round(h * k)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    // JPEG pour les photos ; PNG si l'image peut avoir de la transparence (PNG/WebP)
    const outType = type === 'image/jpeg' ? 'image/jpeg' : 'image/png'
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, outType, 0.92))
    if (!blob) throw new Error('decode')
    const url = URL.createObjectURL(blob)
    const clean = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('decode'))
      i.src = url
    })
    return { img: clean, url }
  } finally {
    URL.revokeObjectURL(srcUrl)
  }
}
