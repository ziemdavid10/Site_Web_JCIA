import { Button, Icon, NdopBand, PatternBg, Reveal, SectionHeader } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'
import './Community.scss'

/**
 * <Community /> — Cameroon AI Network : la communauté de l'écosystème.
 *
 * Un seul appel à l'action : « Rejoindre la communauté », qui ouvre le forum
 * WhatsApp officiel (CONFIG.links.community) dans un nouvel onglet, avec
 * rel="noopener noreferrer" — aucune donnée n'est transmise au passage.
 */
export default function Community() {
  const { t } = useI18n()
  const c = t.community

  return (
    <section className="section community" id="communaute" aria-labelledby="community-title">
      <PatternBg variant="ndop-royal" color="currentColor" opacity={0.05} fade="radial" scale={0.9} />

      <div className="container community__inner">
        <SectionHeader id="community-title" align="center" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />

        <ul className="community__perks">
          {c.perks.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 90}>
              <span className="community__perk-icon" aria-hidden="true">
                <Icon name={p.icon} size={22} />
              </span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </Reveal>
          ))}
        </ul>

        <Reveal className="community__cta" delay={120}>
          <span className="community__cta-badge" aria-hidden="true">
            <Icon name="chat" size={26} />
          </span>
          <div>
            <h3>{c.cta.title}</h3>
            <p>{c.cta.text}</p>
          </div>
          <Button href={CONFIG.links.community} external size="lg" iconLeft="chat" className="community__join">
            {c.cta.button}
          </Button>
          <p className="community__note">{c.cta.note}</p>
        </Reveal>
      </div>

      <NdopBand height={14} heightSm={10} className="community__band" />
    </section>
  )
}
