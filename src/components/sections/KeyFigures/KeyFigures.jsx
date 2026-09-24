import { Reveal, SectionHeader } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import useInView from '@/hooks/useInView'
import useCountUp from '@/hooks/useCountUp'
import fanLeft from '@/assets/images/motifs/fan-bl.webp'
import fanRight from '@/assets/images/motifs/fan-tr.webp'
import './KeyFigures.scss'

/** Un chiffre clé animé (compteur déclenché à l'apparition). */
function Figure({ value, suffix, label, color, start, delay, format }) {
  const n = useCountUp(value, start, 1600 + delay)
  return (
    <li className={`figure figure--${color}`}>
      <span className="figure__value">
        {format(n)}
        <span className="figure__suffix">{suffix}</span>
      </span>
      <span className="figure__label">{label}</span>
    </li>
  )
}

/**
 * <KeyFigures /> — les objectifs chiffrés de l'édition 2027.
 * Décor : éventails rayonnants aux couleurs du drapeau camerounais.
 */
export default function KeyFigures() {
  const { t, locale } = useI18n()
  const [ref, inView] = useInView({ threshold: 0.3 })
  // Séparateur de milliers selon la langue (7 000 / 7,000)
  const format = new Intl.NumberFormat(locale).format
  const f = t.figures

  return (
    <section className="section section--dark key-figures" aria-labelledby="figures-title">
      <img className="key-figures__fan key-figures__fan--left" src={fanLeft} alt="" loading="lazy" aria-hidden="true" />
      <img className="key-figures__fan key-figures__fan--right" src={fanRight} alt="" loading="lazy" aria-hidden="true" />

      <div className="container">
        <SectionHeader id="figures-title" dark align="center" eyebrow={f.eyebrow} title={f.title} lead={f.lead} />

        <Reveal>
          <ul className="key-figures__grid" ref={ref}>
            {f.items.map((item, i) => (
              <Figure key={item.label} {...item} start={inView} delay={i * 60} format={format} />
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
