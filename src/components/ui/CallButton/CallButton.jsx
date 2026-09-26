import Button from '../Button/Button'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'

/**
 * <CallButton /> — « Appeler le secrétariat ».
 *
 * Partout où le site invite à écrire (bouton « Nous contacter », « Devenir
 * exposant »…), ce bouton offre l'autre voie : l'appel. Sur téléphone, le lien
 * `tel:` ouvre le clavier ; sur ordinateur, il ouvre l'application d'appel
 * configurée et le numéro reste lisible dans le pied de page.
 *
 * @param {'sm'|'md'|'lg'} size
 * @param {string} variant  style du bouton (par défaut : contour discret)
 */
export default function CallButton({ size = 'md', variant = 'outline', className = '' }) {
  const { t } = useI18n()
  const phone = CONFIG.contact.phones[0]
  if (!phone) return null

  return (
    <Button
      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      size={size}
      variant={variant}
      iconLeft="phone"
      className={className}
      aria-label={`${t.callCta} — ${phone}`}
    >
      {t.callCta}
    </Button>
  )
}
