import { useId } from 'react'
import './PatternBg.scss'

/**
 * <PatternBg /> — texture de fond vectorielle, positionnée en absolu
 * dans son parent (qui doit être en position: relative).
 *
 * Variantes :
 *  • 'ndop'       → motifs du tissu Ndop (Grassfields de l'Ouest-Cameroun) :
 *                   lunes, croisements, lézards en zigzag, damiers.
 *  • 'ndop-royal' → composition Ndop dense et « royale » : losanges concentriques,
 *                   cercles à noyau (noix de kola), araignée (symbole de sagesse),
 *                   peignes et zigzags, séparés par des lignes parallèles.
 *  • 'ndop-bands' → bandes horizontales alternées (lisière de pagne) : chevrons,
 *                   damiers, points et losanges.
 *  • 'circuit'    → pistes et nœuds de circuit, écho direct aux lignes
 *                   pointées qui dessinent la carte du Cameroun dans le logo.
 *  • 'dots'       → trame de points discrète.
 *
 * Les motifs Ndop sont des dessins originaux inspirés du répertoire traditionnel
 * (domaine culturel des Grassfields), redessinés pour les JCIA : aucun tissu ni
 * aucune œuvre existante n'est reproduit.
 *
 * La couleur est pilotée par `color` et l'intensité par `opacity`.
 * 100 % vectoriel et en ligne : aucune image à télécharger, net sur tous les écrans.
 */
export default function PatternBg({ variant = 'ndop', color = '#19203a', opacity = 0.06, className = '', fade, scale = 1 }) {
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
            <pattern id={id} width={120 * scale} height={120 * scale} patternUnits="userSpaceOnUse" viewBox="0 0 120 120">
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

          {variant === 'ndop-royal' && (
            <pattern id={id} width={220 * scale} height={220 * scale} patternUnits="userSpaceOnUse" viewBox="0 0 220 220">
              <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {/* Losange concentrique (motif du roi), en haut à gauche */}
                <path d="M55 8 96 49 55 90 14 49Z" />
                <path d="M55 22 82 49 55 76 28 49Z" strokeWidth="1.4" />
                <path d="M55 36 68 49 55 62 42 49Z" fill={color} stroke="none" />
                {/* Noix de kola : cercles à noyau */}
                <circle cx="165" cy="49" r="30" />
                <circle cx="165" cy="49" r="18" strokeWidth="1.4" />
                <circle cx="165" cy="49" r="6" fill={color} stroke="none" />
                {/* Lignes parallèles séparant les registres */}
                <path d="M0 104h220M0 110h220" strokeWidth="1.2" />
                {/* Araignée mygale (sagesse) : croix à huit pattes */}
                <g transform="translate(55 165)">
                  <circle cx="0" cy="0" r="9" fill={color} stroke="none" />
                  <path d="M0-34V34M-34 0H34M-24-24 24 24M-24 24 24-24" strokeWidth="1.6" />
                  <path d="M0-34l-6 8M0-34l6 8M0 34l-6-8M0 34l6-8M-34 0l8-6M-34 0l8 6M34 0l-8-6M34 0l-8 6" strokeWidth="1.4" />
                </g>
                {/* Peigne et zigzag (lézard) */}
                <path d="M126 140h78M126 140v14M143 140v14M160 140v14M177 140v14M194 140v14" strokeWidth="1.6" />
                <path d="M126 176l13-13 13 13 13-13 13 13 13-13 13 13" />
                {/* Points d'angle : raccord des tuiles */}
                <g fill={color} stroke="none">
                  <circle cx="0" cy="0" r="3" />
                  <circle cx="220" cy="0" r="3" />
                  <circle cx="0" cy="220" r="3" />
                  <circle cx="220" cy="220" r="3" />
                  <circle cx="110" cy="110" r="3" />
                </g>
              </g>
            </pattern>
          )}

          {variant === 'ndop-bands' && (
            <pattern id={id} width={160 * scale} height={96 * scale} patternUnits="userSpaceOnUse" viewBox="0 0 160 96">
              <g fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {/* Bande 1 : chevrons */}
                <path d="M0 14 16 2 32 14 48 2 64 14 80 2 96 14 112 2 128 14 144 2 160 14" />
                {/* Lignes de séparation */}
                <path d="M0 24h160M0 29h160" strokeWidth="1.1" />
                {/* Bande 2 : damier ouvert */}
                <g strokeWidth="1.4">
                  <rect x="4" y="38" width="16" height="16" />
                  <rect x="36" y="38" width="16" height="16" />
                  <rect x="68" y="38" width="16" height="16" />
                  <rect x="100" y="38" width="16" height="16" />
                  <rect x="132" y="38" width="16" height="16" />
                </g>
                <g fill={color} stroke="none">
                  <rect x="20" y="38" width="16" height="16" opacity="0.55" />
                  <rect x="52" y="38" width="16" height="16" opacity="0.55" />
                  <rect x="84" y="38" width="16" height="16" opacity="0.55" />
                  <rect x="116" y="38" width="16" height="16" opacity="0.55" />
                  <rect x="148" y="38" width="12" height="16" opacity="0.55" />
                </g>
                <path d="M0 62h160M0 67h160" strokeWidth="1.1" />
                {/* Bande 3 : losanges et points */}
                <g>
                  <path d="M16 78 26 88 16 96 6 88Z" />
                  <path d="M56 78 66 88 56 96 46 88Z" />
                  <path d="M96 78 106 88 96 96 86 88Z" />
                  <path d="M136 78 146 88 136 96 126 88Z" />
                </g>
                <g fill={color} stroke="none">
                  <circle cx="36" cy="88" r="2.6" />
                  <circle cx="76" cy="88" r="2.6" />
                  <circle cx="116" cy="88" r="2.6" />
                  <circle cx="156" cy="88" r="2.6" />
                </g>
              </g>
            </pattern>
          )}

          {variant === 'circuit' && (
            <pattern id={id} width={160 * scale} height={160 * scale} patternUnits="userSpaceOnUse" viewBox="0 0 160 160">
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
            <pattern id={id} width={22 * scale} height={22 * scale} patternUnits="userSpaceOnUse" viewBox="0 0 22 22">
              <circle cx="2" cy="2" r="1.6" fill={color} />
            </pattern>
          )}
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  )
}
