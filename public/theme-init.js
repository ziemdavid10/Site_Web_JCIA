/*
 * Thème et langue appliqués AVANT le premier affichage (évite un flash de couleur).
 * Fichier séparé (et non script en ligne) pour respecter la Content-Security-Policy.
 * Même logique que src/theme/ThemeProvider.jsx.
 */
;(function () {
  try {
    var t = localStorage.getItem('jcia-theme')
    if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    document.documentElement.dataset.theme = t
    var l = new URLSearchParams(location.search).get('lang') || localStorage.getItem('jcia-lang')
    if (l === 'en' || l === 'fr') document.documentElement.lang = l
  } catch (e) {
    document.documentElement.dataset.theme = 'light'
  }
})()
