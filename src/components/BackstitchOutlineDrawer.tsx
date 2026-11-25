import React, { useState, useEffect, useMemo } from 'react';
import {
  Route,
  Sparkles,
  Layers,
  Sliders,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  X,
  FileText,
  Palette,
  Square,
  Scissors,
  CheckCircle2,
  Info,
  Maximize2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  PatternData,
  BackstitchSegment,
  SuggestedBackstitchPath,
  DMCColor,
} from '../types';
import {
  detectSuggestedBackstitchPaths,
  convertPathToBackstitchSegments,
  generateBorderBackstitches,
  generateObjectColorOutline,
  calculateBackstitchStats,
} from '../utils/outlineDetector';
import { DMC_PALETTE } from '../data/dmcPalette';

interface BackstitchOutlineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: PatternData;
  onUpdatePattern: (updated: PatternData) => void;
  language: 'en' | 'fil';
  onOpenPrintPreview?: () => void;
  hoveredPathId?: string | null;
  onHoverPath?: (pathId: string | null) => void;
}

export const BackstitchOutlineDrawer: React.FC<BackstitchOutlineDrawerProps> = ({
  isOpen,
  onClose,
  pattern,
  onUpdatePattern,
  language,
  onOpenPrintPreview,
  hoveredPathId,
  onHoverPath = () => {},
}) => {
  // Active Tab
  const [activeTab, setActiveTab] = useState<'suggestions' | 'objects' | 'presets' | 'manage'>('suggestions');

  // Thread Configuration
  const [selectedDmc, setSelectedDmc] = useState<string>('310');
  const [selectedHex, setSelectedHex] = useState<string>('#1A1615');
  const [selectedStrands, setSelectedStrands] = useState<1 | 2>(1);

  // Outline Detection Sliders
  const [contrastThreshold, setContrastThreshold] = useState<number>(26);
  const [minPathLength, setMinPathLength] = useState<number>(3);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'silhouette' | 'contrast-edge' | 'detail' | 'monogram'>('all');

  // Border Preset Config
  const [borderInset, setBorderInset] = useState<number>(2);
  const [borderStyle, setBorderStyle] = useState<'classic' | 'double' | 'mitered'>('classic');

  // Selected object color to outline
  const [selectedObjectCode, setSelectedObjectCode] = useState<string>(
    pattern.palette[0]?.code || '310'
  );

  // Local copy of suggested paths
  const [suggestedPaths, setSuggestedPaths] = useState<SuggestedBackstitchPath[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Current backstitches on pattern
  const currentBackstitches = useMemo(() => pattern.backstitches || [], [pattern.backstitches]);

  // Physical stats
  const stats = useMemo(
    () => calculateBackstitchStats(currentBackstitches, pattern.fabricCount),
    [currentBackstitches, pattern.fabricCount]
  );

  // Run outline detection whenever settings change
  useEffect(() => {
    if (!isOpen) return;
    const detected = detectSuggestedBackstitchPaths(
      pattern.grid,
      pattern.palette,
      pattern.width,
      pattern.height,
      {
        contrastThreshold,
        minPathLength,
        suggestedDmc: selectedDmc,
        suggestedHex: selectedHex,
      }
    );
    setSuggestedPaths(detected);
  }, [
    isOpen,
    pattern.grid,
    pattern.palette,
    pattern.width,
    pattern.height,
    contrastThreshold,
    minPathLength,
    selectedDmc,
    selectedHex,
  ]);

  // Toast message auto-clear
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  if (!isOpen) return null;

  // Color lookup helper
  const handleSelectDmc = (code: string, hex: string) => {
    setSelectedDmc(code);
    setSelectedHex(hex);
  };

  // Add a specific suggested outline path
  const handleAddSuggestedPath = (path: SuggestedBackstitchPath) => {
    const newSegs = convertPathToBackstitchSegments(path, selectedHex, selectedDmc, selectedStrands);
    const existing = new Set(
      currentBackstitches.map(
        (s) => `${Math.min(s.x1, s.x2)},${Math.min(s.y1, s.y2)}-${Math.max(s.x1, s.x2)},${Math.max(s.y1, s.y2)}`
      )
    );

    const nonDupes = newSegs.filter((s) => {
      const key = `${Math.min(s.x1, s.x2)},${Math.min(s.y1, s.y2)}-${Math.max(s.x1, s.x2)},${Math.max(s.y1, s.y2)}`;
      return !existing.has(key);
    });

    if (nonDupes.length === 0) {
      setToastMessage(
        language === 'fil'
          ? 'Nai-apply na ang lahat ng segment ng linyang ito'
          : 'All segments of this outline are already in pattern'
      );
      return;
    }

    const updated = [...currentBackstitches, ...nonDupes];
    onUpdatePattern({
      ...pattern,
      backstitches: updated,
    });

    setToastMessage(
      language === 'fil'
        ? `Idinagdag ang ${nonDupes.length} tahi ng ${path.tagalogTitle}`
        : `Added ${nonDupes.length} backstitches for ${path.title}`
    );
  };

  // Apply all filtered suggestions at once
  const handleApplyAllSuggestions = () => {
    const filtered = categoryFilter === 'all'
      ? suggestedPaths
      : suggestedPaths.filter((p) => p.category === categoryFilter);

    if (filtered.length === 0) {
      setToastMessage(language === 'fil' ? 'Walang nahanap na mungkahi' : 'No suggestions found to apply');
      return;
    }

    const existing = new Set(
      currentBackstitches.map(
        (s) => `${Math.min(s.x1, s.x2)},${Math.min(s.y1, s.y2)}-${Math.max(s.x1, s.x2)},${Math.max(s.y1, s.y2)}`
      )
    );

    const allNew: BackstitchSegment[] = [];
    filtered.forEach((path) => {
      const segs = convertPathToBackstitchSegments(path, selectedHex, selectedDmc, selectedStrands);
      segs.forEach((seg) => {
        const key = `${Math.min(seg.x1, seg.x2)},${Math.min(seg.y1, seg.y2)}-${Math.max(seg.x1, seg.x2)},${Math.max(seg.y1, seg.y2)}`;
        if (!existing.has(key)) {
          existing.add(key);
          allNew.push(seg);
        }
      });
    });

    if (allNew.length === 0) {
      setToastMessage(language === 'fil' ? 'Lahat ng napiling linya ay nai-apply na' : 'All selected outlines already added');
      return;
    }

    const updated = [...currentBackstitches, ...allNew];
    onUpdatePattern({
      ...pattern,
      backstitches: updated,
    });

    setToastMessage(
      language === 'fil'
        ? `Nai-apply ang ${allNew.length} linya mula sa ${filtered.length} mungkahi!`
        : `Applied ${allNew.length} backstitch segments from ${filtered.length} suggestions!`
    );
  };

  // Apply object outline for selected color
  const handleApplyObjectOutline = () => {
    const objectSegs = generateObjectColorOutline(
      pattern.grid,
      selectedObjectCode,
      pattern.width,
      pattern.height,
      selectedHex,
      selectedDmc,
      selectedStrands
    );

    if (objectSegs.length === 0) {
      setToastMessage(
        language === 'fil'
          ? `Walang nahanap na hangganan para sa DMC ${selectedObjectCode}`
          : `No boundaries found for DMC ${selectedObjectCode}`
      );
      return;
    }

    const existing = new Set(
      currentBackstitches.map(
        (s) => `${Math.min(s.x1, s.x2)},${Math.min(s.y1, s.y2)}-${Math.max(s.x1, s.x2)},${Math.max(s.y1, s.y2)}`
      )
    );

    const nonDupes = objectSegs.filter((seg) => {
      const key = `${Math.min(seg.x1, seg.x2)},${Math.min(seg.y1, seg.y2)}-${Math.max(seg.x1, seg.x2)},${Math.max(seg.y1, seg.y2)}`;
      return !existing.has(key);
    });

    if (nonDupes.length === 0) {
      setToastMessage(
        language === 'fil'
          ? 'Nai-apply na ang outline ng bagay na ito'
          : 'Object boundary already outlined'
      );
      return;
    }

    const updated = [...currentBackstitches, ...nonDupes];
    onUpdatePattern({
      ...pattern,
      backstitches: updated,
    });

    setToastMessage(
      language === 'fil'
        ? `Nabalangkas ang bagay: Idinagdag ang ${nonDupes.length} linya ng backstitch!`
        : `Outlined object: Added ${nonDupes.length} perimeter backstitches!`
    );
  };

  // Apply decorative framing border
  const handleApplyBorder = () => {
    const borderSegs = generateBorderBackstitches(
      pattern.width,
      pattern.height,
      borderInset,
      selectedHex,
      selectedDmc,
      selectedStrands,
      borderStyle
    );

    const existing = new Set(
      currentBackstitches.map(
        (s) => `${Math.min(s.x1, s.x2)},${Math.min(s.y1, s.y2)}-${Math.max(s.x1, s.x2)},${Math.max(s.y1, s.y2)}`
      )
    );

    const nonDupes = borderSegs.filter((seg) => {
      const key = `${Math.min(seg.x1, seg.x2)},${Math.min(seg.y1, seg.y2)}-${Math.max(seg.x1, seg.x2)},${Math.max(seg.y1, seg.y2)}`;
      return !existing.has(key);
    });

    if (nonDupes.length === 0) {
      setToastMessage(
        language === 'fil'
          ? 'Nai-apply na ang border na ito sa parehong posisyon'
          : 'Border outline already exists at this inset'
      );
      return;
    }

    const updated = [...currentBackstitches, ...nonDupes];
    onUpdatePattern({
      ...pattern,
      backstitches: updated,
    });

    setToastMessage(
      language === 'fil'
        ? `Idinagdag ang ${borderStyle} frame border (${nonDupes.length} stitches)!`
        : `Added ${borderStyle} framing border (${nonDupes.length} stitches)!`
    );
  };

  // Remove individual backstitch segment
  const handleDeleteSegment = (id: string) => {
    const updated = currentBackstitches.filter((b) => b.id !== id);
    onUpdatePattern({
      ...pattern,
      backstitches: updated,
    });
  };

  // Clear all backstitches
  const handleClearAll = () => {
    if (currentBackstitches.length === 0) return;
    if (
      window.confirm(
        language === 'fil'
          ? 'Nais mo bang tanggalin ang lahat ng dekoratibong backstitch outlines?'
          : 'Are you sure you want to remove all decorative backstitch outlines?'
      )
    ) {
      onUpdatePattern({
        ...pattern,
        backstitches: [],
      });
      setToastMessage(language === 'fil' ? 'Na-clear ang lahat ng outline' : 'Cleared all backstitch outlines');
    }
  };

  // Filtered suggested paths
  const filteredSuggestions = categoryFilter === 'all'
    ? suggestedPaths
    : suggestedPaths.filter((p) => p.category === categoryFilter);

  // Quick DMC picks for backstitch
  const quickDmcPicks = [
    { code: '310', name: 'Black', hex: '#111111' },
    { code: '3371', name: 'Black Brown', hex: '#261F18' },
    { code: '898', name: 'Very Dark Chestnut', hex: '#4B3322' },
    { code: '498', name: 'Dark Red', hex: '#771822' },
    { code: '823', name: 'Dark Navy Blue', hex: '#1E2B45' },
    { code: 'B5200', name: 'Snow White', hex: '#FAF9F6' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-2xs overflow-hidden animate-fade-in">
      {/* Drawer Container */}
      <div className="bg-[#FAF7F2] w-full max-w-xl h-full shadow-2xl border-l border-[#D7CBB9] flex flex-col overflow-hidden animate-slide-left">
        {/* ================= DRAWER HEADER ================= */}
        <div className="bg-[#2C2523] text-white px-5 py-4 flex items-center justify-between border-b border-[#433936] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3D3330] border border-[#B88E3C] flex items-center justify-center text-[#E6C687] shadow-xs">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-base sm:text-lg text-[#F7F3E9]">
                  {language === 'fil' ? 'Add Backstitch Outline' : 'Add Backstitch Outline'}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#B88E3C] text-white px-2 py-0.5 rounded-md">
                  PDF Guide
                </span>
              </div>
              <p className="text-xs text-[#D8CCA7]">
                {language === 'fil'
                  ? 'Dekoratibong outline, silhouette definition, at gabay sa PDF'
                  : 'Decorative outlines, object contours & automatic PDF Backstitch Guide'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title={language === 'fil' ? 'Isara' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= FLOATING TOAST ================= */}
        {toastMessage && (
          <div className="bg-[#2C2523] text-[#E6C687] border-b border-[#B88E3C] px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-md">
            <CheckCircle2 className="w-4 h-4 text-[#E6C687] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ================= LIVE BACKSTITCH STATS STRIP ================= */}
        <div className="bg-[#EDE5D8] px-5 py-2.5 border-b border-[#D7CBB9] flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#7A6E65] block">
                {language === 'fil' ? 'Kabuuang Linya' : 'Active Outlines'}
              </span>
              <span className="font-mono font-bold text-[#2C2523] text-sm">
                {currentBackstitches.length} {language === 'fil' ? 'tahi' : 'segments'}
              </span>
            </div>
            <div className="h-6 w-px bg-[#D7CBB9]" />
            <div>
              <span className="text-[10px] uppercase font-bold text-[#7A6E65] block">
                {language === 'fil' ? 'Haba ng Sinulid' : 'Total Thread'}
              </span>
              <span className="font-mono font-bold text-[#2C2523] text-sm">
                {stats.lengthCm} cm ({stats.lengthInches}")
              </span>
            </div>
            <div className="h-6 w-px bg-[#D7CBB9]" />
            <div>
              <span className="text-[10px] uppercase font-bold text-[#7A6E65] block">
                {language === 'fil' ? 'Tantiyang Skein' : 'Est. Skeins'}
              </span>
              <span className="font-mono font-bold text-[#2C2523] text-sm">
                ~{stats.flossBreakdown.reduce((sum, f) => sum + f.skeinsEstimated, 0)} {language === 'fil' ? 'rolyo' : 'sk'}
              </span>
            </div>
          </div>

          {currentBackstitches.length > 0 && onOpenPrintPreview && (
            <button
              type="button"
              onClick={onOpenPrintPreview}
              className="py-1 px-2.5 rounded-lg text-xs font-semibold text-[#2C2523] bg-white hover:bg-[#FAF7F2] border border-[#D7CBB9] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
              title="Preview Backstitch Guide in PDF"
            >
              <FileText className="w-3.5 h-3.5 text-[#B88E3C]" />
              <span className="hidden sm:inline">{language === 'fil' ? 'Silipin sa PDF' : 'PDF Preview'}</span>
            </button>
          )}
        </div>

        {/* ================= THREAD & STRAND SELECTOR STRIP ================= */}
        <div className="bg-white p-4 border-b border-[#E8E1D5] space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7A6E65]">
              {language === 'fil' ? '1. Pumili ng DMC Sinulid at Strands' : '1. Select DMC Thread & Strands'}
            </span>
            <div className="flex items-center gap-1 bg-[#FAF7F2] p-0.5 rounded-lg border border-[#D7CBB9] text-xs">
              <button
                type="button"
                onClick={() => setSelectedStrands(1)}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                  selectedStrands === 1
                    ? 'bg-[#B88E3C] text-white shadow-2xs'
                    : 'text-[#5F554F] hover:text-[#2C2523]'
                }`}
                title="1 Strand: Fine delicate outlines & facial details"
              >
                1 Strand (Fine)
              </button>
              <button
                type="button"
                onClick={() => setSelectedStrands(2)}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                  selectedStrands === 2
                    ? 'bg-[#B88E3C] text-white shadow-2xs'
                    : 'text-[#5F554F] hover:text-[#2C2523]'
                }`}
                title="2 Strands: Bold heirloom contour & frame borders"
              >
                2 Strands (Bold)
              </button>
            </div>
          </div>

          {/* Quick DMC Swatches */}
          <div className="flex flex-wrap items-center gap-2">
            {quickDmcPicks.map((c) => {
              const isSelected = selectedDmc === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelectDmc(c.code, c.hex)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#B88E3C] bg-[#FAF7F2] ring-2 ring-[#B88E3C]/30 shadow-2xs font-bold text-[#2C2523]'
                      : 'border-[#E8E1D5] bg-white hover:border-[#D7CBB9] text-[#5F554F]'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-sm border border-black/20 shrink-0"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>DMC {c.code}</span>
                  {isSelected && <Check className="w-3 h-3 text-[#B88E3C]" />}
                </button>
              );
            })}

            {/* Quick picker from pattern palette */}
            <div className="flex items-center gap-1 pl-2 border-l border-[#E8E1D5]">
              <span className="text-[10px] text-[#8C8077] uppercase font-semibold">Palette:</span>
              <div className="flex items-center gap-1 overflow-x-auto max-w-[160px] py-0.5">
                {pattern.palette.slice(0, 7).map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelectDmc(c.code, c.hex)}
                    className={`w-5 h-5 rounded-sm border transition-all cursor-pointer shrink-0 ${
                      selectedDmc === c.code
                        ? 'border-[#B88E3C] ring-2 ring-[#B88E3C]/40 scale-110'
                        : 'border-black/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={`DMC ${c.code} (${c.name})`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ================= MODE TABS ================= */}
        <div className="flex border-b border-[#E8E1D5] bg-[#FAF7F2] text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('suggestions')}
            className={`flex-1 py-2.5 text-center transition-all cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'suggestions'
                ? 'border-[#B88E3C] text-[#2C2523] bg-white font-bold'
                : 'border-transparent text-[#7A6E65] hover:text-[#2C2523]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B88E3C]" />
            <span>{language === 'fil' ? 'Smart Mungkahi' : 'Auto Suggestions'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('objects')}
            className={`flex-1 py-2.5 text-center transition-all cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'objects'
                ? 'border-[#B88E3C] text-[#2C2523] bg-white font-bold'
                : 'border-transparent text-[#7A6E65] hover:text-[#2C2523]'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-[#B88E3C]" />
            <span>{language === 'fil' ? 'Pumili ng Bagay' : 'Select Object'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2.5 text-center transition-all cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'presets'
                ? 'border-[#B88E3C] text-[#2C2523] bg-white font-bold'
                : 'border-transparent text-[#7A6E65] hover:text-[#2C2523]'
            }`}
          >
            <Square className="w-3.5 h-3.5 text-[#B88E3C]" />
            <span>{language === 'fil' ? 'Border Frame' : 'Border Presets'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-2.5 text-center transition-all cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'manage'
                ? 'border-[#B88E3C] text-[#2C2523] bg-white font-bold'
                : 'border-transparent text-[#7A6E65] hover:text-[#2C2523]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#B88E3C]" />
            <span>{language === 'fil' ? `Naka-save (${currentBackstitches.length})` : `Saved (${currentBackstitches.length})`}</span>
          </button>
        </div>

        {/* ================= TAB CONTENT VIEWPORT ================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ================= TAB 1: AUTO OUTLINE SUGGESTIONS ================= */}
          {activeTab === 'suggestions' && (
            <div className="space-y-4">
              {/* Controls: Sliders & Filter Pills */}
              <div className="bg-white p-3.5 rounded-xl border border-[#E8E1D5] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2C2523]">
                    {language === 'fil' ? 'Contrast Sensitivity' : 'Contrast Sensitivity'}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#B88E3C]">
                    {contrastThreshold}
                  </span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="55"
                  value={contrastThreshold}
                  onChange={(e) => setContrastThreshold(Number(e.target.value))}
                  className="w-full accent-[#B88E3C] cursor-pointer"
                />
                <p className="text-[11px] text-[#7A6E65]">
                  {language === 'fil'
                    ? 'Mas mababang numero: mas maraming detalye ang makikita. Mas mataas: tanging pangunahing outline lamang.'
                    : 'Lower threshold captures subtle color contours; higher threshold focuses strictly on bold silhouettes.'}
                </p>

                {/* Category Filter Pills */}
                <div className="pt-2 border-t border-[#F0ECE1] flex flex-wrap gap-1.5 text-xs">
                  {(
                    [
                      { id: 'all', label: 'All Categories' },
                      { id: 'silhouette', label: 'Silhouette' },
                      { id: 'contrast-edge', label: 'High Contrast' },
                      { id: 'detail', label: 'Intricate Details' },
                      { id: 'monogram', label: 'Monogram / Script' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        categoryFilter === cat.id
                          ? 'bg-[#2C2523] text-[#E6C687] shadow-2xs'
                          : 'bg-[#FAF7F2] text-[#5F554F] hover:bg-[#EAE2D5]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Master Apply All Button */}
              {filteredSuggestions.length > 0 && (
                <div className="flex items-center justify-between bg-[#FAF7F2] p-3 rounded-xl border border-[#D7CBB9]">
                  <div>
                    <span className="text-xs font-bold text-[#2C2523] block">
                      {language === 'fil'
                        ? `${filteredSuggestions.length} mungkahi ang nakita`
                        : `${filteredSuggestions.length} suggested outline paths found`}
                    </span>
                    <span className="text-[11px] text-[#7A6E65]">
                      {language === 'fil'
                        ? 'I-click upang idagdag lahat sa isang pindot'
                        : 'Batch-apply all detected paths to your pattern'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyAllSuggestions}
                    className="py-1.5 px-3 rounded-lg text-xs font-bold text-[#2C2523] bg-[#E6C687] hover:bg-[#F2D79E] transition-all cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{language === 'fil' ? 'I-apply Lahat' : 'Apply All Top Outlines'}</span>
                  </button>
                </div>
              )}

              {/* Suggestions Cards List */}
              <div className="space-y-2">
                {filteredSuggestions.map((path) => {
                  const isHovered = hoveredPathId === path.id;

                  return (
                    <div
                      key={path.id}
                      onMouseEnter={() => onHoverPath(path.id)}
                      onMouseLeave={() => onHoverPath(null)}
                      className={`p-3 rounded-xl border transition-all ${
                        isHovered
                          ? 'bg-amber-50/80 border-[#B88E3C] shadow-xs'
                          : 'bg-white border-[#E8E1D5] hover:border-[#D7CBB9]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#2C2523] truncate">
                              {language === 'fil' ? path.tagalogTitle : path.title}
                            </span>
                            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#FAF7F2] border border-[#E8E1D5] text-[#7A6E65]">
                              {path.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[#7A6E65] mt-1">
                            <span>{path.length} stitches</span>
                            <span>·</span>
                            <span>{path.confidence}% confidence</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <span
                                className="w-2.5 h-2.5 rounded-xs border border-black/20"
                                style={{ backgroundColor: selectedHex }}
                              />
                              DMC {selectedDmc} ({selectedStrands} str)
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddSuggestedPath(path)}
                          className="py-1 px-3 rounded-lg text-xs font-semibold text-[#2C2523] bg-[#FAF7F2] hover:bg-[#EAE2D5] border border-[#D7CBB9] transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#B88E3C]" />
                          <span>{language === 'fil' ? 'Idagdag' : 'Add Path'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredSuggestions.length === 0 && (
                  <div className="p-8 text-center bg-white rounded-xl border border-dashed border-[#D7CBB9] space-y-2">
                    <Route className="w-8 h-8 text-[#B88E3C] mx-auto opacity-40" />
                    <p className="text-xs font-semibold text-[#2C2523]">
                      {language === 'fil' ? 'Walang nahanap na mungkahi sa setting na ito' : 'No outlines found at this sensitivity'}
                    </p>
                    <p className="text-[11px] text-[#7A6E65]">
                      {language === 'fil'
                        ? 'Subukang babaan ang Contrast Sensitivity slider upang maghanap ng mas malalabong hangganan.'
                        : 'Try lowering the Contrast Sensitivity slider to detect more subtle boundaries.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 2: SELECT OBJECT / COLOR TO OUTLINE ================= */}
          {activeTab === 'objects' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-[#E8E1D5] space-y-3 shadow-2xs">
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#2C2523]">
                    {language === 'fil' ? 'Piliin ang Bagay o Kulay na Babalangkasan' : 'Select Object or Color Region to Outline'}
                  </h3>
                  <p className="text-xs text-[#7A6E65] mt-0.5">
                    {language === 'fil'
                      ? 'Awtomatikong kukunin ng algorithm ang panlabas na hangganan ng napiling kulay upang maglagay ng malinis na backstitch outline.'
                      : 'The algorithm will automatically detect the outer perimeter contour of the chosen thread color to create a crisp decorative backstitch.'}
                  </p>
                </div>

                {/* Palette color selection list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {pattern.palette.map((color) => {
                    const isSelected = selectedObjectCode === color.code;
                    const count = pattern.colorStats.find((s) => s.color.code === color.code)?.count || 0;

                    return (
                      <button
                        key={color.code}
                        type="button"
                        onClick={() => setSelectedObjectCode(color.code)}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#FAF7F2] border-[#B88E3C] ring-2 ring-[#B88E3C]/30 shadow-2xs'
                            : 'bg-white border-[#E8E1D5] hover:border-[#D7CBB9]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-5 h-5 rounded-md border border-black/15 shrink-0 flex items-center justify-center text-[10px] font-bold"
                            style={{
                              backgroundColor: color.hex,
                              color: color.symbolDark ? '#111111' : '#FFFFFF',
                            }}
                          >
                            {color.symbol}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#2C2523] block truncate">
                              DMC {color.code}
                            </span>
                            <span className="text-[10px] text-[#7A6E65] block truncate">
                              {color.name}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-[#8C8077] shrink-0">
                          {count} st
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Apply button */}
                <div className="pt-2 border-t border-[#F0ECE1] flex items-center justify-between gap-3">
                  <div className="text-xs text-[#7A6E65]">
                    {language === 'fil' ? 'Naka-target:' : 'Target:'}{' '}
                    <span className="font-bold text-[#2C2523]">DMC {selectedObjectCode}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyObjectOutline}
                    className="py-2 px-4 rounded-xl text-xs font-bold text-[#2C2523] bg-[#E6C687] hover:bg-[#F2D79E] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {language === 'fil'
                        ? `Balangkasan ang DMC ${selectedObjectCode}`
                        : `Outline DMC ${selectedObjectCode} Object`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Point to point manual stitching guide */}
              <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#D7CBB9] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2C2523]">
                  <Route className="w-4 h-4 text-[#B88E3C]" />
                  <span>
                    {language === 'fil' ? 'Manu-manong Pagpili sa Grid Lines' : 'Point-to-Point Grid Selection'}
                  </span>
                </div>
                <p className="text-xs text-[#5F554F] leading-relaxed">
                  {language === 'fil'
                    ? 'Maaari mo ring i-click ang anumang grid intersection sa Manual Stitch Editor gamit ang Backstitch tool upang gumuhit ng tiyak na tuldok-sa-tuldok na linya.'
                    : 'To draw specific custom backstitch lines point-by-point, open the Manual Stitch Editor and select the Backstitch tool to snap lines between grid intersections.'}
                </p>
              </div>
            </div>
          )}

          {/* ================= TAB 3: DECORATIVE BORDER PRESETS ================= */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-[#E8E1D5] space-y-4 shadow-2xs">
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#2C2523]">
                    {language === 'fil' ? 'Dekoratibong Framing Border' : 'Decorative Framing Border Frame'}
                  </h3>
                  <p className="text-xs text-[#7A6E65] mt-0.5">
                    {language === 'fil'
                      ? 'Maglagay ng tradisyonal na border frame sa paligid ng disenyong cross-stitch gamit ang sinulid na DMC.'
                      : 'Add an elegant heirloom framing border around the perimeter of your wedding pattern.'}
                  </p>
                </div>

                {/* Border Style Selection */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(
                    [
                      { id: 'classic', label: 'Classic Single', desc: '1 clean frame' },
                      { id: 'double', label: 'Royal Double', desc: 'Parallel inner frame' },
                      { id: 'mitered', label: 'Heirloom Mitered', desc: 'Notched corners' },
                    ] as const
                  ).map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setBorderStyle(style.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        borderStyle === style.id
                          ? 'bg-[#FAF7F2] border-[#B88E3C] ring-2 ring-[#B88E3C]/30 shadow-2xs'
                          : 'bg-white border-[#E8E1D5] hover:border-[#D7CBB9]'
                      }`}
                    >
                      <span className="font-bold text-[#2C2523] block">{style.label}</span>
                      <span className="text-[10px] text-[#7A6E65] block mt-0.5">{style.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Inset slider */}
                <div className="space-y-1.5 pt-2 border-t border-[#F0ECE1]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#5F554F]">
                      {language === 'fil' ? 'Layo mula sa gilid (Inset):' : 'Border Inset Distance:'}
                    </span>
                    <span className="font-mono font-bold text-[#B88E3C]">
                      {borderInset} stitches
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max={Math.max(3, Math.floor(Math.min(pattern.width, pattern.height) / 5))}
                    value={borderInset}
                    onChange={(e) => setBorderInset(Number(e.target.value))}
                    className="w-full accent-[#B88E3C] cursor-pointer"
                  />
                </div>

                {/* Action button */}
                <button
                  type="button"
                  onClick={handleApplyBorder}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#2C2523] bg-[#E6C687] hover:bg-[#F2D79E] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>
                    {language === 'fil'
                      ? `I-apply ang ${borderStyle.toUpperCase()} Border (${selectedStrands} strands)`
                      : `Apply ${borderStyle.toUpperCase()} Border (${selectedStrands} Strands)`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 4: ACTIVE OUTLINES & SKEIN LIST ================= */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {/* Floss Summary Table */}
              <div className="bg-white p-4 rounded-xl border border-[#E8E1D5] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-sm text-[#2C2523]">
                    {language === 'fil' ? 'Talaan ng Sinulid para sa Backstitch' : 'Backstitch Floss Breakdown'}
                  </h3>
                  <span className="text-xs font-mono font-bold text-[#B88E3C]">
                    {stats.flossBreakdown.length} colors
                  </span>
                </div>

                {stats.flossBreakdown.length > 0 ? (
                  <div className="space-y-2">
                    {stats.flossBreakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8E1D5] text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-5 h-5 rounded-md border border-black/15 shrink-0"
                            style={{ backgroundColor: item.colorHex }}
                          />
                          <div>
                            <span className="font-bold text-[#2C2523]">DMC {item.dmcCode}</span>
                            <span className="text-[11px] text-[#7A6E65] block">
                              {item.strands} {item.strands === 1 ? 'strand' : 'strands'} · {item.segmentCount} stitches
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-[#2C2523]">
                            {item.lengthCm} cm
                          </span>
                          <span className="text-[10px] text-[#8C8077] block">
                            ~{item.skeinsEstimated} skein
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#7A6E65] italic py-2">
                    {language === 'fil'
                      ? 'Wala pang naidaragdag na backstitch outlines sa pattern.'
                      : 'No backstitch outlines added to this pattern yet.'}
                  </p>
                )}

                {/* Clear All Button */}
                {currentBackstitches.length > 0 && (
                  <div className="pt-2 border-t border-[#F0ECE1] flex justify-end">
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="py-1.5 px-3 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{language === 'fil' ? 'I-clear Lahat' : 'Clear All Outlines'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Informative Note regarding PDF Guide */}
              <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#D7CBB9] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2C2523]">
                  <FileText className="w-4 h-4 text-[#B88E3C]" />
                  <span>
                    {language === 'fil'
                      ? 'Awtomatikong Backstitch Guide sa PDF'
                      : 'Automatic PDF Backstitch Guide'}
                  </span>
                </div>
                <p className="text-xs text-[#5F554F] leading-relaxed">
                  {language === 'fil'
                    ? 'Ang bawat linyang idaragdag mo rito ay awtomatikong isasama sa nae-export na PDF chart, kumpleto kasama ang sariling Pahina ng Gabay sa Backstitch na nagtataglay ng thread key, diagram, at tagubilin sa pagtatahi.'
                    : 'Every outline added here will appear on your exported PDF chart sheets and generate a dedicated Backstitch Specification & Guide page with thread key, strand instructions, and technique advice.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ================= DRAWER FOOTER ================= */}
        <div className="bg-[#EDE5D8] px-5 py-3 border-t border-[#D7CBB9] flex items-center justify-between shrink-0">
          <div className="text-xs text-[#5F554F]">
            {language === 'fil'
              ? 'Lahat ng pagbabago ay awtomatikong nai-save.'
              : 'All outline changes are saved in real-time.'}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-[#2C2523] hover:bg-[#433936] transition-all cursor-pointer shadow-sm active:scale-95"
          >
            {language === 'fil' ? 'Tapos Na (Done)' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
