import { useId } from 'react'
import './Frise.scss'

/**
 * <Frise /> — bande décorative de losanges imbriqués.
 * Inspirée des bordures tissées d'Afrique centrale (tissu Ndop des Grassfields,
 * broderies du Toghu), redessinée avec les couleurs de la charte JCIA.
 * 100 % vectorielle (SVG <pattern>) : nette à toutes les tailles et très légère.
 *
 * @param {'brand'|'flag'|'mono'} palette  Jeu de couleurs
 * @param {number} height                  Hauteur de la bande en px
 */
const PALETTES = {
  brand: ['#f6a343', '#2db8bd', '#cd6035', '#5d4696'],
  flag: ['#0f8a3c', '#c8102e', '#fcd116', '#c8102e'],
  mono: ['#f6a343', '#f6a343', '#f6a343', '#f6a343'],
}

export default function Frise({ palette = 'brand', height = 28, background = '#19203a', className = '' }) {
  // useId garantit un identifiant de pattern unique si plusieurs frises coexistent
  const uid = useId().replace(/:/g, '')
  const colors = PALETTES[palette] ?? PALETTES.brand
  const unit = 28 // largeur d'un losange

  return (
    <div className={`frise ${className}`} style={{ height }} aria-hidden="true">
      <svg width="100%" height={height} preserveAspectRatio="none">
        <defs>
          <pattern id={`frise-${uid}`} width={unit * 4} height={height} patternUnits="userSpaceOnUse">
            <rect width={unit * 4} height={height} fill={background} />
            {colors.map((c, i) => {
              const cx = unit * i + unit / 2
              const cy = height / 2
              const r = height / 2 - 2
              return (
                <g key={i}>
                  {/* Losange extérieur (contour) */}
                  <path
                    d={`M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z`}
                    fill="none"
                    stroke={c}
                    strokeWidth="2.5"
                  />
                  {/* Losange intérieur (plein) */}
                  <path
                    d={`M${cx} ${cy - r / 2.4} L${cx + r / 2.4} ${cy} L${cx} ${cy + r / 2.4} L${cx - r / 2.4} ${cy} Z`}
                    fill={c}
                  />
                  {/* Triangles de liaison (haut / bas) entre deux losanges */}
                  <path d={`M${cx + unit / 2 - 4} 0 L${cx + unit / 2} 5 L${cx + unit / 2 + 4} 0 Z`} fill={c} />
                  <path
                    d={`M${cx + unit / 2 - 4} ${height} L${cx + unit / 2} ${height - 5} L${cx + unit / 2 + 4} ${height} Z`}
                    fill={c}
                  />
                </g>
              )
            })}
            {/* Demi-triangles au bord gauche pour un raccord parfait entre deux tuiles */}
            <path d={`M-4 0 L0 5 L4 0 Z`} fill={colors[colors.length - 1]} />
            <path d={`M-4 ${height} L0 ${height - 5} L4 ${height} Z`} fill={colors[colors.length - 1]} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#frise-${uid})`} />
      </svg>
    </div>
  )
}
