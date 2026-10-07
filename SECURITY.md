# Sécurité — site des JCIA 2027

Ce document décrit les protections en place et **ce que le serveur de billetterie
devra obligatoirement faire** avant la vente réelle de billets.

## Signaler une faille

Écrire à **contact@jcia.cm** (objet : « Sécurité — site JCIA »). Merci de ne pas
publier la faille avant sa correction. Voir aussi `/.well-known/security.txt`.

## Protections en place dans le site (navigateur)

| Risque | Protection | Où |
|---|---|---|
| Injection de script (XSS) | React échappe tout texte ; aucun HTML brut, `eval` ni `innerHTML` (contrôlé par `npm run check:security`) | tout `src/` |
| XSS via des liens | Seules les adresses `/…`, `#…`, `mailto:`, `tel:`, `https://` deviennent des liens (`safeHref`) | `src/security/sanitize.js`, `src/i18n/rich.jsx` |
| Scripts étrangers | **Content-Security-Policy** stricte : scripts du site uniquement, aucun script en ligne | `security/headers.mjs` |
| Clickjacking | `frame-ancestors 'none'` + `X-Frame-Options: DENY` | en-têtes |
| Interception | HTTPS forcé (redirection + HSTS 2 ans), `upgrade-insecure-requests` | `.htaccess`, en-têtes |
| Fuite d'adresse | `Referrer-Policy: strict-origin-when-cross-origin` ; liens externes `rel="noopener noreferrer"` | en-têtes, composants |
| Fonctions sensibles | `Permissions-Policy` : caméra, micro, géolocalisation… désactivés | en-têtes |
| Données falsifiées dans le stockage local | Chaque commande relue est validée (format, montant = prix × quantité, statuts autorisés) ; 20 commandes max | `src/services/orders.js` |
| Paramètres d'URL piégés | Listes blanches (langue, catégorie, intervenant, tarif, code d'erreur) ; format strict des n° de commande | pages |
| Saisies abusives | Longueurs maximales, caractères invisibles retirés, noms et e-mails vérifiés | `CheckoutPage`, `sanitize.js` |
| Robots | Champ « pot de miel » invisible dans la commande | `CheckoutPage` |
| Double paiement | Envoi verrouillé pendant le paiement + en-tête `Idempotency-Key` = n° de commande | `CheckoutPage`, `payment.js` |
| Essais répétés | Après 3 échecs de paiement : pause de 60 s | `CheckoutPage` |
| API de paiement | HTTPS obligatoire, délai max 15 s, aucun cookie envoyé, réponses vérifiées, données minimales envoyées | `src/services/payment.js` |
| Code secret Mobile Money | **Jamais demandé** : validation sur le téléphone de l'utilisateur | parcours de paiement |
| Coordonnées de carte | Jamais écrites dans le stockage local ni journalisées : elles restent dans l'état du composant, sont passées **séparément de la commande** et envoyées en HTTPS au serveur. La commande ne garde que le réseau et les **4 derniers chiffres** (liste blanche à la relecture) | `CheckoutPage`, `card.js`, `orders.js` |
| Carte invalide ou faute de frappe | Réseau, longueur, **somme de Luhn**, date non dépassée et CVC vérifiés avant l'appel (sans jamais prétendre valider le paiement : seule la banque le fait) | `src/utils/card.js` |
| Redirection 3-D Secure détournée | L'adresse renvoyée par le serveur n'est suivie que si elle est en HTTPS **et** sur l'origine de l'API (`safeRedirectUrl`) | `src/services/payment.js` |
| E-mail de récapitulatif détourné | Le navigateur ne peut que *demander* l'envoi : il transmet l'identifiant de commande, jamais le contenu du message ; clé d'idempotence pour éviter les doublons | `src/services/email.js` |
| Fuite de carte dans un reçu | `validateOrder()` refuse toute commande contenant une suite de 13 à 19 chiffres ; tout texte inséré dans l'e-mail est échappé (test automatique) | `scripts/email/` |
| Identifiants SMTP | Uniquement dans l'environnement (jamais dans le dépôt), TLS exigé, certificat invalide refusé ; un test vérifie l'absence de mot de passe en dur | `scripts/email/send-receipt.mjs` |
| Fichiers image piégés | Signature binaire vérifiée (JPEG/PNG/WebP), 15 Mo et 50 Mpx max, image redessinée (métadonnées GPS retirées) ; la photo ne quitte pas l'appareil | `src/security/files.js` |
| Code source exposé | Pas de fichiers `.map` publiés ; `.env`, `.map`, `README.md` refusés par Apache | `vite.config.js`, `.htaccess` |
| Dépendances vulnérables | `npm run audit` (0 vulnérabilité au dernier contrôle) | `package.json` |
| Contenus tiers | La carte OpenStreetMap n'est chargée qu'après consentement | `src/consent/` |

## Contrôles automatiques

```bash
npm run build && npm run check:security   # règles du projet + site construit
npm run audit                             # failles connues des dépendances
npm run test:email                        # envoi réel du récapitulatif : contenu, échappement, aucune donnée de carte
```

## Côté serveur — état (octobre 2026)

Le serveur de billetterie (`../backend`, intégration TIKORA) applique désormais
les points ci-dessous ; détail et preuves (tests) dans `../PROCEDURE.md`.

| # | Exigence | État |
|---|---|---|
| 1 | Clés marchand côté serveur | ✅ `TIKORA_API_KEY` dans l'environnement du serveur uniquement |
| 2 | Montant recalculé | ✅ grille JCIA + contrôle du sous-total TIKORA (`TIKORA_PRICE_CHECK`) |
| 3 | Paiement vérifié auprès de l'opérateur | ✅ statut relu chez TIKORA (`GET /orders/{id}`) ; webhook = simple signal, signature HMAC vérifiée si configurée |
| 4 | Idempotence | ✅ verrou par commande + `Idempotency-Key` TIKORA |
| 5 | Limitation de débit IP **et** téléphone | ✅ |
| 6 | CORS restreint | ✅ refus de démarrer en production avec `*` |
| 7 | QR signés / billet utilisé | ✅ QR émis par TIKORA (statut `valid/used`) ; billets gratuits signés HMAC — ⚠️ application de contrôle d'accès hors périmètre |
| 8 | Flyer contrôlé côté serveur | ⚠️ non (visuel sans valeur d'accès) |
| 9 | Reçu envoyé par le serveur | ✅ automatique après paiement, renvoi limité |
| 10 | Données personnelles | ✅ logs masqués, aucune carte ; ⚠️ chiffrement du disque à activer chez l'hébergeur |
| 11 | CSP | ✅ `npm run sync:vercel` / `check:vercel` (CI) |

> **Cartes bancaires** : TIKORA n'encaisse que Mobile Money. En mode réel, le
> choix « carte » est masqué et le serveur refuse toute donnée de carte
> (`CARD_NOT_SUPPORTED`). Les protections « carte » ci-dessus ne concernent plus
> que le mode démonstration.

## Rappel historique — exigences serveur fixées avant la vente réelle

Le navigateur de l'utilisateur ne doit **jamais** être cru sur parole. Le serveur de
billetterie (appelé par `VITE_PAYMENT_API_URL`) doit :

1. **Garder les clés marchand** (MTN MoMo, Orange Money ou agrégateur) côté serveur uniquement, dans un coffre de secrets. Ne jamais les mettre dans une variable `VITE_` : elles seraient publiques.
2. **Recalculer le montant** à partir du tarif et de la quantité — ne jamais utiliser le montant envoyé par le navigateur.
3. **Vérifier chaque paiement auprès de l'opérateur** (webhook signé + vérification de la signature, puis requête de statut) avant d'émettre un billet.
4. **Respecter l'`Idempotency-Key`** : une même commande ne peut créer qu'un seul paiement.
5. **Limiter le débit** (rate limiting) par IP et par numéro de téléphone sur `POST /payments`.
6. **Autoriser uniquement l'origine du site** en CORS (`Access-Control-Allow-Origin: https://www.jcia.cm`).
7. **Signer les QR codes** (jeton signé, ex. HMAC ou JWT) et les vérifier au contrôle d'accès ; marquer un billet « utilisé » après scan.
8. **Contrôler l'accès au générateur de flyer** côté serveur (billet confirmé).
9. **N'envoyer le récapitulatif que depuis le serveur** (`POST /orders/:id/receipt`) : relire la commande côté serveur, refuser si elle n'est pas payée, limiter le débit et l'idempotence par commande, et ne jamais construire le message à partir de données envoyées par le navigateur. Les coordonnées de carte ne doivent apparaître **dans aucun e-mail, aucun journal, aucune sauvegarde** : seuls le réseau et les 4 derniers chiffres.
10. **Protéger les données personnelles** : HTTPS, chiffrement au repos, accès restreint, durées de conservation de la politique de confidentialité, journalisation sans numéro complet ni e-mail en clair.
11. **Ajouter l'origine de l'API** dans la CSP : automatique pour `_headers` et `.htaccess` (lue depuis `VITE_PAYMENT_API_URL` au build) ; à ajouter à la main dans `vercel.json` et la configuration Nginx.
