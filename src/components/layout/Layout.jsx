import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Loader } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import CookieBanner from '@/consent/CookieBanner'
import CookiePanel from '@/consent/CookiePanel'
import Header from './Header/Header'
import Footer from './Footer/Footer'
import BackToTop from './BackToTop/BackToTop'
import ScrollManager from './ScrollManager'
import ErrorBoundary from './ErrorBoundary'

/**
 * <Layout /> — structure commune à toutes les pages :
 * lien d'évitement, en-tête, contenu (avec état de chargement et filet
 * d'erreur), pied de page, bouton « haut de page » et consentement cookies.
 */
export default function Layout() {
  const { t } = useI18n()
  const { pathname } = useLocation()

  return (
    <>
      <a className="skip-link" href="#main">
        {t.a11y.skipLink}
      </a>
      <ScrollManager />
      <Header />

      <main id="main" tabIndex={-1}>
        <ErrorBoundary resetKey={pathname}>
          {/* Les pages secondaires sont chargées à la demande : on affiche le loader entre-temps */}
          <Suspense fallback={<Loader label={t.loader.page} />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      <Footer />
      <BackToTop />
      <CookieBanner />
      <CookiePanel />
    </>
  )
}
