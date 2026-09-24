import fr from './fr'
import en from './en'

/** Langues disponibles. Pour en ajouter une : créer locales/xx/ et l'enregistrer ici. */
export const LOCALES = { fr, en }
export const LANGS = Object.keys(LOCALES)
export const DEFAULT_LANG = 'fr'
