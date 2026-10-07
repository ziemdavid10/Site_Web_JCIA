# Matrice de couverture des tests backend JCIA

La suite couvre les scénarios fonctionnels et d'erreur par fonctionnalité.

## Paiement

- corps vide / données manquantes
- identifiant absent, vide ou mal formé
- identifiant valide
- montant absent, non numérique, NaN, négatif
- devise absente/inconnue et XAF en casse différente
- méthode absente/inconnue
- Mobile Money sans opérateur / opérateur inconnu / MTN / Orange
- carte bancaire sans opérateur Mobile Money
- e-mail absent ou invalide
- tarif valide et montant falsifié
- quantité 0, négative, décimale, trop grande, texte
- création de commande
- persistance organisation, langue, consentement et participants
- répétition/idempotence d'une commande
- recherche d'un paiement inexistant
- paiement SUCCESSFUL
- paiement FAILED avec motif
- paiement PENDING puis SUCCESSFUL en mode démonstration
- mise à jour de la commande après succès

## Participants

- endpoint disponible
- uniquement commandes confirmées
- uniquement commandes avec consentement
- commandes gratuites consenties
- plusieurs participants
- JSON participants corrompu
- contrat de réponse attendu par le frontend

## Reçu e-mail

- identifiant invalide
- commande inexistante
- e-mail absent/invalide
- commande non confirmée
- e-mail différent de celui de la commande
- casse différente de l'e-mail
- commande gratuite
- langue française
- langue anglaise
- langue inconnue
- panne SMTP transformée en HTTP 502

## Application

- `/health`
- `/`
- route inexistante
- CORS origine autorisée
- CORS origine interdite
- requête sans Origin

## Tarification

- toutes les catégories
- quantité minimale
- quantité maximale
- quantité invalide
- montant exact
- montant falsifié
- catégorie inconnue
- période avant promotion
- début de promotion
- fin de promotion
- après promotion
- inférence du tarif par montant

## Base de données

- création des tables
- insertion/lecture commande
- insertion/lecture paiement
- colonnes ajoutées par migration

## Tests d'intégration fournisseur — IMPLÉMENTÉS (tests/integration/)

Les tests unitaires utilisent le mode `demo`. Les scénarios suivants sont couverts
par `npm run test:integration`, contre un faux serveur TIKORA fidèle à l'API
Partenaire (`tests/helpers/mock-tikora-server.js`) :

- HTTP 400/401/403/404/429/500 du fournisseur
- timeout fournisseur
- réponse non JSON
- réponse TIKORA illisible (commande sans identifiant)
- statut fournisseur inconnu
- échec du réseau après création du paiement
- `redirectUrl` invalide ou non HTTPS
- webhook fournisseur non reçu / reçu en double / signature invalide
- confirmation asynchrone après plusieurs interrogations

S'y ajoutent : parcours nominal complet (billets + QR TIKORA + reçu unique),
double clic concurrent (un seul débit), nouvel essai après refus, réservation
expirée, dérive de prix TIKORA, stock épuisé, faux webhook / ancienne route
/payments/callback, inscription gratuite, consentement de la liste publique,
anti-spam du reçu, en-têtes de sécurité, limitation de débit, démarrage refusé
en production avec une configuration dangereuse, contrat tarifaire
frontend ↔ backend.

## Tests de bout en bout (frontend/tests/e2e) et de charge (tests/load)

Voir `../PROCEDURE.md`.

## Régression démarrage serveur

- Importer `src/app.js` ne doit jamais ouvrir le port configuré dans `.env` (5000 par défaut).
- Le serveur HTTP est démarré uniquement par `npm start` / `node src/app.js`.
- Les tests d'intégration peuvent créer leur propre instance avec `app.listen(...)` sur leur port de test.
