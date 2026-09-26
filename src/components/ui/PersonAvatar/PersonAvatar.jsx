import { useId } from 'react'
import initials from './initials'

const COLORS = { orange: '#f6a343', teal: '#2db8bd', rust: '#cd6035', purple: '#5d4696' }

/**
 * <PersonAvatar /> — portrait d'une personne (intervenant, participant).
 *
 * Avec une photo : l'image, recadrée au carré. Sans photo : un avatar dessiné
 * en SVG — dégradé aux couleurs de la catégorie, motif Ndop et initiales. Rien
 * n'est téléchargé et le rendu reste net à toutes les tailles.
 *
 * @param {string} name   Nom affiché (sert aux initiales et au texte alternatif)
 * @param {string} photo  Image importée, ou null
 * @param {'orange'|'teal'|'rust'|'purple'} color  Couleur d'accent
 */
export default function PersonAvatar({ name, photo, color = 'orange', className = '' }) {
  const uid = useId().replace(/:/g, '')
  if (photo) {
    return <img className={className} src={photo} alt={name} loading="lazy" width="400" height="400" />
  }
  const c = COLORS[color] ?? COLORS.orange
  return (
    <svg className={className} viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label={name}>
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#19203a" />
          <stop offset="1" stopColor={c} />
        </linearGradient>
        {/* Motif Ndop : losange concentrique et noix de kola (dessin original) */}
        <pattern id={`p${uid}`} width="80" height="80" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#fff" strokeOpacity="0.13" strokeWidth="2">
            <path d="M20 4 36 20 20 36 4 20Z" />
            <path d="M20 12 28 20 20 28 12 20Z" strokeWidth="1.4" />
            <circle cx="60" cy="60" r="13" />
            <circle cx="60" cy="60" r="4" fill="#fff" fillOpacity="0.13" stroke="none" />
            <path d="M48 20h24M48 14v12M56 14v12M64 14v12M72 14v12" strokeWidth="1.2" />
            <path d="M6 52l7 8 7-8 7 8 7-8" strokeWidth="1.4" />
          </g>
        </pattern>
      </defs>
      <rect width="400" height="400" fill={`url(#g${uid})`} />
      <rect width="400" height="400" fill={`url(#p${uid})`} />
      {/* Silhouette discrète */}
      <circle cx="200" cy="165" r="70" fill="#fff" fillOpacity="0.14" />
      <path d="M70 400c10-90 62-140 130-140s120 50 130 140z" fill="#fff" fillOpacity="0.14" />
      <text x="200" y="232" textAnchor="middle" fontFamily="'Sora Variable', Sora, sans-serif" fontWeight="700" fontSize="120" fill="#fff">
        {initials(name)}
      </text>
    </svg>
  )
}
