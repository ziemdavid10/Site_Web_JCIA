import { Icon, Reveal } from '@/components/ui'
import { rich } from '@/i18n/rich'

/*
 * Blocs de contenu réutilisables des pages détaillées.
 * Tous acceptent des données issues des fichiers de langue (t.pages.*).
 */

/**
 * <IconCards /> — grille de cartes (icône, titre, texte, étiquette facultative).
 * @param {{icon: string, title: string, text: string, when?: string}[]} items
 * @param {2|3|4} columns  Nombre de colonnes sur grand écran
 */
export function IconCards({ items, columns = 3, variant = 'default' }) {
  return (
    <ul className={`icon-cards icon-cards--cols-${columns} icon-cards--${variant}`}>
      {items.map((item, i) => (
        <Reveal as="li" key={item.title} delay={(i % columns) * 80} className="icon-card">
          {item.icon && (
            <span className="icon-card__icon" aria-hidden="true">
              <Icon name={item.icon} size={24} />
            </span>
          )}
          {item.when && <span className="icon-card__when">{item.when}</span>}
          <h3>{item.title}</h3>
          {item.text && <p>{rich(item.text)}</p>}
        </Reveal>
      ))}
    </ul>
  )
}

/**
 * <Steps /> — étapes numérotées ; verticales sur mobile, en ligne sur desktop.
 * @param {{title: string, text: string}[]} items
 */
export function Steps({ items }) {
  return (
    <ol className={`steps steps--${items.length}`}>
      {items.map((s, i) => (
        <Reveal as="li" key={s.title} delay={i * 90} className="steps__item">
          <span className="steps__num" aria-hidden="true">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div>
            <h3>{s.title}</h3>
            <p>{rich(s.text)}</p>
          </div>
        </Reveal>
      ))}
    </ol>
  )
}

/**
 * <CheckList /> — liste à puces « coche ».
 * @param {string[]} items
 * @param {'check'|'close'} icon
 */
export function CheckList({ items, icon = 'check', columns = 1 }) {
  return (
    <ul className={`check-list check-list--${icon} check-list--cols-${columns}`}>
      {items.map((item) => (
        <li key={item}>
          <Icon name={icon} size={18} />
          <span>{rich(item)}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * <StatRow /> — rangée de chiffres clés.
 * @param {{value: string, label: string}[]} items
 */
export function StatRow({ items }) {
  return (
    <ul className="stat-row">
      {items.map((s, i) => (
        <Reveal as="li" key={s.label} delay={i * 80}>
          <strong>{s.value}</strong>
          <span>{s.label}</span>
        </Reveal>
      ))}
    </ul>
  )
}

/**
 * <DataTable /> — tableau responsive : lignes « cartes » sur mobile
 * (chaque cellule reprend l'intitulé de sa colonne via data-label).
 */
export function DataTable({ head, rows, caption }) {
  return (
    <div className="data-table">
      <table>
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row" data-label={head[i]}>
                    {rich(cell)}
                  </th>
                ) : (
                  <td key={i} data-label={head[i]}>
                    {rich(cell)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** <Callout /> — encadré d'information (icône + texte riche). */
export function Callout({ icon = 'info', tone = 'teal', children }) {
  return (
    <Reveal className={`callout callout--${tone}`}>
      <Icon name={icon} size={22} />
      <div>{children}</div>
    </Reveal>
  )
}
