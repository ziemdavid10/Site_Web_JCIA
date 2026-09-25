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
| Fichiers image piégés | Signature binaire vérifiée (JPEG/PNG/WebP), 15 Mo et 50 Mpx max, image redessinée (métadonnées GPS retirées) ; la photo ne quitte pas l'appareil | `src/security/files.js` |
| Code source exposé | Pas de fichiers `.map` publiés ; `.env`, `.map`, `README.md` refusés par Apache | `vite.config.js`, `.htaccess` |
| Dépendances vulnérables | `npm run audit` (0 vulnérabilité au dernier contrôle) | `package.json` |
| Contenus tiers | La carte OpenStreetMap n'est chargée qu'après consentement | `src/consent/` |

## Contrôles automatiques

```bash
npm run build && npm run check:security   # règles du projet + site construit
npm run audit                             # failles connues des dépendances
```

## ⚠️ À faire côté serveur avant la vente réelle

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
9. **Protéger les données personnelles** : HTTPS, chiffrement au repos, accès restreint, durées de conservation de la politique de confidentialité, journalisation sans numéro complet ni e-mail en clair.
10. **Ajouter l'origine de l'API** dans la CSP : automatique pour `_headers` et `.htaccess` (lue depuis `VITE_PAYMENT_API_URL` au build) ; à ajouter à la main dans `vercel.json` et la configuration Nginx.
