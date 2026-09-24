/**
 * Pages d'erreur — FRANÇAIS
 * Chaque code dispose d'un titre et d'un message ; `retry` affiche un bouton « Réessayer ».
 */
export default {
  eyebrow: 'Erreur',
  mascotAlt: 'La mascotte des JCIA, perplexe',
  retry: 'Réessayer',
  home: 'Retour à l’accueil',
  contact: 'Contacter le secrétariat',
  suggestionsTitle: 'Vous cherchiez peut-être :',
  suggestions: [
    { id: 'programme', label: 'Le programme' },
    { id: 'awards', label: 'Les Cameroon AI Awards' },
    { id: 'inscription', label: 'L’inscription' },
    { id: 'faq', label: 'La FAQ' },
  ],
  codes: {
    400: { title: 'Requête invalide', text: 'Le serveur n’a pas pu comprendre la demande. Vérifiez l’adresse ou les informations saisies, puis réessayez.' },
    401: { title: 'Authentification requise', text: 'Cette page est réservée. Veuillez vous identifier pour y accéder.' },
    403: { title: 'Accès refusé', text: 'Vous n’avez pas l’autorisation d’accéder à cette ressource. Si vous pensez qu’il s’agit d’une erreur, contactez-nous.' },
    404: { title: 'Page introuvable', text: 'Même notre robot n’a pas trouvé cette page. Elle a peut-être été déplacée ou n’existe plus.' },
    408: { title: 'Délai dépassé', text: 'La connexion a mis trop de temps à répondre. Vérifiez votre réseau et réessayez.', retry: true },
    429: { title: 'Trop de requêtes', text: 'Vous avez effectué trop de demandes en peu de temps. Patientez quelques instants avant de réessayer.', retry: true },
    500: { title: 'Erreur interne', text: 'Un problème inattendu est survenu de notre côté. Nos équipes sont prévenues ; réessayez dans quelques instants.', retry: true },
    502: { title: 'Passerelle incorrecte', text: 'Le serveur a reçu une réponse invalide. Réessayez dans quelques instants.', retry: true },
    503: { title: 'Service indisponible', text: 'Le site est momentanément indisponible (maintenance ou forte affluence). Merci de revenir un peu plus tard.', retry: true },
  },
}
