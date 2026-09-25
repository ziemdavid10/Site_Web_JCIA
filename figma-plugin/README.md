# Maquette Figma éditable + prototype — JCIA 2027

Ce dossier est un **plugin Figma** qui construit, dans votre fichier Figma, la maquette complète du site
en calques natifs **modifiables** (cadres, textes, vecteurs, images), le design system et le prototype cliquable.

## Importer la maquette (3 minutes)

1. Ouvrir **Figma Desktop** (l'application ; l'import de plugin en développement n'existe pas dans le navigateur).
2. Créer un fichier de design vide.
3. Menu **Plugins › Development › Import plugin from manifest…** et choisir `figma-plugin/manifest.json`.
4. Lancer **Plugins › Development › JCIA 2027 — Maquette & prototype**, puis **Construire la maquette**.
   Comptez 2 à 5 minutes (≈ 23 000 calques).

> La police **Sora** (Google Fonts) est disponible dans Figma. Si elle manque, le plugin utilise Inter.

## Ce que vous obtenez

| Page Figma | Contenu |
|---|---|
| 0 · Design system | 19 styles de couleur, 9 styles de texte, 14 composants (boutons, cartes billet, carte intervenant, logo partenaire, billet électronique…) |
| 1 · Desktop | 17 écrans en 1 440 px, reliés entre eux (prototype) |
| 2 · Mobile | 12 écrans en 390 px, reliés entre eux (prototype) |
| 3 · Thème sombre | 8 écrans (accueil, intervenants, billetterie, flyer) |

Chaque calque porte le **nom de sa classe CSS** (ex. `tier-card`, `speaker-card`) : on retrouve
immédiatement le composant correspondant dans le code (`src/`).

## Le prototype

- Ouvrir la page **1 · Desktop** (ou **2 · Mobile**), onglet **Prototype** : choisir l'appareil
  (*Desktop* ou *iPhone 14*), puis **▶ Présenter**.
- Parcours prêts : **Parcours visiteur** (accueil → pages) et **Achat de billet → flyer**
  (Billetterie → Commande → Paiement → Confirmation → Mon flyer).
- Tous les liens du menu, du pied de page et des boutons mènent au bon écran. L'écran
  **Paiement** passe tout seul à la **Confirmation** après 2,5 s (validation sur le téléphone simulée).
- L'en-tête reste fixé en haut pendant le défilement.

## Mettre à jour la maquette après une modification du site

```bash
npm run build && npm run preview        # dans un terminal
npm run figma:export                    # dans un autre (nécessite : npx playwright install chromium)
```

`ui.html` est régénéré : relancez le plugin dans un nouveau fichier Figma.

## Fichiers

| Fichier | Rôle |
|---|---|
| `manifest.json` | Déclaration du plugin (aucun accès réseau) |
| `code.js` | Construit les calques, styles, composants et liens du prototype |
| `ui.template.html` | Interface du plugin (modèle) |
| `ui.html` | Interface + données de la maquette (généré par `npm run figma:export`) |
| `apercu-maquette.jpg` | Aperçu des écrans |
