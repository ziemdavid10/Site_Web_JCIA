import { Icon, Reveal } from '@/components/ui'
import { useI18n } from '@/i18n/context'

/**
 * <AwardCategories /> — grille des 10 catégories de prix.
 * Chaque carte révèle son champ couvert au survol / focus (toujours visible
 * sur téléphone et tablette, où le survol n'existe pas).
 */
export default function AwardCategories() {
  const { t } = useI18n()
  const aw = t.awards

  return (
    <div className="award-cats">
      <Reveal as="h3" className="awards__subtitle">
        {aw.categoriesTitle}
      </Reveal>
      <ul className="award-cats__grid">
        {aw.categories.map((c, i) => (
          <Reveal as="li" key={c.title} delay={(i % 5) * 70} className="award-cat" tabIndex={0}>
            <span className="award-cat__num">{String(i + 1).padStart(2, '0')}</span>
            <span className="award-cat__icon">
              <Icon name={c.icon} size={24} />
            </span>
            <h4 className="award-cat__title">{c.title}</h4>
            <p className="award-cat__scope">{c.scope}</p>
          </Reveal>
        ))}
      </ul>
      <Reveal as="p" className="award-cats__note">
        {aw.specialMentions}
      </Reveal>
    </div>
  )
}
