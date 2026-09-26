import { MoreLink, PatternBg, PhotoStack, Reveal, SectionHeader } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import mascot from '@/assets/images/brand/mascot.webp'
import './About.scss'

/**
 * <About /> — Pourquoi les JCIA ? Les 4 défis et le parcours des éditions.
 */
export default function About() {
  const { t } = useI18n()
  const a = t.about

  return (
    <section className="section about" id="apropos" aria-labelledby="about-title">
      <PatternBg variant="ndop-royal" color="currentColor" opacity={0.04} fade="bottom" />

      <div className="container about__grid">
        <div>
          <SectionHeader id="about-title" eyebrow={a.eyebrow} title={a.title} lead={a.lead} />
          <Reveal as="p" className="about__text">
            {rich(a.text)}
          </Reveal>

          {/* Un paquet de photos des éditions précédentes, qui se relaient */}
          <Reveal className="about__photos" delay={120}>
            <PhotoStack ids={['ouverture-2025', 'grande-salle-2025', 'photo-famille-2025', 'pleniere-2023']} tilt="left" />
          </Reveal>
        </div>

        {/* Défis → réponses */}
        <ul className="about__challenges">
          {a.challenges.map((c, i) => (
            <Reveal as="li" key={c.challenge} delay={i * 90} className={`challenge challenge--${c.color}`}>
              <span className="challenge__num">0{i + 1}</span>
              <p className="challenge__label">{a.challengeLabel}</p>
              <h3 className="challenge__title">{c.challenge}</h3>
              <p className="challenge__answer">{c.answer}</p>
            </Reveal>
          ))}
        </ul>
      </div>

      {/* Parcours des éditions */}
      <div className="container">
        <Reveal as="h3" className="about__subtitle">
          {a.editionsTitle}
        </Reveal>
        <ol className="editions">
          {a.editions.map((e, i) => (
            <Reveal as="li" key={e.year} delay={i * 120} className={`edition ${e.current ? 'edition--current' : ''}`}>
              <span className="edition__year">{e.year}</span>
              <div className="edition__body">
                <h4>{e.title}</h4>
                <p className="edition__place">{e.place}</p>
                <ul>
                  {e.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
              {e.current && <img className="edition__mascot" src={mascot} alt="" width="70" height="92" loading="lazy" />}
            </Reveal>
          ))}
        </ol>
        <MoreLink route="about" />
      </div>
    </section>
  )
}
