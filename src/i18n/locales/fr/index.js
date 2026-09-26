/**
 * Langue : FRANÇAIS (langue par défaut)
 * Regroupe les textes de l'interface, de l'accueil, des pages légales et d'erreur.
 */
import common from './common'
import home from './home'
import pages from './pages'
import tickets from './tickets'
import speakers from './speakers'
import attendees from './attendees'
import legal from './legal'
import errors from './errors'

export default { ...common, ...home, ...pages, ...tickets, ...speakers, ...attendees, legal, errors }
