import useInView from '@/hooks/useInView'

/**
 * <Reveal /> — fait apparaître son contenu en fondu lors du défilement.
 * Les styles (.reveal / .is-visible) sont définis dans styles/base/_animations.scss.
 *
 * @param {number} delay  Délai en ms (utile pour décaler les éléments d'une grille)
 * @param {string} as     Balise HTML à rendre (div par défaut)
 */
export default function Reveal({ children, delay = 0, as: Tag = 'div', className = '', ...rest }) {
  const [ref, inView] = useInView()

  return (
    <Tag
      ref={ref}
      className={`reveal ${inView ? 'is-visible' : ''} ${className}`.trim()}
      style={{ '--reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
