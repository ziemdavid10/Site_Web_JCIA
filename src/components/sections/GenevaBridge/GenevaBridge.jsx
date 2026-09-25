import { PatternBg, Reveal, SectionHeader } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import './GenevaBridge.scss'

/**
 * <GenevaBridge /> — positionnement « side event » du AI for Good Global Summit.
 * Visuel : un arc de données animé reliant Yaoundé à Genève.
 */
export default function GenevaBridge() {
  const { t } = useI18n()
  const g = t.geneva

  return (
    <section className="section section--dark geneva" aria-labelledby="geneva-title">
      <PatternBg variant="dots" color="currentColor" opacity={0.06} fade="radial" />

      <div className="container geneva__grid">
        <div>
          <SectionHeader id="geneva-title" dark eyebrow={g.eyebrow} title={g.title} lead={g.lead} />

          {/* Arc Yaoundé → Genève */}
          <Reveal className="geneva__route" aria-hidden="true">
            <svg viewBox="0 0 400 190" fill="none">
              <defs>
                <linearGradient id="route-grad" x1="0" x2="1">
                  <stop offset="0" stopColor="#f6a343" />
                  <stop offset="0.5" stopColor="#cd6035" />
                  <stop offset="1" stopColor="#2db8bd" />
                </linearGradient>
              </defs>
              <path d="M40 160 Q200 -30 360 60" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
              <path className="geneva__arc" d="M40 160 Q200 -30 360 60" stroke="url(#route-grad)" strokeWidth="3" strokeLinecap="round" />
              <circle cx="40" cy="160" r="9" fill="#f6a343" />
              <circle cx="40" cy="160" r="18" stroke="#f6a343" strokeOpacity=".4" />
              <circle cx="360" cy="60" r="9" fill="#2db8bd" />
              <circle cx="360" cy="60" r="18" stroke="#2db8bd" strokeOpacity=".4" />
            </svg>
            <span className="geneva__city geneva__city--from">
              <strong>{g.from.city}</strong>
              {g.from.date}
            </span>
            <span className="geneva__city geneva__city--to">
              <strong>{g.to.city}</strong>
              {g.to.date}
            </span>
          </Reveal>
        </div>

        <ol className="geneva__goals">
          {g.goals.map((goal, i) => (
            <Reveal as="li" key={goal.title} delay={i * 80}>
              <span className="geneva__goal-num">{i + 1}</span>
              <div>
                <h3>{goal.title}</h3>
                <p>{goal.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
