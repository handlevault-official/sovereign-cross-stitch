import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Filter,
  Copy,
  Layers,
  ShoppingBag,
  ShoppingCart,
  ListChecks,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ThreadStashEntry, PatternData, DMCColor } from '../types';
import { DMC_PALETTE } from '../data/dmcPalette';
import { parseBulkCodes } from '../utils/stashStorage';
import { ThreadShortageChart } from './ThreadShortageChart';

interface MyThreadStashProps {
  stash: Record<string, ThreadStashEntry>;
  onAddCode: (code: string, skeins?: number) => void;
  onRemoveCode: (code: string) => void;
  onUpdateSkeins: (code: string, delta: number) => void;
  onBulkAdd: (codes: string[]) => void;
  onClearStash: () => void;
  pattern: PatternData | null;
  language: 'en' | 'fil';
}

const COLOR_GROUPS = [
  {
    name: 'Whites, Creams & Ivories',
    tagalogName: 'Puti, Cream at Ivory',
    codes: ['B5200', 'Blanc', 'Ecru', '3865', '712', '739', '738'],
  },
  {
    name: 'Blush, Peony & Wedding Pink',
    tagalogName: 'Rosas, Peach at Blush',
    codes: ['948', '754', '3778', '3689', '3688', '3687', '224', '223', '221', '818', '776', '3354', '152'],
  },
  {
    name: 'Wine, Burgundy & Rose Petals',
    tagalogName: 'Burgundy, Alahas at Pulang Rosas',
    codes: ['816', '815', '814', '902', '498', '321'],
  },
  {
    name: 'Heirloom Gold, Champagne & Warm Ochre',
    tagalogName: 'Ginto, Champagne at Dilaw',
    codes: ['677', '676', '729', '680', '3829', '745', '743', '741'],
  },
  {
    name: 'Botanical Foliage, Eucalyptus & Sage',
    tagalogName: 'Berdeng Dahon, Eucalyptus at Sage',
    codes: ['524', '523', '522', '520', '3053', '3052', '3051', '3348', '3347', '3346', '3345', '895', '934'],
  },
  {
    name: 'Bridal Navy, Slate & Tuxedo Blues',
    tagalogName: 'Asul, Navy at Tuxedo Slate',
    codes: ['932', '931', '930', '3750', '823', '939', '775', '3325'],
  },
  {
    name: 'Portrait Skin Tones & Wood Grain',
    tagalogName: 'Kulay ng Balat at Kayumanggi',
    codes: ['3770', '945', '402', '3772', '437', '436', '435', '434', '898', '3371'],
  },
  {
    name: 'Neutral Grays, Pewter & Tuxedo Black',
    tagalogName: 'Abo, Pilak at Itim',
    codes: ['762', '415', '318', '414', '317', '413', '3799', '310'],
  },
];

export const MyThreadStash: React.FC<MyThreadStashProps> = ({
  stash,
  onAddCode,
  onRemoveCode,
  onUpdateSkeins,
  onBulkAdd,
  onClearStash,
  pattern,
  language,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [activeCatalogTab, setActiveCatalogTab] = useState<number | null>(null);
  const [stashFilter, setStashFilter] = useState<'all' | 'inPattern' | 'missingFromPattern' | 'notInPattern'>('all');
  const [copiedStashList, setCopiedStashList] = useState(false);
  const [copiedMissing, setCopiedMissing] = useState(false);
  const [copyFormat, setCopyFormat] = useState<'checklist' | 'numbers' | 'order'>('checklist');
  const [showMissingTray, setShowMissingTray] = useState(true);

  // Map of DMC code to full DMC color object
  const colorMap = useMemo(() => {
    const map = new Map<string, DMCColor>();
    DMC_PALETTE.forEach((c) => map.set(c.code, c));
    return map;
  }, []);

  // Set of codes present in current active pattern (including backstitches)
  const patternCodes = useMemo(() => {
    if (!pattern) return new Set<string>();
    const set = new Set(pattern.colorStats.map((s) => s.color.code));
    if (pattern.backstitches) {
      pattern.backstitches.forEach((bs) => {
        if (bs.dmcCode) set.add(bs.dmcCode);
      });
    }
    return set;
  }, [pattern]);

  // Stash entries list
  const stashEntries = useMemo(() => {
    return Object.values(stash).map((entry) => ({
      ...entry,
      color: colorMap.get(entry.dmcCode) || {
        code: entry.dmcCode,
        name: `DMC ${entry.dmcCode}`,
        hex: '#CCCCCC',
        r: 200,
        g: 200,
        b: 200,
        symbol: '?',
      },
      isInCurrentPattern: patternCodes.has(entry.dmcCode),
      isMissing: false,
      deficit: 0,
      required: 1,
      stitchesCount: 0,
      usageType: 'cross-stitch' as const,
    }));
  }, [stash, colorMap, patternCodes]);

  const totalColorsCount = stashEntries.length;
  const totalSkeinsCount = stashEntries.reduce((sum, e) => sum + (e.skeins || 1), 0);

  // Comprehensive Pattern Floss & Missing DMC Alert Report
  const missingFlossReport = useMemo(() => {
    if (!pattern) return null;

    const flossMap = new Map<
      string,
      {
        code: string;
        color: DMCColor;
        name: string;
        hex: string;
        symbol?: string;
        symbolDark?: boolean;
        stitchesCount: number;
        skeinsNeeded: number;
        inStash: number;
        deficit: number;
        isCompletelyMissing: boolean;
        usageType: 'cross-stitch' | 'backstitch' | 'both';
      }
    >();

    // 1. Cross-stitch colors from pattern.colorStats
    pattern.colorStats.forEach((stat) => {
      const code = stat.color.code;
      const stashEntry = stash[code];
      const inStash = stashEntry ? Math.max(0, stashEntry.skeins) : 0;
      const required = Math.max(1, stat.skeinsNeeded);
      const deficit = Math.max(0, required - inStash);

      flossMap.set(code, {
        code,
        color: stat.color,
        name: stat.color.name,
        hex: stat.color.hex,
        symbol: stat.color.symbol,
        symbolDark: stat.color.symbolDark,
        stitchesCount: stat.count,
        skeinsNeeded: required,
        inStash,
        deficit,
        isCompletelyMissing: inStash === 0,
        usageType: 'cross-stitch',
      });
    });

    // 2. Backstitch outline colors if any
    if (pattern.backstitches && pattern.backstitches.length > 0) {
      const bsTally = new Map<string, number>();
      pattern.backstitches.forEach((bs) => {
        const code = bs.dmcCode || '310';
        bsTally.set(code, (bsTally.get(code) || 0) + 1);
      });

      bsTally.forEach((count, code) => {
        const existing = flossMap.get(code);
        if (existing) {
          existing.usageType = 'both';
          existing.stitchesCount += count;
        } else {
          const colorObj = colorMap.get(code) || DMC_PALETTE.find((c) => c.code === code) || {
            code,
            name: `DMC ${code}`,
            hex: '#1A1615',
            r: 26,
            g: 22,
            b: 21,
            symbol: '—',
          };
          const stashEntry = stash[code];
          const inStash = stashEntry ? Math.max(0, stashEntry.skeins) : 0;
          const required = 1;
          const deficit = Math.max(0, required - inStash);

          flossMap.set(code, {
            code,
            color: colorObj,
            name: colorObj.name,
            hex: colorObj.hex,
            symbol: colorObj.symbol,
            symbolDark: colorObj.symbolDark,
            stitchesCount: count,
            skeinsNeeded: required,
            inStash,
            deficit,
            isCompletelyMissing: inStash === 0,
            usageType: 'backstitch',
          });
        }
      });
    }

    const allFloss = Array.from(flossMap.values());
    const missingCodes = allFloss.filter((f) => f.inStash === 0);
    const shortageCodes = allFloss.filter((f) => f.inStash > 0 && f.inStash < f.skeinsNeeded);
    const allNeedingPurchase = [...missingCodes, ...shortageCodes];
    const totalMissingSkeins = allNeedingPurchase.reduce((sum, f) => sum + f.deficit, 0);
    const totalRequiredColors = allFloss.length;
    const ownedCount = allFloss.filter((f) => f.inStash >= f.skeinsNeeded).length;
    const percentage = totalRequiredColors > 0 ? Math.round((ownedCount / totalRequiredColors) * 100) : 100;

    return {
      allFloss,
      missingCodes,
      shortageCodes,
      allNeedingPurchase,
      totalMissingSkeins,
      totalRequiredColors,
      ownedInPatternCount: ownedCount,
      missingInPatternCount: allNeedingPurchase.length,
      percentage,
      isComplete: allNeedingPurchase.length === 0,
    };
  }, [pattern, stash, colorMap]);

  // Backward compatibility alias for readiness gauges
  const patternReadiness = useMemo(() => {
    if (!missingFlossReport) return null;
    return {
      totalColorsInPattern: missingFlossReport.totalRequiredColors,
      ownedInPatternCount: missingFlossReport.ownedInPatternCount,
      missingInPatternCount: missingFlossReport.missingInPatternCount,
      missingSkeinsCount: missingFlossReport.totalMissingSkeins,
      missingColors: missingFlossReport.allNeedingPurchase.map((m) => m.color),
      percentage: missingFlossReport.percentage,
    };
  }, [missingFlossReport]);

  // Autocomplete / Search suggestions
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return DMC_PALETTE.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  // Filtered stash entries (including support for missingFromPattern)
  const filteredStashEntries = useMemo(() => {
    if (stashFilter === 'missingFromPattern') {
      if (!missingFlossReport) return [];
      return missingFlossReport.allNeedingPurchase.map((m) => ({
        dmcCode: m.code,
        skeins: m.inStash,
        color: m.color,
        isInCurrentPattern: true,
        isMissing: true,
        deficit: m.deficit,
        required: m.skeinsNeeded,
        stitchesCount: m.stitchesCount,
        usageType: m.usageType,
      }));
    }

    return stashEntries.filter((entry) => {
      if (stashFilter === 'inPattern') {
        return entry.isInCurrentPattern;
      }
      if (stashFilter === 'notInPattern') {
        return !entry.isInCurrentPattern;
      }
      return true;
    });
  }, [stashEntries, stashFilter, missingFlossReport]);

  // Copy Missing Codes for Shopping
  const handleCopyMissingCodes = (fmt: 'checklist' | 'numbers' | 'order' = copyFormat) => {
    if (!missingFlossReport || missingFlossReport.allNeedingPurchase.length === 0) return;

    const items = missingFlossReport.allNeedingPurchase;
    let text = '';

    if (fmt === 'numbers') {
      // Numbers only, e.g. "310, 816, 677, 930" or "310 (x1), 816 (x2)"
      text = items
        .map((item) => (item.deficit > 1 ? `${item.code} (x${item.deficit})` : item.code))
        .join(', ');
    } else if (fmt === 'order') {
      // Store order format
      text = items
        .map((item) => `DMC ${item.code} x${item.deficit}`)
        .join(', ');
    } else {
      // Comprehensive Checklist
      const lines = items.map((item) => {
        const skeinText = item.deficit === 1 ? '1 skein' : `${item.deficit} skeins`;
        const typeNote = item.usageType === 'backstitch' ? ' [backstitch]' : item.usageType === 'both' ? ' [cross & backstitch]' : '';
        const haveNote = item.inStash > 0 ? ` (have ${item.inStash}/${item.skeinsNeeded})` : '';
        return `[ ] DMC ${item.code} - ${item.name} | Need ${skeinText}${haveNote} • ${item.stitchesCount.toLocaleString()} sts${typeNote}`;
      });

      text = [
        `🛍️ DMC FLOSS SHOPPING LIST - MISSING CODES`,
        `Pattern: "${pattern?.title || 'Heirloom Cross-Stitch'}"`,
        `Fabric: ${pattern?.fabricCount || 14}ct Aida | Date: ${new Date().toLocaleDateString()}`,
        `Total Missing: ${items.length} DMC ${items.length === 1 ? 'Color' : 'Colors'} (${missingFlossReport.totalMissingSkeins} skeins total)`,
        `----------------------------------------`,
        ...lines,
        `----------------------------------------`,
        `Generated by Wedding Cross-Stitch Studio`,
      ].join('\n');
    }

    navigator.clipboard.writeText(text);
    setCopiedMissing(true);
    setTimeout(() => setCopiedMissing(false), 2500);
  };

  // Add all missing codes to stash with their needed deficit
  const handleAddAllMissingToStash = () => {
    if (!missingFlossReport || missingFlossReport.allNeedingPurchase.length === 0) return;
    missingFlossReport.allNeedingPurchase.forEach((item) => {
      onAddCode(item.code, item.deficit);
    });
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkInput.trim()) return;

    const { validCodes, invalidTokens } = parseBulkCodes(bulkInput);

    if (validCodes.length === 0) {
      setBulkMessage(
        language === 'fil'
          ? 'Walang nahanap na wastong DMC color code sa inyong nilagay.'
          : 'No valid DMC floss codes were recognized in your input.'
      );
      return;
    }

    onBulkAdd(validCodes);
    setBulkInput('');
    setBulkMessage(
      language === 'fil'
        ? `Matagumpay na naidagdag ang ${validCodes.length} kulay sa iyong stash!${
            invalidTokens.length > 0 ? ` (Hindi kinilala: ${invalidTokens.slice(0, 3).join(', ')})` : ''
          }`
        : `Successfully imported ${validCodes.length} color(s) into your stash!${
            invalidTokens.length > 0 ? ` (Unrecognized: ${invalidTokens.slice(0, 3).join(', ')})` : ''
          }`
    );
    setTimeout(() => {
      setShowBulkModal(false);
      setBulkMessage(null);
    }, 2500);
  };

  const handleAddAllFromCurrentPattern = () => {
    if (!pattern) return;
    const codes = pattern.colorStats.map((s) => s.color.code);
    onBulkAdd(codes);
  };

  const handleCopyStashList = () => {
    const list = stashEntries
      .map((e) => `DMC ${e.dmcCode} - ${e.color.name} (${e.skeins || 1} skein)`)
      .sort()
      .join('\n');
    const header = `=== MY SOVEREIGN THREAD STASH ===\nTotal Colors: ${totalColorsCount}\nTotal Skeins: ${totalSkeinsCount}\nDate: ${new Date().toLocaleDateString()}\n\n`;
    navigator.clipboard.writeText(header + list);
    setCopiedStashList(true);
    setTimeout(() => setCopiedStashList(false), 2000);
  };

  return (
    <div id="stash-section" className="bg-white rounded-2xl border border-[#E8E1D5] shadow-xs p-6 sm:p-8 space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0ECE1] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8C7A6B] uppercase tracking-wider mb-1">
            <Package className="w-4 h-4 text-[#B88E3C]" />
            <span>{language === 'fil' ? 'Imbentaryo ng Sinulid' : 'Personal Floss Inventory'}</span>
          </div>
          <h2 className="font-serif text-3xl font-bold text-[#2C2523]">
            {language === 'fil' ? 'My Thread Stash' : 'My Thread Stash'}
          </h2>
          <p className="text-xs sm:text-sm text-[#5F554F] mt-1 max-w-2xl">
            {language === 'fil'
              ? 'Itala ang mga DMC thread na mayroon ka na sa bahay. Awtomatikong ipapakita sa Floss Legend kung anong mga kulay ang handa na at kung alin ang kailangan mo pang bilhin.'
              : 'Catalog the DMC embroidery threads you already own in your workbasket. The chart legend will automatically highlight what you already have and what you need to purchase.'}
          </p>
        </div>

        {/* Action button cluster */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowBulkModal(!showBulkModal)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#2C2523] bg-[#FAF7F2] hover:bg-[#F0ECE1] border border-[#D7CBB9] transition-all cursor-pointer shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-[#B88E3C]" />
            <span>{language === 'fil' ? 'I-paste ang Maramihan' : 'Bulk Paste Codes'}</span>
          </button>

          {pattern && (
            <button
              type="button"
              onClick={handleAddAllFromCurrentPattern}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#2C2523] bg-[#FAF7F2] hover:bg-[#F0ECE1] border border-[#D7CBB9] transition-all cursor-pointer shadow-2xs"
              title={language === 'fil' ? 'Markahang mayroon ka ng lahat ng kulay sa kasalukuyang pattern' : 'Mark all colors in the active pattern as owned in your stash'}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B88E3C]" />
              <span>{language === 'fil' ? 'Idagdag Lahat sa Pattern' : 'Add Current Pattern to Stash'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyStashList}
            disabled={totalColorsCount === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#2C2523] bg-[#FAF7F2] hover:bg-[#F0ECE1] border border-[#D7CBB9] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Copy inventory to clipboard"
          >
            {copiedStashList ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">{language === 'fil' ? 'Na-kopya!' : 'Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{language === 'fil' ? 'Kopyahin ang Stash' : 'Copy Stash List'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= AUTOMATIC PATTERN FLOSS ALERT & SHOPPING ASSISTANT ================= */}
      {pattern && missingFlossReport && (
        <>
          {!missingFlossReport.isComplete ? (
            <div id="missing-floss-alert" className="bg-[#FFFDF9] border-2 border-[#D4A346] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 relative overflow-hidden">
              {/* Subtle decorative gold corner motif */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#E6C687]/20 to-transparent pointer-events-none rounded-bl-full" />

              {/* Alert Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300">
                        {language === 'fil' ? 'Awtomatikong Babala sa Sinulid' : 'Automatic Floss Alert'}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-[#8C7A6B]">
                        {missingFlossReport.allNeedingPurchase.length} {language === 'fil' ? 'kulang na DMC codes' : 'missing DMC codes'}
                      </span>
                    </div>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2C2523] mt-0.5">
                      {language === 'fil'
                        ? `Kulang sa ${missingFlossReport.allNeedingPurchase.length} Kulay ng Sinulid para sa "${pattern.title}"`
                        : `Missing ${missingFlossReport.allNeedingPurchase.length} Required DMC Floss ${
                            missingFlossReport.allNeedingPurchase.length === 1 ? 'Color' : 'Colors'
                          } for "${pattern.title}"`}
                    </h3>
                  </div>
                </div>

                {/* Readiness Gauge Pill */}
                <div className="flex items-center gap-2 self-start sm:self-auto bg-white px-3 py-1.5 rounded-xl border border-[#D7CBB9] shadow-2xs">
                  <span className="text-xs text-[#7A6E65]">
                    {language === 'fil' ? 'Stash Readiness:' : 'Stash Readiness:'}
                  </span>
                  <span className="font-mono text-sm font-bold text-amber-700">
                    {missingFlossReport.percentage}%
                  </span>
                  <span className="text-[11px] text-[#8C7A6B]">
                    ({missingFlossReport.ownedInPatternCount}/{missingFlossReport.totalRequiredColors})
                  </span>
                </div>
              </div>

              {/* Descriptive context */}
              <p className="text-xs sm:text-sm text-[#5F554F] leading-relaxed max-w-3xl">
                {language === 'fil'
                  ? `Ang iyong kasalukuyang imbentaryo ay kulang sa mga kinakailangang kulay ng DMC (${missingFlossReport.totalMissingSkeins} skeins kabuuan) para sa proyektong ito. Kopyahin ang listahan sa ibaba para sa pamimili o idagdag ang mga nabiling skein sa iyong stash.`
                  : `Your current thread stash is missing specific DMC codes required for the active pattern "${pattern.title}". You will need ${missingFlossReport.totalMissingSkeins} additional skeins to stitch without running out of floss. Copy the shopping list below or click any shade to mark it as acquired.`}
              </p>

              {/* Action Toolbar: Copy Shopping List & Mark Acquired */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-[#F0ECE1]">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Primary 'Copy Missing Codes' Button */}
                  <button
                    type="button"
                    onClick={() => handleCopyMissingCodes(copyFormat)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#2C2523] bg-[#E6C687] hover:bg-[#F2D79E] transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Copy formatted missing thread codes for shopping"
                  >
                    {copiedMissing ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-800" />
                        <span className="text-emerald-900 font-bold">
                          {language === 'fil' ? 'Na-kopya sa Clipboard!' : 'Copied Shopping List!'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[#2C2523]" />
                        <span>
                          {language === 'fil' ? 'Kopyahin ang Kulang na Codes' : 'Copy Missing Codes for Shopping'}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Format Selector Pills */}
                  <div className="flex items-center bg-[#FAF7F2] p-1 rounded-xl border border-[#D7CBB9] text-[11px]">
                    <span className="px-2 text-[#7A6E65] font-medium hidden sm:inline">
                      {language === 'fil' ? 'Pormat:' : 'Format:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCopyFormat('checklist');
                        handleCopyMissingCodes('checklist');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        copyFormat === 'checklist'
                          ? 'bg-[#2C2523] text-white shadow-2xs'
                          : 'text-[#5F554F] hover:text-[#2C2523]'
                      }`}
                      title="Full checklist with checkboxes, skeins, and stitches"
                    >
                      {language === 'fil' ? 'Checklist' : 'Checklist'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCopyFormat('numbers');
                        handleCopyMissingCodes('numbers');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        copyFormat === 'numbers'
                          ? 'bg-[#2C2523] text-white shadow-2xs'
                          : 'text-[#5F554F] hover:text-[#2C2523]'
                      }`}
                      title="Compact DMC numbers only (e.g. 310, 816, 677)"
                    >
                      {language === 'fil' ? 'Codes Only' : 'Codes Only'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCopyFormat('order');
                        handleCopyMissingCodes('order');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        copyFormat === 'order'
                          ? 'bg-[#2C2523] text-white shadow-2xs'
                          : 'text-[#5F554F] hover:text-[#2C2523]'
                      }`}
                      title="Store order format (e.g. DMC 310 x1, DMC 816 x2)"
                    >
                      {language === 'fil' ? 'Order' : 'Store Order'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Mark All as Acquired */}
                  <button
                    type="button"
                    onClick={handleAddAllMissingToStash}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#2C2523] bg-white hover:bg-[#FAF7F2] border border-[#D7CBB9] transition-all cursor-pointer shadow-2xs"
                    title="Add all missing required skeins into your stash"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#B88E3C]" />
                    <span>
                      {language === 'fil'
                        ? `Idagdag Lahat (${missingFlossReport.allNeedingPurchase.length}) sa Stash`
                        : `Mark All (${missingFlossReport.allNeedingPurchase.length}) as Acquired`}
                    </span>
                  </button>

                  {/* Toggle Tray visibility */}
                  <button
                    type="button"
                    onClick={() => setShowMissingTray(!showMissingTray)}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs text-[#7A6E65] hover:text-[#2C2523] hover:bg-white border border-transparent transition-all cursor-pointer"
                  >
                    <span>{showMissingTray ? (language === 'fil' ? 'Itago' : 'Hide Chips') : (language === 'fil' ? 'Ipakita' : 'View Chips')}</span>
                    {showMissingTray ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Interactive Missing Codes Chips Carousel/Grid */}
              {showMissingTray && (
                <div className="space-y-2 pt-2 border-t border-[#F0ECE1]">
                  <div className="flex items-center justify-between text-xs text-[#7A6E65]">
                    <span className="font-semibold uppercase text-[10px] tracking-wider text-[#8C7A6B]">
                      {language === 'fil' ? 'Mga Nawawalang DMC Shades (I-click ang + para idagdag sa stash):' : 'Specific Missing DMC Shades (Click + to mark as owned):'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStashFilter('missingFromPattern')}
                      className="text-[#B88E3C] hover:underline font-semibold cursor-pointer text-[11px]"
                    >
                      {language === 'fil' ? 'Tingnan sa Talaan ↓' : 'Filter Inventory Table ↓'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
                    {missingFlossReport.allNeedingPurchase.map((item) => (
                      <div
                        key={item.code}
                        className="bg-white rounded-xl border border-amber-200 p-2.5 flex flex-col justify-between gap-2 shadow-2xs hover:border-[#B88E3C] transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 rounded-md border border-black/20 shrink-0 shadow-2xs"
                            style={{ backgroundColor: item.hex }}
                          />
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-xs text-[#2C2523] block leading-none">
                              DMC {item.code}
                            </span>
                            <span className="text-[10px] text-[#7A6E65] truncate block mt-0.5" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#F5F0E6] text-[10px]">
                          <div>
                            <span className="font-semibold text-amber-900 block leading-tight">
                              {item.deficit === 1 ? '1 skein' : `${item.deficit} skeins`}
                            </span>
                            <span className="text-[#8C8077] block text-[9px]">
                              {item.stitchesCount} sts {item.usageType === 'backstitch' ? '• outline' : ''}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onAddCode(item.code, item.deficit)}
                            className="p-1 px-1.5 rounded-lg bg-amber-50 hover:bg-[#2C2523] text-amber-900 hover:text-white border border-amber-200 transition-all font-bold text-[10px] cursor-pointer flex items-center gap-0.5"
                            title={`Add ${item.deficit} skein(s) of DMC ${item.code} to your stash`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>{language === 'fil' ? 'Bili' : 'Add'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* All Required Threads in Stash Celebration Banner */
            <div className="bg-emerald-50/80 border-2 border-emerald-400 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
                      {language === 'fil' ? '100% Kumpleto' : '100% Stash Ready'}
                    </span>
                    <span className="text-xs text-emerald-800 font-medium">
                      {missingFlossReport.totalRequiredColors} DMC colors on hand
                    </span>
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-emerald-950 mt-1">
                    {language === 'fil'
                      ? 'Kumpleto ang Lahat ng Sinulid sa Iyong Stash!'
                      : 'All Required DMC Colors in Stash!'}
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-800 mt-1 max-w-2xl leading-relaxed">
                    {language === 'fil'
                      ? `Nasa iyong basket na ang lahat ng ${missingFlossReport.totalRequiredColors} kulay ng DMC thread para sa "${pattern.title}". Handa ka nang simulan ang pagtahi nang walang kakulangan!`
                      : `Your personal inventory contains 100% of the ${missingFlossReport.totalRequiredColors} DMC thread shades needed for "${pattern.title}". You are completely stocked and ready to stitch!`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setStashFilter('inPattern')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-900 bg-white hover:bg-emerald-100/60 border border-emerald-300 transition-all cursor-pointer shadow-2xs"
                >
                  {language === 'fil' ? 'Tingnan ang mga Kulay sa Pattern' : 'View Pattern Palette in Stash'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Summary KPI Cards & Active Project Alignment Gauge */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Total Colors in Stash */}
        <div className="md:col-span-3 bg-[#FAF7F2] border border-[#E0D7C9] rounded-xl p-5 space-y-1">
          <div className="text-[11px] font-bold text-[#7A6E65] uppercase tracking-wider">
            {language === 'fil' ? 'Mga Kulay sa Stash:' : 'Total Colors in Stash:'}
          </div>
          <div className="font-mono text-3xl font-extrabold text-[#2C2523]">
            {totalColorsCount} <span className="text-sm font-sans font-medium text-[#7A6E65]">DMC shades</span>
          </div>
          <div className="text-[11px] text-[#7A6E65]">
            {totalSkeinsCount} {language === 'fil' ? 'kabuuang skeins na naitala' : 'total 8m skeins on hand'}
          </div>
        </div>

        {/* Current Project Readiness Card */}
        {patternReadiness ? (
          <div className="md:col-span-9 bg-white border-2 border-[#2C2523] rounded-xl p-5 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-[#2C2523]">
                    {language === 'fil' ? 'Kahandaan para sa Kasalukuyang Pattern:' : 'Current Project Floss Readiness:'}
                  </h4>
                  <div className="text-[11px] text-[#7A6E65]">
                    {pattern?.title} ({patternReadiness.totalColorsInPattern} active DMC colors)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-black text-emerald-700">
                  {patternReadiness.percentage}%
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {patternReadiness.ownedInPatternCount} of {patternReadiness.totalColorsInPattern} ready
                </span>
              </div>
            </div>

            {/* Percentage Bar */}
            <div className="w-full bg-[#EAE2D5] h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-600 h-full transition-all duration-500 rounded-l-full"
                style={{ width: `${patternReadiness.percentage}%` }}
              />
              <div
                className="bg-amber-400 h-full transition-all duration-500 rounded-r-full"
                style={{ width: `${100 - patternReadiness.percentage}%` }}
              />
            </div>

            {/* Ready vs Missing summary tags */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 pt-1 border-t border-[#F0ECE1]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                <span className="font-semibold text-[#2C2523]">
                  {patternReadiness.ownedInPatternCount} {language === 'fil' ? 'Nasa Stash na (Handa na)' : 'Available in Stash (Ready)'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="font-semibold text-amber-900">
                  {patternReadiness.missingInPatternCount} {language === 'fil' ? 'Kailangang Bilhin' : 'Missing from Stash'} (~{patternReadiness.missingSkeinsCount} skeins)
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="md:col-span-9 bg-[#FAF7F2] border border-[#E0D7C9] rounded-xl p-5 flex items-center justify-center text-xs text-[#7A6E65]">
            {language === 'fil'
              ? 'Bumuo muna ng pattern sa itaas upang makita ang porsyento ng kahandaan ng iyong sinulid.'
              : 'Generate an embroidery design above to inspect how many required DMC colors are already in your stash.'}
          </div>
        )}
      </div>

      {/* Thread Shortage & Skein Comparison Visualization Bar Chart */}
      {pattern && (
        <div id="thread-shortage-chart-section">
          <ThreadShortageChart
            pattern={pattern}
            stash={stash}
            onAddCode={onAddCode}
            onUpdateSkeins={onUpdateSkeins}
            onBulkAdd={onBulkAdd}
            language={language}
          />
        </div>
      )}

      {/* Bulk Add Modal / Section */}
      {showBulkModal && (
        <div className="bg-[#FAF7F2] border border-[#D7CBB9] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-serif font-bold text-sm text-[#2C2523] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#B88E3C]" />
              <span>{language === 'fil' ? 'Mabilisang Pag-paste ng Maramihang DMC Codes' : 'Quick Bulk Import DMC Codes'}</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowBulkModal(false)}
              className="text-xs text-[#7A6E65] hover:text-[#2C2523] font-semibold cursor-pointer"
            >
              ✕ {language === 'fil' ? 'Isara' : 'Close'}
            </button>
          </div>

          <p className="text-xs text-[#5F554F]">
            {language === 'fil'
              ? 'Ilagay o i-paste ang mga numero ng DMC na pinaghihiwalay ng kuwit, space, o bagong linya (halimbawa: 310, Blanc, 816, 677, 939, 3865):'
              : 'Type or paste a list of DMC floss numbers separated by commas, spaces, or lines (e.g. 310, Blanc, 816, 677, 939, 3865):'}
          </p>

          <form onSubmit={handleBulkSubmit} className="space-y-3">
            <textarea
              rows={3}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="310, Blanc, B5200, 816, 677, 754, 939, 3865, 3346..."
              className="w-full p-3 font-mono text-xs bg-white border border-[#D7CBB9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B88E3C]"
            />

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-[#8C8077]">
                {bulkMessage && <span className="font-semibold text-emerald-700">{bulkMessage}</span>}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-3 py-1.5 text-xs text-[#5F554F] hover:bg-white rounded-lg border border-transparent transition-colors cursor-pointer"
                >
                  {language === 'fil' ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2C2523] hover:bg-[#433936] rounded-lg shadow-2xs transition-all cursor-pointer"
                >
                  {language === 'fil' ? 'I-import sa Stash' : 'Import to Stash'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main Interactive Controls: Quick Add Search Bar & Color Family Browser */}
      <div className="space-y-4">
        {/* Search & Add Input */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8C8077] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'fil'
                    ? 'Maghanap ng DMC code o kulay (halimbawa: 310, 816, Blanc, Garnet)...'
                    : 'Search DMC code or name to quickly add to your stash (e.g. 310, 816, Blanc, Garnet)...'
                }
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#FAF7F2] border border-[#D7CBB9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B88E3C] focus:bg-white text-[#2C2523]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8C8077] hover:text-[#2C2523] cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#D7CBB9] rounded-xl shadow-lg p-2 max-h-72 overflow-y-auto space-y-1">
              {searchResults.map((color) => {
                const isOwned = !!stash[color.code];
                return (
                  <div
                    key={color.code}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-[#FAF7F2] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-md border border-black/20 shadow-2xs shrink-0"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="text-xs">
                        <span className="font-mono font-bold text-[#2C2523]">DMC {color.code}</span>
                        <span className="text-[#5F554F] ml-2">{color.name}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (isOwned) {
                          onRemoveCode(color.code);
                        } else {
                          onAddCode(color.code, 1);
                        }
                      }}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                        isOwned
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                          : 'bg-[#2C2523] text-white hover:bg-[#433936]'
                      }`}
                    >
                      {isOwned ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>{language === 'fil' ? 'Nasa Stash (Alisin)' : 'In Stash (Remove)'}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>{language === 'fil' ? 'Idagdag' : 'Add to Stash'}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Color Families Catalog Accordion */}
        <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-serif font-bold text-xs text-[#2C2523] uppercase tracking-wider flex items-center gap-1.5">
              <span>🎨</span>
              <span>{language === 'fil' ? 'I-browse ang DMC Palette ayon sa Pamilya ng Kulay:' : 'Browse DMC Palette by Color Family:'}</span>
            </h4>
            <span className="text-[11px] text-[#7A6E65]">
              {language === 'fil' ? 'I-click upang magdagdag o magbawas' : 'Click any chip to toggle in stash'}
            </span>
          </div>

          <div className="space-y-2">
            {COLOR_GROUPS.map((group, gIdx) => {
              const isOpen = activeCatalogTab === gIdx;
              const groupColors = group.codes.map((c) => colorMap.get(c)).filter(Boolean) as DMCColor[];
              const ownedCount = group.codes.filter((c) => !!stash[c]).length;

              return (
                <div key={group.name} className="bg-white border border-[#E0D7C9] rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setActiveCatalogTab(isOpen ? null : gIdx)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex -space-x-1 overflow-hidden">
                        {groupColors.slice(0, 4).map((c) => (
                          <div
                            key={c.code}
                            className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-white"
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                      <span className="font-serif text-xs font-bold text-[#2C2523]">
                        {language === 'fil' ? group.tagalogName : group.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#7A6E65]">
                        {ownedCount} / {group.codes.length} {language === 'fil' ? 'mayroon' : 'owned'}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#7A6E65]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#7A6E65]" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-3 bg-[#FAF7F2]/50 border-t border-[#E8E1D5] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {groupColors.map((color) => {
                        const isOwned = !!stash[color.code];
                        const skeinQty = stash[color.code]?.skeins || 1;
                        const inPattern = patternCodes.has(color.code);

                        return (
                          <div
                            key={color.code}
                            className={`p-2 rounded-lg border flex items-center justify-between text-xs transition-all ${
                              isOwned
                                ? 'bg-white border-emerald-300 ring-1 ring-emerald-300'
                                : 'bg-white border-[#E0D7C9] hover:border-[#B88E3C]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-4 h-4 rounded-xs border border-black/20 shrink-0"
                                style={{ backgroundColor: color.hex }}
                              />
                              <div className="truncate">
                                <div className="font-mono font-bold text-[#2C2523] truncate">
                                  {color.code}
                                </div>
                                <div className="text-[10px] text-[#7A6E65] truncate">
                                  {color.name}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (isOwned) {
                                  onRemoveCode(color.code);
                                } else {
                                  onAddCode(color.code, 1);
                                }
                              }}
                              className={`ml-1.5 p-1 rounded cursor-pointer transition-colors shrink-0 ${
                                isOwned
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-700'
                                  : 'bg-[#FAF7F2] text-[#5F554F] hover:bg-[#2C2523] hover:text-white border border-[#D7CBB9]'
                              }`}
                              title={isOwned ? 'Remove from Stash' : 'Add to Stash'}
                            >
                              {isOwned ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stash Inventory Grid with Skein Stepper and Pattern Indicators */}
      <div className="space-y-4 pt-2 border-t border-[#F0ECE1]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg font-bold text-[#2C2523]">
              {language === 'fil' ? 'Kasalukuyang Nakatagong Sinulid' : 'Your Stash Inventory'}
            </h3>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E8E1D5] text-[#7A6E65]">
              {filteredStashEntries.length} {language === 'fil' ? 'mga kulay' : 'colors listed'}
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setStashFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                stashFilter === 'all'
                  ? 'bg-[#2C2523] text-white shadow-xs'
                  : 'bg-[#FAF7F2] text-[#5F554F] hover:bg-[#F0ECE1]'
              }`}
            >
              {language === 'fil' ? 'Lahat' : 'All'} ({stashEntries.length})
            </button>

            {pattern && (
              <>
                <button
                  type="button"
                  onClick={() => setStashFilter('inPattern')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    stashFilter === 'inPattern'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{language === 'fil' ? 'Gamit sa Pattern' : 'Used in Pattern'}</span>
                  <span>({stashEntries.filter((e) => e.isInCurrentPattern).length})</span>
                </button>

                {missingFlossReport && missingFlossReport.allNeedingPurchase.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStashFilter('missingFromPattern')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                      stashFilter === 'missingFromPattern'
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>{language === 'fil' ? 'Kulang sa Pattern' : 'Missing from Pattern'}</span>
                    <span className="font-bold">({missingFlossReport.allNeedingPurchase.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setStashFilter('notInPattern')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    stashFilter === 'notInPattern'
                      ? 'bg-[#2C2523] text-white shadow-xs'
                      : 'bg-[#FAF7F2] text-[#5F554F] hover:bg-[#F0ECE1]'
                  }`}
                >
                  {language === 'fil' ? 'Iba pang Kulay' : 'Other Stash'} (
                  {stashEntries.filter((e) => !e.isInCurrentPattern).length})
                </button>
              </>
            )}

            {totalColorsCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(language === 'fil' ? 'Sigurado ka bang nais mong linisin ang buong stash?' : 'Are you sure you want to clear your thread stash?')) {
                    onClearStash();
                  }
                }}
                className="px-2.5 py-1 text-xs text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-auto"
                title="Clear stash"
              >
                <Trash2 className="w-3 h-3 inline mr-1" />
                <span>{language === 'fil' ? 'Linisin' : 'Clear All'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {filteredStashEntries.length === 0 ? (
          <div className="text-center py-12 px-4 bg-[#FAF7F2]/60 rounded-xl border border-dashed border-[#D7CBB9] space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#EAE2D5] text-[#2C2523] flex items-center justify-center mx-auto text-lg">
              {stashFilter === 'missingFromPattern' ? '🎉' : '🧵'}
            </div>
            <div className="space-y-1">
              <h4 className="font-serif font-bold text-sm text-[#2C2523]">
                {stashFilter === 'missingFromPattern'
                  ? (language === 'fil' ? 'Walang Kulang na Sinulid!' : 'No Missing Threads!')
                  : (language === 'fil' ? 'Walang Sinulid sa Kategoryang Ito' : 'No Floss Found in this View')}
              </h4>
              <p className="text-xs text-[#7A6E65] max-w-md mx-auto">
                {stashFilter === 'missingFromPattern'
                  ? (language === 'fil'
                      ? 'Nasa iyong stash na ang lahat ng kinakailangang kulay ng DMC para sa kasalukuyang pattern.'
                      : 'All required DMC thread colors for the active pattern are already in your stash inventory!')
                  : (language === 'fil'
                      ? 'Gamitin ang search bar sa itaas o i-click ang "Idagdag Lahat sa Pattern" upang simulan ang iyong imbentaryo.'
                      : 'Use the search box above or click "Bulk Paste Codes" / "Add Current Pattern" to populate your thread collection.')}
              </p>
            </div>
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredStashEntries.map((entry) => {
              const skeins = entry.skeins || 1;
              const isMissingCard = entry.isMissing;

              return (
                <div
                  key={entry.dmcCode}
                  className={`bg-white border rounded-xl p-3.5 space-y-2.5 transition-all shadow-2xs hover:shadow-xs ${
                    isMissingCard
                      ? 'border-amber-300 ring-1 ring-amber-200 bg-[#FFFDF9]'
                      : entry.isInCurrentPattern
                      ? 'border-emerald-300 ring-1 ring-emerald-200'
                      : 'border-[#E8E1D5]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg border border-black/20 shadow-2xs shrink-0"
                        style={{ backgroundColor: entry.color.hex }}
                      />
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-sm text-[#2C2523] leading-none">
                          DMC {entry.dmcCode}
                        </div>
                        <div className="text-[11px] text-[#7A6E65] truncate mt-0.5" title={entry.color.name}>
                          {entry.color.name}
                        </div>
                      </div>
                    </div>

                    {!isMissingCard ? (
                      <button
                        type="button"
                        onClick={() => onRemoveCode(entry.dmcCode)}
                        className="text-[#A89C92] hover:text-rose-600 transition-colors p-1 rounded cursor-pointer"
                        title={language === 'fil' ? 'Alisin sa Stash' : 'Remove from Stash'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddCode(entry.dmcCode, entry.deficit)}
                        className="px-2 py-1 rounded-lg bg-[#2C2523] hover:bg-black text-[#E6C687] text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Mark as purchased & add to stash"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{language === 'fil' ? 'Idagdag' : 'Add'}</span>
                      </button>
                    )}
                  </div>

                  {/* Quantity Stepper & Pattern Badge */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#F0ECE1] text-xs">
                    {isMissingCard ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {language === 'fil' ? `Kailangan: ${entry.deficit} sk` : `Need ${entry.deficit} skein(s)`}
                        </span>
                        <span className="text-[10px] text-[#8C7A6B]">
                          {entry.stitchesCount} sts {entry.usageType === 'backstitch' ? '• outline' : ''}
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Skein stepper */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-[#7A6E65]">Skeins:</span>
                          <div className="flex items-center bg-[#FAF7F2] border border-[#D7CBB9] rounded-md">
                            <button
                              type="button"
                              onClick={() => onUpdateSkeins(entry.dmcCode, -1)}
                              className="w-5 h-5 flex items-center justify-center text-[#5F554F] hover:text-[#2C2523] hover:bg-white rounded-l cursor-pointer text-xs font-bold"
                              title="Decrease skein count"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-mono font-bold text-[#2C2523] text-xs">
                              {skeins}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateSkeins(entry.dmcCode, 1)}
                              className="w-5 h-5 flex items-center justify-center text-[#5F554F] hover:text-[#2C2523] hover:bg-white rounded-r cursor-pointer text-xs font-bold"
                              title="Increase skein count"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Pattern indicator badge */}
                        {entry.isInCurrentPattern ? (
                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                            {language === 'fil' ? '✓ Gamit sa Pattern' : '✓ In Pattern'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#8C8077]">
                            {language === 'fil' ? 'Reserba' : 'In Reserve'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
