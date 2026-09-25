/**
 * Formate un montant en francs CFA, selon la langue.
 * @example formatXAF(15000, 'fr-FR') → « 15 000 FCFA »
 */
export function formatXAF(amount, locale = 'fr-FR') {
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount)
  return `${n} FCFA`
}
