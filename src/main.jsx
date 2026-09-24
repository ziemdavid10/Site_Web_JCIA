import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
// Police de la charte (Sora, variable) auto-hébergée : aucune dépendance à Google Fonts
import '@fontsource-variable/sora'
// Styles globaux importés en premier : les styles des composants passent après
import './styles/main.scss'
import I18nProvider from './i18n/I18nProvider'
import ThemeProvider from './theme/ThemeProvider'
import ConsentProvider from './consent/ConsentProvider'
import App from './App'

/**
 * Point d'entrée de l'application.
 * Ordre des fournisseurs : routeur → langue → thème → consentement → application.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <ThemeProvider>
          <ConsentProvider>
            <App />
          </ConsentProvider>
        </ThemeProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)

/**
 * Masque l'écran de chargement initial (défini dans index.html) une fois
 * l'application affichée ET la police chargée, pour éviter tout saut visuel.
 */
const preloader = document.getElementById('preloader')
if (preloader) {
  const minDelay = new Promise((resolve) => setTimeout(resolve, 400)) // évite un simple « flash »
  const fontsReady = document.fonts?.ready ?? Promise.resolve()
  Promise.all([minDelay, fontsReady]).then(() => {
    preloader.classList.add('is-hidden')
    preloader.addEventListener('transitionend', () => preloader.remove(), { once: true })
    setTimeout(() => preloader.remove(), 1000) // sécurité si la transition ne se déclenche pas
  })
}
