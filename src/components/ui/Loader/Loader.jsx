import './Loader.scss'

/**
 * <Loader /> — indicateur de chargement aux couleurs des JCIA.
 * Trois nœuds reliés (réseau neuronal) s'allument tour à tour, sur le rythme
 * des losanges des frises.
 *
 * @param {'page'|'inline'} variant  page = plein écran sous l'en-tête ; inline = dans un bloc
 * @param {string} label             Texte lu par les lecteurs d'écran (et affiché)
 */
export default function Loader({ variant = 'page', label }) {
  return (
    <div className={`loader loader--${variant}`} role="status" aria-live="polite">
      <div className="loader__nodes" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      {label && <p className="loader__label">{label}</p>}
    </div>
  )
}
