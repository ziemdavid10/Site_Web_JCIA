/**
 * Accès sécurisé au localStorage.
 * Le stockage peut être indisponible (navigation privée, cookies bloqués…) :
 * toutes les erreurs sont absorbées et le site continue de fonctionner.
 */
export const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      /* stockage indisponible : on ignore */
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* stockage indisponible : on ignore */
    }
  },
  getJSON(key) {
    try {
      return JSON.parse(this.get(key))
    } catch {
      return null
    }
  },
  setJSON(key, value) {
    this.set(key, JSON.stringify(value))
  },
}
