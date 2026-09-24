import { rich } from '@/i18n/rich'
import Reveal from '../Reveal/Reveal'
import './SectionHeader.scss'

/**
 * <SectionHeader /> — en-tête de section homogène :
 *   « sur-titre » (avec motif losange tricolore) + titre + chapeau.
 *
 * @param {string} eyebrow  Sur-titre court (ex: « Programme »)
 * @param {ReactNode|string} title Titre principal ; une chaîne peut contenir *mot* (mis en valeur)
 * @param {ReactNode} lead  Texte d'introduction
 * @param {'left'|'center'} align
 * @param {boolean} dark    Variante pour fond sombre
 */
export default function SectionHeader({ eyebrow, title, lead, align = 'left', dark = false, id }) {
  return (
    <Reveal className={`section-header section-header--${align} ${dark ? 'section-header--dark' : ''}`}>
      {eyebrow && (
        <p className="section-header__eyebrow">
          {/* Trois losanges : motif récurrent des frises camerounaises */}
          <span className="section-header__diamonds" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {eyebrow}
        </p>
      )}
      <h2 className="section-header__title" id={id}>
        {rich(title)}
      </h2>
      {lead && <p className="section-header__lead">{rich(lead)}</p>}
    </Reveal>
  )
}
