import { lazy } from 'react'
import { Route, Routes } from 'react-router'
import Layout from '@/components/layout/Layout'
import HomePage from '@/pages/HomePage'
// La page d'erreur est chargée d'emblée : elle sert aussi de filet de sécurité (ErrorBoundary)
import ErrorPage from '@/pages/ErrorPage/ErrorPage'
import { CONFIG } from '@/data/config'

// Toutes les autres pages sont chargées à la demande (code splitting) :
// elles n'alourdissent pas le premier chargement de l'accueil.
const AboutPage = lazy(() => import('@/pages/AboutPage/AboutPage'))
const ProgrammePage = lazy(() => import('@/pages/ProgrammePage/ProgrammePage'))
const SpeakersPage = lazy(() => import('@/pages/SpeakersPage/SpeakersPage'))
const SalonPage = lazy(() => import('@/pages/SalonPage/SalonPage'))
const AwardsPage = lazy(() => import('@/pages/AwardsPage/AwardsPage'))
const CataloguePage = lazy(() => import('@/pages/CataloguePage/CataloguePage'))
const PartnersPage = lazy(() => import('@/pages/PartnersPage/PartnersPage'))
const FaqPage = lazy(() => import('@/pages/FaqPage/FaqPage'))
const TicketsPage = lazy(() => import('@/pages/TicketsPage/TicketsPage'))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage/CheckoutPage'))
const ConfirmationPage = lazy(() => import('@/pages/ConfirmationPage/ConfirmationPage'))
const FlyerPage = lazy(() => import('@/pages/FlyerPage/FlyerPage'))
const LegalPage = lazy(() => import('@/pages/LegalPage/LegalPage'))

/**
 * <App /> — table de routage.
 *
 *   /                                   Accueil (toutes les sections, en résumé)
 *   /a-propos, /programme, /intervenants,
 *   /salon, /awards, /catalogue,
 *   /partenaires, /faq                  Pages détaillées (une par section)
 *   /billetterie                        Choix du tarif
 *   /billetterie/commande/:tierId       Commande + paiement Mobile Money
 *   /billetterie/confirmation/:orderId  Billet électronique (QR code)
 *   /mon-flyer                          Générateur du flyer « J'y serai »
 *   /confidentialite, /conditions-utilisation, /cookies   Pages légales
 *   /erreur/:code                       Pages d'erreur (400, 401, 403, 404, 408, 429, 500, 502, 503)
 *   *                                   Toute autre adresse → 404
 */
export default function App() {
  const { routes } = CONFIG

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />

        {/* Pages détaillées */}
        <Route path={routes.about} element={<AboutPage />} />
        <Route path={routes.programme} element={<ProgrammePage />} />
        <Route path={routes.speakers} element={<SpeakersPage />} />
        <Route path={routes.salon} element={<SalonPage />} />
        <Route path={routes.awards} element={<AwardsPage />} />
        <Route path={routes.catalogue} element={<CataloguePage />} />
        <Route path={routes.partners} element={<PartnersPage />} />
        <Route path={routes.faq} element={<FaqPage />} />

        {/* Billetterie */}
        <Route path={routes.tickets} element={<TicketsPage />} />
        <Route path={routes.checkout} element={<CheckoutPage />} />
        <Route path={`${routes.checkout}/:tierId`} element={<CheckoutPage />} />
        <Route path={`${routes.confirmation}/:orderId`} element={<ConfirmationPage />} />
        <Route path={routes.flyer} element={<FlyerPage />} />

        {/* Pages légales */}
        <Route path={routes.privacy} element={<LegalPage doc="privacy" />} />
        <Route path={routes.terms} element={<LegalPage doc="terms" />} />
        <Route path={routes.cookies} element={<LegalPage doc="cookies" />} />

        <Route path={`${routes.error}/:code`} element={<ErrorPage />} />
        <Route path="*" element={<ErrorPage code={404} />} />
      </Route>
    </Routes>
  )
}
