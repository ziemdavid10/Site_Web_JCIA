import { SectionHeader } from '@/components/ui'

/**
 * <PageSection /> — section d'une page détaillée, avec en-tête homogène.
 *
 * @param {string} id        Ancre (utilisée par le sommaire)
 * @param {'default'|'sand'|'white'|'stage'} tone  Fond de la section
 * @param {'default'|'narrow'} width
 */
export default function PageSection({
  id,
  tone = 'default',
  width = 'default',
  eyebrow,
  title,
  lead,
  align = 'left',
  className = '',
  children,
}) {
  const titleId = id ? `${id}-title` : undefined
  return (
    <section
      id={id}
      className={`page-section page-section--${tone} ${className}`.trim()}
      aria-labelledby={title ? titleId : undefined}
    >
      <div className={`container ${width === 'narrow' ? 'page-section__narrow' : ''}`}>
        {title && <SectionHeader id={titleId} eyebrow={eyebrow} title={title} lead={lead} align={align} dark={tone === 'stage'} />}
        {children}
      </div>
    </section>
  )
}
