import { Icon, Reveal } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'

/**
 * <Eligibility /> — qui peut candidater, quels projets, quelles pièces,
 * et ce que gagnent les lauréats.
 */
export default function Eligibility() {
  const { t } = useI18n()
  const aw = t.awards

  return (
    <div className="eligibility">
      <div className="eligibility__cols">
        {aw.eligibility.map((col, i) => (
          <Reveal key={col.title} delay={i * 90} className="eligibility__col">
            <h4>
              <Icon name={col.icon} size={20} />
              {col.title}
            </h4>
            <ul>
              {col.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
      <Reveal as="p" className="eligibility__note">
        {rich(aw.eligibilityNote)}
      </Reveal>

      {/* Avantages des lauréats */}
      <Reveal className="benefits">
        <h3 className="awards__subtitle">{aw.benefitsTitle}</h3>
        <ul>
          {aw.benefits.map((b) => (
            <li key={b}>
              <Icon name="check" size={18} />
              {b}
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  )
}
