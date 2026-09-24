import { useId } from 'react'
import './PatternBg.scss'

/**
 * <PatternBg /> — texture de fond vectorielle, positionnée en absolu
 * dans son parent (qui doit être en position: relative).
 *
 * Variantes :
 *  • 'ndop'    → motifs du tissu Ndop (Grassfields de l'Ouest-Cameroun) :
 *                lunes, croisements, lézards en zigzag, damiers.
 *  • 'circuit' → pistes et nœuds de circuit, écho direct aux lignes
 *                pointées qui dessinent la carte du Cameroun dans le logo.
 *  • 'dots'    → trame de points discrète.
 *
 * La couleur est pilotée par `color` et l'intensité par `opacity`.
 */
export default function PatternBg({ variant = 'ndop', color = '#19203a', opacity = 0.06, className = '', fade }) {
  const uid = useId().replace(/:/g, '')
  const id = `pat-${variant}-${uid}`

  return (
    <div
      className={`pattern-bg ${fade ? `pattern-bg--fade-${fade}` : ''} ${className}`.trim()}
      style={{ opacity }}
      aria-hidden="true"
    >
      <svg width="100%" height="100%">
        <defs>
          {variant === 'ndop' && (
            <pattern id={id} width="120" height="120" patternUnits="userSpaceOnUse">
              <g fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
                {/* Lune / soleil : cercle et point central */}
                <circle cx="30" cy="30" r="14" />
                <circle cx="30" cy="30" r="3.5" fill={color} />
                {/* Croisement des chemins (carrefour) */}
                <path d="M90 16v28M76 30h28" />
                <path d="M81 21l18 18M99 21L81 39" strokeWidth="1.2" />
                {/* Lézard stylisé : zigzag */}
                <path d="M16 90l8-10 8 10 8-10 8 10" />
                {/* Damier */}
                <rect x="78" y="78" width="10" height="10" fill={color} stroke="none" />
                <rect x="92" y="92" width="10" height="10" fill={color} stroke="none" />
                <rect x="78" y="92" width="10" height="10" />
                <rect x="92" y="78" width="10" height="10" />
                {/* Points de liaison */}
                <circle cx="60" cy="60" r="2.4" fill={color} stroke="none" />
                <circle cx="0" cy="60" r="2.4" fill={color} stroke="none" />
                <circle cx="60" cy="0" r="2.4" fill={color} stroke="none" />
              </g>
            </pattern>
          )}

          {variant === 'circuit' && (
            <pattern id={id} width="160" height="160" patternUnits="userSpaceOnUse">
              <g fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M0 40h40l20 20h40" />
                <path d="M160 100h-30l-20-20H90" />
                <path d="M40 160v-40l20-20" />
                <path d="M120 0v30l-15 15" />
                <path d="M10 120h20" />
              </g>
              <g fill={color}>
                <circle cx="100" cy="60" r="4" />
                <circle cx="90" cy="80" r="4" />
                <circle cx="60" cy="100" r="4" />
                <circle cx="105" cy="45" r="3.5" />
                <circle cx="10" cy="120" r="3" />
                <circle cx="30" cy="120" r="3" />
              </g>
            </pattern>
          )}

          {variant === 'dots' && (
            <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.6" fill={color} />
            </pattern>
          )}
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  )
}
