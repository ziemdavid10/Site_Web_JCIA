import { Component } from 'react'
import ErrorPage from '@/pages/ErrorPage/ErrorPage'

/**
 * <ErrorBoundary /> — filet de sécurité : si un composant plante pendant le
 * rendu, on affiche la page d'erreur 500 au lieu d'un écran blanc.
 * (Les « error boundaries » doivent encore être des composants de classe.)
 *
 * `resetKey` (ex : l'URL courante) réinitialise l'erreur lors d'une navigation.
 */
export default class ErrorBoundary extends Component {
  state = { error: null, key: this.props.resetKey }

  static getDerivedStateFromError(error) {
    return { error }
  }

  static getDerivedStateFromProps(props, state) {
    // Nouvelle page → on efface l'erreur précédente
    if (props.resetKey !== state.key) return { error: null, key: props.resetKey }
    return null
  }

  componentDidCatch(error, info) {
    // Point d'accroche pour un outil de suivi d'erreurs (Sentry…)
    console.error('[JCIA] Erreur de rendu :', error, info?.componentStack)
  }

  render() {
    if (this.state.error) return <ErrorPage code={500} embedded />
    return this.props.children
  }
}
