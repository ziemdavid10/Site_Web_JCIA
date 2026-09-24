import { useI18n } from '@/i18n/context'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import Hero from '@/components/sections/Hero/Hero'
import About from '@/components/sections/About/About'
import KeyFigures from '@/components/sections/KeyFigures/KeyFigures'
import Theme from '@/components/sections/Theme/Theme'
import GenevaBridge from '@/components/sections/GenevaBridge/GenevaBridge'
import Programme from '@/components/sections/Programme/Programme'
import Speakers from '@/components/sections/Speakers/Speakers'
import Salon from '@/components/sections/Salon/Salon'
import Awards from '@/components/sections/Awards/Awards'
import Catalogue from '@/components/sections/Catalogue/Catalogue'
import Organizer from '@/components/sections/Organizer/Organizer'
import Partners from '@/components/sections/Partners/Partners'
import Registration from '@/components/sections/Registration/Registration'
import Faq from '@/components/sections/Faq/Faq'

/**
 * <HomePage /> — page d'accueil (page unique de l'événement).
 * L'ordre des sections raconte l'événement :
 *   pourquoi (À propos, chiffres, thème, Genève)
 *   → quoi (programme, intervenants, salon, awards, catalogue)
 *   → qui (organisateur, partenaires)
 *   → comment (inscription, FAQ).
 */
export default function HomePage() {
  const { t } = useI18n()
  useDocumentMeta(t.meta.title)

  return (
    <>
      <Hero />
      <About />
      <KeyFigures />
      <Theme />
      <GenevaBridge />
      <Programme />
      <Speakers />
      <Salon />
      <Awards />
      <Catalogue />
      <Organizer />
      <Partners />
      <Registration />
      <Faq />
    </>
  )
}
