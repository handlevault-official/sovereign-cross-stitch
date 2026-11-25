import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Sparkles,
  Lock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  Scissors,
  Check,
  Palette,
  Maximize2,
  Info,
  Sliders,
  Route,
} from 'lucide-react';
import { PatternData } from '../types';
import { calculateFabricSpecs } from '../utils/colorMatcher';
import { loadAnnotations } from '../utils/annotationStorage';
import { calculateBackstitchStats } from '../utils/outlineDetector';

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: PatternData;
  isPro: boolean;
  language: 'en' | 'fil';
  onDownloadPdf: () => void;
  onOpenCheckout?: () => void;
}

type PaperSize = 'a4' | 'letter';
type PrintColorMode = 'color' | 'mono';

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  pattern,
  isPro,
  language,
  onDownloadPdf,
  onOpenCheckout,
}) => {
  // Navigation & Page State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [colorMode, setColorMode] = useState<PrintColorMode>('color');
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1 = 100%, 0.8 = fit, 1.25 = zoom in

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Tiling metrics (50 stitches wide by 70 stitches tall per chart page)
  const tileW = 50;
  const tileH = 70;
  const tileCols = Math.ceil(pattern.width / tileW);
  const tileRows = Math.ceil(pattern.height / tileH);
  const totalChartPages = tileCols * tileRows;

  // Legend pages calculation: ~32 colors fit per legend page comfortably
  const colorsPerPage = 32;
  const totalLegendPages = Math.max(1, Math.ceil(pattern.colorStats.length / colorsPerPage));

  // Backstitch Guide page calculation
  const hasBackstitches = Boolean(pattern.backstitches && pattern.backstitches.length > 0);
  const backstitchPages = hasBackstitches ? 1 : 0;

  // Booklet total pages:
  // Page 1: Cover Sheet
  // Page 2 .. (1 + totalLegendPages): Legend pages
  // Page (2 + totalLegendPages): Backstitch Guide (if present)
  // Page (2 + totalLegendPages + backstitchPages) .. Total: Chart Sheets
  const totalPages = 1 + totalLegendPages + backstitchPages + totalChartPages;

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage((prev) => Math.max(1, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, totalPages, onClose]);

  if (!isOpen) return null;

  const fabricSpecs = calculateFabricSpecs(pattern.width, pattern.height, pattern.fabricCount);
  const totalSkeins = pattern.colorStats.reduce((acc, c) => acc + c.skeinsNeeded, 0);

  // Page classifications
  const isCoverPage = currentPage === 1;
  const isLegendPage = currentPage > 1 && currentPage <= 1 + totalLegendPages;
  const legendPageIndex = currentPage - 2; // 0-indexed among legend pages

  const isBackstitchPage = hasBackstitches && currentPage === 2 + totalLegendPages;
  const isChartPage = currentPage > 1 + totalLegendPages + backstitchPages;
  const chartSheetIndex = currentPage - (1 + totalLegendPages + backstitchPages); // 1-indexed (1..totalChartPages)
  const chartTileR = Math.floor((chartSheetIndex - 1) / tileCols);
  const chartTileC = (chartSheetIndex - 1) % tileCols;

  const chartStartX = chartTileC * tileW;
  const chartEndX = Math.min(pattern.width, chartStartX + tileW);
  const chartStartY = chartTileR * tileH;
  const chartEndY = Math.min(pattern.height, chartStartY + tileH);
  const stitchesW = chartEndX - chartStartX;
  const stitchesH = chartEndY - chartStartY;

  // Has adjacent sheets for overlap shading?
  const hasTopNeighbor = chartTileR > 0;
  const hasBottomNeighbor = chartTileR < tileRows - 1;
  const hasLeftNeighbor = chartTileC > 0;
  const hasRightNeighbor = chartTileC < tileCols - 1;

  // Midpoint axes for red center triangles
  const midX = Math.floor(pattern.width / 2);
  const midY = Math.floor(pattern.height / 2);
  const centerCrossesX = midX >= chartStartX && midX < chartEndX;
  const centerCrossesY = midY >= chartStartY && midY < chartEndY;

  // Paper aspect ratio
  // A4: 210 x 297 mm (ratio 0.707)
  // Letter: 8.5 x 11 in (ratio 0.772)
  const aspectRatioClass = paperSize === 'a4' ? 'aspect-[210/297]' : 'aspect-[8.5/11]';
  const paperDimensionsLabel = paperSize === 'a4' ? 'A4 · 210 × 297 mm (300 DPI)' : 'US Letter · 8.5 × 11 in (300 DPI)';

  // Print trigger
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1F1B1A]/85 backdrop-blur-md flex flex-col text-[#2C2523] select-none overflow-hidden animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      {/* ============================================================== */}
      {/* TOP CONTROLS & STATUS BAR */}
      {/* ============================================================== */}
      <header className="bg-[#FAF7F2] border-b border-[#E8E1D5] px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2C2523] text-[#FAF7F2] flex items-center justify-center font-serif font-bold text-base shadow-xs">
            🖨️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg font-bold text-[#2C2523]">
                {language === 'fil' ? 'Multi-Page Pattern Print Preview' : 'Multi-Page Pattern Print Preview'}
              </h2>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-[#EFE9DF] text-[#6E6359] rounded-md border border-[#D7CBB9]">
                {paperDimensionsLabel}
              </span>
              {!isPro && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                  {language === 'fil' ? 'Free Preview Mode' : 'Free Preview Mode'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#7A6E65] hidden sm:block">
              {language === 'fil'
                ? 'Sinisimulate ang aktwal na pisikal na kopya na may 14mm margins, 3mm bleed guides, at page numbering.'
                : 'Simulating physical multi-page booklet sheets with 14mm margins, 3mm bleed lines, and crop marks.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Paper Size selector */}
          <div className="flex items-center bg-[#EFE9DF] rounded-lg p-0.5 border border-[#D7CBB9] text-xs">
            <button
              onClick={() => setPaperSize('a4')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                paperSize === 'a4'
                  ? 'bg-white text-[#2C2523] shadow-2xs font-bold'
                  : 'text-[#6E6359] hover:text-[#2C2523]'
              }`}
              title="Standard International A4 (210 x 297mm)"
            >
              A4
            </button>
            <button
              onClick={() => setPaperSize('letter')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                paperSize === 'letter'
                  ? 'bg-white text-[#2C2523] shadow-2xs font-bold'
                  : 'text-[#6E6359] hover:text-[#2C2523]'
              }`}
              title="US Standard Letter (8.5 x 11 inches)"
            >
              Letter
            </button>
          </div>

          {/* Color Mode selector */}
          <div className="flex items-center bg-[#EFE9DF] rounded-lg p-0.5 border border-[#D7CBB9] text-xs">
            <button
              onClick={() => setColorMode('color')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                colorMode === 'color'
                  ? 'bg-white text-[#2C2523] shadow-2xs font-bold'
                  : 'text-[#6E6359] hover:text-[#2C2523]'
              }`}
              title="Full Color Symbols"
            >
              <Palette className="w-3.5 h-3.5 text-[#B88E3C]" />
              <span className="hidden md:inline">{language === 'fil' ? 'May Kulay' : 'Color'}</span>
            </button>
            <button
              onClick={() => setColorMode('mono')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                colorMode === 'mono'
                  ? 'bg-white text-[#2C2523] shadow-2xs font-bold'
                  : 'text-[#6E6359] hover:text-[#2C2523]'
              }`}
              title="Black & White Symbols (Save Printer Ink)"
            >
              <FileText className="w-3.5 h-3.5 text-[#5F554F]" />
              <span className="hidden md:inline">{language === 'fil' ? 'B&W Ink-Saver' : 'B&W'}</span>
            </button>
          </div>

          {/* Toggle Bleed & Trim Guides */}
          <button
            onClick={() => setShowGuides(!showGuides)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              showGuides
                ? 'bg-[#B88E3C]/10 text-[#8C6B1B] border-[#B88E3C]/40 font-semibold shadow-2xs'
                : 'bg-white text-[#5F554F] border-[#D7CBB9] hover:bg-[#F5F0E8]'
            }`}
            title="Toggle printer crop marks, 3mm bleed lines, and 14mm margins"
          >
            {showGuides ? <Eye className="w-3.5 h-3.5 text-[#B88E3C]" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {showGuides
                ? language === 'fil'
                  ? 'Naka-on ang Bleed Guides'
                  : 'Bleed Guides: ON'
                : language === 'fil'
                  ? 'Nakatago ang Guides'
                  : 'Bleed Guides: OFF'}
            </span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-[#EFE9DF] rounded-lg p-0.5 border border-[#D7CBB9] text-xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, Number((z - 0.15).toFixed(2))))}
              className="p-1.5 text-[#5F554F] hover:text-[#2C2523] cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] font-semibold text-[#5F554F] min-w-[42px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, Number((z + 0.15).toFixed(2))))}
              className="p-1.5 text-[#5F554F] hover:text-[#2C2523] cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="px-1.5 py-0.5 text-[10px] text-[#6E6359] hover:text-[#2C2523] cursor-pointer font-medium border-l border-[#D7CBB9]"
              title="Reset Zoom to 100%"
            >
              Reset
            </button>
          </div>

          <div className="h-5 w-px bg-[#D7CBB9] mx-1 hidden sm:block" />

          {/* Download PDF button */}
          <button
            onClick={onDownloadPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2C2523] hover:bg-[#433936] text-white text-xs font-serif font-bold shadow-xs cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#E6C687]" />
            <span className="hidden md:inline">
              {language === 'fil' ? 'I-download ang PDF' : 'Download PDF'}
            </span>
          </button>

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF7F2] hover:bg-white text-[#2C2523] border border-[#D7CBB9] text-xs font-medium cursor-pointer transition-colors"
            title="Print Current Sheet"
          >
            <Printer className="w-3.5 h-3.5 text-[#B88E3C]" />
            <span className="hidden sm:inline">{language === 'fil' ? 'I-print' : 'Print Sheet'}</span>
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5F554F] hover:text-[#2C2523] hover:bg-[#EFE9DF] cursor-pointer transition-colors"
            aria-label="Close Print Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN WORKBENCH: SIDEBAR FILMSTRIP + CENTRAL SHEET STAGE */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Filmstrip Sidebar */}
        <aside className="w-64 bg-[#282422] text-[#E8E1D5] border-r border-[#3E3835] flex flex-col shrink-0 overflow-hidden hidden md:flex">
          {/* Sidebar Header */}
          <div className="p-3.5 border-b border-[#3E3835] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-serif font-bold tracking-wide text-[#FAF7F2]">
              <Layers className="w-4 h-4 text-[#B88E3C]" />
              <span>{language === 'fil' ? 'Talaan ng Pahina' : 'Booklet Sheets'}</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#383330] text-[#D7CBB9]">
              {totalPages} {language === 'fil' ? 'Pahina' : 'Pages'}
            </span>
          </div>

          {/* Thumbnails List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {/* Page 1: Cover */}
            <button
              onClick={() => setCurrentPage(1)}
              className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-2.5 ${
                currentPage === 1
                  ? 'bg-[#383330] border-[#B88E3C] shadow-sm'
                  : 'bg-[#231F1E] border-[#383330] hover:bg-[#2F2A28] opacity-80 hover:opacity-100'
              }`}
            >
              <div className="w-10 h-14 bg-[#FAF7F2] rounded-xs border border-[#C8BEB0] flex flex-col items-center justify-between p-1 shrink-0">
                <div className="w-full h-1 bg-[#B88E3C]/60 rounded-xs" />
                <div className="w-6 h-5 rounded-xs overflow-hidden bg-[#E8E1D5]">
                  <img src={pattern.previewUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
                <div className="w-full h-0.5 bg-[#8C8077]/40 rounded-xs" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#B88E3C]">Page 1</span>
                  <span className="text-[10px] uppercase font-semibold text-[#8C8077]">Cover</span>
                </div>
                <div className="text-xs font-serif font-bold text-[#FAF7F2] truncate mt-0.5">
                  {pattern.title}
                </div>
                <div className="text-[10px] text-[#A89C92] truncate">
                  Heirloom Specs & Preview
                </div>
              </div>
            </button>

            {/* Page 2+: Legend */}
            {Array.from({ length: totalLegendPages }).map((_, lIdx) => {
              const pNum = 2 + lIdx;
              const isSelected = currentPage === pNum;
              return (
                <button
                  key={`legend-${lIdx}`}
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-[#383330] border-[#B88E3C] shadow-sm'
                      : 'bg-[#231F1E] border-[#383330] hover:bg-[#2F2A28] opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="w-10 h-14 bg-[#FAF7F2] rounded-xs border border-[#C8BEB0] flex flex-col p-1 shrink-0 space-y-0.5">
                    <div className="w-full h-1 bg-[#8C8077]/40 rounded-xs" />
                    <div className="space-y-0.5 flex-1 pt-0.5">
                      <div className="w-full h-0.5 bg-[#D7CBB9]" />
                      <div className="w-full h-0.5 bg-[#D7CBB9]" />
                      <div className="w-full h-0.5 bg-[#D7CBB9]" />
                      <div className="w-full h-0.5 bg-[#D7CBB9]" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-[#B88E3C]">Page {pNum}</span>
                      <span className="text-[10px] uppercase font-semibold text-[#8C8077]">Legend</span>
                    </div>
                    <div className="text-xs font-serif font-bold text-[#FAF7F2] truncate mt-0.5">
                      DMC Thread Key
                    </div>
                    <div className="text-[10px] text-[#A89C92]">
                      {pattern.palette.length} DMC Floss Colors
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Pages 3+: Chart Sheets */}
            {Array.from({ length: totalChartPages }).map((_, cIdx) => {
              const sheetNum = cIdx + 1;
              const pNum = 1 + totalLegendPages + sheetNum;
              const isSelected = currentPage === pNum;
              const r = Math.floor(cIdx / tileCols);
              const c = cIdx % tileCols;
              const sX = c * tileW + 1;
              const eX = Math.min(pattern.width, (c + 1) * tileW);
              const sY = r * tileH + 1;
              const eY = Math.min(pattern.height, (r + 1) * tileH);
              const isUnlocked = isPro || sheetNum === 1;

              return (
                <button
                  key={`chart-sheet-${cIdx}`}
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-[#383330] border-[#B88E3C] shadow-sm'
                      : 'bg-[#231F1E] border-[#383330] hover:bg-[#2F2A28] opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="w-10 h-14 bg-white rounded-xs border border-[#C8BEB0] p-1 shrink-0 relative flex flex-col justify-between">
                    <div className="w-full h-0.5 bg-[#8C8077]/50" />
                    {/* Miniature 10x10 grid lines */}
                    <div className="w-full h-8 border border-dashed border-[#D7CBB9] grid grid-cols-2 grid-rows-3 gap-0.5 p-0.5 opacity-60">
                      <div className="bg-[#EFE9DF]" />
                      <div className="bg-[#FAF7F2]" />
                      <div className="bg-[#FAF7F2]" />
                      <div className="bg-[#EFE9DF]" />
                    </div>
                    <div className="w-full h-0.5 bg-[#8C8077]/40" />
                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Lock className="w-3 h-3 text-amber-300" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-[#B88E3C]">Page {pNum}</span>
                      <span className="text-[9px] font-semibold text-[#8C8077]">
                        Sheet {sheetNum} of {totalChartPages}
                      </span>
                    </div>
                    <div className="text-xs font-serif font-bold text-[#FAF7F2] truncate mt-0.5">
                      Row {r + 1}, Col {c + 1}
                    </div>
                    <div className="text-[10px] font-mono text-[#A89C92] truncate">
                      Col {sX}–{eX} / Row {sY}–{eY}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Compass Guide in Sidebar */}
          <div className="p-3 bg-[#231F1E] border-t border-[#3E3835] text-xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#A89C92]">
              <span className="font-semibold text-[#FAF7F2]">Tiling Compass</span>
              <span className="font-mono">{tileCols} × {tileRows} Matrix</span>
            </div>
            <div
              className="grid gap-1 p-1.5 bg-[#1C1817] rounded-md border border-[#3E3835]"
              style={{ gridTemplateColumns: `repeat(${tileCols}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: totalChartPages }).map((_, idx) => {
                const sNum = idx + 1;
                const pNum = 1 + totalLegendPages + sNum;
                const isCurrent = currentPage === pNum;
                return (
                  <button
                    key={`mini-${idx}`}
                    onClick={() => setCurrentPage(pNum)}
                    className={`h-5 text-[9px] font-mono font-bold rounded-xs flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-[#B88E3C] text-[#2C2523]'
                        : 'bg-[#2F2A28] text-[#8C8077] hover:bg-[#383330] hover:text-[#FAF7F2]'
                    }`}
                    title={`Jump to Sheet ${sNum}`}
                  >
                    {sNum}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Central Physical Sheet Stage */}
        <main className="flex-1 bg-[#2C2523] flex flex-col overflow-hidden relative">
          {/* Guide Legend Banner (when guides enabled) */}
          {showGuides && (
            <div className="bg-[#FAF7F2]/95 backdrop-blur-xs border-b border-[#E8E1D5] px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs z-10">
              <div className="flex items-center gap-1.5 font-semibold text-[#5F554F]">
                <Info className="w-3.5 h-3.5 text-[#B88E3C]" />
                <span>
                  {language === 'fil'
                    ? 'Gabay sa Pag-print at Bleed Margins:'
                    : 'Physical Print & Bleed Margins Active:'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-red-500 border border-red-500" />
                  <span className="text-[#7A6E65]">
                    {language === 'fil' ? '3mm Bleed Line (Labas ng Gupit)' : '3mm Bleed Allowance'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 border-t-2 border-dashed border-blue-500" />
                  <span className="text-[#7A6E65]">
                    {language === 'fil' ? '14mm Safe Print Margin' : '14mm Safe Printable Margin'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 border-t-2 border-l-2 border-black" />
                  <span className="text-[#7A6E65]">
                    {language === 'fil' ? 'Crop & Trim Registration Marks' : 'Corner Crop / Trim Marks'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Scrollable Stage Area */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center custom-scrollbar">
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="transition-all"
            >
              {/* THE SIMULATED PHYSICAL PAPER SHEET */}
              <div
                ref={printAreaRef}
                className={`relative bg-[#FAF7F2] text-[#2C2523] shadow-2xl rounded-xs border border-[#D7CBB9] select-text overflow-hidden ${aspectRatioClass}`}
                style={{
                  width: paperSize === 'a4' ? '680px' : '710px',
                  minHeight: paperSize === 'a4' ? '962px' : '918px',
                }}
              >
                {/* ======================================================= */}
                {/* BLEED & TRIM MARGIN OVERLAYS (WHEN ENABLED) */}
                {/* ======================================================= */}
                {showGuides && (
                  <div className="absolute inset-0 pointer-events-none z-30">
                    {/* Corner Crop Marks (L-marks at 4 corners) */}
                    {/* Top-Left */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-black/80" />
                    {/* Top-Right */}
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-black/80" />
                    {/* Bottom-Left */}
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-black/80" />
                    {/* Bottom-Right */}
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-black/80" />

                    {/* 3mm Bleed Line (Outer Red Dashed Line) */}
                    <div className="absolute inset-[6px] border border-dashed border-red-500/50">
                      <span className="absolute top-0.5 left-1 text-[8px] font-mono font-bold text-red-600 uppercase tracking-tighter bg-[#FAF7F2]/90 px-1 rounded-xs">
                        3mm Bleed Boundary
                      </span>
                    </div>

                    {/* 14mm Safe Print Boundary (Inner Blue Dashed Line) */}
                    <div className="absolute inset-[32px] border-2 border-dashed border-blue-500/50">
                      <span className="absolute top-0.5 right-1 text-[8px] font-mono font-bold text-blue-700 uppercase tracking-tighter bg-[#FAF7F2]/90 px-1 rounded-xs">
                        14mm Safe Print Margin
                      </span>
                    </div>

                    {/* Registration Crosshairs at Page Midpoints */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-2 flex flex-col items-center">
                      <div className="w-px h-full bg-black/60" />
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-2 flex flex-col items-center">
                      <div className="w-px h-full bg-black/60" />
                    </div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-2 flex items-center">
                      <div className="h-px w-full bg-black/60" />
                    </div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-2 flex items-center">
                      <div className="h-px w-full bg-black/60" />
                    </div>
                  </div>
                )}

                {/* ======================================================= */}
                {/* PAGE 1 CONTENT: HEIRLOOM COVER PAGE */}
                {/* ======================================================= */}
                {isCoverPage && (
                  <div className="p-[38px] h-full flex flex-col justify-between relative bg-[#FAF7F2]">
                    {/* Ornate Double Frame */}
                    <div className="absolute inset-[24px] border border-[#D7CBB9] pointer-events-none" />
                    <div className="absolute inset-[28px] border border-[#B88E3C] pointer-events-none" />

                    {/* Header Kicker & Titles */}
                    <div className="text-center pt-3 space-y-2">
                      <div className="font-serif italic text-xs tracking-widest text-[#B88E3C] uppercase">
                        SOVEREIGN WEDDING & HEIRLOOM CROSS STITCH PATTERN
                      </div>
                      <h1 className="font-serif text-3xl font-bold text-[#2C2523] tracking-wide">
                        {pattern.title}
                      </h1>
                      {(pattern.coupleNames || pattern.weddingDate) && (
                        <div className="font-serif text-sm text-[#7A6E65] flex items-center justify-center gap-2">
                          <span>{pattern.coupleNames}</span>
                          <span>·</span>
                          <span>{pattern.weddingDate}</span>
                        </div>
                      )}
                    </div>

                    {/* Center Preview Image */}
                    <div className="flex flex-col items-center justify-center my-4">
                      <div className="p-1.5 bg-white border border-[#B88E3C] rounded-sm shadow-md max-w-[280px]">
                        <img
                          src={pattern.previewUrl}
                          alt={pattern.title}
                          className="w-full h-auto max-h-[220px] object-contain rounded-xs"
                        />
                      </div>
                    </div>

                    {/* Specifications Box */}
                    <div className="bg-white border border-[#E8E1D5] rounded-lg p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-2">
                        <span className="font-serif font-bold text-sm text-[#2C2523]">
                          {language === 'fil'
                            ? 'Mga Detalye ng Pattern & Aida Specs'
                            : 'Pattern Specifications & Fabric Dimensions'}
                        </span>
                        <span className="text-[11px] font-mono text-[#B88E3C] font-semibold">
                          {pattern.fabricCount} Count Standard Aida
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div>
                          <div className="text-[10px] text-[#7A6E65] uppercase">
                            Grid / Stitch Count
                          </div>
                          <div className="font-mono font-bold text-[#2C2523]">
                            {pattern.width} × {pattern.height} stitches ({pattern.totalStitches.toLocaleString()} total)
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-[#7A6E65] uppercase">
                            Cut Fabric (+3" Allowance)
                          </div>
                          <div className="font-mono font-bold text-[#2C2523]">
                            {fabricSpecs.cutFabricInchesW}" × {fabricSpecs.cutFabricInchesH}" inches
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-[#7A6E65] uppercase">
                            Finished Design Area
                          </div>
                          <div className="font-mono font-bold text-[#2C2523]">
                            {fabricSpecs.widthInches}" × {fabricSpecs.heightInches}" ({fabricSpecs.widthCm} × {fabricSpecs.heightCm} cm)
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-[#7A6E65] uppercase">
                            DMC Floss Palette & Skeins
                          </div>
                          <div className="font-mono font-bold text-[#2C2523]">
                            {pattern.palette.length} Colors · {totalSkeins} Skeins (8m standard)
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-[#7A6E65] uppercase">
                            Difficulty Rating & Confetti
                          </div>
                          <div className="font-semibold text-[#2C2523] flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded-sm bg-[#FAF7F2] border border-[#E8E1D5] text-[10px] font-bold">
                              {pattern.complexity.tier}
                            </span>
                            <span className="text-[11px] text-[#7A6E65]">
                              ({pattern.complexity.confettiPercentage}% Confetti)
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-[#7A6E65] uppercase">
                            Project Expectation
                          </div>
                          <div className="font-semibold text-[#2C2523]">
                            {pattern.complexity.estimatedMonths}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* License Badge / Watermark Footer */}
                    <div className="text-center pt-2 border-t border-[#E8E1D5] space-y-1">
                      <div className="font-serif italic text-[11px] text-[#5F554F]">
                        {isPro ? (
                          <span className="text-[#8C6B1B] font-semibold flex items-center justify-center gap-1">
                            <span>★</span>
                            <span>
                              Sovereign Heirloom Commercial License Active · Unlimited Reproduction & Sales Permitted
                            </span>
                          </span>
                        ) : (
                          <span className="text-amber-800 font-semibold">
                            ⚠ Free Preview Edition · Unlock Full Multi-Page Booklet for ₱499
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-[#8C8077]">
                        Page 1 of {totalPages} · SOVEREIGN HEIRLOOM COLLECTION
                      </div>
                    </div>
                  </div>
                )}

                {/* ======================================================= */}
                {/* PAGE 2+: DMC FLOSS LEGEND TABLE */}
                {/* ======================================================= */}
                {isLegendPage && (
                  <div className="p-[38px] h-full flex flex-col justify-between bg-[#FAF7F2]">
                    <div>
                      {/* Header */}
                      <div className="border-b border-[#D7CBB9] pb-3 mb-3">
                        <div className="flex items-center justify-between">
                          <h2 className="font-serif text-2xl font-bold text-[#2C2523]">
                            {language === 'fil'
                              ? 'Talaan ng DMC Threads & Simbolo'
                              : 'DMC Thread Legend & Symbol Key'}
                          </h2>
                          <span className="text-xs font-mono font-bold text-[#7A6E65]">
                            Legend Page {legendPageIndex + 1} of {totalLegendPages}
                          </span>
                        </div>
                        <p className="font-serif italic text-xs text-[#7A6E65] mt-1">
                          {language === 'fil'
                            ? `Gamitin ang 2 strands ng floss para sa cross-stitch sa ${pattern.fabricCount}-count Aida.`
                            : `Use 2 strands of floss for full cross stitches on ${pattern.fabricCount}-count Aida.`}
                        </p>
                      </div>

                      {/* Legend Table */}
                      <div className="border border-[#D7CBB9] rounded-md overflow-hidden bg-white shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-[#EEE8DE] text-[#2C2523] font-serif font-bold text-[11px] border-b border-[#D7CBB9]">
                            <tr>
                              <th className="py-1.5 px-2 text-center w-10">Sym</th>
                              <th className="py-1.5 px-2 text-center w-12">Swatch</th>
                              <th className="py-1.5 px-2.5 font-mono w-18">DMC #</th>
                              <th className="py-1.5 px-2">Description / Name</th>
                              <th className="py-1.5 px-2 text-right font-mono">Stitches</th>
                              <th className="py-1.5 px-2 text-right font-mono">Coverage</th>
                              <th className="py-1.5 px-2.5 text-right font-mono w-24">Skeins (8m)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F0ECE1]">
                            {pattern.colorStats
                              .slice(legendPageIndex * colorsPerPage, (legendPageIndex + 1) * colorsPerPage)
                              .map((stat, idx) => (
                                <tr
                                  key={stat.color.code}
                                  className={idx % 2 === 1 ? 'bg-[#F9F7F3]' : 'bg-white'}
                                >
                                  {/* Symbol */}
                                  <td className="py-1 px-2 text-center">
                                    <div className="w-5 h-5 mx-auto bg-white border border-[#C8BEB0] rounded-xs font-serif font-bold text-xs flex items-center justify-center text-black">
                                      {stat.color.symbol}
                                    </div>
                                  </td>
                                  {/* Swatch */}
                                  <td className="py-1 px-2 text-center">
                                    <div
                                      className="w-7 h-4 mx-auto rounded-xs border border-black/20 shadow-2xs"
                                      style={{
                                        backgroundColor:
                                          colorMode === 'mono' ? '#E5E5E5' : stat.color.hex,
                                      }}
                                    />
                                  </td>
                                  {/* DMC # */}
                                  <td className="py-1 px-2.5 font-mono font-bold text-[#2C2523]">
                                    {stat.color.code}
                                  </td>
                                  {/* Name */}
                                  <td className="py-1 px-2 text-[#433936] text-[11px]">
                                    {stat.color.name}
                                  </td>
                                  {/* Stitches */}
                                  <td className="py-1 px-2 text-right font-mono text-[#2C2523]">
                                    {stat.count.toLocaleString()}
                                  </td>
                                  {/* Coverage */}
                                  <td className="py-1 px-2 text-right font-mono text-[#7A6E65]">
                                    {stat.percentage.toFixed(1)}%
                                  </td>
                                  {/* Skeins */}
                                  <td className="py-1 px-2.5 text-right font-mono font-semibold text-[#2C2523]">
                                    {stat.skeinsNeeded} skein{stat.skeinsNeeded > 1 ? 's' : ''}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary Banner below table */}
                      <div className="mt-3 p-2.5 bg-[#FAF7F2] border border-[#E8E1D5] rounded-md flex items-center justify-between text-xs font-mono">
                        <span className="text-[#5F554F]">
                          Total Project Stitches: <strong>{pattern.totalStitches.toLocaleString()}</strong>
                        </span>
                        <span className="text-[#5F554F]">
                          DMC Palette: <strong>{pattern.palette.length} Colors</strong>
                        </span>
                        <span className="text-[#5F554F]">
                          Estimated Skeins: <strong>{totalSkeins} Skeins</strong>
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[#D7CBB9] pt-2 flex items-center justify-between text-[10px] text-[#7A6E65] font-mono">
                      <span>{pattern.title} · DMC Master Legend</span>
                      <span>Page {currentPage} of {totalPages}</span>
                    </div>
                  </div>
                )}

                {/* ======================================================= */}
                {/* BACKSTITCH SPECIFICATION & CONTOUR GUIDE PAGE */}
                {/* ======================================================= */}
                {isBackstitchPage && (
                  <div className="p-[38px] h-full flex flex-col justify-between relative bg-[#FAF7F2]">
                    <div>
                      {/* Page Header */}
                      <div className="border-b-2 border-[#B88E3C] pb-3 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-serif italic text-[#B88E3C]">
                              SOVEREIGN WEDDING CROSS STITCH BOOKLET
                            </span>
                            <span className="text-[10px] font-bold bg-[#B88E3C] text-white px-1.5 py-0.2 rounded-xs">
                              GUIDE
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-[#7A6E65]">
                            Backstitch Specification Page
                          </span>
                        </div>
                        <h2 className="font-serif font-bold text-xl text-[#2C2523] mt-1">
                          {language === 'fil'
                            ? 'Gabay sa Pag-Backstitch at Decorative Outlines'
                            : 'Backstitch Specification & Contour Guide'}
                        </h2>
                        <p className="font-serif italic text-xs text-[#7A6E65] mt-1">
                          {language === 'fil'
                            ? 'Mga tiyak na tagubilin para sa balangkas ng silhouette, lettering, at palamuting hangganan.'
                            : 'Technical specifications, thread key, and heirloom needlework instructions for backstitch outlines.'}
                        </p>
                      </div>

                      {/* Backstitch Metrics */}
                      {(() => {
                        const bsStats = calculateBackstitchStats(pattern.backstitches || [], pattern.fabricCount);
                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div className="p-2.5 bg-white border border-[#D7CBB9] rounded-md shadow-2xs">
                                <span className="text-[9px] uppercase font-bold text-[#B88E3C] block">Total Outlines</span>
                                <span className="font-serif font-bold text-base text-[#2C2523]">{bsStats.totalSegments} Stitches</span>
                                <span className="text-[10px] text-[#7A6E65] block">{bsStats.totalStitchesLength} Units</span>
                              </div>
                              <div className="p-2.5 bg-white border border-[#D7CBB9] rounded-md shadow-2xs">
                                <span className="text-[9px] uppercase font-bold text-[#B88E3C] block">Thread Length</span>
                                <span className="font-serif font-bold text-base text-[#2C2523]">{bsStats.lengthCm} cm</span>
                                <span className="text-[10px] text-[#7A6E65] block">{bsStats.lengthInches} inches</span>
                              </div>
                              <div className="p-2.5 bg-white border border-[#D7CBB9] rounded-md shadow-2xs">
                                <span className="text-[9px] uppercase font-bold text-[#B88E3C] block">DMC Colors</span>
                                <span className="font-serif font-bold text-base text-[#2C2523]">{bsStats.flossBreakdown.length} Shades</span>
                                <span className="text-[10px] text-[#7A6E65] block">Backstitch Floss</span>
                              </div>
                              <div className="p-2.5 bg-white border border-[#D7CBB9] rounded-md shadow-2xs">
                                <span className="text-[9px] uppercase font-bold text-[#B88E3C] block">Estimated Skeins</span>
                                <span className="font-serif font-bold text-base text-[#2C2523]">
                                  ~{bsStats.flossBreakdown.reduce((sum, f) => sum + f.skeinsEstimated, 0)} Skein(s)
                                </span>
                                <span className="text-[10px] text-[#7A6E65] block">8m 6-Strand</span>
                              </div>
                            </div>

                            {/* Backstitch Floss Key Table */}
                            <div className="border border-[#D7CBB9] rounded-md overflow-hidden bg-white shadow-2xs">
                              <div className="bg-[#EEE8DE] text-[#2C2523] font-serif font-bold text-[11px] border-b border-[#D7CBB9] px-3 py-1.5 flex items-center justify-between">
                                <span>Backstitch Floss Key & Strand Thickness</span>
                                <span className="font-mono text-[10px] text-[#7A6E65]">{bsStats.flossBreakdown.length} Thread Colors</span>
                              </div>
                              <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-[#FAF7F2] text-[#433936] text-[10px] border-b border-[#E8E1D5]">
                                  <tr>
                                    <th className="py-1 px-3 w-14">Swatch</th>
                                    <th className="py-1 px-2 font-mono">DMC Code</th>
                                    <th className="py-1 px-2">Strand Count</th>
                                    <th className="py-1 px-2">Weight / Style</th>
                                    <th className="py-1 px-2 text-right">Stitches</th>
                                    <th className="py-1 px-3 text-right">Thread Length</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F0ECE1]">
                                  {bsStats.flossBreakdown.map((item, idx) => (
                                    <tr key={idx} className={idx % 2 === 1 ? 'bg-[#FAF7F2]' : 'bg-white'}>
                                      <td className="py-1.5 px-3">
                                        <div
                                          className="w-7 h-3.5 rounded-xs border border-black/20 shadow-2xs"
                                          style={{ backgroundColor: item.colorHex }}
                                        />
                                      </td>
                                      <td className="py-1.5 px-2 font-mono font-bold text-[#2C2523]">
                                        DMC {item.dmcCode}
                                      </td>
                                      <td className="py-1.5 px-2 font-semibold text-[#7A6E65]">
                                        {item.strands === 1 ? '1 Strand (Fine Detail)' : '2 Strands (Bold Contour)'}
                                      </td>
                                      <td className="py-1.5 px-2">
                                        <div className="flex items-center gap-1.5">
                                          <div
                                            className="w-10 rounded-full"
                                            style={{
                                              height: item.strands === 2 ? '3px' : '1.5px',
                                              backgroundColor: item.colorHex,
                                            }}
                                          />
                                        </div>
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-mono text-[#2C2523]">
                                        {item.segmentCount}
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-mono font-semibold text-[#2C2523]">
                                        {item.lengthCm} cm (~{item.skeinsEstimated} sk)
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Needlework Technique Instructions Card */}
                            <div className="bg-white p-3.5 rounded-md border border-[#D7CBB9] space-y-2 shadow-2xs">
                              <span className="text-[10px] uppercase font-bold text-[#B88E3C] block">
                                {language === 'fil'
                                  ? 'Mga Tagubilin sa Wastong Pagtatahi ng Backstitch (Technique Guide)'
                                  : 'Heirloom Backstitching Technique & Needle Guide'}
                              </span>
                              <div className="grid grid-cols-2 gap-3 text-[11px] text-[#433936] leading-relaxed">
                                <div className="space-y-1">
                                  <div className="font-bold text-[#2C2523] flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-[#B88E3C] text-white flex items-center justify-center text-[9px]">1</span>
                                    <span>Sequence of Work</span>
                                  </div>
                                  <p className="pl-5 text-[#5F554F]">
                                    Complete cross stitches in the area first before adding backstitches. Outlines should float cleanly over the embroidery.
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-bold text-[#2C2523] flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-[#B88E3C] text-white flex items-center justify-center text-[9px]">2</span>
                                    <span>Recommended Needles</span>
                                  </div>
                                  <p className="pl-5 text-[#5F554F]">
                                    Use blunt tapestry needle #26 or #28 for aida holes; use sharp crewel needle #9 when piercing between woven fabric threads.
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-bold text-[#2C2523] flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-[#B88E3C] text-white flex items-center justify-center text-[9px]">3</span>
                                    <span>Stitch Direction (B to A)</span>
                                  </div>
                                  <p className="pl-5 text-[#5F554F]">
                                    Bring needle up forward at hole B, go down into hole A. Advance up at C, go down into B for continuous crisp lineation.
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-bold text-[#2C2523] flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-[#B88E3C] text-white flex items-center justify-center text-[9px]">4</span>
                                    <span>Even Tension Control</span>
                                  </div>
                                  <p className="pl-5 text-[#5F554F]">
                                    Keep tension light and uniform to avoid puckering the cloth or displacing neighboring cross stitches.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[#D7CBB9] pt-2 flex items-center justify-between text-[10px] text-[#7A6E65] font-mono">
                      <span>{pattern.title} · Backstitch Specification Guide</span>
                      <span>Page {currentPage} of {totalPages}</span>
                    </div>
                  </div>
                )}

                {/* ======================================================= */}
                {/* PAGE 3+: MULTI-PAGE CHART SHEET (50x70 STITCH TILE) */}
                {/* ======================================================= */}
                {isChartPage && (
                  <div className="p-[34px] h-full flex flex-col justify-between bg-white relative">
                    {(() => {
                      const activeAnnotations = pattern.annotations || loadAnnotations(pattern.id);
                      const sheetAnnotations = activeAnnotations.filter(
                        (ann) => ann.x >= chartStartX && ann.x < chartEndX && ann.y >= chartStartY && ann.y < chartEndY
                      );
                      return (
                        <>
                          <div>
                            {/* Sheet Header */}
                      <div className="border-b border-[#D7CBB9] pb-2 mb-2 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-sm text-[#2C2523]">
                              {pattern.title}
                            </span>
                            <span className="text-xs font-mono font-bold px-1.5 py-0.5 bg-[#FAF7F2] border border-[#E8E1D5] rounded-xs text-[#B88E3C]">
                              Sheet {chartSheetIndex} of {totalChartPages}
                            </span>
                            <span className="text-[11px] text-[#7A6E65]">
                              (Row {chartTileR + 1}, Col {chartTileC + 1})
                            </span>
                          </div>
                        </div>

                        <div className="text-right text-[11px] font-mono text-[#5F554F]">
                          <div>
                            Col {chartStartX + 1}–{chartEndX} · Row {chartStartY + 1}–{chartEndY}
                          </div>
                          <div className="text-[10px] text-[#8C8077]">
                            10×10 Bold Grid Lines · 3-Stitch Overlap
                          </div>
                        </div>
                      </div>

                      {/* THE STITCH GRID CHART CONTAINER */}
                      <div className="relative border border-[#A89C92] bg-white overflow-hidden shadow-2xs">
                        {/* Center Marks (Arrows pointing towards center) */}
                        {centerCrossesX && (
                          <div
                            className="absolute -top-3 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-red-600 z-20"
                            style={{
                              left: `${((midX - chartStartX + 0.5) / stitchesW) * 100}%`,
                              transform: 'translateX(-50%)',
                            }}
                            title="Vertical Center Axis"
                          />
                        )}
                        {centerCrossesY && (
                          <div
                            className="absolute -left-3 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-red-600 z-20"
                            style={{
                              top: `${((midY - chartStartY + 0.5) / stitchesH) * 100}%`,
                              transform: 'translateY(-50%)',
                            }}
                            title="Horizontal Center Axis"
                          />
                        )}

                        {/* Top Coordinate Numbers */}
                        <div
                          className="grid bg-[#F8F5F0] border-b border-[#A89C92] text-[8px] font-mono text-[#6E6359] text-center"
                          style={{
                            gridTemplateColumns: `repeat(${stitchesW}, minmax(0, 1fr))`,
                          }}
                        >
                          {Array.from({ length: stitchesW }).map((_, x) => {
                            const absCol = chartStartX + x + 1;
                            const showNum = absCol % 10 === 0 || absCol === 1;
                            return (
                              <div
                                key={`top-${x}`}
                                className={`h-3.5 flex items-center justify-center ${
                                  absCol % 10 === 0 ? 'font-bold text-[#2C2523]' : ''
                                }`}
                              >
                                {showNum ? absCol : ''}
                              </div>
                            );
                          })}
                        </div>

                        {/* Stitches Grid (Rows & Cells) */}
                        <div
                          className="grid relative"
                          style={{
                            gridTemplateColumns: `repeat(${stitchesW}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${stitchesH}, minmax(0, 1fr))`,
                          }}
                        >
                          {/* Backstitch Overlay on Chart Sheet Preview */}
                          {hasBackstitches && (
                            <svg
                              className="absolute inset-0 w-full h-full pointer-events-none z-15"
                              viewBox={`0 0 ${stitchesW} ${stitchesH}`}
                              preserveAspectRatio="none"
                            >
                              {(pattern.backstitches || [])
                                .filter(
                                  (bs) =>
                                    Math.max(bs.x1, bs.x2) >= chartStartX &&
                                    Math.min(bs.x1, bs.x2) <= chartEndX &&
                                    Math.max(bs.y1, bs.y2) >= chartStartY &&
                                    Math.min(bs.y1, bs.y2) <= chartEndY
                                )
                                .map((bs, i) => (
                                  <g key={bs.id || i}>
                                    <line
                                      x1={bs.x1 - chartStartX}
                                      y1={bs.y1 - chartStartY}
                                      x2={bs.x2 - chartStartX}
                                      y2={bs.y2 - chartStartY}
                                      stroke={bs.color || '#1A1615'}
                                      strokeWidth={bs.strands === 2 ? '0.24' : '0.14'}
                                      strokeLinecap="round"
                                    />
                                    <circle
                                      cx={bs.x1 - chartStartX}
                                      cy={bs.y1 - chartStartY}
                                      r="0.1"
                                      fill={bs.color || '#1A1615'}
                                    />
                                    <circle
                                      cx={bs.x2 - chartStartX}
                                      cy={bs.y2 - chartStartY}
                                      r="0.1"
                                      fill={bs.color || '#1A1615'}
                                    />
                                  </g>
                                ))}
                            </svg>
                          )}
                          {Array.from({ length: stitchesH }).map((_, y) => {
                            const curRow = chartStartY + y;
                            const isRow10 = (curRow + 1) % 10 === 0;

                            return Array.from({ length: stitchesW }).map((_, x) => {
                              const curCol = chartStartX + x;
                              const isCol10 = (curCol + 1) % 10 === 0;

                              const cell = pattern.grid[curRow]?.[curCol];
                              if (!cell) return null;
                              const color = pattern.palette[cell.colorIndex] || pattern.palette[0];

                              // Shaded overlap border (e.g. 3 stitches on edges with neighbors)
                              const isOverlapEdge =
                                (hasTopNeighbor && y < 3) ||
                                (hasBottomNeighbor && y >= stitchesH - 3) ||
                                (hasLeftNeighbor && x < 3) ||
                                (hasRightNeighbor && x >= stitchesW - 3);

                              // Cell background color
                              let cellBg = '#FFFFFF';
                              if (isOverlapEdge) {
                                cellBg = '#EFE9DF'; // Shaded overlap
                              } else if (colorMode === 'color') {
                                // Subtle tint 18% opacity
                                cellBg = `rgba(${color.r}, ${color.g}, ${color.b}, 0.22)`;
                              }

                              const cellAnn = activeAnnotations.find((a) => a.x === curCol && a.y === curRow);

                              return (
                                <div
                                  key={`${curRow}-${curCol}`}
                                  className={`aspect-square flex items-center justify-center font-serif font-bold relative transition-colors ${
                                    isCol10 ? 'border-r-2 border-r-[#433936]' : 'border-r border-r-[#D7CBB9]'
                                  } ${
                                    isRow10 ? 'border-b-2 border-b-[#433936]' : 'border-b border-b-[#D7CBB9]'
                                  }`}
                                  style={{
                                    backgroundColor: cellBg,
                                    fontSize: stitchesW > 45 ? '8px' : '9.5px',
                                  }}
                                >
                                  {cellAnn && (
                                    <span
                                      className="absolute -top-1 -right-1 z-10 px-1 py-0.2 rounded text-[7px] font-bold text-white shadow-xs pointer-events-none flex items-center gap-0.5 leading-none"
                                      style={{ backgroundColor: cellAnn.color }}
                                      title={`${cellAnn.type.toUpperCase()}: ${cellAnn.text}`}
                                    >
                                      {cellAnn.type === 'label' ? '🏷️' : cellAnn.type === 'flag' ? '🚩' : cellAnn.type === 'note' ? '📝' : '📌'}
                                    </span>
                                  )}
                                  <span className="text-[#1A1615] leading-none">
                                    {color.symbol}
                                  </span>
                                </div>
                              );
                            });
                          })}
                        </div>
                      </div>

                      {/* Sheet Annotations & Labels Banner */}
                      {sheetAnnotations.length > 0 && (
                        <div className="mt-2 p-1.5 bg-[#FAF7F2] border border-[#E8DFC9] rounded text-[9px] font-mono text-[#5F554F] flex items-center gap-2 overflow-x-auto">
                          <span className="font-bold text-[#B88E3C] shrink-0">
                            🏷️ {language === 'fil' ? 'Mga Label sa Sheet:' : 'Sheet Labels:'}
                          </span>
                          {sheetAnnotations.map((a) => (
                            <span
                              key={a.id}
                              className="shrink-0 bg-white px-2 py-0.5 rounded border border-[#E8E1D5] flex items-center gap-1"
                            >
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                              <span>Col {a.x + 1}, Row {a.y + 1}:</span>
                              <strong className="text-[#2C2523] truncate max-w-[140px]">{a.text}</strong>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Chart Legend / Notes strip */}
                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#7A6E65]">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-[#EFE9DF] border border-[#C8BEB0] rounded-xs" />
                            <span>
                              {language === 'fil'
                                ? '3-Stitch Overlap Margin (Para sa pagdikit ng sheets)'
                                : '3-Stitch Overlap Shading (Page Alignment)'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 bg-[#433936]" />
                            <span>10×10 Bold Grid Lines</span>
                          </div>
                        </div>

                        {/* Compass Mini-Matrix in bottom right */}
                        <div className="flex items-center gap-1.5 p-1 bg-[#FAF7F2] border border-[#E8E1D5] rounded-xs">
                          <Compass className="w-3.5 h-3.5 text-[#B88E3C]" />
                          <span className="font-semibold text-[#2C2523]">
                            Sheet {chartSheetIndex} / {totalChartPages}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Watermark for Free Tier */}
                    {!isPro && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <div className="rotate-[-30deg] text-center p-6 bg-white/85 border-2 border-dashed border-red-400 rounded-xl shadow-lg">
                          <div className="font-serif font-bold text-2xl text-red-600 tracking-wider">
                            SAMPLE PREVIEW ONLY
                          </div>
                          <div className="text-xs font-medium text-red-800 mt-1">
                            Unlock complete high-res printable charts for ₱499
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sheet Footer */}
                    <div className="border-t border-[#D7CBB9] pt-2 flex items-center justify-between text-[10px] text-[#7A6E65] font-mono">
                      <span>{pattern.title} · Sovereign Cross Stitch Generator</span>
                      <span>
                        Page {currentPage} of {totalPages} (Sheet {chartSheetIndex} of {totalChartPages})
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* BOTTOM PAGING & ACTION CONTROLS */}
          {/* ============================================================== */}
          <footer className="bg-[#FAF7F2] border-t border-[#E8E1D5] px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs z-20">
            {/* Previous Page */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                currentPage <= 1
                  ? 'bg-transparent text-[#A89C92] border-transparent cursor-not-allowed'
                  : 'bg-white text-[#2C2523] border-[#D7CBB9] hover:bg-[#EFE9DF]'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{language === 'fil' ? 'Nakaraang Pahina' : 'Previous Sheet'}</span>
            </button>

            {/* Quick Page Jump Slider & Counter */}
            <div className="flex items-center gap-3">
              <span className="font-serif font-bold text-sm text-[#2C2523]">
                {language === 'fil'
                  ? `Pahina ${currentPage} ng ${totalPages}`
                  : `Page ${currentPage} of ${totalPages}`}
              </span>

              {/* Page mode description badge */}
              <span className="text-[11px] font-mono px-2 py-0.5 bg-[#EFE9DF] text-[#5F554F] rounded-md border border-[#D7CBB9] hidden sm:inline-block">
                {isCoverPage
                  ? 'Cover Sheet'
                  : isLegendPage
                    ? `DMC Floss Key (${legendPageIndex + 1}/${totalLegendPages})`
                    : `Chart Sheet ${chartSheetIndex}/${totalChartPages} (Row ${chartTileR + 1}, Col ${chartTileC + 1})`}
              </span>
            </div>

            {/* Next Page */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                currentPage >= totalPages
                  ? 'bg-transparent text-[#A89C92] border-transparent cursor-not-allowed'
                  : 'bg-white text-[#2C2523] border-[#D7CBB9] hover:bg-[#EFE9DF]'
              }`}
            >
              <span>{language === 'fil' ? 'Susunod na Pahina' : 'Next Sheet'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
};
