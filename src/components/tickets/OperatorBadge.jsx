import { CONFIG } from '@/data/config'
import './OperatorBadge.scss'

/**
 * <OperatorBadge /> — pastille typographique d'un moyen de paiement :
 * opérateur Mobile Money (MTN, Orange) ou réseau de carte (Visa, Mastercard),
 * à ses couleurs.
 * Volontairement textuelle : remplacer par les logos officiels fournis par les
 * opérateurs, les réseaux de cartes ou l'agrégateur une fois le contrat de
 * paiement signé (les kits de marque imposent des règles d'usage précises).
 *
 * @param {'mtn'|'orange'|'visa'|'mastercard'} id
 * @param {'sm'|'md'} size
 */
export default function OperatorBadge({ id, size = 'md', className = '' }) {
  const { operators, cards } = CONFIG.payment
  const op = [...operators, ...cards].find((o) => o.id === id)
  if (!op) return null
  return (
    <span
      className={`operator-badge operator-badge--${size} ${className}`.trim()}
      style={{ '--op-bg': op.color, '--op-text': op.text }}
    >
      <span className="operator-badge__mark" aria-hidden="true">
        {op.short}
      </span>
      <span className="operator-badge__name">{op.name}</span>
    </span>
  )
}
