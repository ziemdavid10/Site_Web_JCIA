"""Génère les fichiers du logo JCIA 2027 à partir du fichier officiel fourni.

Étapes :
  1. retrait de l'accent fautif de « INTÉLLIGENCE » (celui de « JOURNÉES » reste) ;
  2. détourage : le fond clair uniforme devient transparent (alpha calculé sur la
     distance au fond, puis couleur « dé-prémultipliée » pour garder des bords nets) ;
  3. deux déclinaisons : couleur (thème clair) et blanche (thème sombre : le bleu
     nuit et le noir passent au blanc, les couleurs du Cameroun sont conservées) ;
  4. deux tailles : 1200 px (grand) et 520 px (petit, en-tête).
"""
import numpy as np
from PIL import Image
from scipy import ndimage

# Usage :  python3 scripts/logo/build-logo.py chemin/vers/logo-officiel.jpg
# Prérequis : pip install pillow scipy numpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # racine du projet
SRC = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / 'scripts/logo/logo-officiel.jpg')
BRAND = str(ROOT / 'src/assets/images/brand') + '/'
PUBLIC = str(ROOT / 'public/images') + '/'


def remove_accent(a, bg):
    """Efface le petit signe isolé posé au-dessus de la 2e ligne du sous-titre."""
    h, w = a.shape[:2]
    ink = np.abs(a.astype(int) - bg).max(2) > 34
    lab, _ = ndimage.label(ink)
    boxes = [(i + 1, s[0].start, s[0].stop, s[1].start, s[1].stop, int(ink[s].sum()))
             for i, s in enumerate(ndimage.find_objects(lab))]
    cands = []
    for idx, y0, y1, x0, x1, area in boxes:
        bh, bw = y1 - y0, x1 - x0
        if bh > 0.045 * h or bw > 0.022 * w or area > 0.0006 * w * h:
            continue
        if x0 < 0.28 * w or y0 < 0.45 * h:
            continue
        for jdx, yy0, yy1, xx0, xx1, _ in boxes:          # une lettre juste dessous ?
            if jdx != idx and 0 <= yy0 - y1 <= max(4, int(0.02 * h)) \
               and (yy1 - yy0) > 2.2 * bh and xx0 - 3 <= x0 and x1 <= xx1 + 3:
                cands.append((y0, idx))
                break
    if not cands:
        raise SystemExit('accent introuvable')
    cands.sort()
    idx = cands[-1][1]                                     # le plus bas = 2e ligne
    a[ndimage.binary_dilation(lab == idx, iterations=2)] = bg
    return a


def cut_out(a, bg, lo=8, hi=46):
    """Fond uniforme → transparence, avec récupération de la couleur des bords."""
    d = np.abs(a.astype(float) - bg).max(2)
    alpha = np.clip((d - lo) / (hi - lo), 0, 1)
    al = alpha[..., None]
    rgb = np.where(al > 0.004, (a - (1 - al) * bg) / np.maximum(al, 0.004), bg)
    out = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    ys, xs = np.where(alpha > 0.06)
    pad = 2
    return Image.fromarray(out).crop((max(0, xs.min() - pad), max(0, ys.min() - pad),
                                      min(a.shape[1], xs.max() + 1 + pad),
                                      min(a.shape[0], ys.max() + 1 + pad)))


# Encres à basculer en blanc sur fond sombre : le bleu nuit du sigle JCIA et le
# noir du sous-titre. Les couleurs du Cameroun (orange, turquoise, violet,
# latérite) de la carte et des dates sont conservées telles quelles.
NAVY = np.array([24, 24, 56])


def whiten(img):
    """Thème sombre : bleu nuit et noir → blanc ; toutes les autres couleurs restent."""
    a = np.asarray(img).astype(float)
    rgb, alpha = a[..., :3], a[..., 3]
    mx, mn = rgb.max(2), rgb.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    near_navy = np.linalg.norm(rgb - NAVY, axis=2) < 90      # sigle JCIA
    greyish = (sat < 0.22) & (mx < 150)                      # texte noir et ses bords
    out = a.copy()
    out[(near_navy | greyish) & (alpha > 0), 0:3] = 255
    return Image.fromarray(out.astype(np.uint8))


src = Image.open(SRC).convert('RGB')
arr = np.asarray(src).copy()
border = np.concatenate([arr[:6].reshape(-1, 3), arr[-6:].reshape(-1, 3),
                         arr[:, :6].reshape(-1, 3), arr[:, -6:].reshape(-1, 3)])
bg = np.median(border, axis=0)
arr = remove_accent(arr, bg)
logo = cut_out(arr, bg)
print('détouré :', logo.size, 'ratio', round(logo.width / logo.height, 3))

BIG_W, SM_W = 1200, 520
big_h = round(BIG_W * logo.height / logo.width)
sm_h = round(SM_W * logo.height / logo.width)
color_big = logo.resize((BIG_W, big_h), Image.LANCZOS)
white_big = whiten(color_big)
files = {
    BRAND + 'logo-jcia.webp': color_big,
    BRAND + 'logo-jcia-white.webp': white_big,
    BRAND + 'logo-jcia-sm.webp': color_big.resize((SM_W, sm_h), Image.LANCZOS),
    BRAND + 'logo-jcia-white-sm.webp': white_big.resize((SM_W, sm_h), Image.LANCZOS),
    PUBLIC + 'logo-jcia-white.webp': white_big.resize((SM_W, sm_h), Image.LANCZOS),
}
for path, img in files.items():
    img.save(path, lossless=True, method=6)
    print(f'{path.split("/")[-1]:26s} {img.size}')

# --- Image de partage (Open Graph, 1200 × 630) -------------------------------
og = Image.new('RGB', (1200, 630), (250, 245, 239))
w = 940
h = round(w * logo.height / logo.width)
og.paste(color_big.resize((w, h), Image.LANCZOS), ((1200 - w) // 2, (630 - h) // 2),
         color_big.resize((w, h), Image.LANCZOS))
og.save(PUBLIC + 'og-jcia-2027.jpg', quality=92, optimize=True)
print('og-jcia-2027.jpg          ', og.size)
