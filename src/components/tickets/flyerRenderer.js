/**
 * Moteur de rendu du flyer « J'y serai » (Canvas 2D, 100 % dans le navigateur).
 *
 * Le flyer est dessiné en haute définition (1080 px de large) :
 *   logo JCIA → « J'Y SERAI ! » → photo ronde cerclée aux couleurs de la marque
 *   → nom & titre → date, lieu, nom de l'événement, thème → hashtag → frise.
 *
 * La photo n'est jamais envoyée sur un serveur : elle est lue localement
 * (URL d'objet) et dessinée sur le canevas.
 */

// --- Formats de sortie (px) ---------------------------------------------------------
export const FLYER_FORMATS = {
  portrait: { w: 1080, h: 1350 }, // publication Instagram / LinkedIn / Facebook (4:5)
  story: { w: 1080, h: 1920 }, // story / statut WhatsApp (9:16)
  square: { w: 1080, h: 1080 }, // carré (1:1)
}

/**
 * Mise en page par format : ordonnées (y) des lignes de base et tailles de police.
 * Les valeurs ont été ajustées à l'œil pour chaque format.
 */
const LAYOUTS = {
  portrait: {
    logo: { y: 64, w: 300 },
    headline: { y: 292, size: 118 },
    photo: { cy: 610, r: 222 },
    name: { y: 922, size: 58 },
    role: { y: 974, size: 32 },
    date: { y: 1062, size: 46 },
    venue: { y: 1112, size: 32 },
    event: { y: 1160, size: 27 },
    theme: { y: 1204, size: 25 },
    hashtag: { y: 1262, size: 34 },
    frise: 58,
  },
  story: {
    logo: { y: 150, w: 360 },
    headline: { y: 480, size: 142 },
    photo: { cy: 880, r: 290 },
    name: { y: 1282, size: 70 },
    role: { y: 1344, size: 40 },
    date: { y: 1470, size: 56 },
    venue: { y: 1534, size: 40 },
    event: { y: 1596, size: 32 },
    theme: { y: 1652, size: 30 },
    hashtag: { y: 1770, size: 42 },
    frise: 80,
  },
  square: {
    logo: { y: 44, w: 230 },
    headline: { y: 222, size: 94 },
    photo: { cy: 452, r: 168 },
    name: { y: 692, size: 50 },
    role: { y: 738, size: 28 },
    date: { y: 812, size: 40 },
    venue: { y: 856, size: 28 },
    event: { y: 898, size: 24 },
    theme: { y: 936, size: 22 },
    hashtag: { y: 990, size: 30 },
    frise: 48,
  },
}

export const getLayout = (format) => LAYOUTS[format] ?? LAYOUTS.portrait

// --- Ambiances ----------------------------------------------------------------------------
export const FLYER_STYLES = {
  nuit: {
    bg: ['#0e1326', '#19203a', '#232b4d'],
    glowA: 'rgba(246,163,67,0.38)',
    glowB: 'rgba(45,184,189,0.32)',
    text: '#ffffff',
    soft: 'rgba(255,255,255,0.78)',
    headline: ['#f6a343', '#cd6035'],
    accent: '#f6a343',
    logo: 'white',
    map: 'dark',
    swatch: ['#19203a', '#f6a343'],
  },
  laterite: {
    bg: ['#6e2412', '#a4462a', '#cd6035'],
    glowA: 'rgba(252,209,22,0.35)',
    glowB: 'rgba(25,32,58,0.45)',
    text: '#ffffff',
    soft: 'rgba(255,255,255,0.85)',
    headline: ['#ffe08a', '#fcd116'],
    accent: '#ffd27a',
    logo: 'white',
    map: 'dark',
    swatch: ['#a4462a', '#fcd116'],
  },
  soleil: {
    bg: ['#fff6e8', '#fde3bd', '#f7c27d'],
    glowA: 'rgba(205,96,53,0.28)',
    glowB: 'rgba(45,184,189,0.25)',
    text: '#19203a',
    soft: 'rgba(25,32,58,0.78)',
    headline: ['#cd6035', '#a4462a'],
    accent: '#a4462a',
    logo: 'color',
    map: 'light',
    swatch: ['#fde3bd', '#cd6035'],
  },
}

const BRAND = ['#f6a343', '#2db8bd', '#cd6035', '#5d4696']
export const FLYER_FONT = "'Sora Variable', 'Sora', system-ui, sans-serif"

/** Attend le chargement de la police Sora (sinon le canevas utilise une police de secours). */
export async function loadFlyerFonts() {
  if (!document.fonts?.load) return
  await Promise.all([400, 600, 700, 800].map((w) => document.fonts.load(`${w} 40px 'Sora Variable'`).catch(() => null)))
}

/** Charge une image et résout quand elle est décodée. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// --- Photo : cadrage ------------------------------------------------------------------------
/**
 * Le décalage de la photo est exprimé en « rayons » (indépendant du format).
 * Cette fonction le limite pour que la photo couvre toujours tout le cercle.
 */
export function clampOffset(photo, zoom, offset) {
  if (!photo) return { x: 0, y: 0 }
  const scale = Math.max(2 / photo.naturalWidth, 2 / photo.naturalHeight) * zoom
  const maxX = (photo.naturalWidth * scale - 2) / 2
  const maxY = (photo.naturalHeight * scale - 2) / 2
  return {
    x: Math.max(-maxX, Math.min(maxX, offset.x)),
    y: Math.max(-maxY, Math.min(maxY, offset.y)),
  }
}

// --- Outils de dessin -------------------------------------------------------------------------
const font = (weight, size, italic = false) => `${italic ? 'italic ' : ''}${weight} ${size}px ${FLYER_FONT}`

/** Écrit un texte centré en réduisant sa taille s'il dépasse la largeur disponible. */
function fitText(ctx, text, x, y, { weight = 700, size, maxWidth, color, italic = false, minSize = 14 }) {
  let s = size
  ctx.font = font(weight, s, italic)
  while (ctx.measureText(text).width > maxWidth && s > minSize) {
    s -= 1
    ctx.font = font(weight, s, italic)
  }
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  return s
}

/** Losange plein centré en (x, y). */
function diamond(ctx, x, y, size, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y - size)
  ctx.lineTo(x + size, y)
  ctx.lineTo(x, y + size)
  ctx.lineTo(x - size, y)
  ctx.closePath()
  ctx.fill()
}

/** Fond : dégradé, halos, carte « circuit » du Cameroun et trame de losanges. */
function drawBackground(ctx, w, h, st, assets) {
  const g = ctx.createLinearGradient(0, 0, w * 0.3, h)
  g.addColorStop(0, st.bg[0])
  g.addColorStop(0.55, st.bg[1])
  g.addColorStop(1, st.bg[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  const glow = (x, y, r, color) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, color)
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, w, h)
  }
  glow(w * 0.95, h * 0.05, w * 0.75, st.glowA)
  glow(w * 0.02, h * 0.92, w * 0.8, st.glowB)

  // Carte du Cameroun en circuits, en filigrane à droite
  const map = st.map === 'dark' ? assets.mapDark : assets.mapLight
  if (map) {
    const mh = h * 0.72
    const mw = (map.naturalWidth / map.naturalHeight) * mh
    ctx.save()
    ctx.globalAlpha = 0.1
    ctx.drawImage(map, w - mw * 0.62, h * 0.16, mw, mh)
    ctx.restore()
  }

  // Trame Ndop : losanges concentriques et noix de kola, en filigrane
  ctx.save()
  ctx.globalAlpha = 0.055
  ctx.strokeStyle = st.text
  ctx.lineWidth = 2
  for (let y = 50, row = 0; y < h; y += 100, row += 1) {
    for (let x = row % 2 ? 50 : 0, col = 0; x < w + 50; x += 100, col += 1) {
      if ((col + row) % 2) {
        // Noix de kola : cercle et noyau
        ctx.beginPath()
        ctx.arc(x, y, 16, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x, y, 4.5, 0, Math.PI * 2)
        ctx.fillStyle = st.text
        ctx.fill()
      } else {
        // Losange concentrique
        ctx.beginPath()
        ctx.moveTo(x, y - 18)
        ctx.lineTo(x + 18, y)
        ctx.lineTo(x, y + 18)
        ctx.lineTo(x - 18, y)
        ctx.closePath()
        ctx.stroke()
        diamond(ctx, x, y, 6, st.text)
      }
    }
  }
  ctx.restore()
}

/**
 * Lisière tissée « Ndop » en haut du flyer : fond indigo, motifs écrus
 * (losange concentrique, noix de kola, peigne, chevrons). Dessin original
 * inspiré du répertoire traditionnel des Grassfields.
 */
function drawNdopBand(ctx, w, height) {
  const ground = '#141c38'
  const motif = '#f4ead9'
  ctx.save()
  ctx.fillStyle = ground
  ctx.fillRect(0, 0, w, height)
  const k = height / 56
  ctx.scale(k, k)
  const unit = 168
  ctx.strokeStyle = motif
  ctx.fillStyle = motif
  ctx.lineWidth = 1.8
  ctx.lineCap = 'round'
  for (let x = 0; x < w / k + unit; x += unit) {
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ctx.moveTo(x, 7)
    ctx.lineTo(x + unit, 7)
    ctx.moveTo(x, 49)
    ctx.lineTo(x + unit, 49)
    ctx.stroke()
    ctx.globalAlpha = 1
    // Losange concentrique
    ctx.beginPath()
    ctx.moveTo(x + 28, 13)
    ctx.lineTo(x + 43, 28)
    ctx.lineTo(x + 28, 43)
    ctx.lineTo(x + 13, 28)
    ctx.closePath()
    ctx.stroke()
    diamond(ctx, x + 28, 28, 7, motif)
    // Noix de kola
    ctx.beginPath()
    ctx.arc(x + 72, 28, 12, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x + 72, 28, 4, 0, Math.PI * 2)
    ctx.fill()
    // Peigne
    ctx.beginPath()
    ctx.moveTo(x + 96, 17)
    ctx.lineTo(x + 122, 17)
    for (let i = 0; i < 4; i += 1) {
      ctx.moveTo(x + 96 + i * 8, 17)
      ctx.lineTo(x + 96 + i * 8, 39)
    }
    ctx.stroke()
    // Chevrons
    ctx.beginPath()
    ctx.moveTo(x + 132, 39)
    ctx.lineTo(x + 141, 29)
    ctx.lineTo(x + 150, 39)
    ctx.lineTo(x + 159, 29)
    ctx.lineTo(x + 168, 39)
    ctx.stroke()
  }
  ctx.restore()
  // Filets de la charte
  ctx.fillStyle = '#f6a343'
  ctx.fillRect(0, height - Math.max(3, height * 0.07), w, Math.max(3, height * 0.07))
}

/** Frise de pied de page : triangles et losanges aux couleurs de la marque. */
function drawFrise(ctx, w, h, height) {
  const top = h - height
  ctx.fillStyle = '#19203a'
  ctx.fillRect(0, top, w, height)
  const tile = height * 1.25
  for (let i = 0, x = 0; x < w + tile; i += 1, x += tile) {
    ctx.fillStyle = BRAND[i % 4]
    ctx.beginPath()
    ctx.moveTo(x, top + height)
    ctx.lineTo(x + tile / 2, top + height * 0.18)
    ctx.lineTo(x + tile, top + height)
    ctx.closePath()
    ctx.fill()
    diamond(ctx, x + tile, top + height * 0.42, height * 0.2, BRAND[(i + 2) % 4])
  }
  // Liseré supérieur
  ctx.fillStyle = '#f6a343'
  ctx.fillRect(0, top, w, Math.max(4, height * 0.08))
}

/** Photo ronde + anneau segmenté aux quatre couleurs de la marque. */
function drawPhoto(ctx, cx, cy, r, st, photo, zoom, offset, placeholderText) {
  // Anneau extérieur segmenté
  const ringR = r + r * 0.12
  const seg = (Math.PI * 2) / 4
  ctx.lineWidth = r * 0.07
  ctx.lineCap = 'round'
  BRAND.forEach((c, i) => {
    ctx.strokeStyle = c
    ctx.beginPath()
    ctx.arc(cx, cy, ringR, -Math.PI / 2 + i * seg + 0.09, -Math.PI / 2 + (i + 1) * seg - 0.09)
    ctx.stroke()
  })
  // Losanges aux jonctions de l'anneau
  for (let i = 0; i < 4; i += 1) {
    const a = -Math.PI / 2 + i * seg
    diamond(ctx, cx + Math.cos(a) * ringR, cy + Math.sin(a) * ringR, r * 0.055, st.text)
  }

  // Liseré intérieur
  ctx.beginPath()
  ctx.arc(cx, cy, r + r * 0.03, 0, Math.PI * 2)
  ctx.fillStyle = st.text
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()

  if (photo) {
    const o = clampOffset(photo, zoom, offset)
    const scale = Math.max((2 * r) / photo.naturalWidth, (2 * r) / photo.naturalHeight) * zoom
    const dw = photo.naturalWidth * scale
    const dh = photo.naturalHeight * scale
    ctx.drawImage(photo, cx - dw / 2 + o.x * r, cy - dh / 2 + o.y * r, dw, dh)
  } else {
    // Emplacement vide : silhouette + invitation
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
    ctx.fillStyle = st.map === 'light' ? 'rgba(25,32,58,0.18)' : 'rgba(255,255,255,0.25)'
    ctx.beginPath()
    ctx.arc(cx, cy - r * 0.18, r * 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cx, cy + r * 0.62, r * 0.58, r * 0.45, 0, Math.PI, 0)
    ctx.fill()
    if (placeholderText) {
      ctx.textAlign = 'center'
      fitText(ctx, placeholderText, cx, cy + r * 0.22, { weight: 600, size: r * 0.1, maxWidth: r * 1.5, color: st.soft })
    }
  }
  ctx.restore()
}

/**
 * Dessine le flyer complet sur le canevas.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} o
 * @param {'portrait'|'story'|'square'} o.format
 * @param {'nuit'|'laterite'|'soleil'} o.style
 * @param {HTMLImageElement|null} o.photo
 * @param {number} o.zoom       1 à 3
 * @param {{x:number,y:number}} o.offset  décalage en rayons
 * @param {string} o.name
 * @param {string} o.role
 * @param {boolean} o.online    billet « En ligne » : ajoute un badge
 * @param {object} o.text       textes traduits (t.tickets.flyer.art)
 * @param {object} o.assets     images préchargées { logoWhite, logoColor, mapDark, mapLight }
 * @param {string} o.placeholder texte affiché sans photo
 */
export function drawFlyer(canvas, o) {
  const { w, h } = FLYER_FORMATS[o.format]
  const L = getLayout(o.format)
  const st = FLYER_STYLES[o.style]
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h
  const ctx = canvas.getContext('2d')
  const cx = w / 2
  const maxW = w - 140

  ctx.clearRect(0, 0, w, h)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  drawBackground(ctx, w, h, st, o.assets)
  const bandH = Math.round(L.logo.y * 0.62) // lisière tissée en haut du visuel
  drawNdopBand(ctx, w, bandH)

  // Logo
  const logo = st.logo === 'white' ? o.assets.logoWhite : o.assets.logoColor
  if (logo) {
    const lh = (logo.naturalHeight / logo.naturalWidth) * L.logo.w
    ctx.drawImage(logo, cx - L.logo.w / 2, L.logo.y, L.logo.w, lh)
  }

  // « J'Y SERAI ! » : dégradé + léger soulignement pinceau
  ctx.save()
  ctx.font = font(800, L.headline.size)
  let hs = L.headline.size
  while (ctx.measureText(o.text.headline).width > maxW && hs > 40) {
    hs -= 2
    ctx.font = font(800, hs)
  }
  const tw = ctx.measureText(o.text.headline).width
  const hg = ctx.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0)
  hg.addColorStop(0, st.headline[0])
  hg.addColorStop(1, st.headline[1])
  // Soulignement tissé : quatre segments aux couleurs de la marque
  const segW = (tw * 0.7) / 4
  BRAND.forEach((c, i) => {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.roundRect(cx - tw * 0.35 + i * segW + 3, L.headline.y + hs * 0.14, segW - 6, hs * 0.07, hs * 0.035)
    ctx.fill()
  })
  ctx.fillStyle = hg
  ctx.fillText(o.text.headline, cx, L.headline.y)
  ctx.restore()

  // Photo
  drawPhoto(ctx, cx, L.photo.cy, L.photo.r, st, o.photo, o.zoom, o.offset, o.placeholder)

  // Badge « EN LIGNE »
  if (o.online) {
    const by = L.photo.cy + L.photo.r * 0.98
    ctx.font = font(800, L.role.size * 0.85)
    const bw = ctx.measureText(o.text.online).width + L.role.size * 1.6
    const bh = L.role.size * 1.5
    ctx.fillStyle = '#2db8bd'
    ctx.beginPath()
    ctx.roundRect(cx - bw / 2, by - bh / 2, bw, bh, bh / 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'middle'
    ctx.fillText(o.text.online, cx, by + 2)
    ctx.textBaseline = 'alphabetic'
  }

  // Nom & titre
  if (o.name) fitText(ctx, o.name, cx, L.name.y, { weight: 700, size: L.name.size, maxWidth: maxW, color: st.text })
  if (o.role) fitText(ctx, o.role, cx, L.role.y, { weight: 400, size: L.role.size, maxWidth: maxW, color: st.soft })

  // Séparateur : trois losanges
  const sy = (L.role.y + L.date.y) / 2 - L.date.size * 0.35
  ;[-1, 0, 1].forEach((i) => diamond(ctx, cx + i * 26, sy, 7, BRAND[i + 1]))

  // Informations de l'événement
  fitText(ctx, o.text.date, cx, L.date.y, { weight: 800, size: L.date.size, maxWidth: maxW, color: st.accent })
  fitText(ctx, o.text.venue, cx, L.venue.y, { weight: 600, size: L.venue.size, maxWidth: maxW, color: st.text })
  fitText(ctx, o.text.event, cx, L.event.y, { weight: 400, size: L.event.size, maxWidth: maxW, color: st.soft })
  fitText(ctx, o.text.theme, cx, L.theme.y, { weight: 400, size: L.theme.size, maxWidth: maxW, color: st.soft, italic: true })

  // Hashtag
  fitText(ctx, o.text.hashtag, cx, L.hashtag.y, { weight: 800, size: L.hashtag.size, maxWidth: maxW, color: st.accent })

  drawFrise(ctx, w, h, L.frise)
}

/** Le point (en px du canevas) est-il dans le cercle de la photo ? */
export function isInPhoto(format, x, y) {
  const { w } = FLYER_FORMATS[format]
  const { photo } = getLayout(format)
  return Math.hypot(x - w / 2, y - photo.cy) <= photo.r
}
