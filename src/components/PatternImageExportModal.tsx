import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Download,
  Image as ImageIcon,
  Copy,
  Check,
  Sparkles,
  Grid,
  Sliders,
  Maximize,
} from 'lucide-react';
import { PatternData } from '../types';

export type ImageExportFormat = 'png' | 'jpeg';
export type GridRenderStyle = 'stitches' | 'blocks' | 'symbols';
export type GridLinesMode = 'none' | 'subtle' | 'major10';
export type ShowcaseFrameTheme = 'raw' | 'linen' | 'white' | 'dark';

interface PatternImageExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: PatternData;
  stitchedCells?: Set<string>;
  language: 'en' | 'fil';
  initialStyle?: GridRenderStyle;
}

function getLuminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const PatternImageExportModal: React.FC<PatternImageExportModalProps> = ({
  isOpen,
  onClose,
  pattern,
  stitchedCells,
  language,
  initialStyle = 'stitches',
}) => {
  const [format, setFormat] = useState<ImageExportFormat>('png');
  const [jpegQuality, setJpegQuality] = useState<number>(95);
  const [resolutionScale, setResolutionScale] = useState<1 | 2 | 3>(2);
  const [renderStyle, setRenderStyle] = useState<GridRenderStyle>(initialStyle);
  const [gridLinesMode, setGridLinesMode] = useState<GridLinesMode>('major10');
  const [frameTheme, setFrameTheme] = useState<ShowcaseFrameTheme>('linen');
  const [transparentPngBg, setTransparentPngBg] = useState<boolean>(false);
  const [includeBackstitches, setIncludeBackstitches] = useState<boolean>(true);
  const [includeProgressOverlay, setIncludeProgressOverlay] = useState<boolean>(false);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewDimensions, setPreviewDimensions] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [estimatedBytes, setEstimatedBytes] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRenderStyle(initialStyle);
    }
  }, [isOpen, initialStyle]);

  // Compute target export pixel dimensions safely within canvas limits
  const exportMetrics = useMemo(() => {
    const maxDim = Math.max(pattern.width, pattern.height, 1);
    const baseTarget = resolutionScale === 1 ? 1200 : resolutionScale === 2 ? 2200 : 3200;
    const rawCell = Math.max(6, Math.min(28, Math.floor(baseTarget / maxDim)));
    // Keep total canvas under 3800px per side for reliable browser memory
    const safeCell = Math.max(4, Math.min(rawCell, Math.floor(3500 / maxDim)));
    const gridW = pattern.width * safeCell;
    const gridH = pattern.height * safeCell;

    if (frameTheme === 'raw') {
      return {
        cellSize: safeCell,
        gridW,
        gridH,
        padX: 0,
        padTop: 0,
        padBottom: 0,
        totalW: gridW,
        totalH: gridH,
      };
    }

    const padX = Math.max(36, Math.round(gridW * 0.055));
    const padTop = Math.max(64, Math.round(gridH * 0.095));
    const padBottom = Math.max(54, Math.round(gridH * 0.08));

    return {
      cellSize: safeCell,
      gridW,
      gridH,
      padX,
      padTop,
      padBottom,
      totalW: gridW + padX * 2,
      totalH: gridH + padTop + padBottom,
    };
  }, [pattern.width, pattern.height, resolutionScale, frameTheme]);

  // Shared canvas drawing engine used for both live preview and full-res export
  const drawPatternToCanvas = useCallback(
    (
      canvas: HTMLCanvasElement,
      cellSize: number,
      padX: number,
      padTop: number,
      padBottom: number,
      targetFormat: ImageExportFormat
    ) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const gridW = pattern.width * cellSize;
      const gridH = pattern.height * cellSize;
      const totalW = gridW + padX * 2;
      const totalH = gridH + padTop + padBottom;

      canvas.width = totalW;
      canvas.height = totalH;

      const isTransparent =
        targetFormat === 'png' && frameTheme === 'raw' && transparentPngBg;

      if (isTransparent) {
        ctx.clearRect(0, 0, totalW, totalH);
      } else {
        const outerBg =
          frameTheme === 'dark'
            ? '#1C1917'
            : frameTheme === 'white'
            ? '#FFFFFF'
            : '#FAF7F2';
        ctx.fillStyle = outerBg;
        ctx.fillRect(0, 0, totalW, totalH);
      }

      // Showcase Header & Mat Frame when not Raw Grid
      if (frameTheme !== 'raw') {
        const isDark = frameTheme === 'dark';
        const titleColor = isDark ? '#FAF7F2' : '#2C2523';
        const subColor = isDark ? '#D6CFC4' : '#7A6E65';
        const accentColor = isDark ? '#E6C687' : '#B88E3C';
        const borderColor = isDark ? '#44403C' : '#D7CBB9';

        // Crisp border around mat frame
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = Math.max(1.5, cellSize * 0.14);
        ctx.strokeRect(
          padX - Math.max(4, cellSize * 0.25),
          padTop - Math.max(4, cellSize * 0.25),
          gridW + Math.max(8, cellSize * 0.5),
          gridH + Math.max(8, cellSize * 0.5)
        );

        // Title & Subtitle above grid
        const titleFontSize = Math.max(15, Math.min(34, Math.round(padTop * 0.34)));
        ctx.fillStyle = titleColor;
        ctx.font = `700 ${titleFontSize}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const hasSub = Boolean(pattern.coupleNames || pattern.weddingDate);
        const titleY = hasSub ? padTop * 0.38 : padTop * 0.52;
        ctx.fillText(pattern.title || 'Cross Stitch Pattern', totalW / 2, titleY, gridW);

        if (hasSub) {
          const subText = [pattern.coupleNames, pattern.weddingDate].filter(Boolean).join(' · ');
          const subFontSize = Math.max(10, Math.round(titleFontSize * 0.54));
          ctx.fillStyle = subColor;
          ctx.font = `500 ${subFontSize}px system-ui, -apple-system, sans-serif`;
          ctx.fillText(subText, totalW / 2, padTop * 0.72, gridW);
        }

        // Bottom Specs Strip
        const footerFontSize = Math.max(10, Math.min(18, Math.round(padBottom * 0.28)));
        ctx.fillStyle = accentColor;
        ctx.font = `600 ${footerFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const footerY = padTop + gridH + padBottom * 0.54;
        const footerText = `${pattern.width} × ${pattern.height} stitches · ${pattern.fabricCount}ct Aida · ${pattern.palette.length} DMC colors · ${pattern.totalStitches.toLocaleString()} total stitches`;
        ctx.fillText(footerText, totalW / 2, footerY, gridW);
      }

      // Draw Pattern Grid Area
      ctx.save();
      ctx.translate(padX, padTop);

      // Linen Aida backdrop inside grid area unless transparent raw PNG
      if (!isTransparent) {
        ctx.fillStyle = '#FDFBF7';
        ctx.fillRect(0, 0, gridW, gridH);
      }

      // Render every stitch cell
      for (let y = 0; y < pattern.height; y++) {
        const row = pattern.grid[y];
        for (let x = 0; x < pattern.width; x++) {
          const cell = row[x];
          const color = pattern.palette[cell.colorIndex] || pattern.palette[0];
          const px = x * cellSize;
          const py = y * cellSize;

          if (renderStyle === 'blocks' || renderStyle === 'symbols') {
            ctx.fillStyle = color.hex;
            ctx.fillRect(px, py, cellSize, cellSize);

            if (renderStyle === 'symbols' && cellSize >= 7) {
              const lum = getLuminance(color.r, color.g, color.b);
              ctx.fillStyle = lum > 0.56 ? '#18181B' : '#FAF7F2';
              ctx.font = `700 ${Math.max(6, Math.floor(cellSize * 0.58))}px ui-sans-serif, system-ui, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(color.symbol, px + cellSize / 2, py + cellSize / 2 + 0.3);
            }
          } else {
            // Realistic Thread Stitches ('X') on Aida Weave
            if (!isTransparent) {
              // Subtle Aida hole corners & cloth tint
              ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
              const holeR = Math.max(0.5, cellSize * 0.08);
              ctx.beginPath();
              ctx.arc(px + cellSize * 0.14, py + cellSize * 0.14, holeR, 0, Math.PI * 2);
              ctx.arc(px + cellSize * 0.86, py + cellSize * 0.14, holeR, 0, Math.PI * 2);
              ctx.arc(px + cellSize * 0.14, py + cellSize * 0.86, holeR, 0, Math.PI * 2);
              ctx.arc(px + cellSize * 0.86, py + cellSize * 0.86, holeR, 0, Math.PI * 2);
              ctx.fill();
            }

            const pad = Math.max(1, cellSize * 0.14);
            const legW = Math.max(1.2, cellSize * 0.25);

            // Soft thread under-shadow
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
            ctx.lineWidth = legW + 0.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(px + pad, py + pad + 0.4);
            ctx.lineTo(px + cellSize - pad, py + cellSize - pad + 0.4);
            ctx.stroke();

            // Under-leg (\)
            ctx.strokeStyle = color.hex;
            ctx.lineWidth = legW;
            ctx.beginPath();
            ctx.moveTo(px + pad, py + pad);
            ctx.lineTo(px + cellSize - pad, py + cellSize - pad);
            ctx.stroke();

            // Crossing shadow dot
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.arc(px + cellSize / 2, py + cellSize / 2, legW * 0.45, 0, Math.PI * 2);
            ctx.fill();

            // Top-leg (/)
            ctx.strokeStyle = color.hex;
            ctx.lineWidth = legW;
            ctx.beginPath();
            ctx.moveTo(px + pad, py + cellSize - pad);
            ctx.lineTo(px + cellSize - pad, py + pad);
            ctx.stroke();

            // Mercerized cotton sheen highlight
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
            ctx.lineWidth = Math.max(0.5, legW * 0.26);
            ctx.beginPath();
            ctx.moveTo(px + pad + 0.6, py + cellSize - pad - 0.5);
            ctx.lineTo(px + cellSize - pad - 0.5, py + pad + 0.6);
            ctx.stroke();
          }

          if (includeProgressOverlay && stitchedCells?.has(`${x},${y}`)) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.34)';
            ctx.fillRect(px, py, cellSize, cellSize);
            ctx.strokeStyle = '#059669';
            ctx.lineWidth = Math.max(0.8, cellSize * 0.08);
            ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
          }
        }
      }

      // Optional Grid Lines
      if (gridLinesMode !== 'none') {
        const thinColor =
          renderStyle === 'stitches'
            ? 'rgba(150, 138, 124, 0.28)'
            : 'rgba(60, 50, 45, 0.25)';
        ctx.strokeStyle = thinColor;
        ctx.lineWidth = Math.max(0.5, cellSize * 0.045);

        ctx.beginPath();
        for (let x = 0; x <= pattern.width; x++) {
          const px = x * cellSize;
          ctx.moveTo(px, 0);
          ctx.lineTo(px, gridH);
        }
        for (let y = 0; y <= pattern.height; y++) {
          const py = y * cellSize;
          ctx.moveTo(0, py);
          ctx.lineTo(gridW, py);
        }
        ctx.stroke();

        if (gridLinesMode === 'major10') {
          ctx.strokeStyle = 'rgba(44, 37, 35, 0.72)';
          ctx.lineWidth = Math.max(1.1, cellSize * 0.11);
          ctx.beginPath();
          for (let x = 0; x <= pattern.width; x += 10) {
            const px = x * cellSize;
            ctx.moveTo(px, 0);
            ctx.lineTo(px, gridH);
          }
          for (let y = 0; y <= pattern.height; y += 10) {
            const py = y * cellSize;
            ctx.moveTo(0, py);
            ctx.lineTo(gridW, py);
          }
          ctx.stroke();
        }
      }

      // Optional Backstitch Outlines
      if (includeBackstitches && pattern.backstitches && pattern.backstitches.length > 0) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const seg of pattern.backstitches) {
          const strands = seg.strands ?? 1;
          ctx.strokeStyle = seg.color || '#2C2523';
          ctx.lineWidth = Math.max(1.4, cellSize * (strands >= 2 ? 0.24 : 0.16));
          ctx.beginPath();
          ctx.moveTo(seg.x1 * cellSize, seg.y1 * cellSize);
          ctx.lineTo(seg.x2 * cellSize, seg.y2 * cellSize);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore();
    },
    [
      pattern,
      renderStyle,
      gridLinesMode,
      frameTheme,
      transparentPngBg,
      includeBackstitches,
      includeProgressOverlay,
      stitchedCells,
    ]
  );

  // Render live compact preview canvas whenever modal opens or options change
  useEffect(() => {
    if (!isOpen || !previewCanvasRef.current) return;

    const maxDim = Math.max(pattern.width, pattern.height, 1);
    const previewCell = Math.max(4, Math.min(12, Math.floor(620 / maxDim)));
    const gridW = pattern.width * previewCell;
    const gridH = pattern.height * previewCell;
    const padX = frameTheme === 'raw' ? 0 : Math.max(18, Math.round(gridW * 0.055));
    const padTop = frameTheme === 'raw' ? 0 : Math.max(36, Math.round(gridH * 0.095));
    const padBottom = frameTheme === 'raw' ? 0 : Math.max(28, Math.round(gridH * 0.08));

    drawPatternToCanvas(
      previewCanvasRef.current,
      previewCell,
      padX,
      padTop,
      padBottom,
      format
    );

    setPreviewDimensions({ w: exportMetrics.totalW, h: exportMetrics.totalH });

    // Estimate exported size asynchronously via offscreen export canvas sample
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const qualityArg = format === 'jpeg' ? jpegQuality / 100 : undefined;
    previewCanvasRef.current.toBlob(
      (blob) => {
        if (!blob) {
          setEstimatedBytes(null);
          return;
        }
        const scaleRatio =
          (exportMetrics.totalW * exportMetrics.totalH) /
          Math.max(1, previewCanvasRef.current!.width * previewCanvasRef.current!.height);
        setEstimatedBytes(Math.round(blob.size * Math.sqrt(Math.max(1, scaleRatio))));
      },
      mime,
      qualityArg
    );
  }, [
    isOpen,
    pattern,
    format,
    jpegQuality,
    frameTheme,
    exportMetrics,
    drawPatternToCanvas,
  ]);

  const generateFullExportBlob = useCallback(
    async (overrideMime?: 'image/png' | 'image/jpeg'): Promise<Blob | null> => {
      const offscreen = document.createElement('canvas');
      const targetFormat: ImageExportFormat =
        overrideMime === 'image/png'
          ? 'png'
          : overrideMime === 'image/jpeg'
          ? 'jpeg'
          : format;

      drawPatternToCanvas(
        offscreen,
        exportMetrics.cellSize,
        exportMetrics.padX,
        exportMetrics.padTop,
        exportMetrics.padBottom,
        targetFormat
      );

      const mime = overrideMime || (format === 'png' ? 'image/png' : 'image/jpeg');
      const qualityArg = mime === 'image/jpeg' ? jpegQuality / 100 : undefined;

      return new Promise((resolve) => {
        offscreen.toBlob((blob) => resolve(blob), mime, qualityArg);
      });
    },
    [drawPatternToCanvas, exportMetrics, format, jpegQuality]
  );

  const handleDownloadImage = async () => {
    setIsExporting(true);
    try {
      const blob = await generateFullExportBlob();
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const safeTitle = (pattern.title || 'wedding_pattern')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      const ext = format === 'png' ? 'png' : 'jpg';

      const link = document.createElement('a');
      link.download = `${safeTitle}_${renderStyle}_${exportMetrics.totalW}x${exportMetrics.totalH}.${ext}`;
      link.href = url;
      link.click();

      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return;
    setIsExporting(true);
    try {
      const pngBlob = await generateFullExportBlob('image/png');
      if (!pngBlob) return;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2400);
    } catch (err) {
      console.error('Copy image error', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E8E1D5] shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#FAF7F2] border-b border-[#E8E1D5] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#2C2523] text-[#E6C687] flex items-center justify-center shadow-xs shrink-0">
              <ImageIcon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-lg font-bold text-[#2C2523] truncate">
                {language === 'fil'
                  ? 'I-export ang Pattern Grid bilang Larawan (PNG / JPG)'
                  : 'Export Pattern Grid Image (PNG / JPG)'}
              </h3>
              <p className="text-xs text-[#7A6E65] truncate">
                {language === 'fil'
                  ? 'Gumawa ng malinaw at high-resolution na larawan para i-showcase ang iyong disenyo online.'
                  : 'Render a crisp high-resolution graphic independent of the PDF booklet for online portfolios & social showcases.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#7A6E65] hover:text-[#2C2523] hover:bg-[#EFE9DF] transition-colors cursor-pointer shrink-0"
            aria-label="Close export modal"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Body: Two-Column Preview + Controls */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Live Rendered Preview */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-[#7A6E65]">
              <span className="font-semibold text-[#2C2523] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#B88E3C]" />
                <span>{language === 'fil' ? 'Live Preview' : 'Live Render Preview'}</span>
              </span>
              <span className="font-mono text-[11px] bg-[#FAF7F2] border border-[#E8E1D5] px-2 py-0.5 rounded text-[#2C2523]">
                {previewDimensions.w} × {previewDimensions.h} px
                {estimatedBytes ? ` · ~${formatFileSize(estimatedBytes)}` : ''}
              </span>
            </div>

            <div
              className="flex-1 min-h-[300px] max-h-[430px] rounded-xl border border-[#E8E1D5] p-4 flex items-center justify-center overflow-hidden shadow-inner"
              style={{
                backgroundImage:
                  format === 'png' && frameTheme === 'raw' && transparentPngBg
                    ? 'repeating-conic-gradient(#EFEAE2 0% 25%, #FAF7F2 0% 50%)'
                    : undefined,
                backgroundSize:
                  format === 'png' && frameTheme === 'raw' && transparentPngBg
                    ? '18px 18px'
                    : undefined,
                backgroundColor:
                  format === 'png' && frameTheme === 'raw' && transparentPngBg
                    ? undefined
                    : '#F3EFE7',
              }}
            >
              <canvas
                ref={previewCanvasRef}
                className="max-w-full max-h-[390px] w-auto h-auto rounded shadow-md border border-black/10"
              />
            </div>
          </div>

          {/* Right: Export Configuration Controls */}
          <div className="lg:col-span-5 space-y-4 text-xs">
            {/* 1. File Format */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#2C2523] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#B88E3C]" />
                <span>{language === 'fil' ? 'Format ng Larawan' : 'Image Format'}</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('png')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    format === 'png'
                      ? 'bg-[#2C2523] text-white border-[#2C2523] shadow-xs'
                      : 'bg-[#FAF7F2] text-[#2C2523] border-[#E8E1D5] hover:border-[#D7CBB9]'
                  }`}
                >
                  <div className="font-mono font-bold text-xs">PNG</div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      format === 'png' ? 'text-[#E6C687]' : 'text-[#7A6E65]'
                    }`}
                  >
                    {language === 'fil' ? 'Lossless · Pinakamalinaw' : 'Lossless · Sharp edges'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('jpeg')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    format === 'jpeg'
                      ? 'bg-[#2C2523] text-white border-[#2C2523] shadow-xs'
                      : 'bg-[#FAF7F2] text-[#2C2523] border-[#E8E1D5] hover:border-[#D7CBB9]'
                  }`}
                >
                  <div className="font-mono font-bold text-xs">JPG</div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      format === 'jpeg' ? 'text-[#E6C687]' : 'text-[#7A6E65]'
                    }`}
                  >
                    {language === 'fil' ? 'Magaan · Pang-social media' : 'Compact · Social ready'}
                  </div>
                </button>
              </div>
            </div>

            {/* JPEG Quality Slider */}
            {format === 'jpeg' && (
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E8E1D5] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#2C2523]">
                    {language === 'fil' ? 'Kalidad ng JPG' : 'JPEG Quality'}
                  </span>
                  <span className="font-mono font-bold text-[#B88E3C]">{jpegQuality}%</span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={100}
                  step={5}
                  value={jpegQuality}
                  onChange={(e) => setJpegQuality(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#E8E1D5] rounded-lg appearance-none cursor-pointer accent-[#2C2523]"
                />
              </div>
            )}

            {/* 2. Resolution Scale */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#2C2523] flex items-center gap-1.5">
                <Maximize className="w-3.5 h-3.5 text-[#B88E3C]" />
                <span>{language === 'fil' ? 'Resolusyon ng Export' : 'Resolution Scale'}</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { scale: 1 as const, label: '1× Web', desc: '~1200px' },
                  { scale: 2 as const, label: '2× HD', desc: '~2200px' },
                  { scale: 3 as const, label: '3× Ultra', desc: '~3200px' },
                ]).map((opt) => (
                  <button
                    key={opt.scale}
                    type="button"
                    onClick={() => setResolutionScale(opt.scale)}
                    className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                      resolutionScale === opt.scale
                        ? 'bg-amber-50 border-[#B88E3C] text-[#2C2523] ring-1 ring-[#B88E3C]/50 font-bold'
                        : 'bg-white border-[#E8E1D5] text-[#5F554F] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <div className="text-[11px] font-bold">{opt.label}</div>
                    <div className="text-[10px] font-mono text-[#7A6E65]">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Render Style */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#2C2523] flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-[#B88E3C]" />
                <span>{language === 'fil' ? 'Estilo ng Pattern' : 'Pattern Render Style'}</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { id: 'stitches' as const, label: language === 'fil' ? '🧵 Tahi (X)' : '🧵 Stitches' },
                  { id: 'blocks' as const, label: language === 'fil' ? '🎨 Kulay' : '🎨 Blocks' },
                  { id: 'symbols' as const, label: language === 'fil' ? '🔤 Simbolo' : '🔤 Symbols' },
                ]).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setRenderStyle(st.id)}
                    className={`py-1.5 px-2 rounded-lg border font-semibold text-[11px] transition-all cursor-pointer ${
                      renderStyle === st.id
                        ? 'bg-[#2C2523] text-white border-[#2C2523]'
                        : 'bg-white border-[#E8E1D5] text-[#5F554F] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Grid Lines & Showcase Frame */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="font-semibold text-[#2C2523] block">
                  {language === 'fil' ? 'Mga Linya ng Grid' : 'Grid Lines'}
                </span>
                <select
                  value={gridLinesMode}
                  onChange={(e) => setGridLinesMode(e.target.value as GridLinesMode)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#D7CBB9] bg-white text-[#2C2523] text-xs font-medium cursor-pointer"
                >
                  <option value="major10">
                    {language === 'fil' ? '10×10 + 1×1 Grid' : '10×10 + 1×1 Grid'}
                  </option>
                  <option value="subtle">
                    {language === 'fil' ? 'Pino (1×1) Lang' : 'Subtle 1×1 Only'}
                  </option>
                  <option value="none">
                    {language === 'fil' ? 'Walang Grid Lines' : 'No Grid Lines'}
                  </option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[#2C2523] block">
                  {language === 'fil' ? 'Frame ng Disenyo' : 'Presentation Frame'}
                </span>
                <select
                  value={frameTheme}
                  onChange={(e) => setFrameTheme(e.target.value as ShowcaseFrameTheme)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#D7CBB9] bg-white text-[#2C2523] text-xs font-medium cursor-pointer"
                >
                  <option value="linen">
                    {language === 'fil' ? 'Warm Linen Showcase' : 'Warm Linen Card'}
                  </option>
                  <option value="white">
                    {language === 'fil' ? 'Putì Studio Frame' : 'Crisp White Card'}
                  </option>
                  <option value="dark">
                    {language === 'fil' ? 'Dark Gallery Frame' : 'Dark Studio Card'}
                  </option>
                  <option value="raw">
                    {language === 'fil' ? 'Purong Grid Lang' : 'Raw Grid Only'}
                  </option>
                </select>
              </div>
            </div>

            {/* 5. Extra Checkboxes */}
            <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E8E1D5] space-y-2">
              {format === 'png' && frameTheme === 'raw' && (
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-[#2C2523] font-medium">
                    {language === 'fil' ? 'Transparent Background (PNG)' : 'Transparent Background (PNG)'}
                  </span>
                  <input
                    type="checkbox"
                    checked={transparentPngBg}
                    onChange={(e) => setTransparentPngBg(e.target.checked)}
                    className="rounded accent-[#2C2523] cursor-pointer"
                  />
                </label>
              )}

              {(pattern.backstitches?.length || 0) > 0 && (
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-[#2C2523] font-medium">
                    {language === 'fil' ? 'Isama ang Backstitch Outlines' : 'Include Backstitch Outlines'}
                  </span>
                  <input
                    type="checkbox"
                    checked={includeBackstitches}
                    onChange={(e) => setIncludeBackstitches(e.target.checked)}
                    className="rounded accent-[#2C2523] cursor-pointer"
                  />
                </label>
              )}

              {stitchedCells && stitchedCells.size > 0 && (
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-[#2C2523] font-medium">
                    {language === 'fil'
                      ? `Ipakita ang Progreso (${stitchedCells.size.toLocaleString()} tahi)`
                      : `Show Progress Marks (${stitchedCells.size.toLocaleString()} stitched)`}
                  </span>
                  <input
                    type="checkbox"
                    checked={includeProgressOverlay}
                    onChange={(e) => setIncludeProgressOverlay(e.target.checked)}
                    className="rounded accent-emerald-700 cursor-pointer"
                  />
                </label>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isExporting}
                className="flex-1 py-2.5 px-4 rounded-xl font-serif text-xs font-bold text-white bg-[#2C2523] hover:bg-[#433936] active:scale-[0.99] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Download className="w-4 h-4 text-[#E6C687]" />
                <span>
                  {isExporting
                    ? language === 'fil'
                      ? 'Nire-render...'
                      : 'Rendering...'
                    : language === 'fil'
                    ? `I-download ang ${format === 'png' ? 'PNG' : 'JPG'}`
                    : `Download ${format === 'png' ? 'PNG' : 'JPG'} Image`}
                </span>
              </button>

              {typeof ClipboardItem !== 'undefined' && (
                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  disabled={isExporting}
                  className="py-2.5 px-3.5 rounded-xl text-xs font-semibold text-[#2C2523] bg-[#FAF7F2] hover:bg-[#F0ECE1] border border-[#D7CBB9] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  title={
                    language === 'fil'
                      ? 'Kopyahin ang larawan sa clipboard'
                      : 'Copy PNG image to clipboard'
                  }
                >
                  {copiedImage ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-emerald-800 font-bold">
                        {language === 'fil' ? 'Nakopya!' : 'Copied!'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#7A6E65]" />
                      <span>{language === 'fil' ? 'Kopyahin' : 'Copy'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
