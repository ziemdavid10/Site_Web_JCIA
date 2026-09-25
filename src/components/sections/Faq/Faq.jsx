import { Accordion, Button, MoreLink, Reveal, SectionHeader } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { useTheme } from '@/theme/context'
import { CONFIG } from '@/data/config'
import mascot from '@/assets/images/brand/mascot.webp'
import mascotWhite from '@/assets/images/brand/mascot-white.webp'
import './Faq.scss'

/**
 * <Faq /> — questions fréquentes, animées par la mascotte des JCIA.
 * L'accueil n'affiche que les questions marquées « top » ; la page /faq les présente toutes.
 */
export default function Faq() {
  const { t } = useI18n()
  const { isDark } = useTheme()
  const faq = t.faq
  const topItems = t.pages.faq.items.filter((item) => item.top)
  const email = CONFIG.contact.emails[0]

  return (
    <section className="section section--sand faq" id="faq" aria-labelledby="faq-title">
      <div className="container faq__grid">
        <div className="faq__aside">
          <SectionHeader id="faq-title" eyebrow={faq.eyebrow} title={faq.title} lead={faq.lead} />
          <Reveal className="faq__mascot">
            <img src={isDark ? mascotWhite : mascot} alt={faq.mascotAlt} width="150" height="198" loading="lazy" />
            <div className="faq__bubble">
              <p>{faq.help}</p>
              <Button href={`mailto:${email}`} size="sm" variant="secondary" iconLeft="mail">
                {email}
              </Button>
            </div>
          </Reveal>
        </div>

        <div>
          <Accordion items={topItems} className="faq__list" />
          <MoreLink route="faq" label={faq.more} />
        </div>
      </div>
    </section>
  )
}
