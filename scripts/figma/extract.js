/**
 * Extracteur « page web → maquette Figma » (exécuté DANS le navigateur par
 * scripts/figma-export.mjs, via Playwright).
 *
 * Il parcourt le DOM affiché et produit un arbre de calques simples que le
 * plugin Figma (figma-plugin/) sait reconstruire en calques natifs et éditables :
 *   F = cadre (fond, bordure, arrondis, ombre, flou, découpe)
 *   T = texte (avec styles par plage : gras, couleur, soulignement)
 *   I = image (clé vers le dictionnaire d'images)
 *   S = SVG (icônes, motifs : deviennent des vecteurs éditables)
 * Chaque nœud garde un nom lisible (la classe CSS) et, pour les liens internes,
 * la page de destination (utilisée pour le prototype).
 *
 * Toutes les positions sont en pixels, relatives au document (haut de page = 0).
 * La fonction est autonome (aucune dépendance) car elle est sérialisée par Playwright.
 */
// eslint-disable-next-line no-unused-vars
function extractPage(options = {}) {
  const SEMANTIC = new Set(['SECTION', 'HEADER', 'FOOTER', 'NAV', 'MAIN', 'ARTICLE', 'ASIDE', 'FORM', 'UL', 'OL', 'LI', 'BUTTON', 'A', 'LABEL', 'FIGURE', 'DIALOG', 'FIELDSET', 'TABLE', 'TR', 'TD', 'TH', 'INPUT', 'SELECT', 'TEXTAREA', 'DL'])
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'META', 'LINK', 'BR', 'WBR', 'IFRAME', 'SOURCE'])
  const images = {} // clé → URL (résolue ensuite par le script Node)
  const overlays = [] // éléments fixes (en-tête, fenêtres modales) : placés au premier plan
  let imageSeq = 0
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  const scrollY = window.scrollY // 0 : positions = positions dans le document
  const round = (n) => Math.round(n * 100) / 100

  // --- Couleurs --------------------------------------------------------------------------
  const ctx = document.createElement('canvas').getContext('2d')
  /** Toute couleur CSS → {r,g,b,a} (0-1) via le moteur du navigateur */
  function color(str) {
    if (!str || str === 'transparent' || str === 'none') return null
    let m = str.match(/^rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\)$/)
    if (m) {
      let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
      return { r: m[1] / 255, g: m[2] / 255, b: m[3] / 255, a }
    }
    m = str.match(/^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.]+%?))?\)$/)
    if (m) {
      const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
      return { r: +m[1], g: +m[2], b: +m[3], a }
    }
    // Autres notations (oklab, color-mix…) : le canevas convertit en hexadécimal / rgba
    ctx.fillStyle = '#000'
    ctx.fillStyle = str
    const v = ctx.fillStyle
    if (v.startsWith('#')) {
      const n = parseInt(v.slice(1), 16)
      return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 }
    }
    return v === str ? null : color(v)
  }
  const visible = (c) => c && c.a > 0.01

  // --- Dégradés CSS → dégradés Figma -------------------------------------------------------
  /** Sépare une liste CSS au niveau des virgules de premier niveau */
  function splitTop(str) {
    const out = []
    let depth = 0
    let cur = ''
    for (const ch of str) {
      if (ch === '(') depth++
      if (ch === ')') depth--
      if (ch === ',' && depth === 0) {
        out.push(cur.trim())
        cur = ''
      } else cur += ch
    }
    if (cur.trim()) out.push(cur.trim())
    return out
  }

  function parseStops(parts, lengthPx) {
    const stops = parts.map((p) => {
      const m = p.match(/^(.*?)(?:\s+(-?[\d.]+)(%|px))?(?:\s+(-?[\d.]+)(%|px))?$/)
      const c = color(m[1].trim())
      const pos = m[2] === undefined ? null : m[3] === '%' ? m[2] / 100 : m[2] / lengthPx
      const pos2 = m[4] === undefined ? null : m[5] === '%' ? m[4] / 100 : m[4] / lengthPx
      return { c: c ?? { r: 0, g: 0, b: 0, a: 0 }, pos, pos2 }
    })
    // Deux positions → deux arrêts (arrêt « dur »)
    const flat = []
    stops.forEach((s) => {
      flat.push({ c: s.c, pos: s.pos })
      if (s.pos2 !== null) flat.push({ c: s.c, pos: s.pos2 })
    })
    // Positions manquantes : réparties uniformément
    if (flat[0].pos === null) flat[0].pos = 0
    if (flat[flat.length - 1].pos === null) flat[flat.length - 1].pos = 1
    for (let i = 1; i < flat.length; i++) {
      if (flat[i].pos !== null) continue
      let j = i
      while (flat[j].pos === null) j++
      const a = flat[i - 1].pos
      const b = flat[j].pos
      for (let k = i; k < j; k++) flat[k].pos = a + ((b - a) * (k - i + 1)) / (j - i + 1)
    }
    return flat.map((s) => ({ color: s.c, position: Math.min(1, Math.max(0, s.pos)) }))
  }

  const SIDES = { top: 0, right: 90, bottom: 180, left: 270 }
  function parseGradient(str, w, h) {
    let m = str.match(/^(repeating-)?linear-gradient\((.*)\)$/s)
    if (m) {
      const parts = splitTop(m[2])
      let angle = 180
      if (/^-?[\d.]+(deg|turn|rad)/.test(parts[0])) {
        const v = parseFloat(parts[0])
        angle = parts[0].endsWith('turn') ? v * 360 : parts[0].endsWith('rad') ? (v * 180) / Math.PI : v
        parts.shift()
      } else if (parts[0].startsWith('to ')) {
        const dirs = parts.shift().slice(3).split(/\s+/)
        angle = dirs.length === 1 ? SIDES[dirs[0]] : (SIDES[dirs[0]] + SIDES[dirs[1]]) / 2 + (dirs.includes('top') && dirs.includes('left') ? 180 : 0)
      }
      const horizontal = Math.abs(Math.sin((angle * Math.PI) / 180)) > 0.7
      const len = horizontal ? w : h
      let stops = parseStops(parts, len)
      if (m[1]) {
        // Motif répété (bordure tissée…) : on déroule le motif sur toute la longueur
        const period = stops[stops.length - 1].position
        if (period > 0 && period < 1) {
          const unrolled = []
          for (let k = 0; k * period < 1 && unrolled.length < 240; k++) {
            stops.forEach((s) => unrolled.push({ color: s.color, position: Math.min(1, s.position + k * period) }))
          }
          stops = unrolled
        }
      }
      return { type: 'GRADIENT_LINEAR', angle, stops }
    }
    m = str.match(/^radial-gradient\((.*)\)$/s)
    if (m) {
      const parts = splitTop(m[1])
      let cx = 0.5
      let cy = 0.5
      let shape = 'ellipse'
      if (!color(parts[0].split(/\s+/)[0]) || /\bat\b|circle|ellipse/.test(parts[0])) {
        const head = parts.shift()
        if (head.includes('circle')) shape = 'circle'
        const at = head.match(/at\s+(\S+)\s*(\S+)?/)
        const pos = (v, size) => (v === undefined || v === 'center' ? 0.5 : v === 'left' || v === 'top' ? 0 : v === 'right' || v === 'bottom' ? 1 : v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v) / size)
        if (at) {
          cx = pos(at[1], w)
          cy = pos(at[2], h)
        }
      }
      // Taille « farthest-corner » (valeur par défaut CSS)
      const dx = Math.max(cx, 1 - cx) * w
      const dy = Math.max(cy, 1 - cy) * h
      let rx
      let ry
      if (shape === 'circle') rx = ry = Math.hypot(dx, dy)
      else {
        rx = dx * Math.SQRT2
        ry = dy * Math.SQRT2
      }
      return { type: 'GRADIENT_RADIAL', cx, cy, rx: rx / w, ry: ry / h, stops: parseStops(parts, rx) }
    }
    return null
  }

  function backgroundPaints(cs, w, h, el) {
    const paints = []
    const bgc = color(cs.backgroundColor)
    if (visible(bgc)) paints.push({ type: 'SOLID', color: bgc })
    const img = cs.backgroundImage
    if (img && img !== 'none') {
      const layers = splitTop(img).reverse() // CSS : premier = dessus ; Figma : dernier = dessus
      const repeats = splitTop(cs.backgroundRepeat)
      layers.forEach((layer, idx) => {
        if (layer.startsWith('url(')) {
          const url = layer.slice(4, -1).replace(/^["']|["']$/g, '')
          const key = `img${imageSeq++}`
          images[key] = new URL(url, location.href).href
          const rep = repeats[layers.length - 1 - idx] ?? repeats[0]
          paints.push({ type: 'IMAGE', key, scaleMode: rep && rep.startsWith('repeat') && cs.backgroundSize !== 'cover' ? 'TILE' : 'FILL', opacity: 1 })
        } else {
          const g = parseGradient(layer, w, h)
          if (g) paints.push(g)
        }
      })
    }
    // Texte en dégradé (background-clip: text) : le dégradé va au texte, pas au cadre
    if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') return { paints: [], textPaint: paints.find((p) => p.type !== 'SOLID') ?? paints[0] }
    return { paints, el }
  }

  // --- Bordures, arrondis, ombres -------------------------------------------------------------
  const px = (v) => parseFloat(v) || 0
  function radii(cs, w, h) {
    const r = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map((k) => {
      const v = cs[k]
      return v.includes('%') ? (parseFloat(v) / 100) * Math.min(w, h) : px(v)
    })
    return r.map((v) => Math.min(v, Math.min(w, h) / 2))
  }

  function strokes(cs, w) {
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({ w: cs[`border${s}Style`] === 'none' ? 0 : px(cs[`border${s}Width`]), c: color(cs[`border${s}Color`]) }))
    // Bordure « tissée » (border-image en dégradé répété) : devient un bandeau dégradé
    let band = null
    if (cs.borderImageSource && cs.borderImageSource !== 'none' && sides[0].w > 0) {
      const g = parseGradient(cs.borderImageSource, w, sides[0].w)
      if (g) band = { h: sides[0].w, paint: g }
      sides[0].w = 0
    }
    const main = sides.filter((s) => s.w > 0 && visible(s.c)).sort((a, b) => b.w - a.w)[0]
    if (!main) return { band }
    return { band, stroke: { color: main.c, weights: sides.map((s) => (visible(s.c) ? s.w : 0)) } }
  }

  function shadows(cs) {
    const out = []
    if (cs.boxShadow && cs.boxShadow !== 'none') {
      splitTop(cs.boxShadow).forEach((s) => {
        const inset = s.includes('inset')
        const cm = s.match(/(rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-f]+)/i)
        const nums = s.replace(cm ? cm[0] : '', '').replace('inset', '').trim().split(/\s+/).map(px)
        const c = cm ? color(cm[0]) : null
        if (!visible(c)) return
        out.push({ type: inset ? 'INNER_SHADOW' : 'DROP_SHADOW', color: c, x: nums[0] ?? 0, y: nums[1] ?? 0, blur: nums[2] ?? 0, spread: nums[3] ?? 0 })
      })
    }
    const bf = cs.backdropFilter?.match(/blur\(([\d.]+)px\)/)
    if (bf) out.push({ type: 'BACKGROUND_BLUR', radius: +bf[1] })
    const f = cs.filter?.match(/blur\(([\d.]+)px\)/)
    if (f) out.push({ type: 'LAYER_BLUR', radius: +f[1] })
    return out
  }

  // --- Texte --------------------------------------------------------------------------------------
  const INLINE = new Set(['inline', 'contents'])
  function isInlineText(el) {
    const cs = getComputedStyle(el)
    return INLINE.has(cs.display) && !['SVG', 'IMG', 'CANVAS', 'svg'].includes(el.tagName) && el.tagName !== 'BR'
  }
  function transformText(t, cs) {
    if (cs.textTransform === 'uppercase') return t.toUpperCase()
    if (cs.textTransform === 'lowercase') return t.toLowerCase()
    if (cs.textTransform === 'capitalize') return t.replace(/\b\p{L}/gu, (c) => c.toUpperCase())
    return t
  }

  /** Construit un calque texte pour un élément contenant du texte « en ligne » */
  function textNode(el, cs, rect) {
    const segments = []
    const textRects = []
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === 3) {
          if (child.textContent.trim()) {
            const r = document.createRange()
            r.selectNodeContents(child)
            textRects.push(...[...r.getClientRects()].filter((x) => x.width > 0 && x.height > 0))
          }
          const parent = child.parentElement
          const pcs = getComputedStyle(parent)
          let t = child.textContent.replace(/\s+/g, ' ')
          if (!t) continue
          t = transformText(t, pcs)
          const bg = backgroundPaints(pcs, 100, 20)
          segments.push({
            text: t,
            size: round(px(pcs.fontSize)),
            weight: +pcs.fontWeight || 400,
            italic: pcs.fontStyle === 'italic',
            color: color(pcs.webkitTextFillColor) && color(pcs.webkitTextFillColor).a > 0 ? color(pcs.webkitTextFillColor) : color(pcs.color),
            paint: bg.textPaint ?? null,
            underline: pcs.textDecorationLine.includes('underline'),
            lh: pcs.lineHeight === 'normal' ? null : round(px(pcs.lineHeight)),
            ls: pcs.letterSpacing === 'normal' ? 0 : round(px(pcs.letterSpacing)),
          })
        } else if (child.nodeType === 1 && !SKIP.has(child.tagName) && isInlineText(child) && isShown(child)) {
          walk(child)
        } else if (child.nodeType === 1 && child.tagName === 'BR') {
          segments.push({ ...(segments[segments.length - 1] ?? {}), text: '\n' })
        }
      }
    }
    walk(el)
    // Nettoyage des espaces en début / fin
    while (segments.length && !segments[0].text.trim()) segments.shift()
    if (!segments.length) return null
    segments[0].text = segments[0].text.replace(/^\s+/, '')
    const last = segments[segments.length - 1]
    last.text = last.text.replace(/\s+$/, '')
    if (!segments.some((s) => s.text.trim())) return null

    // Boîte du texte : la zone réellement occupée par les lignes (Range)
    const rects = textRects
    let box = rect
    if (rects.length) {
      const x1 = Math.min(...rects.map((r) => r.left))
      const y1 = Math.min(...rects.map((r) => r.top))
      const x2 = Math.max(...rects.map((r) => r.right))
      const y2 = Math.max(...rects.map((r) => r.bottom))
      box = { left: x1, top: y1, width: x2 - x1, height: y2 - y1 }
    }
    const align = { center: 'CENTER', right: 'RIGHT', end: 'RIGHT', justify: 'JUSTIFIED' }[cs.textAlign] ?? 'LEFT'
    // Largeur : celle du bloc parent pour garder l'alignement (centré, retour à la ligne)
    const content = {
      left: rect.left + px(cs.paddingLeft) + px(cs.borderLeftWidth),
      width: rect.width - px(cs.paddingLeft) - px(cs.paddingRight) - px(cs.borderLeftWidth) - px(cs.borderRightWidth),
    }
    const multiLine = box.height > (segments[0].lh ?? segments[0].size * 1.4) * 1.5
    const useBlock = align !== 'LEFT' || multiLine
    return {
      t: 'T',
      n: `${el.tagName.toLowerCase()} · ${segments.map((s) => s.text).join('').slice(0, 40)}`,
      x: round((useBlock ? content.left : box.left) + window.scrollX),
      y: round(box.top + scrollY),
      w: round(Math.max(1, useBlock ? content.width : box.width + 2)),
      h: round(box.height),
      align,
      fixedWidth: useBlock,
      segs: segments,
    }
  }

  // --- Visibilité --------------------------------------------------------------------------------
  function isShown(el) {
    const cs = getComputedStyle(el)
    return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.visibility !== 'collapse' && parseFloat(cs.opacity) > 0.01
  }

  function linkOf(el) {
    const a = el.closest('a[href]')
    if (!a) return null
    const url = new URL(a.getAttribute('href'), location.href)
    if (url.origin !== location.origin) return null
    if (/\.(pdf|ics)$/.test(url.pathname)) return null
    return url.pathname + (url.search || '')
  }

  function nameOf(el) {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter((c) => c && !/^is-|^reveal$/.test(c)) : []
    return cls.length ? cls.slice(0, 2).join(' ') : el.tagName.toLowerCase()
  }

  // --- Pseudo-éléments décoratifs (::before / ::after positionnés) ---------------------------------
  function pseudo(el, which, rect) {
    const cs = getComputedStyle(el, which)
    if (!cs || cs.content === 'none' || cs.content === 'normal' || cs.display === 'none') return null
    if (!/^["']/.test(cs.content)) return null
    const text = cs.content.slice(1, -1)
    const pos = cs.position
    const W = rect.width
    const H = rect.height
    let x = 0
    let y = 0
    let w = px(cs.width)
    let h = px(cs.height)
    if (pos === 'absolute') {
      const L = cs.left === 'auto' ? null : px(cs.left)
      const R = cs.right === 'auto' ? null : px(cs.right)
      const T = cs.top === 'auto' ? null : px(cs.top)
      const B = cs.bottom === 'auto' ? null : px(cs.bottom)
      if (cs.width === 'auto' || !w) w = W - (L ?? 0) - (R ?? 0)
      if (cs.height === 'auto' || !h) h = H - (T ?? 0) - (B ?? 0)
      x = L ?? (R !== null ? W - R - w : 0)
      y = T ?? (B !== null ? H - B - h : 0)
    } else if (!text) return null
    if (w < 1 || h < 1) return null
    const bg = backgroundPaints(cs, w, h)
    const st = strokes(cs, w)
    if (!bg.paints.length && !st.stroke && !text) return null
    const rot = cs.transform && cs.transform !== 'none' ? cs.transform : null
    let angle = 0
    if (rot) {
      const m = rot.match(/matrix\(([^)]+)\)/)
      if (m) {
        const [a, b] = m[1].split(',').map(Number)
        angle = Math.round((Math.atan2(b, a) * 180) / Math.PI)
      }
    }
    return {
      t: 'F',
      n: `${nameOf(el)} ${which}`,
      x: round(rect.left + window.scrollX + x),
      y: round(rect.top + scrollY + y),
      w: round(w),
      h: round(h),
      fills: bg.paints,
      stroke: st.stroke,
      r: radii(cs, w, h),
      rot: angle,
      op: parseFloat(cs.opacity),
      kids: [],
    }
  }

  // --- Parcours ------------------------------------------------------------------------------------
  function svgNode(el, rect) {
    const clone = el.cloneNode(true)
    const cs = getComputedStyle(el)
    const cur = cs.color
    clone.setAttribute('width', rect.width)
    clone.setAttribute('height', rect.height)
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.removeAttribute('class')
    // Couleurs calculées (currentColor, variables CSS) inscrites dans le SVG
    const src = [el, ...el.querySelectorAll('*')]
    const dst = [clone, ...clone.querySelectorAll('*')]
    src.forEach((node, i) => {
      const ncs = getComputedStyle(node)
      const d = dst[i]
      if (!d || !d.setAttribute) return
      ;['fill', 'stroke'].forEach((prop) => {
        const v = ncs[prop]
        if (v && v !== 'none' && !v.startsWith('url(')) d.setAttribute(prop, v)
        else if (v === 'none') d.setAttribute(prop, 'none')
      })
      if (ncs.strokeWidth && ncs.stroke !== 'none') d.setAttribute('stroke-width', ncs.strokeWidth)
      if (ncs.opacity !== '1') d.setAttribute('opacity', ncs.opacity)
      if (node.tagName === 'text') {
        d.setAttribute('font-family', 'Sora')
        d.setAttribute('font-weight', ncs.fontWeight)
      }
    })
    let markup = new XMLSerializer().serializeToString(clone).replace(/currentColor/g, cur)
    if (!markup.includes('viewBox') && !el.getAttribute('viewBox')) markup = markup.replace('<svg', `<svg viewBox="0 0 ${rect.width} ${rect.height}"`)
    return { t: 'S', n: nameOf(el) === 'svg' ? 'icône' : nameOf(el), x: round(rect.left + window.scrollX), y: round(rect.top + scrollY), w: round(rect.width), h: round(rect.height), svg: markup, op: parseFloat(cs.opacity), link: linkOf(el) }
  }

  function imageNode(el, rect, cs) {
    const key = `img${imageSeq++}`
    if (el.tagName === 'CANVAS') {
      try {
        images[key] = el.toDataURL('image/png')
      } catch {
        return null
      }
    } else {
      images[key] = el.currentSrc || el.src
    }
    return {
      t: 'I',
      n: el.getAttribute('alt') || nameOf(el),
      x: round(rect.left + window.scrollX),
      y: round(rect.top + scrollY),
      w: round(rect.width),
      h: round(rect.height),
      key,
      fit: cs.objectFit === 'contain' ? 'FIT' : 'FILL',
      r: radii(cs, rect.width, rect.height),
      op: parseFloat(cs.opacity),
      link: linkOf(el),
    }
  }

  /** Nœud d'un élément ; renvoie un tableau (un élément « transparent » rend ses enfants) */
  function visit(el, depth = 0) {
    if (SKIP.has(el.tagName) || !isShown(el)) return []
    if (el.id === 'preloader' || el.classList?.contains('skip-link')) return []
    if (options.ignore && el.matches?.(options.ignore)) return []
    const cs = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    const tag = el.tagName.toUpperCase()

    if (tag === 'SVG') return rect.width > 0 && rect.height > 0 ? [svgNode(el, rect)] : []
    if (tag === 'IMG' || tag === 'CANVAS') return rect.width > 0 && rect.height > 0 ? [imageNode(el, rect, cs)].filter(Boolean) : []

    const kids = []
    const before = pseudo(el, '::before', rect)
    if (before) kids.push(before)

    // Texte : direct, ou éléments en ligne
    const hasDirectText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    const inlineOnly = hasDirectText || ([...el.children].length > 0 && [...el.children].every((c) => isInlineText(c) || c.tagName === 'BR') && el.textContent.trim())
    if (inlineOnly && tag !== 'INPUT') {
      const tn = textNode(el, cs, rect)
      if (tn) {
        tn.link = linkOf(el)
        kids.push(tn)
      }
      // Les éléments non « en ligne » (icônes…) restent à traiter
      for (const child of el.children) if (!isInlineText(child)) kids.push(...visit(child, depth + 1))
    } else {
      for (const child of el.children) kids.push(...visit(child, depth + 1))
    }

    // Champs de formulaire : valeur ou texte indicatif
    if ((tag === 'INPUT' && !['checkbox', 'radio', 'range', 'hidden', 'file'].includes(el.type)) || tag === 'TEXTAREA') {
      const value = el.value || el.placeholder
      if (value && rect.width > 0) {
        const pcs = getComputedStyle(el, el.value ? null : '::placeholder')
        kids.push({
          t: 'T',
          n: el.value ? 'valeur' : 'placeholder',
          x: round(rect.left + px(cs.paddingLeft) + px(cs.borderLeftWidth)),
          y: round(rect.top + scrollY + (rect.height - px(cs.fontSize) * 1.3) / 2),
          w: round(rect.width - px(cs.paddingLeft) - px(cs.paddingRight)),
          h: round(px(cs.fontSize) * 1.3),
          align: 'LEFT',
          fixedWidth: true,
          segs: [{ text: value, size: px(cs.fontSize), weight: +cs.fontWeight || 400, color: color(el.value ? cs.color : pcs.color) ?? color(cs.color), lh: null, ls: 0 }],
        })
      }
    }

    const after = pseudo(el, '::after', rect)
    if (after) kids.push(after)

    if (rect.width < 1 || rect.height < 1) return kids // élément sans taille : on garde ses enfants

    const bg = backgroundPaints(cs, rect.width, rect.height, el)
    const st = strokes(cs, rect.width)
    const fx = shadows(cs)
    const op = parseFloat(cs.opacity)
    const clip = ['hidden', 'clip'].includes(cs.overflowX) || ['hidden', 'clip'].includes(cs.overflowY)
    const isVisual = bg.paints.length || st.stroke || st.band || fx.length || op < 1 || clip
    const fixed = cs.position === 'fixed' || cs.position === 'sticky'
    const makeFrame = isVisual || SEMANTIC.has(tag) || fixed || depth <= 1 || (kids.length > 1 && typeof el.className === 'string' && el.className)

    if (!makeFrame) return kids
    // Fenêtre modale : voile sombre derrière (::backdrop)
    if (tag === 'DIALOG' && el.matches(':modal')) {
      const bcs = getComputedStyle(el, '::backdrop')
      overlays.push({ t: 'F', n: 'voile', x: 0, y: 0, w: document.documentElement.clientWidth, h: window.innerHeight, fills: [{ type: 'SOLID', color: color(bcs.backgroundColor) ?? { r: 0.05, g: 0.07, b: 0.15, a: 0.7 } }], r: [0, 0, 0, 0], fx: [{ type: 'BACKGROUND_BLUR', radius: 6 }], kids: [], fixed: true })
    }
    if (st.band) {
      kids.unshift({ t: 'F', n: 'bordure tissée', x: round(rect.left + window.scrollX), y: round(rect.top + scrollY), w: round(rect.width), h: st.band.h, fills: [st.band.paint], r: [0, 0, 0, 0], kids: [] })
    }
    const frame = [
      {
        t: 'F',
        n: nameOf(el),
        tag: tag.toLowerCase(),
        x: round(rect.left + window.scrollX),
        y: round(rect.top + scrollY),
        w: round(rect.width),
        h: round(rect.height),
        fills: bg.paints,
        stroke: st.stroke,
        r: radii(cs, rect.width, rect.height),
        fx,
        op,
        clip,
        fixed: cs.position === 'fixed',
        link: tag === 'A' ? linkOf(el) : null,
        proto: el.getAttribute('data-proto') || null,
        kids,
      },
    ]
    if (cs.position === 'fixed' && depth > 0) {
      overlays.push(frame[0])
      return []
    }
    return frame
  }

  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  const bodyCs = getComputedStyle(document.body)
  const root = [...visit(document.getElementById('root')), ...overlays]
  const doc = document.documentElement
  return {
    title: document.title,
    width: doc.clientWidth,
    height: Math.max(doc.scrollHeight, document.body.scrollHeight),
    background: color(bodyCs.backgroundColor) ?? color(getComputedStyle(doc).backgroundColor) ?? { r: 1, g: 1, b: 1, a: 1 },
    nodes: root,
    images,
  }
}
