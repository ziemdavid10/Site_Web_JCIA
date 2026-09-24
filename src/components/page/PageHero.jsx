import { Link } from 'react-router'
import { Frise, Icon, PatternBg, Reveal } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'

/**
 * <PageHero /> — bandeau d'en-tête des pages détaillées.
 *
 * Même « scène » que le hero de l'accueil (bleu nuit en thème sombre,
 * crème latérite en thème clair), en plus compact :
 *   fil d'Ariane → sur-titre → titre (h1) → chapeau → actions → chiffres clés.
 *
 * @param {string}   eyebrow
 * @param {string}   title     Titre ; *mot* est mis en valeur
 * @param {string}   lead
 * @param {string}   current   Libellé de la page dans le fil d'Ariane
 * @param {{label: string, to: string}[]} parents  Niveaux intermédiaires du fil d'Ariane
 * @param {{value: string, label: string}[]} stats Chiffres clés affichés sous le chapeau
 * @param {ReactNode} art      Visuel décoratif (facultatif) affiché à droite sur grand écran
 * @param {ReactNode} children Boutons d'action
 */
export default function PageHero({ eyebrow, title, lead, current, parents = [], stats, art, children }) {
  const { t } = useI18n()

  return (
    <header className={`page-hero ${art ? 'page-hero--art' : ''}`}>
      <PatternBg variant="circuit" color="currentColor" opacity={0.06} fade="radial" />
      <span className="page-hero__glow page-hero__glow--a" aria-hidden="true" />
      <span className="page-hero__glow page-hero__glow--b" aria-hidden="true" />

      <div className="container page-hero__inner">
        <div className="page-hero__content">
          {/* Fil d'Ariane */}
          <nav className="breadcrumb" aria-label={t.pages.breadcrumbLabel}>
            <ol>
              <li>
                <Link to="/">{t.pages.breadcrumbHome}</Link>
              </li>
              {parents.map((p) => (
                <li key={p.to}>
                  <Icon name="chevron-right" size={14} />
                  <Link to={p.to}>{p.label}</Link>
                </li>
              ))}
              <li aria-current="page">
                <Icon name="chevron-right" size={14} />
                <span>{current}</span>
              </li>
            </ol>
          </nav>

          {eyebrow && (
            <p className="page-hero__eyebrow">
              <span className="page-hero__diamonds" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {eyebrow}
            </p>
          )}
          <h1 className="page-hero__title">{rich(title)}</h1>
          {lead && <p className="page-hero__lead">{rich(lead)}</p>}
          {children && <div className="page-hero__actions">{children}</div>}
        </div>

        {art && (
          <div className="page-hero__art" aria-hidden="true">
            {art}
          </div>
        )}

        {stats && (
          <ul className="page-hero__stats">
            {stats.map((s, i) => (
              <Reveal as="li" key={s.label} delay={i * 80}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </Reveal>
            ))}
          </ul>
        )}
      </div>

      <Frise height={16} className="page-hero__frise" />
    </header>
  )
}
