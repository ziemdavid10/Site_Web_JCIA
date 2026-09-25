import { useId } from 'react'
import useMediaQuery from '@/hooks/useMediaQuery'
import './NdopBand.scss'

/**
 * <NdopBand /> — bande tissée « Ndop », en lisière de section.
 *
 * Le Ndop est le pagne indigo des Grassfields de l'Ouest-Cameroun : fond bleu
 * profond, motifs réservés en blanc (losanges concentriques, noix de kola,
 * chevrons, peignes), registres séparés par des lignes parallèles.
 * Les motifs ci-dessous sont des dessins originaux inspirés de ce répertoire
 * traditionnel, redessinés aux couleurs des JCIA — aucun tissu existant n'est copié.
 *
 * 100 % SVG : net à toutes les tailles, aucune image à télécharger.
 *
 * @param {number} height    Hauteur de la bande (px) sur tablette et desktop
 * @param {number} heightSm  Hauteur sur téléphone (par défaut : 62 % de `height`)
 * @param {boolean} accents  Ajoute les filets orange / turquoise / latérite
 * @param {'top'|'bottom'|'both'|'none'} rule  Filets de bordure
 */
export default function NdopBand({ height: tall = 56, heightSm, accents = true, rule = 'both', className = '' }) {
  // Sur téléphone, la lisière est plus fine : le motif est réduit, jamais rogné
  const isPhone = useMediaQuery('(max-width: 767.98px)')
  const height = isPhone ? (heightSm ?? Math.round(tall * 0.62)) : tall
  const uid = useId().replace(/:/g, '')
  const id = `ndop-band-${uid}`
  const unit = 168 // largeur d'un motif complet (à hauteur 56)
  const k = height / 56 // le motif garde ses proportions, quelle que soit la hauteur

  return (
    <div className={`ndop-band ${className}`.trim()} style={{ height }} aria-hidden="true">
      {/* Le motif est répété (et non étiré) : proportions conservées sur toutes les largeurs */}
      <svg width="100%" height={height}>
        <defs>
          <pattern
            id={id}
            width={unit * k}
            height={height}
            patternUnits="userSpaceOnUse"
            viewBox="0 0 168 56"
            preserveAspectRatio="none"
          >
            {/* Fond indigo du pagne */}
            <rect width="168" height="56" fill="var(--ndop-ground, #141c38)" />
            <g fill="none" stroke="var(--ndop-motif, #f4ead9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              {/* Registres : lignes parallèles */}
              <path d="M0 7h168M0 49h168" strokeWidth="1.2" opacity="0.7" />
              {/* Losange concentrique */}
              <path d="M28 13 43 28 28 43 13 28Z" />
              <path d="M28 21 35 28 28 35 21 28Z" fill="var(--ndop-motif, #f4ead9)" stroke="none" />
              {/* Noix de kola */}
              <circle cx="72" cy="28" r="12" />
              <circle cx="72" cy="28" r="4" fill="var(--ndop-motif, #f4ead9)" stroke="none" />
              {/* Peigne */}
              <path d="M96 17h26M96 17v22M104 17v22M112 17v22M120 17v22" strokeWidth="1.3" />
              {/* Chevrons */}
              <path d="M132 39l9-10 9 10 9-10 9 10" />
              {/* Points de liaison */}
              <g fill="var(--ndop-motif, #f4ead9)" stroke="none">
                <circle cx="54" cy="28" r="2" />
                <circle cx="90" cy="28" r="2" />
                <circle cx="128" cy="28" r="2" />
                <circle cx="166" cy="28" r="2" />
              </g>
            </g>
          </pattern>
        </defs>
        <rect width="100%" height={height} fill={`url(#${id})`} />
        {/* Filets de couleur de la charte, en lisière */}
        {accents && (rule === 'top' || rule === 'both') && (
          <g>
            <rect width="100%" height={3} fill="#f6a343" />
            <rect y={3} width="100%" height={1.5} fill="#2db8bd" opacity="0.9" />
          </g>
        )}
        {accents && (rule === 'bottom' || rule === 'both') && (
          <g>
            <rect y={height - 3.5} width="100%" height={3.5} fill="#cd6035" />
            <rect y={height - 5} width="100%" height={1.5} fill="#5d4696" opacity="0.9" />
          </g>
        )}
      </svg>
    </div>
  )
}
