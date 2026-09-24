import { useId } from 'react'

const COLORS = { orange: '#f6a343', teal: '#2db8bd', rust: '#cd6035', purple: '#5d4696' }

/** Initiales d'un nom, sans les titres (Pr, Dr, S.E., M., Mme) */
function initials(name) {
  return name
    .replace(/^(Pr|Dr|S\.E\.|M\.|Mme)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/**
 * <SpeakerAvatar /> — photo de l'intervenant, ou, à défaut, un avatar dessiné
 * en SVG : dégradé aux couleurs de la catégorie, motif de losanges et initiales.
 *
 * @param {object} speaker   { name, photo }
 * @param {'orange'|'teal'|'rust'|'purple'} color  Couleur de la catégorie
 */
export default function SpeakerAvatar({ speaker, color = 'orange', className = '' }) {
  const uid = useId().replace(/:/g, '')
  if (speaker.photo) {
    return <img className={`speaker-avatar ${className}`} src={speaker.photo} alt={speaker.name} loading="lazy" width="400" height="400" />
  }
  const c = COLORS[color] ?? COLORS.orange
  return (
    <svg className={`speaker-avatar ${className}`} viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label={speaker.name}>
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#19203a" />
          <stop offset="1" stopColor={c} />
        </linearGradient>
        <pattern id={`p${uid}`} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M20 4 L36 20 L20 36 L4 20 Z" fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="400" height="400" fill={`url(#g${uid})`} />
      <rect width="400" height="400" fill={`url(#p${uid})`} />
      {/* Silhouette discrète */}
      <circle cx="200" cy="165" r="70" fill="#fff" fillOpacity="0.14" />
      <path d="M70 400c10-90 62-140 130-140s120 50 130 140z" fill="#fff" fillOpacity="0.14" />
      <text x="200" y="232" textAnchor="middle" fontFamily="'Sora Variable', Sora, sans-serif" fontWeight="700" fontSize="120" fill="#fff">
        {initials(speaker.name)}
      </text>
    </svg>
  )
}
