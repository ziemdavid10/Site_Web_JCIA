import { useState } from 'react'
import { PARTNER_LOGOS, PARTNER_LOGO_DIR } from '@/data/partners'
import './PartnerLogo.scss'

// Petits mots ignorés pour fabriquer un monogramme
const STOP = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'pour', 'et', 'l', 'd', 'of', 'the', 'for', 'and', '&', '+'])

/** Monogramme : sigle existant (« CRTV ») ou initiales des mots importants (« AUF »). */
function monogram(name) {
  const compact = name.replace(/[^\p{L}\p{N}]/gu, '')
  if (name.length <= 5 && compact === compact.toUpperCase()) return compact.slice(0, 4)
  const words = name
    .split(/[\s’'-]+/)
    .filter((w) => w && !STOP.has(w.toLowerCase()))
  const letters = words.map((w) => (/^\d/.test(w) ? w : w[0])).join('')
  return letters.toUpperCase().slice(0, 3)
}

/**
 * <PartnerLogo /> — logo d'un partenaire ou d'un média, toujours accompagné de son nom.
 *
 *  • Si un fichier logo est déclaré dans src/data/partners.js, il est affiché
 *    (sur une pastille blanche, lisible dans les deux thèmes).
 *  • Sinon, ou si le fichier est introuvable, un monogramme aux couleurs des JCIA
 *    le remplace — jamais une imitation du logo réel.
 *
 * @param {string} id     Clé du partenaire (src/data/partners.js)
 * @param {string} name   Nom traduit
 * @param {'partner'|'media'} kind
 * @param {number} index  Position (fait tourner les couleurs des monogrammes)
 */
export default function PartnerLogo({ id, name, kind = 'partner', index = 0 }) {
  const file = PARTNER_LOGOS[id]
  const [failed, setFailed] = useState(false)
  const showImage = file && !failed

  return (
    <figure className={`partner-logo partner-logo--${kind} partner-logo--c${index % 4}`}>
      <span className="partner-logo__mark">
        {showImage ? (
          <img src={`${PARTNER_LOGO_DIR}${file}`} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
        ) : (
          <span className="partner-logo__monogram" aria-hidden="true">
            {monogram(name)}
          </span>
        )}
      </span>
      <figcaption className="partner-logo__name">{name}</figcaption>
    </figure>
  )
}
