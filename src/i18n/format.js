/**
 * Remplace les variables {nom} d'un texte traduit.
 * @example fill('Payer {amount}', { amount: '15 000 FCFA' }) → 'Payer 15 000 FCFA'
 */
export function fill(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) => (key in vars ? vars[key] : match))
}
