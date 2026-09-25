/**
 * Shared interface strings — ENGLISH
 * (header, footer, cookie banner, loading, accessibility…)
 */
export default {
  meta: {
    intlLocale: 'en-GB',
    ogLocale: 'en_GB',
    title: 'JCIA 2027 | Cameroon Artificial Intelligence Days',
    description:
      '3rd edition of the Cameroon Artificial Intelligence Days — 27 & 28 April 2027, Hilton Hotel, Yaoundé. AI Made in Cameroon: conferences, National 100% AI Expo, masterclasses and the Cameroon AI Awards.',
  },

  a11y: {
    skipLink: 'Skip to content',
    home: 'JCIA 2027 — back to home',
    mainNav: 'Main navigation',
    mobileNav: 'Mobile navigation',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    backToTop: 'Back to top',
    backToTopBubble: 'Back up?',
    socials: 'Social media',
    timer: 'Time remaining',
    timerUnits: { days: 'days', hours: 'hours', minutes: 'minutes' },
  },

  // Main menu: `route` maps to CONFIG.routes, `section` to the home-page anchor
  nav: [
    { route: 'home', section: 'top', label: 'Home' },
    { route: 'about', section: 'apropos', label: 'About' },
    { route: 'programme', section: 'programme', label: 'Programme' },
    { route: 'salon', section: 'salon', label: '100% AI Expo' },
    { route: 'awards', section: 'awards', label: 'CAIA Awards' },
    { route: 'catalogue', section: 'catalogue', label: 'National Directory' },
    { route: 'partners', section: 'partenaires', label: 'Partners' },
    { route: 'faq', section: 'faq', label: 'FAQ' },
  ],

  /** Action volontairement bloquée (document non publié, paiement fermé) */
  soon: 'Coming soon',
  soonShort: 'Soon',
  soonDoc: 'Document being finalised — available very soon.',

  header: {
    announce: '**CAIA 2027** call for applications: 15 November 2026 to 28 February 2027 —',
    announceLink: 'learn more',
    cta: 'Tickets',
    mobileCta: 'Book my seat',
  },

  switchers: {
    theme: { light: 'Light theme', dark: 'Dark theme', toLight: 'Switch to light theme', toDark: 'Switch to dark theme' },
    lang: { label: 'Language', current: 'English', options: { fr: 'Français', en: 'English' } },
  },

  countdown: {
    units: { days: 'Days', hours: 'Hours', minutes: 'Min', seconds: 'Sec' },
    ended: 'It’s on!',
  },

  footer: {
    organizedBy: 'Organised by',
    eventTitle: 'The event',
    extra: { speakers: 'Speakers', tickets: 'Tickets', flyer: 'My “I’ll be there” flyer' },
    docsTitle: 'Documents',
    docs: {
      tdr: 'CAIA call for applications — ToR (FR)',
      partnership: 'Partnership package (FR)',
      platform: 'Application platform',
      iac: 'IAC – CAIPI website',
    },
    contactTitle: 'Secretariat',
    address: 'Route de l’aéroport, Cami-Toyota roundabout, Coron, Dangote Building, 2nd floor, Yaoundé',
    legalTitle: 'Legal',
    legal: {
      privacy: 'Privacy policy',
      terms: 'Terms of use',
      cookies: 'Cookie policy',
      manageCookies: 'Manage cookies',
    },
    rights: 'All rights reserved.',
    motto: 'Designed in Cameroon, for Cameroon.',
  },

  loader: {
    label: 'Loading the JCIA 2027 website',
    page: 'Loading page…',
  },

  cookies: {
    banner: {
      title: 'Your privacy matters',
      text: 'We use cookies and trackers that are strictly necessary for the site to work. With your consent, we also display third-party content (interactive map) and, in the future, anonymous audience measurement.',
      learnMore: 'Learn more',
      accept: 'Accept all',
      reject: 'Reject all',
      customize: 'Customise',
    },
    panel: {
      title: 'Cookie preferences',
      intro: 'Choose the categories you accept. You can change these choices at any time using the “Manage cookies” link at the bottom of the page.',
      alwaysOn: 'Always on',
      save: 'Save my choices',
      accept: 'Accept all',
      reject: 'Reject all',
      close: 'Close',
      categories: {
        necessary: {
          title: 'Strictly necessary',
          text: 'Remembering your language, theme (light/dark), cookie choices and your tickets on this device. Required for the site to work.',
        },
        media: {
          title: 'Third-party content',
          text: 'Displaying the OpenStreetMap interactive map. This service may collect your IP address.',
        },
        analytics: {
          title: 'Audience measurement',
          text: 'Anonymous traffic statistics to improve the site. No tool is active at this time.',
        },
      },
    },
  },

  common: {
    download: 'Download',
    external: '(new tab)',
    backHome: 'Back to home',
    lastUpdated: 'Last updated',
    onThisPage: 'On this page',
    print: 'Print',
  },
}
