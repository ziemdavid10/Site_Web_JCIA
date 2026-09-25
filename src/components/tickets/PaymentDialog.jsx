import { useEffect, useRef } from 'react'
import { Button, Icon } from '@/components/ui'
import OperatorBadge from './OperatorBadge'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { fill } from '@/i18n/format'
import './PaymentDialog.scss'

const STEPS = ['initiating', 'awaiting', 'confirming']

/**
 * <PaymentDialog /> — fenêtre modale de suivi d'un paiement Mobile Money.
 *
 * Affiche les trois étapes (demande envoyée → validation sur le téléphone →
 * confirmation), les consignes propres à l'opérateur (code USSD de secours) et,
 * en cas d'échec, les actions « Réessayer » / « Modifier ma commande ».
 *
 * @param {'running'|'failed'} status
 * @param {'initiating'|'awaiting'|'confirming'} step
 * @param {string} amount    Montant formaté
 * @param {string} phone     Numéro formaté
 * @param {object} operator  Opérateur (CONFIG.payment.operators)
 * @param {boolean} demo     Paiement simulé
 */
export default function PaymentDialog({ status, step, amount, phone, operator, demo, onRetry, onClose }) {
  const { t } = useI18n()
  const p = t.tickets.payment
  const dialogRef = useRef(null)
  const failed = status === 'failed'
  const current = STEPS.indexOf(step)

  // Focus dans la fenêtre à l'ouverture ; défilement de la page verrouillé
  useEffect(() => {
    dialogRef.current?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Échap ferme la fenêtre uniquement après un échec (jamais pendant un paiement)
  useEffect(() => {
    if (!failed) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [failed, onClose])

  return (
    <div className="pay-dialog" role="presentation">
      <div
        ref={dialogRef}
        className={`pay-dialog__box ${failed ? 'is-failed' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-dialog-title"
        aria-describedby="pay-dialog-desc"
        tabIndex={-1}
      >
        {demo && <p className="pay-dialog__demo">{p.demoNote}</p>}

        <div className="pay-dialog__head">
          {operator && <OperatorBadge id={operator.id} />}
          <strong className="pay-dialog__amount">{amount}</strong>
        </div>

        {failed ? (
          <div className="pay-dialog__failed" role="alert">
            <span className="pay-dialog__failed-icon">
              <Icon name="alert" size={32} />
            </span>
            <h2 id="pay-dialog-title">{p.failedTitle}</h2>
            <p id="pay-dialog-desc">{p.failedText}</p>
            <div className="pay-dialog__actions">
              <Button onClick={onRetry} iconLeft="refresh">
                {p.retry}
              </Button>
              <Button onClick={onClose} variant="outline">
                {p.close}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h2 id="pay-dialog-title" className="pay-dialog__title">
              {p.title}
            </h2>

            {/* Étapes */}
            <ol className="pay-dialog__steps" aria-live="polite">
              {STEPS.map((s, i) => {
                const state = i < current ? 'done' : i === current ? 'active' : 'todo'
                return (
                  <li key={s} className={`is-${state}`} aria-current={state === 'active' ? 'step' : undefined}>
                    <span className="pay-dialog__dot" aria-hidden="true">
                      {state === 'done' ? <Icon name="check" size={14} /> : i + 1}
                    </span>
                    {p.steps[s]}
                  </li>
                )
              })}
            </ol>

            {/* Consignes pendant la validation sur le téléphone */}
            <div id="pay-dialog-desc" className={`pay-dialog__phone ${step === 'awaiting' ? 'is-awaiting' : ''}`}>
              <span className="pay-dialog__phone-icon" aria-hidden="true">
                <Icon name="smartphone" size={30} />
                <i />
              </span>
              <div>
                <p>{rich(fill(p.awaiting, { amount, phone, op: operator?.name ?? '' }))}</p>
                {operator && <p className="pay-dialog__ussd">{fill(p.noPrompt, { ussd: p.ussd[operator.id] })}</p>}
              </div>
            </div>

            <p className="pay-dialog__keep">
              <Icon name="lock" size={14} /> {p.keepOpen}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
