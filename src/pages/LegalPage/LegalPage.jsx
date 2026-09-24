import { Button, Frise, Icon, PatternBg, Reveal } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { useConsent } from '@/consent/context'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import useScrollSpy from '@/hooks/useScrollSpy'
import './LegalPage.scss'

/** Rendu d'un bloc de contenu : paragraphe, liste ou tableau */
function Block({ block }) {
  if (typeof block === 'string') return <p>{rich(block)}</p>

  if (block.list) {
    return (
      <ul>
        {block.list.map((item) => (
          <li key={item}>{rich(item)}</li>
        ))}
      </ul>
    )
  }

  if (block.table) {
    return (
      // Tableau défilable horizontalement sur petit écran
      <div className="legal__table" role="region" tabIndex={0} aria-label={block.table.head.join(' / ')}>
        <table>
          <thead>
            <tr>
              {block.table.head.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.table.rows.map((row) => (
              <tr key={row.join('|')}>
                {row.map((cell, i) => (
                  <td key={i} data-label={block.table.head[i]}>
                    {rich(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return null
}

/**
 * <LegalPage /> — gabarit commun aux pages légales
 * (confidentialité, conditions d'utilisation, cookies).
 * Contenu : t.legal[doc] dans les fichiers de langue.
 *
 * @param {'privacy'|'terms'|'cookies'} doc
 */
export default function LegalPage({ doc }) {
  const { t } = useI18n()
  const { openPanel } = useConsent()
  const page = t.legal[doc]
  const activeId = useScrollSpy(page.sections.map((s) => s.id))
  useDocumentMeta(`${page.title} | ${t.event.shortName}`)

  return (
    <div className="legal">
      {/* Bandeau d'en-tête */}
      <header className="legal__hero">
        <PatternBg variant="circuit" color="#2db8bd" opacity={0.08} fade="radial" />
        <div className="container legal__hero-inner">
          <p className="legal__eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="legal__intro">{page.intro}</p>
          <p className="legal__updated">
            <Icon name="calendar" size={16} />
            {t.common.lastUpdated} : {page.updated}
          </p>
        </div>
        <Frise height={18} />
      </header>

      <div className="container legal__body">
        {/* Sommaire (collant sur grand écran) */}
        <nav className="legal__toc" aria-label={t.common.onThisPage}>
          <p>{t.common.onThisPage}</p>
          <ol>
            {page.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={activeId === s.id ? 'is-active' : ''}>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="legal__content prose">
          {page.sections.map((s) => (
            <Reveal as="section" key={s.id} id={s.id} className="legal__section">
              <h2>{s.title}</h2>
              {s.blocks.map((b, i) => (
                <Block key={i} block={b} />
              ))}
            </Reveal>
          ))}

          {/* Politique de cookies : accès direct aux préférences */}
          {doc === 'cookies' && (
            <div className="legal__manage">
              <Button variant="secondary" iconLeft="shield" onClick={openPanel}>
                {page.manage}
              </Button>
            </div>
          )}
        </article>
      </div>
    </div>
  )
}
