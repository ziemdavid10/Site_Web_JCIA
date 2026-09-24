import { Link } from 'react-router'
import { Button, PatternBg, Reveal } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { CONFIG } from '@/data/config'
import mascot from '@/assets/images/brand/mascot-white.webp'

/**
 * <CtaBand /> — bandeau d'appel à l'action en bas des pages détaillées :
 * réserver sa place (billetterie) ou consulter le programme.
 * Les libellés par défaut viennent de t.pages.ctaBand ; ils sont surchargeables.
 */
export default function CtaBand({ title, text, primary, secondary, secondaryTo }) {
  const { t } = useI18n()
  const c = t.pages.ctaBand
  const { routes } = CONFIG

  return (
    <section className="cta-band">
      <div className="container">
        <Reveal className="cta-band__card">
          <PatternBg variant="ndop" color="#ffffff" opacity={0.07} />
          <img className="cta-band__mascot" src={mascot} alt="" width="120" height="158" loading="lazy" aria-hidden="true" />
          <div className="cta-band__text">
            <h2>{rich(title || c.title)}</h2>
            <p>{rich(text || c.text)}</p>
          </div>
          <div className="cta-band__actions">
            <Button as={Link} to={routes.tickets} size="lg" icon="arrow-right">
              {primary || c.primary}
            </Button>
            <Button as={Link} to={secondaryTo || routes.programme} size="lg" variant="ghost">
              {secondary || c.secondary}
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
