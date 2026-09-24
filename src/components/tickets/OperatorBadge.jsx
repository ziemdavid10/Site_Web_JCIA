import { CONFIG } from '@/data/config'
import './OperatorBadge.scss'

/**
 * <OperatorBadge /> — pastille typographique d'un opérateur Mobile Money
 * (MTN Mobile Money, Orange Money), aux couleurs de l'opérateur.
 * Volontairement textuelle : remplacer par les logos officiels fournis par
 * les opérateurs / l'agrégateur une fois le contrat de paiement signé.
 *
 * @param {'mtn'|'orange'} id
 * @param {'sm'|'md'} size
 */
export default function OperatorBadge({ id, size = 'md', className = '' }) {
  const op = CONFIG.payment.operators.find((o) => o.id === id)
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
