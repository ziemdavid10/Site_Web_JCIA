/**
 * Language: ENGLISH
 * Same structure as the French locale (src/i18n/locales/fr/index.js).
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
