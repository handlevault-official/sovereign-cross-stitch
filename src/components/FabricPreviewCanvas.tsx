import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Sparkles,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  AlertCircle,
  Palette,
  Info,
} from 'lucide-react';
import { DMCColor } from '../types';

export interface FabricColorOption {
  id: string;
  name: string;
  tagalogName: string;
  hex: string;
  gridLineColor: string;
  majorGridLineColor: string;
  isDark: boolean;
  description: string;
}

export const FABRIC_COLOR_OPTIONS: FabricColorOption[] = [
  {
    id: 'white',
    name: 'Classic White',
    tagalogName: 'Klasikong Puti',
    hex: '#FFFFFF',
    gridLineColor: 'rgba(215, 205, 195, 0.55)',
    majorGridLineColor: 'rgba(100, 90, 80, 0.65)',
    isDark: false,
    description: 'Crisp & timeless. Excellent contrast for bold, vibrant colors.',
  },
  {
    id: 'antique-white',
    name: 'Antique White',
    tagalogName: 'Antique White / Garing',
    hex: '#FAF6EE',
    gridLineColor: 'rgba(210, 200, 185, 0.6)',
    majorGridLineColor: 'rgba(110, 100, 85, 0.7)',
    isDark: false,
    description: 'Soft warm cream. Ideal for vintage bridal portraits & heirloom tapestries.',
  },
  {
    id: 'oatmeal',
    name: 'Oatmeal / Flax',
    tagalogName: 'Oatmeal / Natural Flax',
    hex: '#E8DEC8',
    gridLineColor: 'rgba(180, 170, 155, 0.65)',
    majorGridLineColor: 'rgba(85, 75, 65, 0.75)',
    isDark: false,
    description: 'Rustic woven flax. Makes white gowns and pastel floss pop with dimension.',
  },
  {
    id: 'tea-dyed',
    name: 'Tea-Dyed Parchment',
    tagalogName: 'Parchment / Kulay Tsaa',
    hex: '#DFCEB4',
    gridLineColor: 'rgba(165, 155, 138, 0.65)',
    majorGridLineColor: 'rgba(75, 65, 55, 0.75)',
    isDark: false,
    description: 'Aged antique parchment look with warm heritage undertones.',
  },
  {
    id: 'soft-sage',
    name: 'Botanical Sage',
    tagalogName: 'Luntiang Sage',
    hex: '#E1E7DD',
    gridLineColor: 'rgba(170, 180, 168, 0.6)',
    majorGridLineColor: 'rgba(75, 90, 72, 0.7)',
    isDark: false,
    description: 'Romantic muted green. Natural compliment for garden and floral themes.',
  },
  {
    id: 'ice-blue',
    name: 'Bridal Ice Blue',
    tagalogName: 'Asul na Langit',
    hex: '#DFE7EE',
    gridLineColor: 'rgba(170, 180, 192, 0.6)',
    majorGridLineColor: 'rgba(70, 85, 105, 0.7)',
    isDark: false,
    description: 'Cool pastel blue. Adds an ethereal touch to lace, pearls, and gold floss.',
  },
  {
    id: 'navy',
    name: 'Midnight Navy',
    tagalogName: 'Hatinggabi Navy Blue',
    hex: '#1E293B',
    gridLineColor: 'rgba(255, 255, 255, 0.22)',
    majorGridLineColor: 'rgba(255, 255, 255, 0.5)',
    isDark: true,
    description: 'Deep navy blue. High-drama contrast for metallic gold, white, and florals.',
  },
  {
    id: 'black',
    name: 'Ebony Black Aida',
    tagalogName: 'Maitim na Aida',
    hex: '#18181B',
    gridLineColor: 'rgba(255, 255, 255, 0.2)',
    majorGridLineColor: 'rgba(255, 255, 255, 0.45)',
    isDark: true,
    description: 'Striking black canvas. Thread colors glow with extraordinary brilliance.',
  },
];

// Fallback curated thread colors if no active pattern palette is loaded
const DEFAULT_TEST_COLORS: DMCColor[] = [
  { code: 'B5200', name: 'Snow White', hex: '#FFFFFF', r: 255, g: 255, b: 255, symbol: '◇' },
  { code: '745', name: 'Light Pale Yellow', hex: '#FDF0A6', r: 253, g: 240, b: 166, symbol: '★' },
  { code: '760', name: 'Salmon Rose', hex: '#E58A8A', r: 229, g: 138, b: 138, symbol: '♥' },
  { code: '817', name: 'Coral Red Dark', hex: '#BE1E2D', r: 190, g: 30, b: 45, symbol: '◆' },
  { code: '729', name: 'Old Gold Medium', hex: '#D4AF37', r: 212, g: 175, b: 55, symbol: '▲' },
  { code: '3348', name: 'Yellow Green Light', hex: '#D6E29D', r: 214, g: 226, b: 157, symbol: '✿' },
  { code: '930', name: 'Antique Blue Dark', hex: '#445D78', r: 68, g: 93, b: 120, symbol: '■' },
  { code: '310', name: 'Black', hex: '#000000', r: 0, g: 0, b: 0, symbol: '●' },
];

interface FabricPreviewCanvasProps {
  fabricCount: number;
  palette?: DMCColor[];
  language: 'en' | 'fil';
}

export const FabricPreviewCanvas: React.FC<FabricPreviewCanvasProps> = ({
  fabricCount,
  palette,
  language,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFabricId, setSelectedFabricId] = useState<string>('oatmeal');
  const [previewMode, setPreviewMode] = useState<'threads' | 'motif' | 'blank'>('threads');
  const [zoomLevel, setZoomLevel] = useState<number>(1.5); // 1x, 1.5x, 2.2x

  const activeFabric =
    FABRIC_COLOR_OPTIONS.find((f) => f.id === selectedFabricId) || FABRIC_COLOR_OPTIONS[2];

  const effectivePalette = useMemo(() => {
    if (palette && palette.length > 0) return palette.slice(0, 12);
    return DEFAULT_TEST_COLORS;
  }, [palette]);

  // Compute contrast advice
  const contrastAnalysis = useMemo(() => {
    // Luminance of fabric
    const hex = activeFabric.hex.replace('#', '');
    const fR = parseInt(hex.substring(0, 2), 16);
    const fG = parseInt(hex.substring(2, 4), 16);
    const fB = parseInt(hex.substring(4, 6), 16);
    const fabricLuminance = (0.299 * fR + 0.587 * fG + 0.114 * fB) / 255;

    // Check light threads (like white/cream) on light fabric
    const hasWhiteThread = effectivePalette.some(
      (c) => c.code === 'B5200' || c.code === 'Blanc' || c.code === 'White' || c.hex.toLowerCase() === '#ffffff'
    );
    const hasBlackThread = effectivePalette.some(
      (c) => c.code === '310' || c.hex.toLowerCase() === '#000000'
    );

    let adviceEn = 'High contrast across your palette. Threads will be sharp and legible.';
    let adviceFil = 'Magandang contrast sa buong palette. Malinaw at madaling makita ang bawat tahi.';
    let isWarning = false;

    if (activeFabric.id === 'white' && hasWhiteThread) {
      adviceEn =
        'Notice: White thread (DMC Blanc / B5200) has low contrast on Pure White Aida. Oatmeal or Antique White is recommended to make bridal gowns & lace pop.';
      adviceFil =
        'Paalala: Ang puting sinulid ay may mababang contrast sa Purong Puting Aida. Mas inirerekomenda ang Oatmeal o Antique White upang lumutang ang puting damit-pangkasal.';
      isWarning = true;
    } else if (activeFabric.id === 'black' && hasBlackThread) {
      adviceEn =
        'Notice: Black thread (DMC 310) blends into Black Aida cloth. Consider dark navy or charcoal if edge definition is needed.';
      adviceFil =
        'Paalala: Ang itim na sinulid ay maaaring mahirap makita sa Maitim na Aida. Isaalang-alang ang Navy o Oatmeal kung kailangan ng matalas na balangkas.';
      isWarning = true;
    } else if (activeFabric.id === 'oatmeal' || activeFabric.id === 'antique-white') {
      adviceEn =
        'Excellent choice! Both bright white silks and dark lettering contrast naturally against warm woven fibers.';
      adviceFil =
        'Mahusay na pagpipilian! Ang puting sinulid at maitim na titik ay kapwa lilitaw nang natural sa mainit na habi ng tela.';
    }

    return { adviceEn, adviceFil, isWarning, fabricLuminance };
  }, [activeFabric, effectivePalette]);

  // Render Fabric Cloth Weave & Threads onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Fill base fabric color
    ctx.fillStyle = activeFabric.hex;
    ctx.fillRect(0, 0, width, height);

    // Dynamic grid spacing based on count and zoom
    // Standard cell size on screen: scaled by zoom
    const baseCellSize = Math.round(14 * zoomLevel);
    const cols = Math.ceil(width / baseCellSize);
    const rows = Math.ceil(height / baseCellSize);

    // 2. Realistic Aida Cloth Weave Texture (Warp & Weft interlacing effect)
    ctx.save();
    const isDark = activeFabric.isDark;
    const weftAlpha = isDark ? 0.08 : 0.06;
    const shadowAlpha = isDark ? 0.25 : 0.12;

    // Weave blocks (Aida blocks of 4 parallel threads)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * baseCellSize;
        const y = r * baseCellSize;

        // Subtle alternating weave highlight
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = isDark ? `rgba(255, 255, 255, ${weftAlpha})` : `rgba(0, 0, 0, ${weftAlpha * 0.7})`;
          ctx.fillRect(x + 1, y + 1, baseCellSize - 2, baseCellSize - 2);
        }

        // Weave corner pin-holes (Aida fabric holes where needle penetrates)
        ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(x, y, 1.2 * zoomLevel, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // 3. Faint 1x1 Aida Grid Lines
    ctx.strokeStyle = activeFabric.gridLineColor;
    ctx.lineWidth = 0.6;
    for (let x = 0; x <= width; x += baseCellSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += baseCellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }

    // 4. Bold 10x10 Reference Grid Lines
    ctx.strokeStyle = activeFabric.majorGridLineColor;
    ctx.lineWidth = 1.3;
    const majorStep = baseCellSize * 10;
    for (let x = 0; x <= width; x += majorStep) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += majorStep) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }

    // Helper: Draw realistic cross-stitch 'X'
    const drawCrossStitch = (col: number, row: number, hexColor: string, isLightOnDark?: boolean) => {
      const px = col * baseCellSize;
      const py = row * baseCellSize;
      const padding = 2 * zoomLevel;

      ctx.save();

      // Under-hole shadow
      ctx.fillStyle = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.08)';
      ctx.beginPath();
      ctx.arc(px + padding, py + padding, 1 * zoomLevel, 0, Math.PI * 2);
      ctx.arc(px + baseCellSize - padding, py + padding, 1 * zoomLevel, 0, Math.PI * 2);
      ctx.arc(px + padding, py + baseCellSize - padding, 1 * zoomLevel, 0, Math.PI * 2);
      ctx.arc(px + baseCellSize - padding, py + baseCellSize - padding, 1 * zoomLevel, 0, Math.PI * 2);
      ctx.fill();

      // Diagonal stitch 1 (\)
      ctx.strokeStyle = hexColor;
      ctx.lineWidth = 2.4 * zoomLevel;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px + padding, py + padding);
      ctx.lineTo(px + baseCellSize - padding, py + baseCellSize - padding);
      ctx.stroke();

      // Diagonal stitch 2 (/) with thread sheen
      ctx.beginPath();
      ctx.moveTo(px + baseCellSize - padding, py + padding);
      ctx.lineTo(px + padding, py + baseCellSize - padding);
      ctx.stroke();

      // Top thread highlight sheen
      ctx.strokeStyle = isLightOnDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 0.8 * zoomLevel;
      ctx.beginPath();
      ctx.moveTo(px + baseCellSize - padding - 1, py + padding + 1);
      ctx.lineTo(px + padding + 1, py + baseCellSize - padding - 1);
      ctx.stroke();

      ctx.restore();
    };

    // 5. Draw Content based on Preview Mode
    if (previewMode === 'threads') {
      // Swatch bars of palette colors stitched as 'X' over the fabric
      const startRow = Math.max(1, Math.floor(rows / 2) - Math.floor(effectivePalette.length / 2));
      const swatchWidth = Math.min(8, cols - 6);
      const startCol = 3;

      effectivePalette.forEach((c, idx) => {
        const r = startRow + idx;
        if (r < rows - 1) {
          // Label on left
          ctx.save();
          ctx.fillStyle = isDark ? '#F1F5F9' : '#2C2523';
          ctx.font = `bold ${Math.round(9 * zoomLevel)}px monospace`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(`DMC ${c.code}`, startCol * baseCellSize - 6, (r + 0.5) * baseCellSize);

          // Stitches strip
          for (let s = 0; s < swatchWidth; s++) {
            drawCrossStitch(startCol + s, r, c.hex, isDark);
          }

          // Swatch color name label on right
          ctx.textAlign = 'left';
          ctx.font = `${Math.round(8 * zoomLevel)}px sans-serif`;
          ctx.fillStyle = isDark ? '#94A3B8' : '#7A6E65';
          ctx.fillText(c.name, (startCol + swatchWidth) * baseCellSize + 8, (r + 0.5) * baseCellSize);
          ctx.restore();
        }
      });
    } else if (previewMode === 'motif') {
      // Render a charming heirloom wedding heart & rings cross-stitch sampler motif
      const centerCol = Math.floor(cols / 2);
      const centerRow = Math.floor(rows / 2);

      // Heart outline coordinates offset from center
      const heartOffsets = [
        [-2, -3], [-1, -4], [0, -4], [1, -4], [2, -3], [3, -2], [4, -1], [4, 0], [3, 1], [2, 2], [1, 3], [0, 4],
        [-1, 3], [-2, 2], [-3, 1], [-4, 0], [-4, -1], [-3, -2],
      ];

      // Inner fill heart
      const innerHeart = [
        [-1, -3], [0, -3], [1, -3],
        [-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2],
        [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1],
        [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0],
        [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1],
        [-1, 2], [0, 2], [1, 2],
        [0, 3],
      ];

      // Two interlocking rings in center
      const ring1 = [[-2, 0], [-1, 0], [0, 0], [-2, 1], [0, 1], [-2, 2], [-1, 2], [0, 2]];
      const ring2 = [[0, 1], [1, 1], [2, 1], [0, 2], [2, 2], [0, 3], [1, 3], [2, 3]];

      const primaryColor = effectivePalette[3]?.hex || '#BE1E2D'; // Burgundy
      const softRoseColor = effectivePalette[2]?.hex || '#E58A8A'; // Rose
      const goldColor = effectivePalette[4]?.hex || '#D4AF37'; // Gold
      const whiteColor = '#FFFFFF';

      // Draw heart outline
      heartOffsets.forEach(([dx, dy]) => {
        drawCrossStitch(centerCol + dx, centerRow + dy - 1, primaryColor);
      });

      // Draw soft rose inner fill
      innerHeart.forEach(([dx, dy]) => {
        drawCrossStitch(centerCol + dx, centerRow + dy - 1, softRoseColor);
      });

      // Draw interlocking wedding rings
      ring1.forEach(([dx, dy]) => {
        drawCrossStitch(centerCol + dx, centerRow + dy - 1, goldColor);
      });
      ring2.forEach(([dx, dy]) => {
        drawCrossStitch(centerCol + dx, centerRow + dy - 1, whiteColor, isDark);
      });

      // Monogram text or sampler banner below
      ctx.save();
      ctx.fillStyle = isDark ? '#FAF7F2' : '#2C2523';
      ctx.font = `bold ${Math.round(11 * zoomLevel)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(
        language === 'fil' ? 'Puso & Singsing Sampler' : 'Heirloom Keepsake Sampler',
        centerCol * baseCellSize,
        (centerRow + 6) * baseCellSize
      );
      ctx.restore();
    }

    // 6. Center Marks & Arrow indicators
    const midX = Math.floor(cols / 2) * baseCellSize;
    const midY = Math.floor(rows / 2) * baseCellSize;

    ctx.save();
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);

    // Vertical center
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, height);
    ctx.stroke();

    // Horizontal center
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Red arrow at top
    ctx.fillStyle = '#DC2626';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(midX - 4, 0);
    ctx.lineTo(midX + 4, 0);
    ctx.lineTo(midX, 6);
    ctx.fill();

    // Red arrow at left
    ctx.beginPath();
    ctx.moveTo(0, midY - 4);
    ctx.lineTo(0, midY + 4);
    ctx.lineTo(6, midY);
    ctx.fill();
    ctx.restore();
  }, [activeFabric, effectivePalette, fabricCount, previewMode, zoomLevel, language]);

  return (
    <div className="bg-white rounded-2xl border border-[#E8E1D5] shadow-xs p-5 sm:p-6 space-y-5">
      {/* Header and Live Swatch Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0ECE1] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2C2523] text-[#E6C687] flex items-center justify-center shadow-xs">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-base sm:text-lg text-[#2C2523]">
                {language === 'fil'
                  ? 'Biswal na Preview ng Kulay ng Tela & Faint Grid'
                  : 'Fabric Color & Thread Contrast Preview'}
              </h4>
              <p className="text-xs text-[#7A6E65]">
                {language === 'fil'
                  ? 'Subukan kung paano lilitaw ang iyong mga kulay ng sinulid sa iba\'t ibang kulay ng AIDA cloth.'
                  : 'Visualize your thread colors and faint weave grid on authentic AIDA fabric shades.'}
              </p>
            </div>
          </div>
        </div>

        {/* Zoom & View Mode Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Preview Mode Switcher */}
          <div className="flex items-center bg-[#FAF7F2] p-0.5 rounded-lg border border-[#D7CBB9] text-xs">
            <button
              type="button"
              onClick={() => setPreviewMode('threads')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                previewMode === 'threads'
                  ? 'bg-[#2C2523] text-white shadow-2xs font-semibold'
                  : 'text-[#7A6E65] hover:text-[#2C2523]'
              }`}
            >
              {language === 'fil' ? '🧵 Sinulid' : '🧵 Thread Palette'}
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('motif')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                previewMode === 'motif'
                  ? 'bg-[#2C2523] text-white shadow-2xs font-semibold'
                  : 'text-[#7A6E65] hover:text-[#2C2523]'
              }`}
            >
              {language === 'fil' ? '💍 Sampler' : '💍 Keepsake Motif'}
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('blank')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                previewMode === 'blank'
                  ? 'bg-[#2C2523] text-white shadow-2xs font-semibold'
                  : 'text-[#7A6E65] hover:text-[#2C2523]'
              }`}
            >
              {language === 'fil' ? '📏 Grid Lamang' : '📏 Weave Grid'}
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center bg-[#FAF7F2] p-1 rounded-lg border border-[#D7CBB9]">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.3))}
              className="p-1 text-[#7A6E65] hover:text-[#2C2523] rounded hover:bg-white transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 font-bold text-[#2C2523]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.3))}
              className="p-1 text-[#7A6E65] hover:text-[#2C2523] rounded hover:bg-white transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Fabric Color Swatch Picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#5F554F] uppercase tracking-wider text-[11px]">
            {language === 'fil' ? 'Pumili ng Kulay ng Aida Tela:' : 'Select Rendered Fabric Color:'}
          </span>
          <span className="font-mono text-xs font-bold text-[#B88E3C]">
            {language === 'fil' ? activeFabric.tagalogName : activeFabric.name}
          </span>
        </div>

        {/* Color buttons grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {FABRIC_COLOR_OPTIONS.map((f) => {
            const isSelected = selectedFabricId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFabricId(f.id)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'border-[#2C2523] ring-2 ring-[#B88E3C] shadow-xs'
                    : 'border-[#E0D7C9] hover:border-[#B88E3C] hover:bg-[#FAF7F2]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-5 h-5 rounded-full border border-black/20 shadow-2xs flex items-center justify-center shrink-0"
                    style={{ backgroundColor: f.hex }}
                  >
                    {isSelected && (
                      <Check
                        className={`w-3 h-3 ${f.isDark ? 'text-white' : 'text-[#2C2523]'}`}
                      />
                    )}
                  </div>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B88E3C]" />
                  )}
                </div>

                <div>
                  <div className="font-bold text-[11px] text-[#2C2523] truncate">
                    {language === 'fil' ? f.tagalogName : f.name}
                  </div>
                  <div className="text-[9px] text-[#8C8077] truncate">
                    {f.isDark ? 'Dark Fabric' : 'Light Fabric'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Rendered Canvas Viewport */}
      <div className="space-y-2">
        <div className="relative w-full aspect-16/9 max-h-[360px] rounded-xl overflow-hidden border-2 border-[#D7CBB9] shadow-inner bg-black/5 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={720}
            height={380}
            className="w-full h-full object-cover select-none"
          />

          {/* Floating Fabric Spec Badge */}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs border border-[#E8E1D5] rounded-lg px-2.5 py-1 text-[11px] font-mono text-[#2C2523] shadow-xs flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/20"
              style={{ backgroundColor: activeFabric.hex }}
            />
            <span className="font-bold">{activeFabric.name}</span>
            <span className="text-[#7A6E65]">· {fabricCount} Count Aida</span>
          </div>

          {/* Mode watermark badge */}
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-white rounded-md px-2 py-0.5 text-[10px] font-mono">
            {previewMode === 'threads'
              ? 'Thread Palette Contrast View'
              : previewMode === 'motif'
              ? 'Embroidered Sampler View'
              : 'Faint 10x10 Weave Grid View'}
          </div>
        </div>

        {/* Contrast Analysis & Recommendation Box */}
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
            contrastAnalysis.isWarning
              ? 'bg-amber-50/80 border-amber-300 text-amber-950'
              : 'bg-[#FAF7F2] border-[#E8E1D5] text-[#2C2523]'
          }`}
        >
          {contrastAnalysis.isWarning ? (
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          ) : (
            <Sparkles className="w-4 h-4 text-[#B88E3C] shrink-0 mt-0.5" />
          )}

          <div className="space-y-0.5">
            <div className="font-bold">
              {language === 'fil'
                ? 'Pagsusuri sa Contrast at Linaw ng Sinulid:'
                : 'Thread Contrast & Readability Advice:'}
            </div>
            <p className="text-[11px] leading-relaxed text-[#5F554F]">
              {language === 'fil' ? contrastAnalysis.adviceFil : contrastAnalysis.adviceEn}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
