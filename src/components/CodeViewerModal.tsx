import React, { useState } from 'react';
import { X, Copy, Check, Code2, Download, FileCode, CheckCircle2 } from 'lucide-react';

interface CodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'fil';
}

interface SourceFile {
  name: string;
  path: string;
  language: string;
  descriptionFil: string;
  descriptionEn: string;
  content: string;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);

  if (!isOpen) return null;

  const files: SourceFile[] = [
    {
      name: 'types.ts',
      path: 'src/types.ts',
      language: 'typescript',
      descriptionFil: 'Mga interface para sa DMC Palette, Stitch Grid, Pattern Specs, at Complexity Engine.',
      descriptionEn: 'TypeScript interfaces for DMC colors, stitch grid, pattern data, and fabric calculations.',
      content: `export interface DMCColor {
  code: string;
  name: string;
  hex: string;
  r: number;
  g: number;
  b: number;
  symbol: string;
  symbolDark?: boolean;
}

export interface StitchGridCell {
  colorIndex: number;
  dmcCode: string;
  stitched?: boolean;
}

export interface PatternColorStats {
  color: DMCColor;
  count: number;
  percentage: number;
  skeinsNeeded: number;
}

export type DifficultyTier = 'Beginner' | 'Intermediate' | 'Masterpiece';

export interface ComplexityAnalysis {
  tier: DifficultyTier;
  tagalogTier: string;
  confettiPercentage: number;
  confettiLevel: 'Low (Smooth Blocks)' | 'Moderate (Fine Shading)' | 'High (Intricate Confetti)';
  colorCount: number;
  totalStitches: number;
  estimatedMonths: string;
  stitchingAdvice: string;
  tagalogAdvice: string;
  score: number;
}

export interface PatternData {
  id: string;
  title: string;
  coupleNames?: string;
  weddingDate?: string;
  width: number;
  height: number;
  grid: StitchGridCell[][];
  palette: DMCColor[];
  colorStats: PatternColorStats[];
  totalStitches: number;
  previewUrl: string;
  fabricCount: number;
  createdDate: string;
  complexity: ComplexityAnalysis;
}

export interface FabricSpecs {
  count: number;
  widthInches: number;
  heightInches: number;
  widthCm: number;
  heightCm: number;
  cutFabricInchesW: number;
  cutFabricInchesH: number;
  recommendedFrame: string;
}

export interface TemplateDesign {
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
}`
    },
    {
      name: 'colorMatcher.ts',
      path: 'src/utils/colorMatcher.ts',
      language: 'typescript',
      descriptionFil: 'Delta E CIE76 color matching algorithm, Floyd-Steinberg dithering, at Aida fabric calculator.',
      descriptionEn: 'Delta E CIE76 color distance algorithms, smart dithering, and fabric sizing formulas.',
      content: `import { DMC_PALETTE } from '../data/dmcPalette';
import { ComplexityAnalysis, DifficultyTier, DMCColor, FabricSpecs, PatternColorStats, PatternData, StitchGridCell } from '../types';

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  let rL = r / 255;
  let gL = g / 255;
  let bL = b / 255;

  rL = rL > 0.04045 ? Math.pow((rL + 0.055) / 1.055, 2.4) : rL / 12.92;
  gL = gL > 0.04045 ? Math.pow((gL + 0.055) / 1.055, 2.4) : gL / 12.92;
  bL = bL > 0.04045 ? Math.pow((bL + 0.055) / 1.055, 2.4) : bL / 12.92;

  rL *= 100;
  gL *= 100;
  bL *= 100;

  const x = rL * 0.4124 + gL * 0.3576 + bL * 0.1805;
  const y = rL * 0.2126 + gL * 0.7152 + bL * 0.0722;
  const z = rL * 0.0193 + gL * 0.1192 + bL * 0.9505;

  return [x, y, z];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const refX = 95.047;
  const refY = 100.0;
  const refZ = 108.883;

  let xR = x / refX;
  let yR = y / refY;
  let zR = z / refZ;

  xR = xR > 0.008856 ? Math.pow(xR, 1 / 3) : 7.787 * xR + 16 / 116;
  yR = yR > 0.008856 ? Math.pow(yR, 1 / 3) : 7.787 * yR + 16 / 116;
  zR = zR > 0.008856 ? Math.pow(zR, 1 / 3) : 7.787 * zR + 16 / 116;

  const L = 116 * yR - 16;
  const a = 500 * (xR - yR);
  const b = 200 * (yR - zR);

  return [L, a, b];
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

function deltaE(labA: [number, number, number], labB: [number, number, number]): number {
  const dL = labA[0] - labB[0];
  const da = labA[1] - labB[1];
  const db = labA[2] - labB[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

export function calculateFabricSpecs(widthStitches: number, heightStitches: number, fabricCount: number): FabricSpecs {
  const widthInches = Number((widthStitches / fabricCount).toFixed(2));
  const heightInches = Number((heightStitches / fabricCount).toFixed(2));
  const widthCm = Number((widthInches * 2.54).toFixed(1));
  const heightCm = Number((heightInches * 2.54).toFixed(1));

  const marginInches = 3;
  const cutFabricInchesW = Number((widthInches + marginInches * 2).toFixed(1));
  const cutFabricInchesH = Number((heightInches + marginInches * 2).toFixed(1));

  let recommendedFrame = '10" x 12" Hoop';
  if (widthInches > 14 || heightInches > 14) {
    recommendedFrame = 'Scroll Frame (18" x 24") o Custom Wedding Framing';
  } else if (widthInches > 10 || heightInches > 10) {
    recommendedFrame = 'Q-Snap Frame (11" x 17") o 12" Wood Hoop';
  } else {
    recommendedFrame = '8" - 10" Beechwood Embroidery Hoop';
  }

  return {
    count: fabricCount,
    widthInches,
    heightInches,
    widthCm,
    heightCm,
    cutFabricInchesW,
    cutFabricInchesH,
    recommendedFrame,
  };
}`
    },
    {
      name: 'pdfGenerator.ts',
      path: 'src/utils/pdfGenerator.ts',
      language: 'typescript',
      descriptionFil: 'Paggawa ng commercial multi-page PDF chart na may DMC symbols, grid mapping, at thread shopping key.',
      descriptionEn: 'Generates multi-page high resolution PDF charts with symbol legends and multi-page printable layout.',
      content: `import jsPDF from 'jspdf';
import { PatternData } from '../types';
import { calculateFabricSpecs } from './colorMatcher';

export async function generatePatternPdf(pattern: PatternData, isPro: boolean = true): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Cover Page
  doc.setFillColor(44, 37, 35);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(250, 247, 242);
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.text('SOVEREIGN CROSS STITCH', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(230, 198, 135);
  doc.text('WEDDING HEIRLOOM EDITION | COMMERCIAL CHART', pageWidth - margin, 18, { align: 'right' });

  // Title & Metadata
  doc.setTextColor(44, 37, 35);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text(pattern.title, margin, 42);

  if (pattern.coupleNames) {
    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(184, 142, 60);
    doc.text(\`\${pattern.coupleNames} • \${pattern.weddingDate || ''}\`, margin, 50);
  }

  doc.save(\`\${pattern.title.replace(/\\s+/g, '_')}_CrossStitch_Pattern.pdf\`);
}`
    },
    {
      name: 'dmcPalette.ts',
      path: 'src/data/dmcPalette.ts',
      language: 'typescript',
      descriptionFil: 'Listahan ng tunay na DMC stranded cotton colors na may Hex, RGB values, at distinct chart symbols.',
      descriptionEn: 'Curated DMC color database with calibrated hex/RGB codes and distinct printing symbols.',
      content: `import { DMCColor, TemplateDesign } from '../types';

export const DMC_PALETTE: DMCColor[] = [
  // Whites & Creams
  { code: 'B5200', name: 'Bright Snow White', hex: '#FFFFFF', r: 255, g: 255, b: 255, symbol: '◇' },
  { code: 'Blanc', name: 'White', hex: '#FBFBFB', r: 251, g: 251, b: 251, symbol: '□' },
  { code: 'Ecru', name: 'Ecru Silk', hex: '#F3EFE3', r: 243, g: 239, b: 227, symbol: '○' },
  { code: '3865', name: 'Winter White', hex: '#F7F6F2', r: 247, g: 246, b: 242, symbol: '△' },
  { code: '712', name: 'Cream', hex: '#F3EDDA', r: 243, g: 237, b: 218, symbol: '▽' },

  // Blush, Peony & Wedding Pink
  { code: '948', name: 'Peach Very Light', hex: '#FEECE6', r: 254, g: 236, b: 230, symbol: '♡' },
  { code: '754', name: 'Peach Light', hex: '#F7D6CB', r: 247, g: 214, b: 203, symbol: '♥' },
  { code: '3689', name: 'Mauve Light', hex: '#F7D7DF', r: 247, g: 215, b: 223, symbol: '✿' },
  { code: '3688', name: 'Mauve Medium', hex: '#E8A7B8', r: 232, g: 167, b: 184, symbol: '❀' },
  { code: '3687', name: 'Mauve', hex: '#C46D82', r: 196, g: 109, b: 130, symbol: '❁' },
  { code: '221', name: 'Shell Pink Very Dark', hex: '#873B43', r: 135, g: 59, b: 67, symbol: '★' },

  // Wine & Burgundy
  { code: '816', name: 'Garnet', hex: '#941B2E', r: 148, g: 27, b: 46, symbol: '▲' },
  { code: '814', name: 'Garnet Dark', hex: '#630D1C', r: 99, g: 13, b: 28, symbol: '◀' },
  { code: '321', name: 'Red', hex: '#C71B32', r: 199, g: 27, b: 50, symbol: '◈' },

  // Gold & Champagne
  { code: '677', name: 'Old Gold Very Light', hex: '#F0E5BE', r: 240, g: 229, b: 190, symbol: '⬢' },
  { code: '676', name: 'Old Gold Light', hex: '#DECB95', r: 222, g: 203, b: 149, symbol: '⬣' },
  { code: '729', name: 'Old Gold Medium', hex: '#C29F55', r: 194, g: 159, b: 85, symbol: '⊕' },
  { code: '680', name: 'Old Gold Dark', hex: '#A88034', r: 168, g: 128, b: 52, symbol: '⊖' },

  // Foliage & Greens
  { code: '524', name: 'Fern Green Very Light', hex: '#C2C9AC', r: 194, g: 201, b: 172, symbol: '♣' },
  { code: '522', name: 'Fern Green', hex: '#87926C', r: 135, g: 146, b: 108, symbol: '✕' },
  { code: '3051', name: 'Green Gray Dark', hex: '#515B38', r: 81, g: 91, b: 56, symbol: '✛' },
  { code: '3346', name: 'Hunter Green', hex: '#406C32', r: 64, g: 108, b: 50, symbol: '⚙' },
  { code: '310', name: 'Black', hex: '#000000', r: 0, g: 0, b: 0, symbol: '■' }
];`
    },
    {
      name: 'package.json',
      path: 'package.json',
      language: 'json',
      descriptionFil: 'NPM configuration, scripts, at mga kailangan na dependencies.',
      descriptionEn: 'NPM package configuration, scripts, and production dependencies.',
      content: `{
  "name": "sovereign-cross-stitch",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@types/canvas-confetti": "^1.9.0",
    "@vitejs/plugin-react": "^6.1.1",
    "canvas-confetti": "^1.9.4",
    "jspdf": "^4.2.1",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "tailwindcss": "^4.3.3",
    "vite": "^8.3.0"
  }
}`
    }
  ];

  const currentFile = files[selectedFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleCopyAll = () => {
    const bundle = files.map(f => `// ==========================================\n// FILE: ${f.path}\n// ==========================================\n\n${f.content}\n\n`).join('\n');
    navigator.clipboard.writeText(bundle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([currentFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative bg-[#1A1817] text-[#EDE7DE] w-full max-w-5xl rounded-2xl border border-[#3E3834] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#332D29] flex items-center justify-between bg-[#231F1C]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#B88E3C]/20 border border-[#B88E3C]/40 flex items-center justify-center text-[#E6C687]">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-[#F5F2EB]">
                  {language === 'fil' ? 'Malinis na Kahon ng Buong Code' : 'Clean Source Code Box'}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-[#B88E3C]/20 text-[#E6C687] rounded border border-[#B88E3C]/30">
                  Ready to Copy
                </span>
              </div>
              <p className="text-xs text-[#A89F91]">
                {language === 'fil'
                  ? 'Kompleto, maayos, at handang kopyahin sa isang click ang bawat bahagi ng code.'
                  : 'Clean, formatted, production code ready to copy or download in one click.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#E6C687] bg-[#B88E3C]/15 hover:bg-[#B88E3C]/25 border border-[#B88E3C]/30 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{language === 'fil' ? 'Kopyahin Lahat' : 'Copy All Files'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#8E8477] hover:text-[#EDE7DE] hover:bg-[#332D29] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* File Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 bg-[#1E1B19] border-b border-[#332D29] overflow-x-auto scrollbar-thin">
          {files.map((file, idx) => (
            <button
              key={file.name}
              onClick={() => setSelectedFileIndex(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
                selectedFileIndex === idx
                  ? 'bg-[#2E2824] text-[#E6C687] border border-[#B88E3C]/40 font-semibold shadow-sm'
                  : 'text-[#968D7F] hover:text-[#EDE7DE] hover:bg-[#26211E]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{file.name}</span>
            </button>
          ))}
        </div>

        {/* File Sub-header info */}
        <div className="px-5 py-2.5 bg-[#171514] border-b border-[#2C2723] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[#D4C3A3] font-medium">{currentFile.path}</span>
            <span className="text-[#6E6457]">•</span>
            <span className="text-[#8F8677]">{language === 'fil' ? currentFile.descriptionFil : currentFile.descriptionEn}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#A89F91] hover:text-[#EDE7DE] hover:bg-[#26211E] border border-[#38312C] rounded transition-colors"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'fil' ? 'I-download' : 'Download'}</span>
            </button>

            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#B88E3C] hover:bg-[#A37B2E] text-slate-950 font-semibold'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{language === 'fil' ? 'Nakopya na!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{language === 'fil' ? 'Kopyahin ang File' : 'Copy File'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Content Container (The Clean Box) */}
        <div className="flex-1 overflow-auto bg-[#0F0E0D] p-4 font-mono text-xs leading-relaxed border-t border-[#231F1C]">
          <pre className="text-[#E2DAD0] whitespace-pre selection:bg-[#B88E3C]/30 selection:text-white">
            <code>{currentFile.content}</code>
          </pre>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-[#1A1817] border-t border-[#332D29] flex items-center justify-between text-xs text-[#8E8477]">
          <span>
            {language === 'fil'
              ? '✨ 100% Malinis na code na walang placeholders o sirang syntax.'
              : '✨ 100% Clean production code without missing dependencies.'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2E2824] hover:bg-[#3E3631] text-[#EDE7DE] rounded-lg transition-colors"
          >
            {language === 'fil' ? 'Isara' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
