import { useParams } from 'react-router'
import { Button, CallButton, Frise, NeuralCanvas, SectionLink, ThemeImg } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import mascot from '@/assets/images/brand/mascot.webp'
import mascotWhite from '@/assets/images/brand/mascot-white.webp'
import './ErrorPage.scss'

/**
 * <ErrorPage /> — page d'erreur générique (400, 401, 403, 404, 408, 429, 500, 502, 503).
 *
 * Le code provient :
 *  • de la prop `code` (ErrorBoundary → 500, route inconnue → 404) ;
 *  • ou de l'URL /erreur/:code (utilisée par l'hébergeur, voir public/.htaccess,
 *    public/_redirects et vercel.json).
 *
 * Mise en scène : les « 0 » du code deviennent le soleil orange du logo,
 * la mascotte flotte, perplexe, au-dessus du réseau de neurones.
 */
export default function ErrorPage({ code: codeProp, embedded = false }) {
  const { t } = useI18n()
  const params = useParams()
  const e = t.errors

  // Code demandé, ramené à 404 s'il n'est pas géré
  const requested = Number(codeProp ?? params.code ?? 404)
  const code = CONFIG.errorCodes.includes(requested) ? requested : 404
  const info = e.codes[code]

  useDocumentMeta(`${code} — ${info.title} | ${t.event.shortName}`, { noindex: true })

  return (
    <section className={`error-page ${embedded ? 'error-page--embedded' : ''}`} aria-labelledby="error-title">
      <NeuralCanvas density={0.6} />
      <div className="error-page__glow" aria-hidden="true" />

      <div className="container error-page__inner">
        <div className="error-page__visual" aria-hidden="true">
          {/* Chiffres du code ; chaque « 0 » est remplacé par le soleil JCIA */}
          <p className="error-page__code">
            {String(code)
              .split('')
              .map((digit, i) =>
                digit === '0' ? <span key={i} className="error-page__sun" /> : <span key={i}>{digit}</span>,
              )}
          </p>
          <ThemeImg className="error-page__mascot" light={mascot} dark={mascotWhite} width="150" height="198" />
        </div>

        <div className="error-page__content">
          <p className="error-page__eyebrow">
            {e.eyebrow} {code}
          </p>
          <h1 id="error-title">{info.title}</h1>
          <p className="error-page__text">{info.text}</p>

          <div className="error-page__ctas">
            {info.retry && (
              <Button onClick={() => window.location.reload()} iconLeft="refresh" size="lg">
                {e.retry}
              </Button>
            )}
            {/* Lien « dur » pour repartir d'un état propre après une erreur */}
            <Button href="/" variant={info.retry ? 'ghost' : 'primary'} icon="arrow-right" size="lg">
              {e.home}
            </Button>
            <Button href={`mailto:${CONFIG.contact.emails[0]}?subject=${encodeURIComponent(`${e.eyebrow} ${code}`)}`} variant="ghost" iconLeft="mail" size="lg">
              {e.contact}
            </Button>
            <CallButton variant="ghost" size="lg" />
          </div>

          <nav className="error-page__suggestions" aria-label={e.suggestionsTitle}>
            <p>{e.suggestionsTitle}</p>
            <ul>
              {e.suggestions.map((s) => (
                <li key={s.id}>
                  <SectionLink id={s.id}>{s.label}</SectionLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <Frise className="error-page__frise" height={20} />
    </section>
  )
}
