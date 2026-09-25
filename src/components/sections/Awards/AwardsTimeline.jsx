import { Reveal } from '@/components/ui'
import { useI18n } from '@/i18n/context'

/**
 * <AwardsTimeline /> — chronogramme de l'appel à candidatures.
 * Chaque étape est marquée « passée », « prochaine » ou « à venir »
 * automatiquement selon la date du jour.
 */
export default function AwardsTimeline() {
  const { t } = useI18n()
  const { timeline, timelineTitle, nextStep } = t.awards
  const today = new Date().toISOString().slice(0, 10)
  const nextIndex = timeline.findIndex((step) => step.iso >= today)

  return (
    <div className="awards-timeline">
      <Reveal as="h3" className="awards__subtitle">
        {timelineTitle}
      </Reveal>
      <Reveal as="ol" className="awards-timeline__list">
        {timeline.map((step, i) => {
          const status = nextIndex === -1 || i < nextIndex ? 'past' : i === nextIndex ? 'next' : 'upcoming'
          return (
            <li key={step.iso} className={`awards-timeline__item is-${status} ${step.key ? 'is-key' : ''}`}>
              <span className="awards-timeline__dot" aria-hidden="true" />
              <time dateTime={step.iso}>{step.date}</time>
              <p>{step.label}</p>
              {status === 'next' && <span className="awards-timeline__badge">{nextStep}</span>}
            </li>
          )
        })}
      </Reveal>
    </div>
  )
}
