# Site web — JCIA 2027

**Journées Camerounaises de l'Intelligence Artificielle** · 3e édition
27 & 28 avril 2027 · Hilton Hotel, Yaoundé
*L'IA Made in Cameroun : « Penser l'Intelligence Artificielle au Cameroun, pour le Cameroun »*

Site bilingue (français / anglais) avec thème clair / sombre, développé avec **React 19 + Vite 8 + SCSS** selon une approche par composants.

---

## Démarrage

```bash
npm install          # installer les dépendances
npm run dev          # serveur de développement → http://localhost:5173
npm run build        # build de production → dossier dist/
npm run preview      # prévisualiser le build
npm run lint         # vérifier le code (ESLint)
npm run check:i18n   # vérifier que l'anglais a exactement la même structure que le français
npm run check:security # contrôle de sécurité (après npm run build)
npm run audit        # failles connues des dépendances
npm run figma:export # régénérer la maquette Figma (site lancé avec npm run preview)
```

## Fonctionnalités

| Fonctionnalité | Où ? |
|---|---|
| **Langues FR / EN** : sélecteur dans l'en-tête et le menu mobile ; détection automatique (navigateur), choix mémorisé, lien partageable `?lang=en` | `src/i18n/` |
| **Thème clair / sombre** : suit le réglage du système par défaut, bascule animée (soleil → lune), choix mémorisé, aucun flash au chargement | `src/theme/`, `src/styles/base/_themes.scss` |
| **Bandeau cookies + préférences** : Tout accepter / Tout refuser / Personnaliser, par catégorie ; consentement conservé 6 mois ; lien « Gérer les cookies » dans le pied de page | `src/consent/` |
| **Contenus tiers bloqués sans accord** : la carte OpenStreetMap ne se charge qu'après consentement (encart « Afficher la carte ») | `Registration.jsx` |
| **Pages légales** : politique de confidentialité, conditions d'utilisation, politique de cookies (sommaire collant, tableaux adaptés au mobile) | `src/pages/LegalPage/` |
| **Pages d'erreur** 400, 401, 403, 404, 408, 429, 500, 502, 503 | `src/pages/ErrorPage/`, `public/errors/` |
| **Filet de sécurité** : une erreur JavaScript affiche la page 500 au lieu d'un écran blanc | `src/components/layout/ErrorBoundary.jsx` |
| **États de chargement** : écran d'accueil animé (avant le JavaScript), indicateur pendant le chargement des pages secondaires | `index.html`, `src/components/ui/Loader/` |
| **Pages détaillées** : chaque section de l'accueil a sa page (À propos, Programme, Intervenants, Salon, Awards, Catalogue, Partenaires, FAQ), avec fil d'Ariane, sommaire collant et lien « En savoir plus » depuis l'accueil | `src/pages/*Page/`, `src/components/page/` |
| **Billetterie** : choix du tarif, commande (quantité, participants), paiement MTN Mobile Money / Orange Money (mode démo tant que l'API n'est pas branchée), confirmation avec billets à QR code, impression, ajout à l'agenda | `src/pages/TicketsPage/`, `CheckoutPage/`, `ConfirmationPage/`, `src/services/` |
| **Flyer « J'y serai »** : réservé aux billets confirmés ; photo (glisser-déposer, zoom, recadrage), nom, titre, 3 formats (4:5, 9:16, 1:1), 3 ambiances ; export PNG, partage natif ; la photo ne quitte jamais l'appareil | `src/pages/FlyerPage/`, `src/components/tickets/flyerRenderer.js` |
| **Intervenants** : catégories cliquables → cartes (photo, thème, propos, créneau) → fiche détaillée ; recherche et lien partageable sur /intervenants | `src/components/speakers/`, `src/data/speakers.js` |
| **Logos des partenaires et médias** : logo officiel (si fourni) + nom, sinon monogramme | `src/components/ui/PartnerLogo/`, `src/data/partners.js`, `public/images/partners/` |
| **Sécurité** : CSP stricte et en-têtes HTTP générés au build, validations, anti-robots, fichiers vérifiés — voir `SECURITY.md` | `security/`, `src/security/` |
| **Motifs Ndop** : lisière tissée (`NdopBand`) sous les bandeaux et en haut du pied de page, textures `ndop-royal` en filigrane, trame et lisière sur le flyer | `src/components/ui/NdopBand/`, `src/components/ui/PatternBg/` |
| **Maquette Figma éditable + prototype** : plugin qui reconstruit tous les écrans, le design system et les liens | `figma-plugin/`, `scripts/figma-export.mjs` |
| **Recherche dans la FAQ** : plein texte (insensible aux accents) + filtres par catégorie | `src/pages/FaqPage/` |
| **Responsive** : téléphone, tablette, laptop, desktop, grand écran (≥ 1536), écran large (≥ 1920) et 2K/4K (≥ 2400) | `src/styles/abstracts/_variables.scss` |

### Routes

| URL | Page |
|---|---|
| `/` | Accueil (toutes les sections, en résumé) |
| `/a-propos` · `/programme` · `/intervenants` · `/salon` · `/awards` · `/catalogue` · `/partenaires` · `/faq` | Pages détaillées |
| `/billetterie` | Choix du tarif |
| `/billetterie/commande/:tarif` | Commande et paiement (`etudiant`, `standard`, `professionnel`) |
| `/billetterie/confirmation/:commande` | Billets électroniques |
| `/mon-flyer` | Générateur du flyer « J'y serai » |
| `/confidentialite` | Politique de confidentialité |
| `/conditions-utilisation` | Conditions d'utilisation |
| `/cookies` | Politique de cookies |
| `/erreur/:code` | Page d'erreur (ex : `/erreur/503`) |
| toute autre URL | 404 |

## Structure du projet

```
src/
├── main.jsx                  Point d'entrée : routeur + fournisseurs (langue, thème, consentement)
├── App.jsx                   Table de routage
├── i18n/
│   ├── I18nProvider.jsx      Langue courante, <html lang>, meta description
│   ├── context.js            Hook useI18n()
│   ├── rich.jsx              Mise en forme des textes : *mis en valeur*, **gras**, [lien](/url)
│   └── locales/
│       ├── fr/               ✏️  TOUS LES TEXTES EN FRANÇAIS
│       │   ├── common.js     Interface : menu, pied de page, cookies, chargement
│       │   ├── home.js       Contenu de l'accueil (programme, awards…)
│       │   ├── pages.js      Contenu des pages détaillées (dont toutes les questions de la FAQ)
│       │   ├── tickets.js    Billetterie, paiement, confirmation, flyer
│       │   ├── legal.js      Pages légales
│       │   └── errors.js     Pages d'erreur
│       └── en/               ✏️  Mêmes fichiers en anglais
├── theme/                    ThemeProvider + hook useTheme()
├── consent/                  ConsentProvider, bandeau, fenêtre de préférences, hook useConsent()
├── data/config.js            Données sans langue : dates, liens, contacts, routes, codes d'erreur
├── pages/                    Une page = un dossier : HomePage, AboutPage, ProgrammePage, SpeakersPage,
│                             SalonPage, AwardsPage, CataloguePage, PartnersPage, FaqPage, TicketsPage,
│                             CheckoutPage, ConfirmationPage, FlyerPage, LegalPage, ErrorPage
├── services/                 orders.js (commandes), payment.js (Mobile Money : démo / API réelle)
├── components/
│   ├── ui/                   Briques réutilisables (Button, Icon, SectionHeader, Reveal, Countdown,
│   │                         Frise, PatternBg, NeuralCanvas, Marquee, Loader, ThemeToggle,
│   │                         LangSwitch, SectionLink)
│   ├── page/                 Kit des pages détaillées : PageHero, Toc, PageSection, CtaBand, IconCards, Steps…
│   ├── tickets/              OperatorBadge, PaymentDialog, flyerRenderer (dessin du flyer sur canvas)
│   ├── layout/               Layout, Header, Footer, BackToTop, ScrollManager, ErrorBoundary
│   └── sections/             Une section = un dossier (JSX + SCSS co-localisés)
├── hooks/                    useCountdown, useInView, useScrollSpy, useScrollPosition, useCountUp, useDocumentMeta
├── utils/                    calendar.js (.ics), storage.js (localStorage sécurisé), money.js (FCFA), phone.js (numéros camerounais)
├── styles/
│   ├── abstracts/            Design tokens et mixins (aucune sortie CSS)
│   ├── base/                 Reset, thèmes, styles globaux, animations
│   └── main.scss
└── assets/images/            brand/ (logos, mascotte, carte) · motifs/ (illustrations africaines)
public/
├── documents/                TDR CAIA 2027 et dossier de partenariat (PDF)
├── errors/                   Pages d'erreur statiques servies par l'hébergeur → /erreur/:code
├── images/                   Favicons, image de partage, logo du préchargement
├── .htaccess                 Configuration Apache (SPA, erreurs, cache, HTTPS)
├── _redirects                Configuration Netlify
├── robots.txt · sitemap.xml
vercel.json                   Configuration Vercel
scripts/check-i18n.mjs        Contrôle de cohérence des traductions
```

## Modifier le contenu

**Aucun texte n'est écrit en dur dans les composants.** Tout se modifie dans `src/i18n/locales/fr/` et `src/i18n/locales/en/` (mêmes clés dans les deux langues), puis `npm run check:i18n` pour vérifier.

- **Mettre un mot en valeur dans un titre** : l'entourer d'astérisques, ex. `'Deux journées *intensives*'`.
- **Ajouter les intervenants** : remplir `speakers.list` dans `home.js` (fr et en) ; la section bascule automatiquement des « profils attendus » à la grille.
- **Réseaux sociaux, téléphones, e-mails, dates** : `src/data/config.js`.
- **Ajouter une langue** : copier `locales/en/` vers `locales/xx/`, traduire, puis l'enregistrer dans `locales/index.js`.

## Thème : ajouter des couleurs

Les composants utilisent des couleurs **sémantiques** (`$surface`, `$text`, `$text-soft`, `$border`…) qui pointent vers des variables CSS définies pour chaque thème dans `src/styles/base/_themes.scss`. Pour ajuster le thème sombre, il suffit de modifier les valeurs du bloc `[data-theme='dark']`. Les sections « signature » (hero, chiffres, awards, inscription) restent bleu nuit dans les deux thèmes.

## Cookies et consentement

| Catégorie | Contenu | Par défaut |
|---|---|---|
| `necessary` | langue, thème, choix de cookies, billets sur l'appareil | toujours actif |
| `media` | carte OpenStreetMap | désactivé |
| `analytics` | mesure d'audience (aucun outil installé) | désactivé |

Pour brancher un outil d'audience plus tard : `const { has } = useConsent(); if (has('analytics')) { /* charger le script */ }`.
Modifier `CONFIG.consentVersion` redemande le consentement à tous les visiteurs.

## Intervenants

Les **16 profils actuels sont des exemples** (noms fictifs, badge « Exemple »). Pour publier la liste officielle :
remplacer les objets de `src/data/speakers.js` (`example: false`), déposer les photos carrées (600 × 600, WebP)
dans `src/assets/images/speakers/` et les importer, puis écrire fonction, thème, propos et biographie dans
`src/i18n/locales/fr/speakers.js` et `en/speakers.js`.

## Logos des partenaires

Déposer chaque logo officiel (SVG de préférence) dans `public/images/partners/`, puis indiquer son nom de fichier
dans `src/data/partners.js` (ex. `'crtv': 'crtv.svg'`). Sans fichier, un monogramme aux couleurs des JCIA s'affiche.

## Sécurité

Voir **`SECURITY.md`** : protections en place, contrôles automatiques et 10 obligations pour le futur serveur de billetterie.
La Content-Security-Policy est définie une seule fois dans `security/headers.mjs` et injectée au build
(balise `<meta>`, `dist/_headers`, `dist/.htaccess`) ; `vercel.json` reprend les mêmes valeurs.

## Maquette Figma

Voir **`figma-plugin/README.md`** : import du plugin dans Figma Desktop, pages construites, prototype.

## Billetterie et paiement Mobile Money

**Tarifs** : `CONFIG.tickets` dans `src/data/config.js` (prix en FCFA, quantité maximale, billet mis en avant) ; libellés et avantages dans `locales/*/tickets.js`.

**Paiement** (`src/services/payment.js`) :

- **Mode démonstration** (par défaut) : le parcours complet est simulé, aucune somme n'est débitée. Un numéro se terminant par `0000` simule un refus, pour tester l'écran d'échec.
- **Mode réel** : renseigner `VITE_PAYMENT_API_URL` dans `.env`. Le serveur de billetterie expose :
  - `POST /payments` ← `{ orderId, amount, currency, operator, phone, customer, description }` → `{ paymentId }`
  - `GET /payments/:id` → `{ status: 'PENDING' | 'SUCCESSFUL' | 'FAILED', transactionId, reason? }`

  Il appelle l'API de l'opérateur (MTN MoMo Collection « Request to Pay », Orange Money WebPay) ou d'un agrégateur (Campay, Notch Pay, CinetPay, Monetbil…), vérifie le paiement via webhook, puis émet le billet et l'envoie par e-mail. **Les clés marchand ne doivent jamais être dans le site.** Le code secret Mobile Money n'est jamais demandé : l'utilisateur valide sur son téléphone.

**Commandes** (`src/services/orders.js`) : en démonstration, elles sont gardées sur l'appareil (`localStorage`, clé `jcia-orders`). En production, la confirmation, les QR codes (jeton signé) et l'accès au générateur de flyer doivent être contrôlés par le serveur.

### Quotas et disponibilité

Chaque tarif porte un **quota** dans `CONFIG.tickets.tiers` (`quota`, `sold`, `maxQty`) :

| Tarif | Prix | Quota | Maximum par commande |
| --- | --- | --- | --- |
| Étudiant | 5 000 FCFA | 1 500 | 5 |
| Standard | 15 000 FCFA | 3 000 | 10 |
| Professionnel | 50 000 FCFA | 500 | 10 |

`src/utils/tickets.js` en déduit les places restantes (`remainingSeats`), le plafond réel d'une commande (`maxQuantity` = le plus petit de `maxQty` et du stock), l'alerte « Plus que N places » (`isLowStock`, ≤ 15 %) et l'état « Complet » (`isSoldOut` — carte grisée, bouton désactivé, tarif non sélectionnable dans la commande). **Le navigateur ne fait jamais foi sur les stocks** : en production, `sold` vient du serveur (`GET /tickets/availability`) et la disponibilité est revérifiée avant chaque paiement.

### Option « En ligne » (gratuite) — désactivée

Le tarif gratuit est retiré de la vente : le flyer « J'y serai » est réservé aux billets payants (`canGenerateFlyer` = paiement `paid`). Tout le code correspondant est **conservé en commentaire** et la marche à suivre pour le réactiver est décrite en tête de `CONFIG.tickets` (`src/data/config.js`) : ligne du tarif, blocs des fichiers de langue (`tickets.js`, `pages.js`, `legal.js`) et colonne du tableau comparatif.

## Flyer « J'y serai »

Dessiné en 1080 px dans le navigateur (`flyerRenderer.js`) : logo, « J'Y SERAI ! », photo ronde cerclée aux 4 couleurs de la marque, nom et titre, date, lieu, thème, hashtag et frise. Les positions de chaque format sont réglables dans l'objet `LAYOUTS`, les ambiances dans `FLYER_STYLES`.

## Déploiement

Le dossier `dist/` est un site statique.

- **Apache / OVH / cPanel** : `public/.htaccess` est copié dans `dist/` (redirection des URL vers `index.html`, pages d'erreur, cache, HTTPS).
- **Netlify** : `public/_redirects` est pris en compte automatiquement.
- **Vercel** : `vercel.json` à la racine.
- **Nginx** :

  ```nginx
  location / { try_files $uri $uri/ /index.html; }
  error_page 400 /errors/400.html;  error_page 401 /errors/401.html;
  error_page 403 /errors/403.html;  error_page 404 /errors/404.html;
  error_page 500 /errors/500.html;  error_page 502 /errors/502.html;
  error_page 503 /errors/503.html;
  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
  # En-têtes de sécurité : copier les valeurs de dist/_headers (générées au build), par exemple :
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
  # add_header Content-Security-Policy "…valeur de dist/_headers…" always;
  ```

## ⚠️ Avant la mise en ligne

- Faire **valider les pages légales** par le conseil juridique de l'IAC – CAIPI (rédigées sur la base de la Loi n° 2024/017 du 23 décembre 2024) et compléter la mention **[À compléter : hébergeur]** dans les conditions d'utilisation.
- Remplacer les URL génériques des **réseaux sociaux** (`src/data/config.js`).
- Remplacer les PDF de travail (BAT) de `public/documents/` par les versions définitives.
- **Valider les tarifs et les quotas** des billets (indicatifs) et les **préfixes opérateurs** (`CONFIG.payment.operators`).
- **Brancher l'API de paiement** (`VITE_PAYMENT_API_URL`) et déplacer côté serveur la vérification des commandes et l'accès au flyer (voir `SECURITY.md`).
- Remplacer les **intervenants d'exemple** et déposer les **logos officiels** des partenaires et médias.

## Accessibilité et performance

- Navigation clavier complète, lien d'évitement, onglets / accordéon / fenêtre modale conformes WAI-ARIA, focus visible, `lang` mis à jour.
- `prefers-reduced-motion` et `prefers-color-scheme` respectés.
- Pages secondaires chargées à la demande ; police auto-hébergée ; images WebP ; canvas mis en pause hors écran.
- SEO : balises meta, Open Graph, `schema.org/Event`, `robots.txt`, `sitemap.xml`, pages d'erreur en `noindex`.

## Crédits

Illustrations africaines : Freepik (licence Premium fournie — usage web autorisé, revente interdite).
Organisation : Intelligence Artificielle Cameroun (IAC) – Cameroon Artificial Intelligence Policy Institute (CAIPI).
