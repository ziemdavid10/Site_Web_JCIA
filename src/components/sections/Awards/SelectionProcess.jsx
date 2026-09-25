import { Reveal } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import useInView from '@/hooks/useInView'

/**
 * <SelectionProcess /> — étapes de sélection, répartition jury / public
 * (anneau SVG 60/40) et grille d'évaluation (barres animées).
 */
export default function SelectionProcess() {
  const { t } = useI18n()
  const aw = t.awards
  const [ref, inView] = useInView({ threshold: 0.2 })

  // Anneau : circonférence d'un cercle de rayon 52
  const C = 2 * Math.PI * 52
  const jury = 0.6

  return (
    <div className="selection" ref={ref}>
      {/* Étapes */}
      <div>
        <Reveal as="h3" className="awards__subtitle">
          {aw.processTitle}
        </Reveal>
        <ol className="selection__steps">
          {aw.steps.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 90}>
              <span className="selection__step-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h4>{s.title}</h4>
                <p>{s.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>

      {/* Pondération + critères */}
      <div className={`selection__scoring ${inView ? 'is-animated' : ''}`}>
        <div className="score-ring">
          <svg viewBox="0 0 120 120" role="img" aria-label={aw.ring.aria}>
            <circle cx="60" cy="60" r="52" fill="none" stroke="#2db8bd" strokeWidth="14" />
            <circle
              className="score-ring__jury"
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#f6a343"
              strokeWidth="14"
              strokeDasharray={`${C * jury} ${C}`}
              style={{ '--circ': C }}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="score-ring__legend">
            <p>
              <i className="is-orange" /> <strong>60 %</strong> {aw.ring.jury}
            </p>
            <p>
              <i className="is-teal" /> <strong>40 %</strong> {aw.ring.public}
            </p>
            <p className="score-ring__jury-note">{aw.ring.note}</p>
          </div>
        </div>

        <h4 className="selection__criteria-title">{aw.criteriaTitle}</h4>
        <ul className="criteria">
          {aw.criteria.map((c, i) => (
            <li key={c.label}>
              <div className="criteria__row">
                <span>{c.label}</span>
                <strong>{c.weight} %</strong>
              </div>
              <div className="criteria__bar">
                <span style={{ '--w': `${(c.weight / 25) * 100}%`, '--d': `${i * 90}ms` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
