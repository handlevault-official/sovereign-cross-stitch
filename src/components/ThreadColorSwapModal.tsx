import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowRight,
  Search,
  RefreshCw,
  Sparkles,
  Check,
  Layers,
} from 'lucide-react';
import { DMCColor, PatternData } from '../types';
import { DMC_PALETTE } from '../data/dmcPalette';

interface ThreadColorSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: PatternData;
  sourceCode: string | null;
  onConfirmSwap: (sourceCode: string, targetColor: DMCColor) => void;
  language: 'en' | 'fil';
}

function getColorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  // Weighted perceptual Euclidean distance
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

function getContrastText(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#1C1917';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.56 ? '#1C1917' : '#FAF7F2';
}

export const ThreadColorSwapModal: React.FC<ThreadColorSwapModalProps> = ({
  isOpen,
  onClose,
  pattern,
  sourceCode,
  onConfirmSwap,
  language,
}) => {
  const [search, setSearch] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<DMCColor | null>(null);

  const sourceStat = useMemo(() => {
    if (!sourceCode) return null;
    return pattern.colorStats.find((s) => s.color.code === sourceCode) || null;
  }, [pattern.colorStats, sourceCode]);

  const paletteCodeSet = useMemo(() => {
    return new Set(pattern.palette.map((c) => c.code));
  }, [pattern.palette]);

  const usedSymbolsSet = useMemo(() => {
    const set = new Set<string>();
    pattern.palette.forEach((c) => {
      if (c.code !== sourceCode) set.add(c.symbol);
    });
    return set;
  }, [pattern.palette, sourceCode]);

  // Closest perceptual shades in the DMC database (excluding the source color itself)
  const closestMatches = useMemo(() => {
    if (!sourceStat) return [];
    return DMC_PALETTE.filter((c) => c.code !== sourceStat.color.code)
      .map((c) => ({
        color: c,
        dist: getColorDistance(sourceStat.color, c),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6)
      .map((item) => item.color);
  }, [sourceStat]);

  // Filtered full DMC list
  const filteredPalette = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DMC_PALETTE.filter((c) => {
      if (sourceStat && c.code === sourceStat.color.code) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.includes(q)
      );
    });
  }, [search, sourceStat]);

  if (!isOpen || !sourceStat) return null;

  const isMergeTarget = selectedTarget ? paletteCodeSet.has(selectedTarget.code) : false;

  // Compute resulting symbol preview cleanly (avoiding symbol collision)
  const resolvedPreviewSymbol = (() => {
    if (!selectedTarget) return sourceStat.color.symbol;
    if (isMergeTarget) {
      const existing = pattern.palette.find((c) => c.code === selectedTarget.code);
      return existing ? existing.symbol : selectedTarget.symbol;
    }
    if (!usedSymbolsSet.has(selectedTarget.symbol)) {
      return selectedTarget.symbol;
    }
    return sourceStat.color.symbol;
  })();

  const handleConfirm = () => {
    if (!selectedTarget) return;
    onConfirmSwap(sourceStat.color.code, selectedTarget);
    setSelectedTarget(null);
    setSearch('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E8E1D5] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-[#FAF7F2] border-b border-[#E8E1D5] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#2C2523] text-[#E6C687] flex items-center justify-center shadow-xs shrink-0">
              <RefreshCw className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-lg font-bold text-[#2C2523] truncate">
                {language === 'fil'
                  ? 'Palitan ang Kulay ng Sinulid (DMC Swap)'
                  : 'Swap DMC Thread Color'}
              </h3>
              <p className="text-xs text-[#7A6E65] truncate">
                {language === 'fil'
                  ? 'Pumili ng kapalit na DMC thread. Awtomatikong ia-update ang Symbol Key at Grid Preview.'
                  : 'Choose your preferred replacement DMC shade—updates both the Symbol Key and Pattern Grid live.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedTarget(null);
              setSearch('');
              onClose();
            }}
            className="p-2 rounded-lg text-[#7A6E65] hover:text-[#2C2523] hover:bg-[#EFE9DF] transition-colors cursor-pointer shrink-0"
            aria-label="Close thread swap modal"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Before -> After Live Comparison Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-center bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E1D5]">
            {/* Current Thread */}
            <div className="sm:col-span-5 flex items-center gap-3 bg-white p-2.5 rounded-lg border border-[#E8E1D5]">
              <div
                className="w-10 h-10 rounded-lg border border-black/20 shadow-2xs shrink-0 flex items-center justify-center font-mono font-bold text-sm"
                style={{
                  backgroundColor: sourceStat.color.hex,
                  color: getContrastText(sourceStat.color.hex),
                }}
              >
                {sourceStat.color.symbol}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8C8077]">
                  {language === 'fil' ? 'Kasalukuyan' : 'Current'}
                </div>
                <div className="font-mono font-bold text-xs text-[#2C2523]">
                  DMC {sourceStat.color.code}
                </div>
                <div className="text-[11px] text-[#5F554F] truncate">
                  {sourceStat.color.name} · {sourceStat.count.toLocaleString()} sts
                </div>
              </div>
            </div>

            <div className="sm:col-span-1 flex justify-center">
              <div className="w-7 h-7 rounded-full bg-[#EFE8DC] border border-[#D7CBB9] flex items-center justify-center text-[#7A6E65]">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Replacement Thread */}
            <div
              className={`sm:col-span-5 flex items-center gap-3 p-2.5 rounded-lg border ${
                selectedTarget
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-white/60 border-dashed border-[#D7CBB9]'
              }`}
            >
              {selectedTarget ? (
                <>
                  <div
                    className="w-10 h-10 rounded-lg border border-black/20 shadow-2xs shrink-0 flex items-center justify-center font-mono font-bold text-sm"
                    style={{
                      backgroundColor: selectedTarget.hex,
                      color: getContrastText(selectedTarget.hex),
                    }}
                  >
                    {resolvedPreviewSymbol}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                      <span>{language === 'fil' ? 'Ipapalit' : 'New Thread'}</span>
                      {isMergeTarget && (
                        <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-bold">
                          Merge
                        </span>
                      )}
                    </div>
                    <div className="font-mono font-bold text-xs text-[#2C2523]">
                      DMC {selectedTarget.code}
                    </div>
                    <div className="text-[11px] text-[#5F554F] truncate">
                      {selectedTarget.name}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-[#8C8077] italic py-1 px-1">
                  {language === 'fil'
                    ? 'Pumili ng kapalit na kulay sa ibaba...'
                    : 'Select a replacement shade below...'}
                </div>
              )}
            </div>
          </div>

          {/* Closest Shade Suggestions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#2C2523] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#B88E3C]" />
                <span>
                  {language === 'fil'
                    ? 'Pinakamalapit na Katugmang Kulay (Recommended)'
                    : 'Closest Color Harmony Matches'}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {closestMatches.map((c) => {
                const isSelected = selectedTarget?.code === c.code;
                const inPattern = paletteCodeSet.has(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setSelectedTarget(c)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2C2523] text-white border-[#2C2523] ring-2 ring-[#B88E3C]/50 shadow-xs'
                        : 'bg-[#FAF7F2] hover:bg-[#F3EDE2] text-[#2C2523] border-[#E8E1D5]'
                    }`}
                  >
                    <span
                      className="w-7 h-7 rounded-md border border-black/20 shrink-0 flex items-center justify-center font-mono text-[11px] font-bold"
                      style={{
                        backgroundColor: c.hex,
                        color: getContrastText(c.hex),
                      }}
                    >
                      {c.symbol}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-mono text-xs font-bold ${
                            isSelected ? 'text-[#E6C687]' : 'text-[#2C2523]'
                          }`}
                        >
                          {c.code}
                        </span>
                        {inPattern && (
                          <span
                            className={`text-[9px] px-1 rounded font-semibold ${
                              isSelected
                                ? 'bg-amber-400/20 text-amber-200'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                            title={
                              language === 'fil'
                                ? 'Nasa pattern na (isa-merge ang mga tahi)'
                                : 'Already in pattern (merges stitches)'
                            }
                          >
                            {language === 'fil' ? 'Merge' : 'In Set'}
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[10px] truncate ${
                          isSelected ? 'text-stone-300' : 'text-[#7A6E65]'
                        }`}
                      >
                        {c.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Full Authentic DMC Database */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-[#2C2523] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#7A6E65]" />
                <span>
                  {language === 'fil'
                    ? 'Lahat ng DMC Threads sa Database'
                    : 'All Authentic DMC Floss Shades'}
                </span>
              </span>
              <span className="text-[11px] font-mono text-[#8C8077]">
                {filteredPalette.length} {language === 'fil' ? 'kulay' : 'shades'}
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8C8077] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  language === 'fil'
                    ? 'Maghanap ng DMC code o pangalan (hal. 310, Blanc, Navy, Mauve)...'
                    : 'Search DMC code or shade name (e.g. 310, Blanc, Navy, Mauve)...'
                }
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[#D7CBB9] bg-[#FAF7F2] focus:bg-white focus:border-[#B88E3C] focus:outline-hidden text-[#2C2523]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C8077] hover:text-[#2C2523] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="max-h-52 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {filteredPalette.map((c) => {
                const isSelected = selectedTarget?.code === c.code;
                const inPattern = paletteCodeSet.has(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setSelectedTarget(c)}
                    className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2C2523] text-white border-[#2C2523] shadow-xs'
                        : 'bg-white hover:bg-[#FAF7F2] text-[#2C2523] border-[#E8E1D5]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-6 h-6 rounded border border-black/20 shrink-0 flex items-center justify-center font-mono text-[10px] font-bold"
                        style={{
                          backgroundColor: c.hex,
                          color: getContrastText(c.hex),
                        }}
                      >
                        {c.symbol}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono text-xs font-bold ${
                              isSelected ? 'text-[#E6C687]' : 'text-[#2C2523]'
                            }`}
                          >
                            DMC {c.code}
                          </span>
                          {inPattern && (
                            <span
                              className={`text-[9px] px-1 rounded font-semibold ${
                                isSelected
                                  ? 'bg-amber-400/20 text-amber-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {language === 'fil' ? 'Merge' : 'In Pattern'}
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[11px] truncate ${
                            isSelected ? 'text-stone-300' : 'text-[#7A6E65]'
                          }`}
                        >
                          {c.name}
                        </div>
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}

              {filteredPalette.length === 0 && (
                <div className="col-span-full py-6 text-center text-xs text-[#7A6E65]">
                  {language === 'fil'
                    ? 'Walang nahanap na katugmang DMC thread.'
                    : 'No matching DMC threads found.'}
                </div>
              )}
            </div>
          </div>

          {isMergeTarget && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-950">
              <strong>{language === 'fil' ? 'Paalala sa Merge:' : 'Palette Merge:'}</strong>{' '}
              {language === 'fil'
                ? `Ang DMC ${selectedTarget?.code} ay nasa pattern na. Pagsasamahin ang lahat ng ${sourceStat.count.toLocaleString()} tahi sa iisang kulay at bababa ang kabuuang bilang ng kulay.`
                : `DMC ${selectedTarget?.code} is already in this pattern. Swapping will merge all ${sourceStat.count.toLocaleString()} stitches into it and simplify your palette.`}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#F0ECE1]">
            <button
              type="button"
              onClick={() => {
                setSelectedTarget(null);
                setSearch('');
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5F554F] bg-[#FAF7F2] hover:bg-[#F0ECE1] border border-[#D7CBB9] transition-colors cursor-pointer"
            >
              {language === 'fil' ? 'Kanselahin' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={!selectedTarget}
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl font-serif text-xs font-bold text-white bg-[#2C2523] hover:bg-[#433936] disabled:opacity-45 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#E6C687]" />
              <span>
                {language === 'fil' ? 'I-apply ang Palit Kulay' : 'Apply Thread Swap'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
