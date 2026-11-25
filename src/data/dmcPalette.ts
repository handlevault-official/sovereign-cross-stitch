import { DMCColor } from '../types';

export const DMC_PALETTE: DMCColor[] = [
  // Whites, Creams & Ivories
  { code: 'B5200', name: 'Bright Snow White', hex: '#FFFFFF', r: 255, g: 255, b: 255, symbol: '◇' },
  { code: 'Blanc', name: 'White', hex: '#FBFBFB', r: 251, g: 251, b: 251, symbol: '□' },
  { code: 'Ecru', name: 'Ecru Silk', hex: '#F3EFE3', r: 243, g: 239, b: 227, symbol: '○' },
  { code: '3865', name: 'Winter White', hex: '#F7F6F2', r: 247, g: 246, b: 242, symbol: '△' },
  { code: '712', name: 'Cream', hex: '#F3EDDA', r: 243, g: 237, b: 218, symbol: '▽' },
  { code: '739', name: 'Tan Ultra Very Light', hex: '#E7DEC7', r: 231, g: 222, b: 199, symbol: '◬' },
  { code: '738', name: 'Tan Very Light', hex: '#D8CCA7', r: 216, g: 204, b: 167, symbol: '⬡' },

  // Blush, Peony & Wedding Pink
  { code: '948', name: 'Peach Very Light', hex: '#FEECE6', r: 254, g: 236, b: 230, symbol: '♡' },
  { code: '754', name: 'Peach Light', hex: '#F7D6CB', r: 247, g: 214, b: 203, symbol: '♥' },
  { code: '3778', name: 'Terra Cotta Light', hex: '#D88E7B', r: 216, g: 142, b: 123, symbol: '♠' },
  { code: '3689', name: 'Mauve Light', hex: '#F7D7DF', r: 247, g: 215, b: 223, symbol: '✿' },
  { code: '3688', name: 'Mauve Medium', hex: '#E8A7B8', r: 232, g: 167, b: 184, symbol: '❀' },
  { code: '3687', name: 'Mauve', hex: '#C46D82', r: 196, g: 109, b: 130, symbol: '❁' },
  { code: '224', name: 'Shell Pink Very Light', hex: '#E6C6C1', r: 230, g: 198, b: 193, symbol: '✦' },
  { code: '223', name: 'Shell Pink Light', hex: '#CB8C84', r: 203, g: 140, b: 132, symbol: '✧' },
  { code: '221', name: 'Shell Pink Very Dark', hex: '#873B43', r: 135, g: 59, b: 67, symbol: '★' },
  { code: '818', name: 'Baby Pink', hex: '#FFDFE5', r: 255, g: 223, b: 229, symbol: '✶' },
  { code: '776', name: 'Pink Medium', hex: '#FCB2C4', r: 252, g: 178, b: 196, symbol: '✷' },
  { code: '3354', name: 'Dusty Rose Light', hex: '#E79CAE', r: 231, g: 156, b: 174, symbol: '✸' },
  { code: '152', name: 'Shell Rose Medium Light', hex: '#D99893', r: 217, g: 152, b: 147, symbol: '✹' },

  // Wine, Burgundy & Rose Petals
  { code: '816', name: 'Garnet', hex: '#941B2E', r: 148, g: 27, b: 46, symbol: '▲' },
  { code: '815', name: 'Garnet Medium', hex: '#7E1324', r: 126, g: 19, b: 36, symbol: '▼' },
  { code: '814', name: 'Garnet Dark', hex: '#630D1C', r: 99, g: 13, b: 28, symbol: '◀' },
  { code: '902', name: 'Garnet Very Dark', hex: '#4B101D', r: 75, g: 16, b: 29, symbol: '▶' },
  { code: '498', name: 'Red Dark', hex: '#A7142A', r: 167, g: 20, b: 42, symbol: '◆' },
  { code: '321', name: 'Red', hex: '#C71B32', r: 199, g: 27, b: 50, symbol: '◈' },

  // Heirloom Gold, Champagne & Warm Ochre
  { code: '677', name: 'Old Gold Very Light', hex: '#F0E5BE', r: 240, g: 229, b: 190, symbol: '⬢' },
  { code: '676', name: 'Old Gold Light', hex: '#DECB95', r: 222, g: 203, b: 149, symbol: '⬣' },
  { code: '729', name: 'Old Gold Medium', hex: '#C29F55', r: 194, g: 159, b: 85, symbol: '⊕' },
  { code: '680', name: 'Old Gold Dark', hex: '#A88034', r: 168, g: 128, b: 52, symbol: '⊖' },
  { code: '3829', name: 'Old Gold Very Dark', hex: '#99732B', r: 153, g: 115, b: 43, symbol: '⊗' },
  { code: '745', name: 'Yellow Pale Light', hex: '#FBE8A4', r: 251, g: 232, b: 164, symbol: '⊘' },
  { code: '743', name: 'Yellow Medium', hex: '#FED352', r: 254, g: 211, b: 82, symbol: '⊙' },
  { code: '741', name: 'Tangerine Medium', hex: '#FFA82E', r: 255, g: 168, b: 46, symbol: '⊚' },

  // Botanical Foliage, Eucalyptus & Sage
  { code: '524', name: 'Fern Green Very Light', hex: '#C2C9AC', r: 194, g: 201, b: 172, symbol: '♣' },
  { code: '523', name: 'Fern Green Light', hex: '#A5AE8B', r: 165, g: 174, b: 139, symbol: '♧' },
  { code: '522', name: 'Fern Green', hex: '#87926C', r: 135, g: 146, b: 108, symbol: '✕' },
  { code: '520', name: 'Fern Green Dark', hex: '#586541', r: 88, g: 101, b: 65, symbol: '✖' },
  { code: '3053', name: 'Green Gray', hex: '#9A9F82', r: 154, g: 159, b: 130, symbol: '✚' },
  { code: '3052', name: 'Green Gray Medium', hex: '#7D8664', r: 125, g: 134, b: 100, symbol: '✜' },
  { code: '3051', name: 'Green Gray Dark', hex: '#515B38', r: 81, g: 91, b: 56, symbol: '✛' },
  { code: '3348', name: 'Yellow Green Light', hex: '#CCD98B', r: 204, g: 217, b: 139, symbol: '♁' },
  { code: '3347', name: 'Yellow Green Medium', hex: '#719B53', r: 113, g: 155, b: 83, symbol: '⚚' },
  { code: '3346', name: 'Hunter Green', hex: '#406C32', r: 64, g: 108, b: 50, symbol: '⚙' },
  { code: '3345', name: 'Hunter Green Dark', hex: '#2A5323', r: 42, g: 83, b: 35, symbol: '⌂' },
  { code: '895', name: 'Hunter Green Very Dark', hex: '#1C3E17', r: 28, g: 62, b: 23, symbol: '■' },
  { code: '934', name: 'Black Avocado Green', hex: '#31371B', r: 49, g: 55, b: 27, symbol: '●' },

  // Bridal Navy, Slate & Tuxedo Blues
  { code: '932', name: 'Antique Blue Light', hex: '#9AB2C5', r: 154, g: 178, b: 197, symbol: '❅' },
  { code: '931', name: 'Antique Blue Medium', hex: '#6886A2', r: 104, g: 134, b: 162, symbol: '❄' },
  { code: '930', name: 'Antique Blue Dark', hex: '#446481', r: 68, g: 100, b: 129, symbol: '❇' },
  { code: '3750', name: 'Antique Blue Very Dark', hex: '#22405C', r: 34, g: 64, b: 92, symbol: '❈' },
  { code: '823', name: 'Navy Blue Dark', hex: '#1A2A4C', r: 26, g: 42, b: 76, symbol: '❊' },
  { code: '939', name: 'Navy Blue Very Dark', hex: '#111C35', r: 17, g: 28, b: 53, symbol: '❋' },
  { code: '775', name: 'Baby Blue Very Light', hex: '#DAE7ED', r: 218, g: 231, b: 237, symbol: '⊞' },
  { code: '3325', name: 'Baby Blue Light', hex: '#B2CFDF', r: 178, g: 207, b: 223, symbol: '⊟' },

  // Portrait Skin Tones & Wood Grain
  { code: '3770', name: 'Tawny Very Light', hex: '#FDF1E3', r: 253, g: 241, b: 227, symbol: '▤' },
  { code: '945', name: 'Tawny', hex: '#F9D8BD', r: 249, g: 216, b: 189, symbol: '▥' },
  { code: '402', name: 'Mahogany Very Light', hex: '#F3AA7D', r: 243, g: 170, b: 125, symbol: '▨' },
  { code: '3772', name: 'Desert Sand Very Dark', hex: '#996352', r: 153, g: 99, b: 82, symbol: '▧' },
  { code: '437', name: 'Tan Light', hex: '#CE9F6A', r: 206, g: 159, b: 106, symbol: '▦' },
  { code: '436', name: 'Tan', hex: '#B67E48', r: 182, g: 126, b: 72, symbol: '▩' },
  { code: '435', name: 'Brown Very Light', hex: '#965C30', r: 150, g: 92, b: 48, symbol: '◰' },
  { code: '434', name: 'Brown Light', hex: '#77411E', r: 119, g: 65, b: 30, symbol: '◱' },
  { code: '898', name: 'Coffee Brown', hex: '#48240D', r: 72, g: 36, b: 13, symbol: '◲' },
  { code: '3371', name: 'Black Brown', hex: '#1C0E07', r: 28, g: 14, b: 7, symbol: '◳' },

  // Neutral Grays, Pewter & Tuxedo Black
  { code: '762', name: 'Pearl Gray Very Light', hex: '#E4E3E3', r: 228, g: 227, b: 227, symbol: '◴' },
  { code: '415', name: 'Pearl Gray', hex: '#C7C6C6', r: 199, g: 198, b: 198, symbol: '◵' },
  { code: '318', name: 'Steel Gray Light', hex: '#A8A6A6', r: 168, g: 166, b: 166, symbol: '◶' },
  { code: '414', name: 'Steel Gray Dark', hex: '#817F7F', r: 129, g: 127, b: 127, symbol: '◷' },
  { code: '317', name: 'Pewter Gray', hex: '#636060', r: 99, g: 96, b: 96, symbol: '◢' },
  { code: '413', name: 'Pewter Gray Dark', hex: '#4C4848', r: 76, g: 72, b: 72, symbol: '◣' },
  { code: '3799', name: 'Pewter Gray Very Dark', hex: '#2F2D2D', r: 47, g: 45, b: 45, symbol: '◤' },
  { code: '310', name: 'Black', hex: '#111111', r: 17, g: 17, b: 17, symbol: '◥' }
];

export const TEMPLATES: Record<string, {
  id: string;
  title: string;
  tagalogTitle: string;
  description: string;
  dimensions: string;
  defaultWidth: number;
  defaultHeight: number;
  imageSrc: string;
  defaultColors: number;
  sampleCouple: string;
  sampleDate: string;
}> = {
  rings: {
    id: 'rings',
    title: 'Classic Wedding Rings & Florals',
    tagalogTitle: 'Klasikong Wedding Rings at mga Bulaklak',
    description: 'Gold wedding bands resting amidst gardenias, blush garden roses, and delicate bridal linen.',
    dimensions: '300 x 450 (1-Year Masterpiece)',
    defaultWidth: 150,
    defaultHeight: 225,
    imageSrc: '/src/assets/images/template_wedding_rings_1793018917157.jpg',
    defaultColors: 28,
    sampleCouple: 'Sarah & David',
    sampleDate: 'September 14, 2026'
  },
  silhouette: {
    id: 'silhouette',
    title: 'Bridal Silhouette & Cathedral Roses',
    tagalogTitle: 'Bridal Silhouette at Cathedral Roses',
    description: 'Heirloom lace gown and cascading bouquet framed by soft cathedral lighting.',
    dimensions: '200 x 300 (Large Tapestry)',
    defaultWidth: 140,
    defaultHeight: 210,
    imageSrc: '/src/assets/images/template_bridal_silhouette_1793018918245.jpg',
    defaultColors: 24,
    sampleCouple: 'April & Christian',
    sampleDate: 'December 28, 2026'
  },
  monogram: {
    id: 'monogram',
    title: 'Mr & Mrs Botanical Monogram Wreath',
    tagalogTitle: 'Mr & Mrs Botanical Monogram Wreath',
    description: 'Intricate botanical eucalyptus and rose wreath with personalized wedding crest.',
    dimensions: '150 x 150 (Medium Keepsake)',
    defaultWidth: 120,
    defaultHeight: 120,
    imageSrc: '/src/assets/images/template_monogram_floral_1793018917993.jpg',
    defaultColors: 20,
    sampleCouple: 'Maria & Joshua',
    sampleDate: 'October 24, 2026'
  }
};
