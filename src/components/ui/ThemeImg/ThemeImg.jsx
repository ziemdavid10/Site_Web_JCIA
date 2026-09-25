import { useTheme } from '@/theme/context'

/**
 * <ThemeImg /> — image qui change selon le thème (logo couleur / blanc,
 * mascotte bleu nuit / blanche…).
 * @param {string} light  Source affichée en thème clair
 * @param {string} dark   Source affichée en thème sombre
 */
export default function ThemeImg({ light, dark, alt = '', ...rest }) {
  const { isDark } = useTheme()
  return <img src={isDark ? dark : light} alt={alt} {...rest} />
}
