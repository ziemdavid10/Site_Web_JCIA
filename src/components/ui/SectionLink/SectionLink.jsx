import { Link, useLocation } from 'react-router'

/**
 * <SectionLink /> — lien vers une section de la page d'accueil (#id).
 *
 *  • Sur l'accueil : simple ancre (défilement natif, fluide).
 *  • Sur une autre page (pages légales, erreurs) : navigation vers « /#id » ;
 *    le <ScrollManager /> se charge ensuite de défiler jusqu'à la section.
 */
export default function SectionLink({ id, children, ...rest }) {
  const { pathname } = useLocation()

  if (pathname === '/') {
    return (
      <a href={`#${id}`} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <Link to={{ pathname: '/', hash: `#${id}` }} {...rest}>
      {children}
    </Link>
  )
}
