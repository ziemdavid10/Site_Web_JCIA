/**
 * Pages légales — FRANÇAIS
 *
 * ⚠️ Textes rédigés sur la base de la Loi n° 2024/017 du 23 décembre 2024 relative
 *    à la protection des données à caractère personnel au Cameroun et des
 *    documents officiels des JCIA. Ils doivent être relus et validés par le
 *    conseil juridique de l'IAC – CAIPI avant la mise en ligne.
 *    Les mentions entre crochets [À compléter …] sont à renseigner.
 *
 * Structure d'une page :
 *   { eyebrow, title, intro, updated, sections: [{ id, title, blocks: [...] }] }
 * Types de blocs : chaîne (paragraphe) | { list: [...] } | { table: { head, rows } }
 * Les liens internes s'écrivent [texte](/chemin) ; le gras **texte**.
 */
export default {
  // ===========================================================================
  privacy: {
    eyebrow: 'Informations légales',
    title: 'Politique de confidentialité',
    intro:
      'L’IAC – CAIPI accorde une grande importance à la protection de vos données personnelles. Cette politique explique quelles données nous collectons via le site des JCIA 2027, pourquoi, combien de temps nous les conservons et comment exercer vos droits.',
    updated: '22 septembre 2026',
    sections: [
      {
        id: 'responsable',
        title: '1. Responsable du traitement',
        blocks: [
          'Le responsable du traitement est **Intelligence Artificielle Cameroun (IAC) – Cameroon Artificial Intelligence Policy Institute (CAIPI)**, association à but non lucratif (récépissé n° 00001626/RDA/JO6/SAAJP/BAPP du 6 octobre 2023), dont le siège est situé Route de l’aéroport, Rond-point Cami-Toyota, Coron, Immeuble Dangote, 2e étage, Yaoundé, Cameroun.',
          'Contact : **contact@jcia.cm** ou **jcia@iacameroun.com** — Tél. : (+237) 222 306 079.',
        ],
      },
      {
        id: 'cadre',
        title: '2. Cadre juridique',
        blocks: [
          'Les traitements sont réalisés conformément à la **Loi n° 2024/017 du 23 décembre 2024 relative à la protection des données à caractère personnel au Cameroun**, à la Loi n° 2010/012 du 21 décembre 2010 relative à la cybersécurité et à la cybercriminalité, ainsi que, le cas échéant, aux réglementations applicables aux participants résidant à l’étranger.',
        ],
      },
      {
        id: 'donnees',
        title: '3. Données collectées',
        blocks: [
          'Nous ne collectons que les données nécessaires :',
          {
            list: [
              '**Billetterie** : nom et prénom, adresse e-mail, téléphone, organisation ou établissement (facultatif), noms des autres participants d’une même commande, type et nombre de billets.',
              '**Paiement** : moyen choisi (MTN Mobile Money, Orange Money, Visa ou Mastercard), numéro débité pour le Mobile Money, montant et identifiant de transaction. Le paiement est traité par l’opérateur, l’établissement bancaire ou leur agrégateur agréé ; nous ne collectons **jamais** votre code secret ni vos données de carte bancaire.',
              '**Flyer « J’y serai »** : la photo que vous choisissez est traitée **uniquement dans votre navigateur** ; elle n’est ni envoyée ni conservée sur nos serveurs.',
              '**Échanges avec le secrétariat** : les informations que vous nous transmettez par e-mail ou téléphone (demande de stand, partenariat, accréditation presse, proposition d’intervention…).',
              '**Candidatures aux CAIA 2027** : elles sont déposées sur la plateforme dédiée (awards.jcia.cm) et régies par les Termes de Référence de l’appel à candidatures.',
              '**Référencement au Catalogue National des Acteurs de l’IA** : uniquement avec votre consentement explicite.',
              '**Données techniques** : adresse IP et journaux de connexion conservés par notre hébergeur pour la sécurité du site ; préférences (langue, thème, choix de cookies) stockées sur votre propre appareil.',
            ],
          },
        ],
      },
      {
        id: 'finalites',
        title: '4. Finalités et bases légales',
        blocks: [
          {
            table: {
              head: ['Finalité', 'Base légale'],
              rows: [
                ['Vendre et émettre les billets, gérer l’accès à l’événement', 'Exécution du contrat (achat de billet)'],
                ['Encaisser les paiements (Mobile Money, carte bancaire) et tenir la comptabilité', 'Exécution du contrat / obligations légales'],
                ['Vous informer sur le programme et l’organisation des JCIA 2027', 'Votre consentement / intérêt légitime de l’organisateur'],
                ['Répondre à vos demandes (stands, partenariats, presse)', 'Exécution de mesures précontractuelles'],
                ['Assurer la sécurité du site et prévenir la fraude', 'Intérêt légitime / obligations légales'],
                ['Publier votre profil au Catalogue National', 'Consentement explicite'],
                ['Mesurer l’audience du site (si activée)', 'Consentement'],
              ],
            },
          },
          'Vos données ne sont **jamais vendues** et ne sont pas utilisées à des fins de prospection commerciale par des tiers.',
        ],
      },
      {
        id: 'destinataires',
        title: '5. Destinataires',
        blocks: [
          'Vos données sont accessibles aux seules personnes habilitées du Comité d’Organisation des JCIA 2027. Elles peuvent être communiquées :',
          {
            list: [
              'à nos prestataires techniques (hébergement, messagerie, billetterie, application de mise en relation), tenus à la confidentialité et agissant sur nos instructions ;',
              'aux prestataires de paiement (MTN Mobile Money, Orange Money, réseaux de cartes Visa et Mastercard) ou à leur agrégateur agréé, pour le seul traitement de la transaction ;',
              'aux partenaires de l’événement, **uniquement avec votre accord préalable** (par exemple pour organiser un rendez-vous B2B) ;',
              'aux autorités compétentes lorsque la loi l’exige.',
            ],
          },
        ],
      },
      {
        id: 'transferts',
        title: '6. Transferts hors du Cameroun',
        blocks: [
          'Certains prestataires (hébergement, messagerie) peuvent être situés hors du Cameroun. Dans ce cas, nous veillons à ce que ces transferts soient encadrés par des garanties appropriées, conformément à la Loi n° 2024/017.',
        ],
      },
      {
        id: 'conservation',
        title: '7. Durées de conservation',
        blocks: [
          {
            list: [
              'Données de billetterie : jusqu’à 12 mois après la clôture des JCIA 2027, puis suppression ou anonymisation.',
              'Données de transaction : durée légale de conservation des pièces comptables.',
              'Échanges avec le secrétariat : 3 ans à compter du dernier contact.',
              'Journaux techniques : 6 mois maximum.',
              'Choix de cookies : 6 mois, après quoi votre accord vous est redemandé.',
              'Catalogue National : jusqu’au retrait de votre consentement.',
            ],
          },
        ],
      },
      {
        id: 'droits',
        title: '8. Vos droits',
        blocks: [
          'Conformément à la réglementation, vous disposez d’un droit d’**accès**, de **rectification**, de **suppression**, d’**opposition**, de **limitation** du traitement et du droit de **retirer votre consentement** à tout moment.',
          'Pour les exercer, écrivez à **contact@jcia.cm** ou **jcia@iacameroun.com** en précisant votre demande. Une pièce justificative d’identité pourra vous être demandée en cas de doute raisonnable. Nous vous répondons dans un délai d’un mois.',
          'Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de l’autorité de protection des données à caractère personnel compétente au Cameroun.',
        ],
      },
      {
        id: 'securite',
        title: '9. Sécurité',
        blocks: [
          'Nous mettons en œuvre des mesures techniques et organisationnelles adaptées : connexion chiffrée (HTTPS), accès restreint aux données, minimisation des informations collectées et sensibilisation de l’équipe organisatrice.',
        ],
      },
      {
        id: 'mineurs',
        title: '10. Mineurs',
        blocks: [
          'La billetterie en ligne s’adresse aux personnes majeures. Les mineurs souhaitant participer doivent obtenir l’accord et être accompagnés de leur représentant légal. La participation aux CAIA 2027 est réservée aux personnes âgées d’au moins 18 ans.',
        ],
      },
      {
        id: 'cookies',
        title: '11. Cookies',
        blocks: ['L’utilisation des cookies et traceurs est détaillée dans notre [politique de cookies](/cookies).'],
      },
      {
        id: 'modifications',
        title: '12. Modifications',
        blocks: [
          'Cette politique peut être mise à jour, notamment pour tenir compte des évolutions légales ou de l’organisation de l’événement. La date de dernière mise à jour figure en haut de page.',
        ],
      },
    ],
  },

  // ===========================================================================
  terms: {
    eyebrow: 'Informations légales',
    title: 'Conditions d’utilisation',
    intro:
      'Les présentes conditions régissent l’accès et l’utilisation du site officiel des Journées Camerounaises de l’Intelligence Artificielle (JCIA 2027). En naviguant sur le site, vous les acceptez sans réserve.',
    updated: '22 septembre 2026',
    sections: [
      {
        id: 'editeur',
        title: '1. Éditeur du site',
        blocks: [
          'Le site est édité par **Intelligence Artificielle Cameroun (IAC) – Cameroon Artificial Intelligence Policy Institute (CAIPI)**, association à but non lucratif (récépissé n° 00001626/RDA/JO6/SAAJP/BAPP du 6 octobre 2023).',
          {
            list: [
              'Siège : Route de l’aéroport, Rond-point Cami-Toyota, Coron, Immeuble Dangote, 2e étage, Yaoundé, Cameroun',
              'Téléphone : (+237) 222 306 079 / 699 089 937 / 677 238 022',
              'E-mail : contact@jcia.cm — jcia@iacameroun.com',
              'Directeur de la publication : le Président de l’IAC – CAIPI',
              'Hébergeur : [À compléter : raison sociale, adresse et téléphone de l’hébergeur]',
            ],
          },
        ],
      },
      {
        id: 'objet',
        title: '2. Objet du site',
        blocks: [
          'Le site présente les JCIA 2027 (programme, Salon National 100 % IA, Cameroon AI Awards, Catalogue National, partenaires) et permet de se pré-inscrire à l’événement. Les informations publiées le sont à titre indicatif.',
        ],
      },
      {
        id: 'acces',
        title: '3. Accès au site',
        blocks: [
          'Le site est accessible gratuitement, 24 h/24 et 7 j/7, sauf interruption pour maintenance ou cas de force majeure. Les frais de connexion à Internet restent à la charge de l’utilisateur. L’éditeur ne saurait être tenu responsable d’une indisponibilité temporaire du site.',
        ],
      },
      {
        id: 'inscription',
        title: '4. Billetterie et participation',
        blocks: [
          {
            list: [
              'Les billets sont vendus en francs CFA (XAF), toutes taxes comprises, et réglés par MTN Mobile Money, Orange Money, Visa ou Mastercard. Le paiement par carte est effectué sur la page sécurisée de l’établissement bancaire ; aucune donnée de carte n’est collectée par le site. La commande est confirmée dès la validation du paiement ; le billet électronique est alors émis.',
              'Le billet « En ligne » donne accès à la retransmission des travaux et au replay pendant 30 jours ; il ne donne pas accès au Hilton Hotel.',
              'Chaque tarif est vendu dans la limite d’un quota annoncé sur la page Billetterie. Lorsque le quota est atteint, le tarif est signalé « épuisé ».',
              'Le billet « Étudiant » est soumis à la présentation d’une carte d’étudiant en cours de validité à l’accueil.',
              'Sauf annulation de l’événement par l’organisateur, les billets ne sont ni repris ni remboursés ; ils peuvent être transférés à un tiers sur demande écrite au secrétariat.',
              'Le générateur de flyer « J’y serai » est réservé aux détenteurs d’un billet confirmé ; l’utilisateur garantit disposer des droits sur la photo utilisée.',
              'Le nombre de places étant limité, l’organisateur se réserve le droit de clore les inscriptions ou de refuser une demande, notamment en cas d’informations inexactes.',
              'L’accès au Hilton Hotel est soumis au respect des consignes de sécurité du lieu et de l’organisateur. Le badge est personnel.',
              'La soirée de gala des Cameroon AI Awards est accessible **uniquement sur invitation**.',
              'Les participants peuvent être photographiés ou filmés dans les espaces publics de l’événement à des fins de communication ; toute personne ne le souhaitant pas peut le signaler à l’accueil.',
            ],
          },
        ],
      },
      {
        id: 'caia',
        title: '5. Cameroon AI Awards (CAIA 2027)',
        blocks: [
          'La participation au concours est régie exclusivement par les [Termes de Référence de l’appel à candidatures](/documents/TDR-CAIA-2027.pdf), qui prévalent sur les présentes conditions pour tout ce qui concerne le concours.',
        ],
      },
      {
        id: 'propriete',
        title: '6. Propriété intellectuelle',
        blocks: [
          'La marque et le logo « JCIA », la mascotte, les textes, visuels, chartes graphiques et documents du site sont la propriété de l’IAC – CAIPI ou de leurs auteurs respectifs. Toute reproduction ou réutilisation sans autorisation écrite préalable est interdite.',
          'Certaines illustrations d’inspiration africaine sont utilisées sous licence Freepik Premium ; elles ne peuvent être extraites ni réutilisées en dehors du site.',
          'Les logos et noms des partenaires restent la propriété de leurs titulaires.',
        ],
      },
      {
        id: 'comportement',
        title: '7. Engagements de l’utilisateur',
        blocks: [
          'L’utilisateur s’engage à fournir des informations exactes, à ne pas perturber le fonctionnement du site (tentatives d’intrusion, envois automatisés, contenus malveillants) et à respecter la législation en vigueur, notamment la Loi n° 2010/012 relative à la cybersécurité et à la cybercriminalité.',
        ],
      },
      {
        id: 'responsabilite',
        title: '8. Responsabilité',
        blocks: [
          'Le programme, les intervenants et les horaires sont communiqués sous réserve de modifications. L’éditeur s’efforce d’assurer l’exactitude des informations publiées mais ne peut garantir l’absence d’erreurs ou d’omissions.',
        ],
      },
      {
        id: 'liens',
        title: '9. Liens externes',
        blocks: [
          'Le site contient des liens vers des sites tiers (plateforme de candidature, partenaires, réseaux sociaux). L’éditeur n’exerce aucun contrôle sur leur contenu et décline toute responsabilité à leur égard.',
        ],
      },
      {
        id: 'donnees',
        title: '10. Données personnelles et cookies',
        blocks: ['Voir la [politique de confidentialité](/confidentialite) et la [politique de cookies](/cookies).'],
      },
      {
        id: 'droit',
        title: '11. Droit applicable',
        blocks: [
          'Les présentes conditions sont soumises au droit camerounais. À défaut de résolution amiable, tout litige relèvera de la compétence des juridictions de Yaoundé.',
        ],
      },
    ],
  },

  // ===========================================================================
  cookies: {
    eyebrow: 'Informations légales',
    title: 'Politique de cookies',
    intro:
      'Cette page explique quels cookies et traceurs sont utilisés sur le site des JCIA 2027, dans quel but, et comment vous pouvez gérer vos choix à tout moment.',
    updated: '22 septembre 2026',
    manage: 'Modifier mes préférences',
    sections: [
      {
        id: 'definition',
        title: '1. Qu’est-ce qu’un cookie ?',
        blocks: [
          'Un cookie (ou traceur) est un petit fichier ou une information enregistrée sur votre appareil lors de la visite d’un site. Le site des JCIA utilise principalement le **stockage local** de votre navigateur (localStorage), qui fonctionne de manière similaire.',
        ],
      },
      {
        id: 'liste',
        title: '2. Traceurs utilisés',
        blocks: [
          {
            table: {
              head: ['Nom', 'Finalité', 'Catégorie', 'Durée'],
              rows: [
                ['jcia-lang', 'Mémoriser la langue choisie (français / anglais)', 'Strictement nécessaire', 'Jusqu’à suppression'],
                ['jcia-theme', 'Mémoriser le thème choisi (clair / sombre)', 'Strictement nécessaire', 'Jusqu’à suppression'],
                ['jcia-consent', 'Mémoriser vos choix de cookies', 'Strictement nécessaire', '6 mois'],
                ['jcia-orders', 'Conserver vos billets sur cet appareil (confirmation, flyer)', 'Strictement nécessaire', 'Jusqu’à suppression'],
                ['OpenStreetMap', 'Afficher la carte interactive du lieu', 'Contenus tiers', 'Selon la politique d’OpenStreetMap'],
                ['Mesure d’audience', 'Statistiques anonymes (non activée à ce jour)', 'Mesure d’audience', '13 mois maximum'],
              ],
            },
          },
          'Aucun cookie publicitaire n’est utilisé sur ce site.',
        ],
      },
      {
        id: 'consentement',
        title: '3. Votre consentement',
        blocks: [
          'Lors de votre première visite, un bandeau vous permet d’accepter, de refuser ou de personnaliser les traceurs non essentiels. Refuser est aussi simple qu’accepter et n’empêche pas d’utiliser le site.',
          'Votre choix est conservé 6 mois. Vous pouvez le modifier à tout moment via le lien **« Gérer les cookies »** en bas de chaque page ou le bouton ci-dessous.',
        ],
      },
      {
        id: 'navigateur',
        title: '4. Paramétrer votre navigateur',
        blocks: [
          'Vous pouvez également supprimer ou bloquer les cookies et le stockage local depuis les réglages de votre navigateur (Chrome, Firefox, Safari, Edge…). Certaines préférences (langue, thème) ne pourront alors plus être mémorisées.',
        ],
      },
      {
        id: 'contact',
        title: '5. Contact',
        blocks: ['Pour toute question : **contact@jcia.cm**. Voir aussi notre [politique de confidentialité](/confidentialite).'],
      },
    ],
  },
}
