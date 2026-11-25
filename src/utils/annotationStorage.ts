import { ProjectAnnotation } from '../types';

export const getAnnotationStorageKey = (patternId: string) => `sovereign_annotations_${patternId}`;

export function loadAnnotations(patternId: string): ProjectAnnotation[] {
  try {
    const raw = localStorage.getItem(getAnnotationStorageKey(patternId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error loading annotations:', err);
    return [];
  }
}

export function saveAnnotations(patternId: string, annotations: ProjectAnnotation[]): void {
  try {
    localStorage.setItem(getAnnotationStorageKey(patternId), JSON.stringify(annotations));
  } catch (err) {
    console.error('Error saving annotations:', err);
  }
}

export const ANNOTATION_COLORS = [
  { name: 'Warm Amber', hex: '#D97706', ring: 'ring-amber-500', bg: 'bg-amber-500' },
  { name: 'Burgundy Red', hex: '#DC2626', ring: 'ring-red-500', bg: 'bg-red-500' },
  { name: 'Emerald Forest', hex: '#059669', ring: 'ring-emerald-600', bg: 'bg-emerald-600' },
  { name: 'Heirloom Indigo', hex: '#4F46E5', ring: 'ring-indigo-600', bg: 'bg-indigo-600' },
  { name: 'Royal Violet', hex: '#9333EA', ring: 'ring-purple-600', bg: 'bg-purple-600' },
  { name: 'Rose Blossom', hex: '#E11D48', ring: 'ring-rose-500', bg: 'bg-rose-500' },
  { name: 'Cerulean Blue', hex: '#0284C7', ring: 'ring-sky-500', bg: 'bg-sky-500' },
];

export const STITCH_TECHNIQUE_SUGGESTIONS = [
  { en: 'French knot', fil: 'French knot', icon: '●', descEn: 'Raised knot stitch for floral or eye accents', descFil: 'Buhol na tahi para sa bulaklak o detalye' },
  { en: 'Half-stitch', fil: 'Half-stitch (½)', icon: '½', descEn: 'Single diagonal slash for translucent shading', descFil: 'Isang hilig na tahi para sa anino at lalim' },
  { en: 'Quarter-stitch', fil: 'Quarter-stitch (¼)', icon: '¼', descEn: 'Petite corner stitch for rounded curves', descFil: 'Maliit na tahi sa sulok para sa kurbada' },
  { en: 'Backstitch outline', fil: 'Backstitch outline', icon: '—', descEn: 'Fine outline detailing around edges', descFil: 'Pangguhit na balangkas sa gilid' },
  { en: 'Metallic thread accent', fil: 'Metallic accent', icon: '✦', descEn: 'Sparkling wedding ring or lace highlight', descFil: 'Kumikinang na sinulid sa singsing' },
  { en: 'Bead attachment', fil: 'Bead attachment', icon: '◈', descEn: 'Seed bead attachment point', descFil: 'Lalagyan ng bead o perlas' },
];

export const QUICK_NOTE_SUGGESTIONS = [
  { en: 'French knot', fil: 'French knot' },
  { en: 'Half-stitch', fil: 'Half-stitch' },
  { en: 'Quarter-stitch', fil: 'Quarter-stitch' },
  { en: 'Confetti area - double-check floss', fil: 'Confetti area - suriin ang kulay ng sinulid' },
  { en: 'French knot accent spot', fil: 'Lalagyan ng French knot na tahi' },
  { en: 'Lettering & wedding date starting point', fil: 'Simula ng titik at petsa ng kasal' },
  { en: 'Center anchor stitch', fil: 'Gitnang gabay ng tahi' },
  { en: 'Color change boundary', fil: 'Hangganan ng pagpapalit ng kulay' },
  { en: 'Reserved for metallic thread highlight', fil: 'Laan para sa metallic thread highlight' },
];

export const QUICK_LABEL_SUGGESTIONS = [
  { en: 'Bridal Monogram (Initials)', fil: 'Monogram ng Kasal (Inisyal)' },
  { en: 'Wedding Date (Est. 2026)', fil: 'Petsa ng Kasal (2026)' },
  { en: "Groom's Suit Accent", fil: 'Palamuti sa Damit ng Lalaki' },
  { en: 'Gold Filigree Border', fil: 'Gintong Gilid / Border' },
  { en: 'Center Alignment Anchor', fil: 'Gitnang Gabay ng Disenyo' },
  { en: 'French Knot Bouquet Accent', fil: 'Bouquet French Knot Accent' },
  { en: 'Metallic DMC E3852 Gold', fil: 'Metallic DMC E3852 Gold' },
  { en: 'Lace Veil Highlight', fil: 'Belo / Lace Veil Highlight' },
];

