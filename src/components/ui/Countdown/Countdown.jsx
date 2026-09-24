import useCountdown from '@/hooks/useCountdown'
import { useI18n } from '@/i18n/context'
import './Countdown.scss'

/**
 * <Countdown /> — compte à rebours jusqu'à une date.
 * @param {string} target     Date ISO cible
 * @param {string} label      Texte d'accompagnement (affiché et lu par les lecteurs d'écran)
 * @param {'dark'|'light'} theme
 * @param {'lg'|'sm'} size
 */
const pad = (n) => String(n).padStart(2, '0')

export default function Countdown({ target, label, theme = 'dark', size = 'lg' }) {
  const { days, hours, minutes, seconds, isOver } = useCountdown(target)
  const { t } = useI18n()

  if (isOver) {
    return <p className={`countdown countdown--${theme} countdown--ended`}>{t.countdown.ended}</p>
  }

  const { units } = t.countdown
  const values = [
    { value: days, label: units.days },
    { value: pad(hours), label: units.hours },
    { value: pad(minutes), label: units.minutes },
    { value: pad(seconds), label: units.seconds },
  ]
  const a = t.a11y.timerUnits

  return (
    <div
      className={`countdown countdown--${theme} countdown--${size}`}
      role="timer"
      aria-label={`${label ?? t.a11y.timer} : ${days} ${a.days}, ${hours} ${a.hours}, ${minutes} ${a.minutes}`}
    >
      {label && <p className="countdown__label">{label}</p>}
      <div className="countdown__units" aria-hidden="true">
        {values.map((u) => (
          <div className="countdown__unit" key={u.label}>
            <span className="countdown__value">{u.value}</span>
            <span className="countdown__name">{u.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
