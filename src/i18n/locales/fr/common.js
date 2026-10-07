/**
 * Textes communs de l'interface — FRANÇAIS
 * (en-tête, pied de page, bandeau cookies, chargement, accessibilité…)
 */
export default {
  meta: {
    intlLocale: 'fr-FR',
    ogLocale: 'fr_FR',
    title: "JCIA 2027 | Journées Camerounaises de l'Intelligence Artificielle",
    description:
      "3e édition des Journées Camerounaises de l'Intelligence Artificielle — 27 & 28 avril 2027, Hilton Hotel, Yaoundé. L'IA Made in Cameroun : conférences, Salon National 100 % IA, masterclasses et Cameroon AI Awards.",
  },

  a11y: {
    skipLink: 'Aller au contenu',
    home: 'JCIA 2027 — retour à l’accueil',
    mainNav: 'Navigation principale',
    mobileNav: 'Navigation mobile',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    backToTop: 'Retour en haut de la page',
    backToTopBubble: 'On remonte ?',
    socials: 'Réseaux sociaux',
    timer: 'Temps restant',
    timerUnits: { days: 'jours', hours: 'heures', minutes: 'minutes' },
  },

  // Menu principal : `route` renvoie à CONFIG.routes, `section` à l'ancre de l'accueil
  nav: [
    { route: 'home', section: 'top', label: 'Accueil' },
    { route: 'about', section: 'apropos', label: 'À propos' },
    { route: 'programme', section: 'programme', label: 'Programme' },
    { route: 'salon', section: 'salon', label: 'Salon 100 % IA' },
    { route: 'awards', section: 'awards', label: 'Cameroon AI Awards' },
    { route: 'catalogue', section: 'catalogue', label: 'Catalogue national' },
    { route: 'partners', section: 'partenaires', label: 'Partenaires' },
    { route: 'faq', section: 'faq', label: 'FAQ' },
  ],

  /** Action volontairement bloquée (document non publié, paiement fermé) */
  callCta: 'Appeler le secrétariat',
  soon: 'Bientôt disponible',
  soonShort: 'Bientôt',
  soonDoc: 'Document en cours de finalisation — disponible très bientôt.',

  header: {
    donate: 'Donate',
    donateLong: 'Soutenir les JCIA 2027',
    announce: '**Inscriptions ouvertes — JCIA 2027** : participez aux JCIA 2027, les 27 et 28 avril 2027 à Yaoundé —',
    announceLink: 's’inscrire maintenant',
    cta: 'Billetterie',
    mobileCta: 'Réserver ma place',
  },

  switchers: {
    theme: { light: 'Thème clair', dark: 'Thème sombre', toLight: 'Passer au thème clair', toDark: 'Passer au thème sombre' },
    lang: { label: 'Langue', current: 'Français', options: { fr: 'Français', en: 'English' } },
  },

  countdown: {
    units: { days: 'Jours', hours: 'Heures', minutes: 'Min', seconds: 'Sec' },
    ended: 'C’est parti !',
  },

  footer: {
    organizedBy: 'Organisé par',
    eventTitle: 'L’événement',
    extra: { attendees: 'Participants', speakers: 'Intervenants', tickets: 'Billetterie', flyer: 'Mon visuel « J’y serai »' },
    docsTitle: 'Documents',
    docs: {
      tdr: 'TDR — Appel à candidatures CAIA',
      partnership: 'Dossier de partenariat',
      platform: 'Plateforme de candidature',
      iac: 'Site de l’IAC – CAIPI',
    },
    contactTitle: 'Secrétariat',
    address: "Route de l'aéroport, Rond-point Cami-Toyota, Coron, Immeuble Dangote, 2e étage, Yaoundé",
    legalTitle: 'Informations légales',
    legal: {
      privacy: 'Politique de confidentialité',
      terms: 'Conditions d’utilisation',
      cookies: 'Politique de cookies',
      manageCookies: 'Gérer les cookies',
    },
    rights: 'Tous droits réservés.',
    motto: 'Pensé au Cameroun, pour le Cameroun.',
  },

  loader: {
    label: 'Chargement du site des JCIA 2027',
    page: 'Chargement de la page…',
  },

  cookies: {
    banner: {
      title: 'Votre vie privée compte',
      text: 'Nous utilisons des cookies et traceurs strictement nécessaires au fonctionnement du site. Avec votre accord, nous affichons aussi des contenus tiers (carte interactive) et, à l’avenir, une mesure d’audience anonyme.',
      learnMore: 'En savoir plus',
      accept: 'Tout accepter',
      reject: 'Tout refuser',
      customize: 'Personnaliser',
    },
    panel: {
      title: 'Préférences de cookies',
      intro: 'Choisissez les catégories que vous acceptez. Vous pouvez modifier ces choix à tout moment depuis le lien « Gérer les cookies » en bas de page.',
      alwaysOn: 'Toujours actifs',
      save: 'Enregistrer mes choix',
      accept: 'Tout accepter',
      reject: 'Tout refuser',
      close: 'Fermer',
      categories: {
        necessary: {
          title: 'Strictement nécessaires',
          text: 'Mémorisation de votre langue, de votre thème (clair/sombre), de vos choix de cookies et de vos billets sur cet appareil. Indispensables au fonctionnement du site.',
        },
        media: {
          title: 'Contenus tiers',
          text: 'Affichage de la carte interactive OpenStreetMap. Ce service peut collecter votre adresse IP.',
        },
        analytics: {
          title: 'Mesure d’audience',
          text: 'Statistiques anonymes de fréquentation pour améliorer le site. Aucun outil n’est actif à ce jour.',
        },
      },
    },
  },

  common: {
    download: 'Télécharger',
    external: '(nouvel onglet)',
    backHome: 'Retour à l’accueil',
    lastUpdated: 'Dernière mise à jour',
    onThisPage: 'Sur cette page',
    print: 'Imprimer',
  },
}
