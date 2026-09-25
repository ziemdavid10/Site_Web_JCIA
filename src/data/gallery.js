/**
 * Galerie photos — éditions précédentes des JCIA (données sans langue).
 *
 * Les photos viennent du dossier officiel « LOGOS – PHOTOS JCIA 2027 » fourni
 * par l'organisateur. Deux tailles sont générées pour chaque image :
 *   public/images/gallery/<id>-sm.webp   vignette (640 px) → grille
 *   public/images/gallery/<id>.webp      grande version (1400 px) → visionneuse
 *
 * ➜ Ajouter une photo : déposer les deux fichiers puis ajouter une entrée
 *   ci-dessous (la légende se traduit dans t.gallery.photos[id]).
 *   Les dimensions servent à réserver la place de l'image (aucun saut de mise
 *   en page pendant le chargement).
 */

export const GALLERY_DIR = '/images/gallery/'

export const GALLERY = [
  { id: 'ouverture-2025', year: 2025, w: 1400, h: 934 },
  { id: 'photo-famille-2025', year: 2025, w: 1400, h: 934 },
  { id: 'officiels-2025', year: 2025, w: 1400, h: 934 },
  { id: 'pleniere-2025', year: 2025, w: 1400, h: 934 },
  { id: 'grande-salle-2025', year: 2025, w: 1400, h: 934 },
  { id: 'posters-2025', year: 2025, w: 1400, h: 934 },
  { id: 'salon-2025', year: 2025, w: 1400, h: 934 },
  { id: 'pupitre-2025', year: 2025, w: 1400, h: 934 },
  { id: 'trophee-2025', year: 2025, w: 1400, h: 934 },
  { id: 'laureats-2025', year: 2025, w: 1400, h: 934 },
  { id: 'remise-prix-2025', year: 2025, w: 1400, h: 934 },
  { id: 'delegation-2025', year: 2025, w: 1400, h: 931 },
  { id: 'ambiance-2025', year: 2025, w: 1400, h: 934 },
  { id: 'equipe-2025', year: 2025, w: 1400, h: 934 },
  { id: 'village-2025', year: 2025, w: 1400, h: 934 },
  { id: 'public-2025', year: 2025, w: 1400, h: 934 },
  { id: 'pleniere-2023', year: 2023, w: 1400, h: 933 },
  { id: 'ministre-2023', year: 2023, w: 1400, h: 933 },
  { id: 'signature-2023', year: 2023, w: 1400, h: 934 },
  { id: 'remise-2023', year: 2023, w: 1400, h: 975 },
]

/** Éditions représentées, pour les filtres de la galerie */
export const GALLERY_YEARS = [...new Set(GALLERY.map((p) => p.year))].sort((a, b) => b - a)
