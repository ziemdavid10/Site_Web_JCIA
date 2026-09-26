/** Initiales d'un nom, sans les titres (Pr, Dr, S.E., M., Mme) — deux lettres au plus */
export default function initials(name) {
  return name
    .replace(/^(Pr|Dr|S\.E\.|M\.|Mme)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}
