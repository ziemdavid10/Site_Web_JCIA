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
| **Billetterie** : 4 tarifs (dont un billet « En ligne »), quotas et places restantes, bouton « Épuisé » quand le quota est vendu, commande (quantité, participants), paiement Mobile Money **ou carte Visa / Mastercard**, confirmation avec billets à QR code, impression, ajout à l'agenda | `src/pages/TicketsPage/`, `CheckoutPage/`, `ConfirmationPage/`, `src/utils/tickets.js`, `src/services/` |
| **Communauté Cameroon AI Network** : section dédiée et bouton « Rejoindre la communauté » vers le forum WhatsApp officiel | `src/components/sections/Community/` |
| **Participants inscrits** : section « Ils y seront » et page `/participants` — filtres par profil, recherche, compteur ; n'affiche que les personnes ayant coché l'accord d'affichage public au moment de leur commande | `src/components/sections/Attendees/`, `src/components/attendees/`, `src/data/attendees.js`, `src/services/attendees.js` |
| **Paquets de photos** : 3 à 4 tirages empilés qui se relaient (À propos, Salon, Awards), au clic ou toutes les 5 s, en pause au survol et immobiles si le système demande moins d'animations | `src/components/ui/PhotoStack/` |
| **Soutien** : bouton « Donate » dans la barre de navigation (libellé complet sur tablette et très grand écran, cœur seul entre les deux), dans le menu mobile et dans le pied de page | `src/components/layout/Header/`, `src/data/config.js` |
| **Galerie photos** : dernière section de l'accueil, filtres par édition (2025, 2023), visionneuse au clavier (Échap, ← →), images WebP en deux tailles chargées paresseusement | `src/components/sections/Gallery/`, `src/data/gallery.js`, `public/images/gallery/` |
| **Flyer « J'y serai »** : réservé aux billets confirmés ; photo (glisser-déposer, zoom, recadrage), nom, titre, 3 formats (4:5, 9:16, 1:1), 3 ambiances ; export PNG, partage natif ; la photo ne quitte jamais l'appareil | `src/pages/FlyerPage/`, `src/components/tickets/flyerRenderer.js` |
| **Intervenants** : catégories cliquables → cartes (photo, thème, propos, créneau) → fiche détaillée ; recherche et lien partageable sur /intervenants | `src/components/speakers/`, `src/data/speakers.js` |
| **Logos des partenaires et médias** : 20 logos officiels fournis par l'organisateur + nom, monogramme en repli ; chaque logo est contenu dans une pastille blanche (`object-fit: contain`, jamais déformé ni débordant, quel que soit son format) ; **IAC – CAIPI** (organisateur) et **Road to Geneva AI Summit** (label international) mis en avant | `src/components/ui/PartnerLogo/`, `src/data/partners.js`, `public/images/partners/` |
| **Sécurité** : CSP stricte et en-têtes HTTP générés au build, validations, anti-robots, fichiers vérifiés — voir `SECURITY.md` | `security/`, `src/security/` |
| **Motifs Ndop** : lisière tissée (`NdopBand`) sous les bandeaux et en haut du pied de page, textures `ndop-royal` en filigrane, trame et lisière sur le flyer | `src/components/ui/NdopBand/`, `src/components/ui/PatternBg/` |
| **Maquette Figma éditable + prototype** : plugin qui reconstruit tous les écrans, le design system et les liens | `figma-plugin/`, `scripts/figma-export.mjs` |
| **Recherche dans la FAQ** : plein texte (insensible aux accents) + filtres par catégorie | `src/pages/FaqPage/` |
| **Responsive** : téléphone, tablette, laptop, desktop, grand écran (≥ 1536), écran large (≥ 1920) et 2K/4K (≥ 2400) | `src/styles/abstracts/_variables.scss` |

### Routes

| URL | Page |
|---|---|
| `/` | Accueil (toutes les sections, en résumé) |
| `/a-propos` · `/programme` · `/intervenants` · `/participants` · `/salon` · `/awards` · `/catalogue` · `/partenaires` · `/faq` | Pages détaillées |
| `/billetterie` | Choix du tarif |
| `/billetterie/commande/:tarif` | Commande et paiement (`etudiant`, `standard`, `en-ligne`, `professionnel`) |
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

## Identité de l'événement et contacts

- **Titre du Hero** : le nom complet de l'événement en grand, l'organisateur (« Intelligence Artificielle Cameroun — Cameroon AI Policy Institute ») en petites capitales juste en dessous.
- **Carte du Cameroun** : extraite du logo officiel par `scripts/logo/build-logo.py` (elle alimente le Hero, la section Thème, la page À propos et le flyer) — elle est donc, au pixel près, celle du logo.
- **Bandeau d'annonce** : « Inscriptions ouvertes — JCIA 2027 », qui mène à la billetterie.
- **Cameroon AI Awards** : nom complet employé partout ; le compte à rebours de la section Awards vise désormais l'**ouverture** des candidatures (`CONFIG.awardsStart`, 15 novembre 2026).
- **Coordonnées** : `contact@jciacm.com`, `jcia@iacameroun.com`, (+237) 699 089 937 et 677 238 022 — tous cliquables (`mailto:` / `tel:`).
- **Réseaux** : LinkedIn, Facebook, YouTube, TikTok et le forum WhatsApp de la communauté.
- **Contacter en deux gestes** : partout où le site propose d'écrire, un bouton « Appeler le secrétariat » (`<CallButton />`) propose l'appel.

## Participants inscrits

La page `/participants` et la section « Ils y seront » n'affichent que les personnes ayant coché **« Afficher mon nom dans la liste publique des participants »** au moment de leur commande (case décochée par défaut). Seuls le nom, l'organisation, la ville et le profil sont publiés — jamais l'e-mail, le téléphone ni le numéro de billet, et le retrait se fait sur simple demande.

En démonstration, la liste combine les commandes confirmées sur l'appareil (`src/services/attendees.js`) et un jeu d'exemple (`src/data/attendees.js`). En production, elle doit venir du serveur de billetterie (`GET /attendees`), seul juge de ce qui est publiable.

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

| Tarif | Prix | Quota | Maximum par commande | Accès |
| --- | --- | --- | --- | --- |
| Étudiant | 2 500 FCFA | 1 500 | 5 | Hilton |
| Standard | 5 000 FCFA | 3 000 | 10 | Hilton |
| En ligne | 15 000 FCFA | 5 000 | 5 | Retransmission + replay 30 jours |
| Professionnel | 25 000 FCFA | 500 | 10 | Hilton + avantages premium |

`src/utils/tickets.js` en déduit les places restantes (`remainingSeats`), le plafond réel d'une commande (`maxQuantity` = le plus petit de `maxQty` et du stock), l'alerte « Plus que N places » (`isLowStock`, ≤ 15 %) et l'état épuisé (`isSoldOut`). Le nombre de places restantes est affiché **en permanence** sur chaque carte, dans l'en-tête du comparatif et dans l'aperçu de l'accueil ; dès que le quota est vendu, la carte est grisée, porte le ruban « Complet » et le bouton devient **« Épuisé »** (désactivé, tarif non sélectionnable dans la commande). **Le navigateur ne fait jamais foi sur les stocks** : en production, `sold` vient du serveur (`GET /tickets/availability`) et la disponibilité est revérifiée avant chaque paiement.

### Moyens de paiement

MTN Mobile Money, Orange Money, **Visa** et **Mastercard**. Le choix se fait au bloc 3 de la commande : Mobile Money demande l'opérateur et le numéro à débiter ; la carte **n'est jamais saisie sur le site** — le serveur de billetterie crée la session et renvoie l'adresse de la page sécurisée (3-D Secure) de la banque, vérifiée par `safeRedirectUrl()` (HTTPS + même origine que l'API) avant toute redirection. Aucune donnée de carte ne transite donc par le site (exigence PCI-DSS).

Les pastilles Visa / Mastercard sont typographiques, comme celles des opérateurs : déposer les logos officiels des réseaux une fois les kits de marque obtenus.

### Interrupteurs de mise en production

Le site est livré en production avant que tout soit prêt. Trois booléens dans `CONFIG.features` (`src/data/config.js`) suffisent à rallumer chaque brique :

Les trois drapeaux sont à **`true`** dans la version livrée : la billetterie, les téléchargements et la liste des intervenants sont ouverts. Les repasser à `false` referme proprement la brique correspondante.

| Drapeau | `false` | `true` (état livré) |
| --- | --- | --- |
| `payment` | Billetterie consultable (tarifs, quotas, places restantes) ; bandeau « Ouverture prochaine », boutons « Bientôt disponible », `/billetterie/commande/*` affiche un message et renvoie vers le secrétariat | Parcours complet commande → paiement → confirmation → flyer |
| `documentDownloads` | Boutons TDR (appel à candidatures CAIA) et dossier de partenariat grisés (`<button disabled>` + pastille « Bientôt »), liens neutralisés dans le pied de page | Téléchargement des PDF |
| `speakerDirectory` | Catégories d'intervenants visibles mais non cliquables, message d'attente, aucune fiche rendue (même avec un paramètre d'URL) | Cartes, recherche et fiches détaillées |

## Flyer « J'y serai »

Dessiné en 1080 px dans le navigateur (`flyerRenderer.js`) : logo, « J'Y SERAI ! », photo ronde cerclée aux 4 couleurs de la marque, nom et titre, date, lieu, thème, hashtag et frise. Les positions de chaque format sont réglables dans l'objet `LAYOUTS`, les ambiances dans `FLYER_STYLES`.

## Logo

Le logo officiel fourni par l'organisateur (carte du Cameroun + sigle JCIA + « JOURNÉES CAMEROUNAISES DE L'INTELLIGENCE ARTIFICIELLE » + « Hilton, Yaoundé – 27 & 28 Avril 2027 ») est utilisé partout : en-tête, pied de page, écran de chargement, billet électronique, flyer, page de commande et image de partage.

L'accent fautif de « INT**É**LLIGENCE » a été retiré (celui de « JOURNÉES » est, lui, correct), le fond a été détouré et deux déclinaisons sont générées :

| Fichier | Rôle |
| --- | --- |
| `src/assets/images/brand/logo-jcia.webp` (1200 × 495) | Couleur — thème clair, flyer |
| `src/assets/images/brand/logo-jcia-white.webp` | Thème sombre : le bleu nuit du sigle et le noir du sous-titre passent au blanc ; la carte garde ses couleurs (orange, turquoise, violet, latérite) et les dates restent orange |
| `…-sm.webp` (520 × 215) | Mêmes visuels en petite taille (en-tête, pied de page, billet) |
| `public/images/logo-jcia-white.webp` | Écran de chargement (avant le JavaScript) |
| `public/images/og-jcia-2027.jpg` (1200 × 630) | Aperçu lors d'un partage sur les réseaux |

Le basculement clair / sombre est automatique : l'en-tête superpose les deux images en fondu (`.header__logo-img`), le pied de page et les pages utilisent `<ThemeImg light dark />`.

En cas de nouveau fichier fourni par l'organisateur, régénérer les cinq images avec le script livré plutôt que de les retoucher à la main :

```bash
pip install pillow scipy numpy
python3 scripts/logo/build-logo.py chemin/vers/logo-officiel.jpg
```

Il retire l'accent fautif, détoure le fond, fabrique la déclinaison blanche et écrit les cinq fichiers aux bonnes tailles.

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
- **Valider les tarifs et les quotas** des billets et les **préfixes opérateurs** (`CONFIG.payment.operators`).
- **Brancher la liste des participants** sur le serveur de billetterie (`GET /attendees`) : elle ne doit contenir que les inscrits ayant coché l'accord d'affichage public.
- **Rallumer les trois interrupteurs** de `CONFIG.features` au fur et à mesure : paiement, téléchargements, liste des intervenants.
- Déposer les **logos officiels Visa et Mastercard** (kits de marque des réseaux) et les logos des **médias**.
- Vérifier les **droits de diffusion des photos** de la galerie (personnes identifiables) et compléter les légendes si besoin.
- **Brancher l'API de paiement** (`VITE_PAYMENT_API_URL`) et déplacer côté serveur la vérification des commandes et l'accès au flyer (voir `SECURITY.md`).
- Remplacer les **intervenants d'exemple** par la liste officielle du Comité Scientifique.

## Accessibilité et performance

- Navigation clavier complète, lien d'évitement, onglets / accordéon / fenêtre modale conformes WAI-ARIA, focus visible, `lang` mis à jour.
- `prefers-reduced-motion` et `prefers-color-scheme` respectés.
- Pages secondaires chargées à la demande ; police auto-hébergée ; images WebP ; canvas mis en pause hors écran.
- SEO : balises meta, Open Graph, `schema.org/Event`, `robots.txt`, `sitemap.xml`, pages d'erreur en `noindex`.

## Crédits

Illustrations africaines : Freepik (licence Premium fournie — usage web autorisé, revente interdite).
Organisation : Intelligence Artificielle Cameroun (IAC) – Cameroon Artificial Intelligence Policy Institute (CAIPI).
