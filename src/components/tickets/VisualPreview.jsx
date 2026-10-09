import { PersonAvatar } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { styleForTier } from './flyerRenderer'
import './VisualPreview.scss'

/**
 * <VisualPreview /> — aperçu EN DIRECT du visuel « J'y serai » pendant
 * l'inscription : charte du billet choisi, photo recadrée, nom, rôle et
 * organisation tels que saisis. Le visuel définitif (PNG haute définition,
 * trois formats) est généré ensuite sur la page « Mon visuel ».
 */
export default function VisualPreview({ tier, photo, name, role }) {
  const { t } = useI18n()
  const f = t.tickets.flyer
  const st = styleForTier(tier)
  const style = {
    '--vp-bg-a': st.bg[0],
    '--vp-bg-b': st.bg[1],
    '--vp-bg-c': st.bg[2],
    '--vp-text': st.text,
    '--vp-soft': st.soft,
    '--vp-head-a': st.headline[0],
    '--vp-head-b': st.headline[1],
    '--vp-accent': st.accent,
    '--vp-badge-bg': st.badge.bg,
    '--vp-badge-text': st.badge.text,
  }

  return (
    <figure className="visual-preview" style={style}>
      <div className="visual-preview__card" aria-hidden="true">
        <span className="visual-preview__band" />
        <strong className="visual-preview__headline">{f.art.headline}</strong>
        <span className="visual-preview__photo">
          {photo ? <img src={photo} alt="" /> : <PersonAvatar name={name || '?'} className="visual-preview__avatar" />}
          <em className="visual-preview__badge">{f.art.badges?.[tier]}</em>
        </span>
        <span className={`visual-preview__name ${name ? '' : 'is-empty'}`}>{name || f.previewName}</span>
        <span className={`visual-preview__role ${role ? '' : 'is-empty'}`}>{role || f.previewRole}</span>
        <span className="visual-preview__date">{f.art.date}</span>
        <span className="visual-preview__tag">{f.art.hashtag}</span>
      </div>
      <figcaption>{f.previewCaption}</figcaption>
    </figure>
  )
}
