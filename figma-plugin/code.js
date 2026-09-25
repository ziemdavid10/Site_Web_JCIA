/**
 * Plugin Figma « JCIA 2027 — Maquette & prototype »
 *
 * Reconstruit, en calques Figma natifs et ÉDITABLES, tous les écrans du site
 * exportés par `npm run figma:export` (données embarquées dans ui.html) :
 *
 *   Page « 0 · Design system »  couleurs (styles), typographies (styles), composants
 *   Page « 1 · Desktop »        écrans 1440 px + prototype (liens entre écrans)
 *   Page « 2 · Mobile »         écrans 390 px + prototype
 *   Page « 3 · Thème sombre »   écrans principaux en thème sombre
 *
 * Chaque calque porte le nom de sa classe CSS dans le code (ex. « tier-card »),
 * ce qui relie la maquette au code source.
 *
 * Écrit en JavaScript « classique » (sans ?. ni ??) pour la machine virtuelle de Figma.
 */

var FAMILY = 'Sora'
var WEIGHTS = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'ExtraBold' }
var availableStyles = {}
var imagePool = {} // hash → dataURL
var imageCache = {} // hash → imageHash Figma
var meta = null
var pages = {}
var built = [] // { frame, data, links: [{ node, link, proto }] }

figma.showUI(__html__, { width: 400, height: 330, title: 'JCIA 2027 — Maquette & prototype' })

function progress(text, pct) {
  figma.ui.postMessage({ type: 'progress', text: text, pct: pct })
}

// --- Polices ----------------------------------------------------------------------------------
async function loadFonts() {
  var fonts = await figma.listAvailableFontsAsync()
  var sora = fonts.filter(function (f) {
    return f.fontName.family === 'Sora'
  })
  if (!sora.length) FAMILY = 'Inter' // Sora absente : repli sur Inter (toujours disponible)
  fonts
    .filter(function (f) {
      return f.fontName.family === FAMILY
    })
    .forEach(function (f) {
      availableStyles[f.fontName.style] = true
    })
  var styles = Object.keys(availableStyles)
  for (var i = 0; i < styles.length; i++) {
    if (/Italic/.test(styles[i])) continue
    await figma.loadFontAsync({ family: FAMILY, style: styles[i] })
  }
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
}

function fontFor(weight) {
  var w = Math.round((weight || 400) / 100) * 100
  var order = [w, w + 100, w - 100, w + 200, w - 200, 400]
  for (var i = 0; i < order.length; i++) {
    var style = WEIGHTS[order[i]]
    if (style && availableStyles[style]) return { family: FAMILY, style: style }
  }
  return { family: 'Inter', style: 'Regular' }
}

// --- Peintures --------------------------------------------------------------------------------------
function rgb(c) {
  return { r: clamp(c.r), g: clamp(c.g), b: clamp(c.b) }
}
function clamp(v) {
  return Math.max(0, Math.min(1, v || 0))
}

function imageHash(key) {
  if (!key) return null
  if (imageCache[key]) return imageCache[key]
  var dataUrl = imagePool[key]
  if (!dataUrl) return null
  try {
    var b64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
    var img = figma.createImage(figma.base64Decode(b64))
    imageCache[key] = img.hash
    return img.hash
  } catch (e) {
    return null
  }
}

function toPaint(p) {
  if (!p) return null
  if (p.type === 'SOLID') return { type: 'SOLID', color: rgb(p.color), opacity: clamp(p.color.a) }
  // Positions croissantes obligatoires (règle CSS : une position plus petite prend la précédente)
  var last = 0
  var stops = (p.stops || []).map(function (s) {
    last = Math.max(last, clamp(s.position))
    return { position: last, color: { r: clamp(s.color.r), g: clamp(s.color.g), b: clamp(s.color.b), a: clamp(s.color.a) } }
  })
  if (stops.length < 2) return null
  if (p.type === 'GRADIENT_LINEAR') {
    // Angle CSS (0° = vers le haut, 90° = vers la droite) → matrice Figma (espace du calque → espace du dégradé)
    var a = ((p.angle - 90) * Math.PI) / 180
    var cos = Math.cos(a)
    var sin = Math.sin(a)
    return {
      type: 'GRADIENT_LINEAR',
      gradientTransform: [
        [cos, sin, 0.5 - cos / 2 - sin / 2],
        [-sin, cos, 0.5 + sin / 2 - cos / 2],
      ],
      gradientStops: stops,
    }
  }
  if (p.type === 'GRADIENT_RADIAL') {
    var rx = Math.max(0.001, p.rx)
    var ry = Math.max(0.001, p.ry)
    return {
      type: 'GRADIENT_RADIAL',
      gradientTransform: [
        [1 / (2 * rx), 0, 0.5 - p.cx / (2 * rx)],
        [0, 1 / (2 * ry), 0.5 - p.cy / (2 * ry)],
      ],
      gradientStops: stops,
    }
  }
  if (p.type === 'IMAGE') {
    var h = imageHash(p.key)
    if (!h) return null
    return p.scaleMode === 'TILE' ? { type: 'IMAGE', imageHash: h, scaleMode: 'TILE', scalingFactor: 0.5 } : { type: 'IMAGE', imageHash: h, scaleMode: 'FILL' }
  }
  return null
}

function paints(list) {
  return (list || []).map(toPaint).filter(Boolean)
}

function effects(list) {
  return (list || [])
    .map(function (e) {
      if (e.type === 'BACKGROUND_BLUR' || e.type === 'LAYER_BLUR') return { type: e.type, radius: e.radius, visible: true }
      return {
        type: e.type,
        color: { r: clamp(e.color.r), g: clamp(e.color.g), b: clamp(e.color.b), a: clamp(e.color.a) },
        offset: { x: e.x, y: e.y },
        radius: Math.max(0, e.blur),
        spread: e.spread || 0,
        visible: true,
        blendMode: 'NORMAL',
      }
    })
    .filter(Boolean)
}

function applyRadius(node, r) {
  if (!r) return
  if (r[0] === r[1] && r[1] === r[2] && r[2] === r[3]) node.cornerRadius = r[0]
  else {
    node.topLeftRadius = r[0]
    node.topRightRadius = r[1]
    node.bottomRightRadius = r[2]
    node.bottomLeftRadius = r[3]
  }
}

function applyStroke(node, s) {
  if (!s) return
  node.strokes = [{ type: 'SOLID', color: rgb(s.color), opacity: clamp(s.color.a) }]
  node.strokeAlign = 'INSIDE'
  var w = s.weights
  if (w[0] === w[1] && w[1] === w[2] && w[2] === w[3]) node.strokeWeight = w[0]
  else {
    node.strokeTopWeight = w[0]
    node.strokeRightWeight = w[1]
    node.strokeBottomWeight = w[2]
    node.strokeLeftWeight = w[3]
  }
}

/** Rotation autour du centre (losanges, décorations) */
function applyRotation(node, deg, x, y, w, h) {
  if (!deg) return
  var a = (deg * Math.PI) / 180
  var cos = Math.cos(a)
  var sin = Math.sin(a)
  var cx = x + w / 2
  var cy = y + h / 2
  node.relativeTransform = [
    [cos, -sin, cx - (cos * w) / 2 + (sin * h) / 2],
    [sin, cos, cy - (sin * w) / 2 - (cos * h) / 2],
  ]
}

// --- Construction des calques --------------------------------------------------------------------------
function build(n, parent, ox, oy, ctx) {
  var node = null
  var x = n.x - ox
  var y = n.y - oy
  var w = Math.max(0.01, n.w)
  var h = Math.max(0.01, n.h)
  try {
    if (n.t === 'F') {
      node = figma.createFrame()
      node.name = n.n || 'cadre'
      node.resizeWithoutConstraints(w, h)
      node.x = x
      node.y = y
      node.fills = paints(n.fills)
      node.clipsContent = !!n.clip
      applyRadius(node, n.r)
      applyStroke(node, n.stroke)
      if (n.fx && n.fx.length) node.effects = effects(n.fx)
      if (n.op !== undefined && n.op < 1) node.opacity = n.op
      parent.appendChild(node)
      if (n.rot) applyRotation(node, n.rot, x, y, w, h)
      ;(n.kids || []).forEach(function (k) {
        build(k, node, n.x, n.y, ctx)
      })
    } else if (n.t === 'T') {
      node = buildText(n)
      if (!node) return
      parent.appendChild(node)
      node.x = x
      node.y = y
    } else if (n.t === 'I') {
      var hsh = imageHash(n.key)
      if (!hsh) return
      node = figma.createRectangle()
      node.name = n.n || 'image'
      node.resize(w, h)
      node.x = x
      node.y = y
      node.fills = [{ type: 'IMAGE', imageHash: hsh, scaleMode: n.fit === 'FIT' ? 'FIT' : 'FILL' }]
      applyRadius(node, n.r)
      if (n.op !== undefined && n.op < 1) node.opacity = n.op
      parent.appendChild(node)
    } else if (n.t === 'S') {
      node = figma.createNodeFromSvg(n.svg)
      node.name = n.n || 'icône'
      parent.appendChild(node)
      node.x = x
      node.y = y
      if (Math.abs(node.width - w) > 1 || Math.abs(node.height - h) > 1) node.resize(w, h)
      if (n.op !== undefined && n.op < 1) node.opacity = n.op
    }
  } catch (e) {
    ctx.errors++
    return
  }
  if (node && (n.link || n.proto)) ctx.links.push({ node: node, link: n.link, proto: n.proto })
  if (node && n.fixed && parent === ctx.top) ctx.fixed.push(node)
}

function buildText(n) {
  var text = n.segs
    .map(function (s) {
      return s.text
    })
    .join('')
  if (!text.trim()) return null
  var t = figma.createText()
  var first = n.segs[0]
  t.fontName = fontFor(first.weight)
  t.characters = text
  t.name = n.n || text.slice(0, 40)
  var pos = 0
  n.segs.forEach(function (s) {
    var end = pos + s.text.length
    if (end > pos) {
      t.setRangeFontName(pos, end, fontFor(s.weight))
      t.setRangeFontSize(pos, end, Math.max(1, s.size))
      var fill = s.paint ? toPaint(s.paint) : null
      if (!fill && s.color) fill = { type: 'SOLID', color: rgb(s.color), opacity: clamp(s.color.a) }
      if (fill) t.setRangeFills(pos, end, [fill])
      if (s.underline) t.setRangeTextDecoration(pos, end, 'UNDERLINE')
      if (s.lh) t.setRangeLineHeight(pos, end, { value: s.lh, unit: 'PIXELS' })
      if (s.ls) t.setRangeLetterSpacing(pos, end, { value: s.ls, unit: 'PIXELS' })
    }
    pos = end
  })
  t.textAlignHorizontal = n.align || 'LEFT'
  if (n.fixedWidth) {
    t.textAutoResize = 'HEIGHT'
    t.resize(Math.max(1, n.w), Math.max(1, n.h))
    t.textAutoResize = 'HEIGHT'
  } else {
    t.textAutoResize = 'WIDTH_AND_HEIGHT'
  }
  return t
}

// --- Écrans ------------------------------------------------------------------------------------------------
var positions = {} // page → x courant

async function pageFor(name) {
  if (pages[name]) return pages[name]
  var page = figma.createPage()
  page.name = name
  pages[name] = page
  positions[name] = 0
  return page
}

async function buildFrame(data) {
  var pageName = data.theme === 'dark' ? '3 · Thème sombre' : data.view === 'Mobile' ? '2 · Mobile' : '1 · Desktop'
  var page = await pageFor(pageName)
  await figma.setCurrentPageAsync(page)
  var top = figma.createFrame()
  top.name = data.id
  top.resizeWithoutConstraints(data.width, data.height)
  top.x = positions[pageName]
  top.y = 0
  positions[pageName] += data.width + (data.view === 'Mobile' ? 120 : 240)
  top.fills = [{ type: 'SOLID', color: rgb(data.background), opacity: 1 }]
  top.clipsContent = true
  page.appendChild(top)
  var ctx = { top: top, links: [], fixed: [], errors: 0 }
  data.nodes.forEach(function (n) {
    build(n, top, 0, 0, ctx)
  })
  // Éléments fixes (en-tête, barre de paiement, fenêtres) : restent en place au défilement du prototype
  ctx.fixed.forEach(function (f) {
    top.appendChild(f)
  })
  top.numberOfFixedChildren = ctx.fixed.length
  built.push({ frame: top, data: data, links: ctx.links, page: page })
  return ctx.errors
}

// --- Prototype ------------------------------------------------------------------------------------------------
var PROTO = { menu: '02 Menu mobile', accueil: '01 Accueil', paiement: '14 Paiement', confirmation: '15 Confirmation', fiche: '06 Fiche intervenant', intervenants: '05 Intervenants', commande: '13 Commande' }

function screenForPath(path) {
  var p = path.split('?')[0].split('#')[0]
  if (p.indexOf('/billetterie/commande') === 0) return '13 Commande'
  if (p.indexOf('/billetterie/confirmation') === 0) return '15 Confirmation'
  var best = null
  meta.routes.forEach(function (r) {
    if (r.path === p || (r.path !== '/' && p.indexOf(r.path + '/') === 0)) {
      if (!best || r.path.length > best.path.length) best = r
    }
  })
  return best ? best.id : null
}

function findFrame(screen, view, theme) {
  var candidates = built.filter(function (b) {
    return b.data.screen === screen && b.data.view === view
  })
  var same = candidates.filter(function (b) {
    return b.data.theme === theme
  })
  return (same[0] || candidates[0] || {}).frame || null
}

function navigate(destinationId) {
  return {
    type: 'NODE',
    destinationId: destinationId,
    navigation: 'NAVIGATE',
    transition: { type: 'DISSOLVE', easing: { type: 'EASE_OUT' }, duration: 0.3 },
    preserveScrollPosition: false,
  }
}

async function wirePrototype() {
  var count = 0
  for (var i = 0; i < built.length; i++) {
    var b = built[i]
    for (var j = 0; j < b.links.length; j++) {
      var l = b.links[j]
      var screen = l.proto ? PROTO[l.proto] : screenForPath(l.link)
      if (!screen) continue
      var target = findFrame(screen, b.data.view, b.data.theme)
      if (!target || target === b.frame) continue
      try {
        await l.node.setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [navigate(target.id)] }])
        count++
      } catch (e) {
        /* calque non interactif : ignoré */
      }
    }
    // Écran « Paiement » : passe tout seul à la confirmation (simulation de la validation sur le téléphone)
    if (b.data.screen === '14 Paiement') {
      var conf = findFrame('15 Confirmation', b.data.view, b.data.theme)
      if (conf) await b.frame.setReactionsAsync([{ trigger: { type: 'AFTER_TIMEOUT', timeout: 2500 }, actions: [navigate(conf.id)] }])
    }
  }
  // Points de départ des parcours
  var flows = [
    ['1 · Desktop', 'Desktop', '01 Accueil', 'Parcours visiteur (desktop)'],
    ['1 · Desktop', 'Desktop', '12 Billetterie', 'Achat de billet → flyer (desktop)'],
    ['2 · Mobile', 'Mobile', '01 Accueil', 'Parcours visiteur (mobile)'],
    ['2 · Mobile', 'Mobile', '12 Billetterie', 'Achat de billet → flyer (mobile)'],
    ['3 · Thème sombre', 'Desktop', '01 Accueil', 'Thème sombre'],
  ]
  for (var k = 0; k < flows.length; k++) {
    var page = pages[flows[k][0]]
    var f = page && findFrame(flows[k][2], flows[k][1], flows[k][0] === '3 · Thème sombre' ? 'dark' : 'light')
    if (!page || !f) continue
    page.flowStartingPoints = page.flowStartingPoints.concat([{ nodeId: f.id, name: flows[k][3] }])
  }
  return count
}

// --- Design system ---------------------------------------------------------------------------------------------
var TOKENS = [
  ['Marque/Bleu nuit', '#19203A'],
  ['Marque/Bleu nuit 900', '#0E1326'],
  ['Marque/Bleu nuit 700', '#232B4D'],
  ['Marque/Orange soleil', '#F6A343'],
  ['Marque/Latérite', '#CD6035'],
  ['Marque/Turquoise', '#2DB8BD'],
  ['Marque/Violet', '#5D4696'],
  ['Drapeau/Vert', '#0F8A3C'],
  ['Drapeau/Rouge', '#C8102E'],
  ['Drapeau/Jaune', '#FCD116'],
  ['Thème clair/Fond', '#FBF6EE'],
  ['Thème clair/Sable', '#F4EAD9'],
  ['Thème clair/Surface', '#FFFFFF'],
  ['Thème clair/Texte', '#19203A'],
  ['Thème clair/Scène', '#F4E6D2'],
  ['Thème sombre/Fond', '#0E1326'],
  ['Thème sombre/Surface', '#19203A'],
  ['Thème sombre/Texte', '#FFFFFF'],
  ['Thème sombre/Scène', '#19203A'],
]
var TYPE = [
  ['Titres/Display', 64, 700, 1.08],
  ['Titres/H1', 50, 700, 1.1],
  ['Titres/H2', 36, 700, 1.15],
  ['Titres/H3', 24, 700, 1.25],
  ['Texte/Chapeau', 18, 400, 1.7],
  ['Texte/Courant', 16, 400, 1.7],
  ['Texte/Petit', 14, 400, 1.6],
  ['Texte/Sur-titre', 12, 700, 1.3],
  ['Interface/Bouton', 15, 600, 1.2],
]
var COMPONENTS = ['btn btn--primary', 'btn btn--secondary', 'btn btn--outline', 'section-header', 'icon-card', 'steps__item', 'tier-card', 'speaker-cat', 'speaker-card', 'partner-logo', 'accordion-item', 'operator-badge', 'e-ticket', 'cta-band__card']

function hex(h) {
  var n = parseInt(h.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

function label(text, size, weight, x, y, parent, color) {
  var t = figma.createText()
  t.fontName = fontFor(weight)
  t.characters = text
  t.fontSize = size
  t.fills = [{ type: 'SOLID', color: color || hex('#19203A'), opacity: 1 }]
  t.x = x
  t.y = y
  parent.appendChild(t)
  return t
}

async function buildDesignSystem() {
  var page = await pageFor('0 · Design system')
  await figma.setCurrentPageAsync(page)
  var board = figma.createFrame()
  board.name = 'Design system — JCIA 2027'
  board.resizeWithoutConstraints(1440, 1600)
  board.fills = [{ type: 'SOLID', color: hex('#FBF6EE'), opacity: 1 }]
  page.appendChild(board)
  label('JCIA 2027 — Design system', 48, 700, 80, 64, board)
  label("L'IA Made in Cameroun · couleurs, typographies et composants extraits du site", 18, 400, 80, 132, board, hex('#4A5170'))
  label('Prototype : ouvrez la page « 1 · Desktop » ou « 2 · Mobile », puis ▶ Présenter (choisissez l’appareil dans l’onglet Prototype).', 14, 500, 80, 166, board, hex('#A4462A'))

  // Couleurs → styles de couleur
  label('Couleurs', 28, 700, 80, 230, board)
  TOKENS.forEach(function (tk, i) {
    var style = figma.createPaintStyle()
    style.name = tk[0]
    style.paints = [{ type: 'SOLID', color: hex(tk[1]) }]
    var col = i % 7
    var row = Math.floor(i / 7)
    var sw = figma.createRectangle()
    sw.resize(160, 96)
    sw.cornerRadius = 14
    sw.x = 80 + col * 184
    sw.y = 290 + row * 170
    sw.fillStyleId = style.id
    sw.strokes = [{ type: 'SOLID', color: hex('#19203A'), opacity: 0.1 }]
    sw.name = tk[0]
    board.appendChild(sw)
    label(tk[0].split('/')[1], 13, 600, sw.x, sw.y + 104, board)
    label(tk[1], 12, 400, sw.x, sw.y + 124, board, hex('#6F7593'))
  })

  // Typographies → styles de texte
  label('Typographie — ' + FAMILY, 28, 700, 80, 830, board)
  var y = 890
  TYPE.forEach(function (ty) {
    var style = figma.createTextStyle()
    style.name = ty[0]
    style.fontName = fontFor(ty[2])
    style.fontSize = ty[1]
    style.lineHeight = { value: Math.round(ty[3] * 100), unit: 'PERCENT' }
    if (ty[0] === 'Texte/Sur-titre') {
      style.letterSpacing = { value: 18, unit: 'PERCENT' }
      style.textCase = 'UPPER'
    }
    var t = figma.createText()
    t.fontName = fontFor(ty[2])
    t.characters = ty[0].split('/')[1] + ' — Penser l’IA au Cameroun, pour le Cameroun'
    t.textStyleId = style.id
    t.fills = [{ type: 'SOLID', color: hex('#19203A'), opacity: 1 }]
    t.x = 80
    t.y = y
    board.appendChild(t)
    y += Math.max(28, ty[1] * ty[3]) + 18
  })
  board.resizeWithoutConstraints(1440, y + 80)
  return page
}

async function buildComponents() {
  var page = pages['0 · Design system']
  await figma.setCurrentPageAsync(page)
  var desktop = pages['1 · Desktop']
  var x = 1600
  var y = 0
  var rowH = 0
  var made = 0
  for (var i = 0; i < COMPONENTS.length; i++) {
    var name = COMPONENTS[i]
    var source = null
    for (var j = 0; j < built.length && !source; j++) {
      if (built[j].page !== desktop) continue
      source = built[j].frame.findOne(function (n) {
        return n.type === 'FRAME' && n.name.indexOf(name) === 0 && n.width > 20
      })
    }
    if (!source) continue
    var clone = source.clone()
    page.appendChild(clone)
    // ⚠️ Taille lue AVANT createComponentFromNode : ce nœud est remplacé par le composant
    var cw = clone.width
    var ch = clone.height
    if (x + cw > 4200) {
      x = 1600
      y += rowH + 80
      rowH = 0
    }
    clone.x = x
    clone.y = y + 40
    try {
      var comp = figma.createComponentFromNode(clone)
      comp.name = 'Composant / ' + name.split(' ').pop()
      comp.description = 'Classe CSS : .' + name.split(' ').join(' .')
      made++
    } catch (e) {
      /* le calque reste tel quel : ignoré */
    }
    x += cw + 80
    rowH = Math.max(rowH, ch)
  }
  return made
}

// --- Messages de l'interface ---------------------------------------------------------------------------------------
var errors = 0
figma.ui.onmessage = async function (msg) {
  try {
    if (msg.type === 'start') {
      meta = msg.meta
      progress('Chargement des polices…', 2)
      await loadFonts()
      progress('Design system…', 4)
      await buildDesignSystem()
      figma.ui.postMessage({ type: 'ack' })
    } else if (msg.type === 'images') {
      Object.keys(msg.images).forEach(function (k) {
        imagePool[k] = msg.images[k]
      })
      figma.ui.postMessage({ type: 'ack' })
    } else if (msg.type === 'frame') {
      errors += await buildFrame(msg.frame)
      progress('Écran construit : ' + msg.frame.id, msg.pct)
      figma.ui.postMessage({ type: 'ack' })
    } else if (msg.type === 'done') {
      progress('Composants…', 96)
      // Les composants sont un bonus : une erreur ici ne doit pas empêcher le prototype
      var comps = 0
      try {
        comps = await buildComponents()
      } catch (e) {
        figma.notify('Composants ignorés : ' + (e && e.message ? e.message : e))
      }
      progress('Liens du prototype…', 98)
      var links = await wirePrototype()
      await figma.setCurrentPageAsync(pages['1 · Desktop'])
      figma.viewport.scrollAndZoomIntoView([built[0].frame])
      progress('Terminé : ' + built.length + ' écrans, ' + comps + ' composants, ' + links + ' liens de prototype' + (errors ? ' (' + errors + ' calques ignorés)' : '') + '.', 100)
      figma.notify('Maquette JCIA 2027 prête : ' + built.length + ' écrans, ' + links + ' liens de prototype')
    } else if (msg.type === 'close') {
      figma.closePlugin()
    }
  } catch (e) {
    progress('Erreur : ' + (e && e.message ? e.message : e), 100)
    figma.ui.postMessage({ type: 'ack' })
  }
}
