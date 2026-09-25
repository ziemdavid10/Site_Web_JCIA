import { Link } from 'react-router'
import { Icon, NdopBand, PatternBg, SectionLink, ThemeImg } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { useConsent } from '@/consent/context'
import { CONFIG } from '@/data/config'
import logoWhite from '@/assets/images/brand/logo-jcia-white-sm.webp'
import logoColor from '@/assets/images/brand/logo-jcia-sm.webp'
import './Footer.scss'

/**
 * <Footer /> — pied de page : identité, navigation, documents, contacts,
 * informations légales et accès aux préférences de cookies.
 */
export default function Footer() {
  const { t } = useI18n()
  const { openPanel } = useConsent()
  const { contact, links, routes, features } = CONFIG
  const downloads = features.documentDownloads
  const f = t.footer
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <NdopBand height={56} />
      <PatternBg variant="ndop-royal" color="currentColor" opacity={0.045} />

      <div className="footer__inner container">
        {/* Identité */}
        <div className="footer__brand">
          <ThemeImg light={logoColor} dark={logoWhite} alt={`${t.event.shortName} — ${t.event.name}`} width="200" height="83" loading="lazy" />
          <p className="footer__theme">« {t.event.theme} »</p>
          <p className="footer__org">
            {f.organizedBy} <strong>{t.organizer.name}</strong> – {t.organizer.fullName}
          </p>
          <ul className="footer__socials" aria-label={t.a11y.socials}>
            {contact.socials.map((s) => (
              <li key={s.name}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.name}>
                  <Icon name={s.icon} size={18} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Navigation */}
        <div className="footer__col">
          <h3>{f.eventTitle}</h3>
          <ul>
            {t.nav.map((l) => (
              <li key={l.route}>
                {/* « Accueil » : ancre vers le haut de la page d'accueil */}
                {l.route === 'home' ? (
                  <SectionLink id={l.section}>{l.label}</SectionLink>
                ) : (
                  <Link to={routes[l.route]}>{l.label}</Link>
                )}
              </li>
            ))}
            <li>
              <Link to={routes.speakers}>{f.extra.speakers}</Link>
            </li>
            <li>
              <Link to={routes.tickets}>{f.extra.tickets}</Link>
            </li>
            <li>
              <Link to={routes.flyer}>{f.extra.flyer}</Link>
            </li>
          </ul>
        </div>

        {/* Documents + légal */}
        <div className="footer__col">
          <h3>{f.docsTitle}</h3>
          <ul>
            {/* TDR et dossier de partenariat : liens neutralisés tant que les PDF
                ne sont pas définitifs (CONFIG.features.documentDownloads) */}
            <li>
              {downloads ? (
                <a href={links.tdrPdf} target="_blank" rel="noopener noreferrer">
                  {f.docs.tdr}
                </a>
              ) : (
                <span className="footer__soon" aria-disabled="true">
                  {f.docs.tdr} <em>{t.soon}</em>
                </span>
              )}
            </li>
            <li>
              {downloads ? (
                <a href={links.partnershipPdf} target="_blank" rel="noopener noreferrer">
                  {f.docs.partnership}
                </a>
              ) : (
                <span className="footer__soon" aria-disabled="true">
                  {f.docs.partnership} <em>{t.soon}</em>
                </span>
              )}
            </li>
            <li>
              <a href={links.awards} target="_blank" rel="noopener noreferrer">
                {f.docs.platform}
              </a>
            </li>
            <li>
              <a href={links.iac} target="_blank" rel="noopener noreferrer">
                {f.docs.iac}
              </a>
            </li>
          </ul>

          <h3 className="footer__subtitle">{f.legalTitle}</h3>
          <ul>
            <li>
              <Link to={routes.privacy}>{f.legal.privacy}</Link>
            </li>
            <li>
              <Link to={routes.terms}>{f.legal.terms}</Link>
            </li>
            <li>
              <Link to={routes.cookies}>{f.legal.cookies}</Link>
            </li>
            <li>
              <button type="button" className="footer__link-btn" onClick={openPanel}>
                {f.legal.manageCookies}
              </button>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="footer__col footer__contact">
          <h3>{f.contactTitle}</h3>
          <p>
            <Icon name="pin" size={16} />
            <span>{f.address}</span>
          </p>
          <p>
            <Icon name="phone" size={16} />
            <span>
              {contact.phones.map((p, i) => (
                <a key={p} href={`tel:${p.replace(/\s/g, '')}`}>
                  {p}
                  {i < contact.phones.length - 1 && <br />}
                </a>
              ))}
            </span>
          </p>
          <p>
            <Icon name="mail" size={16} />
            <span>
              {contact.emails.map((m, i) => (
                <a key={m} href={`mailto:${m}`}>
                  {m}
                  {i < contact.emails.length - 1 && <br />}
                </a>
              ))}
            </span>
          </p>
        </div>
      </div>

      <div className="footer__bottom container">
        <p>
          © {year} {t.organizer.short}. {f.rights}
        </p>
        <p className="footer__made">{f.motto}</p>
      </div>
    </footer>
  )
}
