import { useI18n } from '@/i18n/context'
import { LANGS } from '@/i18n/locales'
import './LangSwitch.scss'

/**
 * <LangSwitch /> — sélecteur de langue « FR | EN » en boutons segmentés.
 * Chaque bouton porte l'attribut lang de sa langue pour les lecteurs d'écran.
 */
export default function LangSwitch({ className = '' }) {
  const { lang, setLang, t } = useI18n()

  return (
    <div className={`lang-switch ${className}`.trim()} role="group" aria-label={t.switchers.lang.label}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          className={lang === code ? 'is-active' : ''}
          aria-pressed={lang === code}
          aria-label={t.switchers.lang.options[code]}
          title={t.switchers.lang.options[code]}
          onClick={() => setLang(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
