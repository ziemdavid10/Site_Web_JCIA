import { useEffect, useRef } from 'react'
import { useTheme } from '@/theme/context'
import './NeuralCanvas.scss'

/**
 * <NeuralCanvas /> — réseau de neurones animé (canvas 2D).
 *
 * Des « neurones » colorés aux couleurs de la charte dérivent lentement ;
 * lorsqu'ils sont proches, une synapse (ligne) se dessine. Des impulsions
 * lumineuses voyagent sur certaines synapses : une métaphore de l'IA qui
 * reprend le vocabulaire graphique du logo (lignes terminées par des points).
 *
 * Performances :
 *  • nombre de nœuds adapté à la surface de l'écran ;
 *  • animation mise en pause hors écran (IntersectionObserver) et onglet masqué ;
 *  • image fixe si l'utilisateur a activé « réduire les animations ».
 *
 * Thème : les synapses prennent la couleur du premier plan (blanc la nuit,
 * bleu nuit le jour, variable CSS --c-canvas-link) et la palette des neurones
 * s'adapte pour rester lisible sur fond clair.
 */
const COLORS_DARK = ['#f6a343', '#2db8bd', '#cd6035', '#8a74c9', '#ffffff']
const COLORS_LIGHT = ['#e58a22', '#1d8c90', '#cd6035', '#5d4696', '#19203a']
const LINK_DISTANCE = 150

export default function NeuralCanvas({ density = 1, className = '' }) {
  const canvasRef = useRef(null)
  const { isDark } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT
    // Couleur des synapses lue dans le thème (ex : « 255, 255, 255 »)
    const link = getComputedStyle(canvas).getPropertyValue('--c-canvas-link').trim() || '255, 255, 255'
    const linkBoost = isDark ? 1 : 0.7 // traits un peu plus discrets sur fond clair

    let width = 0
    let height = 0
    let nodes = []
    let pulses = []
    let frame = null
    let running = false
    const mouse = { x: -9999, y: -9999 }

    /** (Re)crée les nœuds en fonction de la taille du canvas */
    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.round(Math.min(110, (width * height) / 14000) * density)
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.4 + Math.random() * 2.4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }))
      pulses = []
    }

    /** Dessine une image de l'animation */
    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      // Déplacement des nœuds (rebond sur les bords)
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > width) n.vx *= -1
        if (n.y < 0 || n.y > height) n.vy *= -1
      }

      // Synapses entre nœuds proches
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < LINK_DISTANCE) {
            // Les liens proches du curseur s'illuminent
            const nearMouse = Math.hypot(a.x - mouse.x, a.y - mouse.y) < 160
            const alpha = (1 - dist / LINK_DISTANCE) * (nearMouse ? 0.6 : 0.22) * linkBoost
            ctx.strokeStyle = `rgba(${link},${alpha})`
            ctx.lineWidth = nearMouse ? 1.1 : 0.8
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()

            // Création aléatoire d'une impulsion sur ce lien
            if (!reduceMotion && pulses.length < 18 && Math.random() < 0.0009) {
              pulses.push({ a, b, t: 0, color: a.color })
            }
          }
        }
      }

      // Impulsions voyageant le long des synapses
      pulses = pulses.filter((p) => p.t <= 1)
      for (const p of pulses) {
        p.t += 0.018
        const x = p.a.x + (p.b.x - p.a.x) * p.t
        const y = p.a.y + (p.b.y - p.a.y) * p.t
        ctx.beginPath()
        ctx.fillStyle = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur = 12
        ctx.arc(x, y, 2.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Neurones
      for (const n of nodes) {
        ctx.beginPath()
        ctx.fillStyle = n.color
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const loop = () => {
      draw()
      frame = requestAnimationFrame(loop)
    }

    const start = () => {
      if (running || reduceMotion) return
      running = true
      frame = requestAnimationFrame(loop)
    }

    const stop = () => {
      running = false
      cancelAnimationFrame(frame)
    }

    setup()
    draw() // première image (également l'image fixe en mode « animations réduites »)

    // Pause automatique hors écran
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()))
    io.observe(canvas)

    const onVisibility = () => (document.hidden ? stop() : start())
    const onResize = () => {
      setup()
      draw()
    }
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onMove, { passive: true })

    return () => {
      stop()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [density, isDark])

  return <canvas ref={canvasRef} className={`neural-canvas ${className}`} aria-hidden="true" />
}
