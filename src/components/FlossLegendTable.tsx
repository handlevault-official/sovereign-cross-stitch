import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  Download,
  Filter,
  Sparkles,
  FileCode2,
  AlertCircle,
  Package,
  Plus,
  Minus,
  ShoppingBag,
  ShoppingCart,
  ArrowUpDown,
  ArrowDown10,
  ArrowUp10,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  RotateCcw,
  AlertTriangle,
  Calculator,
  Search,
  CheckCircle2,
  CheckSquare,
  Square,
  Trash2,
  X,
  Crosshair,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { DMCColor, PatternData } from '../types';
import { ThreadColorSwapModal } from './ThreadColorSwapModal';

interface FlossLegendTableProps {
  pattern: PatternData;
  activeColorFilter: string | null;
  onSelectColor: (code: string | null) => void;
  language: 'en' | 'fil';
  onOpenExportModal?: () => void;
  stash?: Record<string, { skeins: number }>;
  onToggleStash?: (code: string) => void;
  onSwapThreadColor?: (sourceCode: string, targetColor: DMCColor) => void;
  swappedFromMap?: Record<string, string[]>;
  onResetColorSwaps?: () => void;
}

export type SmartSortOption =
  | 'frequency-desc' // Most used to least used
  | 'frequency-asc' // Least used to most used
  | 'dmc-asc' // DMC numeric sequence (1 -> 9999)
  | 'dmc-desc' // DMC numeric sequence (9999 -> 1)
  | 'projected-desc' // Most projected skeins first
  | 'shortage-desc' // Highest stash shortage first
  | 'default'; // Original palette order

export type TableViewMode = 'all' | 'missing' | 'stash';

// Helper to naturally sort DMC thread codes (handling numbers and special strings like Blanc, Ecru, B5200)
export function parseDmcCode(code: string): { isSpecial: boolean; num: number; raw: string } {
  const trimmed = code.trim();
  if (/^\d+$/.test(trimmed)) {
    return { isSpecial: false, num: parseInt(trimmed, 10), raw: trimmed };
  }
  const prefixMatch = trimmed.match(/^([A-Za-z]+)(\d+)$/);
  if (prefixMatch) {
    return { isSpecial: false, num: parseInt(prefixMatch[2], 10), raw: trimmed };
  }
  return { isSpecial: true, num: 0, raw: trimmed };
}

export function compareDmcNumbers(a: string, b: string): number {
  const pA = parseDmcCode(a);
  const pB = parseDmcCode(b);

  if (pA.isSpecial && !pB.isSpecial) return -1;
  if (!pA.isSpecial && pB.isSpecial) return 1;
  if (pA.isSpecial && pB.isSpecial) return a.localeCompare(b);

  return pA.num - pB.num;
}

// Calculate projected skeins based on pattern dimensions, fabric count, and stitch count with 15% safety buffer
export function calculateProjectedSkeins(stitchCount: number, fabricCount: number): number {
  const stitchesPerSkein =
    fabricCount === 18 ? 2200 : fabricCount === 16 ? 2000 : fabricCount === 22 ? 2600 : 1800;

  const rawSkeins = (stitchCount * 1.15) / stitchesPerSkein;
  return Math.max(1, Math.ceil(rawSkeins));
}

export const FlossLegendTable: React.FC<FlossLegendTableProps> = ({
  pattern,
  activeColorFilter,
  onSelectColor,
  language,
  onOpenExportModal,
  stash,
  onToggleStash,
  onSwapThreadColor,
  swappedFromMap,
  onResetColorSwaps,
}) => {
  // Persistent local stash storage if not externally controlled
  const [internalStash, setInternalStash] = useState<Record<string, { skeins: number }>>(() => {
    try {
      const saved = localStorage.getItem('sovereign_user_stash');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const activeStash = stash || internalStash;

  const [activeTab, setActiveTab] = useState<TableViewMode>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [copiedMissing, setCopiedMissing] = useState(false);
  const [smartSort, setSmartSort] = useState<SmartSortOption>('frequency-desc');
  const [swapModalSourceCode, setSwapModalSourceCode] = useState<string | null>(null);

  // Toggle stash ownership for a specific color
  const handleToggleStashItem = (code: string, projectedSkeins: number) => {
    const current = activeStash[code]?.skeins || 0;
    const nextSkeins = current >= projectedSkeins ? 0 : Math.max(1, projectedSkeins);

    const updated = {
      ...activeStash,
      [code]: { skeins: nextSkeins },
    };

    setInternalStash(updated);
    try {
      localStorage.setItem('sovereign_user_stash', JSON.stringify(updated));
    } catch {}

    if (onToggleStash) {
      onToggleStash(code);
    }
  };

  // Adjust skein count by +1 or -1
  const handleAdjustSkeins = (code: string, delta: number) => {
    const current = activeStash[code]?.skeins || 0;
    const nextSkeins = Math.max(0, current + delta);
    const updated = {
      ...activeStash,
      [code]: { skeins: nextSkeins },
    };
    setInternalStash(updated);
    try {
      localStorage.setItem('sovereign_user_stash', JSON.stringify(updated));
    } catch {}
  };

  // Mark all colors as owned
  const handleMarkAllInStash = () => {
    const updated = { ...activeStash };
    pattern.colorStats.forEach((s) => {
      const needed = calculateProjectedSkeins(s.count, pattern.fabricCount);
      updated[s.color.code] = { skeins: needed };
    });
    setInternalStash(updated);
    try {
      localStorage.setItem('sovereign_user_stash', JSON.stringify(updated));
    } catch {}
  };

  // Clear all colors from stash
  const handleClearStash = () => {
    const updated = { ...activeStash };
    pattern.colorStats.forEach((s) => {
      delete updated[s.color.code];
    });
    setInternalStash(updated);
    try {
      localStorage.setItem('sovereign_user_stash', JSON.stringify(updated));
    } catch {}
  };

  // Precompute projected skeins and shortages for each color
  const enrichedStats = useMemo(() => {
    return pattern.colorStats.map((s) => {
      const projectedSkeins = calculateProjectedSkeins(s.count, pattern.fabricCount);
      const ownedSkeins = activeStash?.[s.color.code]?.skeins || 0;
      const isShortage = ownedSkeins < projectedSkeins;
      const shortageSkeins = Math.max(0, projectedSkeins - ownedSkeins);
      const isCompletelyMissing = ownedSkeins === 0;

      return {
        ...s,
        projectedSkeins,
        ownedSkeins,
        isShortage,
        shortageSkeins,
        isCompletelyMissing,
      };
    });
  }, [pattern.colorStats, pattern.fabricCount, activeStash]);

  const totalProjectedSkeins = useMemo(
    () => enrichedStats.reduce((acc, c) => acc + c.projectedSkeins, 0),
    [enrichedStats]
  );

  // Missing & Shortage metrics
  const { ownedCount, missingCount, insufficientCount, totalShortageSkeins } = useMemo(() => {
    let owned = 0;
    let missing = 0;
    let insufficient = 0;
    let shortageSkeinsSum = 0;

    enrichedStats.forEach((s) => {
      if (s.ownedSkeins >= s.projectedSkeins) {
        owned++;
      } else {
        insufficient++;
        shortageSkeinsSum += s.shortageSkeins;
        if (s.ownedSkeins === 0) {
          missing++;
        }
      }
    });

    return {
      ownedCount: owned,
      missingCount: missing,
      insufficientCount: insufficient,
      totalShortageSkeins: shortageSkeinsSum,
    };
  }, [enrichedStats]);

  // Filtered and sorted stats
  const displayedStats = useMemo(() => {
    let filtered = enrichedStats;

    // Filter by tab
    if (activeTab === 'missing') {
      filtered = filtered.filter((s) => s.isShortage);
    } else if (activeTab === 'stash') {
      filtered = filtered.filter((s) => !s.isShortage);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.color.code.toLowerCase().includes(q) ||
          s.color.name.toLowerCase().includes(q) ||
          s.color.symbol.includes(q)
      );
    }

    switch (smartSort) {
      case 'frequency-desc':
        return [...filtered].sort(
          (a, b) => b.count - a.count || compareDmcNumbers(a.color.code, b.color.code)
        );
      case 'frequency-asc':
        return [...filtered].sort(
          (a, b) => a.count - b.count || compareDmcNumbers(a.color.code, b.color.code)
        );
      case 'dmc-asc':
        return [...filtered].sort((a, b) => compareDmcNumbers(a.color.code, b.color.code));
      case 'dmc-desc':
        return [...filtered].sort((a, b) => compareDmcNumbers(b.color.code, a.color.code));
      case 'projected-desc':
        return [...filtered].sort((a, b) => b.projectedSkeins - a.projectedSkeins);
      case 'shortage-desc':
        return [...filtered].sort((a, b) => b.shortageSkeins - a.shortageSkeins);
      case 'default':
      default:
        return filtered;
    }
  }, [enrichedStats, activeTab, searchQuery, smartSort]);

  // Best match for quick Enter-to-highlight in search bar (prefers exact DMC code match)
  const bestSearchMatch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || displayedStats.length === 0) return null;
    const exactCode = displayedStats.find((s) => s.color.code.toLowerCase() === q);
    if (exactCode) return exactCode;
    const exactName = displayedStats.find((s) => s.color.name.toLowerCase() === q);
    return exactName || displayedStats[0];
  }, [displayedStats, searchQuery]);

  const activeFilterStat = useMemo(() => {
    if (!activeColorFilter) return null;
    return enrichedStats.find((s) => s.color.code === activeColorFilter) || null;
  }, [enrichedStats, activeColorFilter]);

  const scrollToGridIfNeeded = (force = false) => {
    const el = document.getElementById('stitch-viewer-section');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const isOffscreen = rect.bottom < 100 || rect.top > window.innerHeight - 100;
    if (force || isOffscreen) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleHighlightFromSearch = (code: string, shouldScroll = true) => {
    onSelectColor(code);
    if (shouldScroll) {
      scrollToGridIfNeeded(false);
    }
  };

  const renderHighlightedText = (text: string, query: string) => {
    const q = query.trim();
    if (!q) return text;
    const lowerText = text.toLowerCase();
    const lowerQ = q.toLowerCase();
    const idx = lowerText.indexOf(lowerQ);
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (
      <>
        {before}
        <mark className="bg-amber-200/90 text-[#2C2523] rounded-xs px-0.5 font-bold">{match}</mark>
        {after}
      </>
    );
  };

  // Toggle DMC sort
  const handleToggleDmcSort = () => {
    setSmartSort((prev) => (prev === 'dmc-asc' ? 'dmc-desc' : 'dmc-asc'));
  };

  // Toggle Frequency sort
  const handleToggleFrequencySort = () => {
    setSmartSort((prev) => (prev === 'frequency-desc' ? 'frequency-asc' : 'frequency-desc'));
  };

  // Toggle Projected Skeins sort
  const handleToggleProjectedSort = () => {
    setSmartSort((prev) => (prev === 'projected-desc' ? 'shortage-desc' : 'projected-desc'));
  };

  // Copy Complete Shopping List
  const handleCopyShoppingList = () => {
    const listText = displayedStats
      .map(
        (s) =>
          `[${s.ownedSkeins >= s.projectedSkeins ? 'X' : ' '}] DMC ${s.color.code} - ${s.color.name}: ${s.projectedSkeins} skein(s) (${s.count.toLocaleString()} stitches)${
            s.isShortage ? ` [NEED ${s.shortageSkeins} MORE]` : ' [HAVE IN STASH]'
          }`
      )
      .join('\n');

    const header = `=== SOVEREIGN CROSS STITCH FLOSS REQUIREMENTS ===\nPattern: ${pattern.title}\nDimensions: ${pattern.width}x${pattern.height} stitches (${pattern.fabricCount}ct Aida)\nTotal Projected Skeins: ${totalProjectedSkeins}\nColors in Stash: ${ownedCount} / ${pattern.colorStats.length}\nMissing/Shortage Colors: ${insufficientCount}\n\n`;

    navigator.clipboard.writeText(header + listText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Copy Missing Threads Checklist
  const handleCopyMissingShoppingList = () => {
    const missingOnly = enrichedStats.filter((s) => s.isShortage);
    const shortageList = missingOnly
      .map(
        (s) =>
          `[ ] DMC ${s.color.code} - ${s.color.name}: buy ${s.shortageSkeins} skein(s) (Need ${s.projectedSkeins} total, currently have ${s.ownedSkeins})`
      )
      .join('\n');

    const header = `=== SOVEREIGN CROSS STITCH - MISSING THREADS SHOPPING CHECKLIST ===\nPattern: ${pattern.title}\nMissing Colors to Buy: ${missingOnly.length} of ${pattern.colorStats.length}\nTotal Skeins to Buy: ${totalShortageSkeins} skeins\nEstimated Floss Cost: ~₱${(totalShortageSkeins * 35).toLocaleString()} (~$${(totalShortageSkeins * 1.4).toFixed(2)})\n\n`;

    navigator.clipboard.writeText(header + shortageList);
    setCopiedMissing(true);
    setTimeout(() => setCopiedMissing(false), 2500);
  };

  // Download CSV
  const handleDownloadCsv = () => {
    const headers =
      'Symbol,DMC Code,Color Name,Stitches,Coverage,Projected Total Skeins,Owned in Stash,Shortage to Buy,Status\n';
    const rows = displayedStats
      .map((s) => {
        const status = s.isShortage ? `Missing (-${s.shortageSkeins})` : 'Owned in Stash';
        return `"${s.color.symbol}","${s.color.code}","${s.color.name}",${s.count},${s.percentage}%,${s.projectedSkeins},${s.ownedSkeins},${s.shortageSkeins},"${status}"`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pattern.title.replace(/\s+/g, '_')}_DMC_${activeTab === 'missing' ? 'Missing_Shopping_List' : 'Floss_Legend'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8E1D5] shadow-xs p-6 space-y-5">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0ECE1] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-2xl font-bold text-[#2C2523]">
              {language === 'fil' ? 'Talaan ng DMC Floss & Legend' : 'DMC Thread Legend & Floss Key'}
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#FAF7F2] border border-[#E8E1D5] rounded-md text-[#5F554F]">
              {pattern.palette.length} {language === 'fil' ? 'Kulay' : 'Colors'} · ~{totalProjectedSkeins} Projected Skeins
            </span>
          </div>
          <p className="text-xs text-[#7A6E65] mt-1">
            {language === 'fil'
              ? 'I-toggle ang "My Stash" upang i-marka ang mga sinulid na mayroon ka na, at gamitin ang "Missing Threads" view para sa pamimili.'
              : 'Toggle "My Stash" on any color to track threads you own, or open the "Missing Threads" shopping view to buy remaining floss.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2C2523] bg-[#FAF7F2] hover:bg-[#F3EFE7] border border-[#D7CBB9] rounded-lg transition-colors cursor-pointer"
              title={language === 'fil' ? 'I-export ang CSV o JSON' : 'Export CSV or JSON data'}
            >
              <FileCode2 className="w-3.5 h-3.5 text-[#B88E3C]" />
              <span>{language === 'fil' ? 'Export CSV / JSON' : 'Export CSV / JSON'}</span>
            </button>
          )}

          {/* Copy Missing Checklist Button */}
          {insufficientCount > 0 && (
            <button
              type="button"
              onClick={handleCopyMissingShoppingList}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-950 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title={language === 'fil' ? 'Kopyahin ang checklist ng mga kulang na sinulid' : 'Copy shopping checklist of missing threads'}
            >
              {copiedMissing ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">{language === 'fil' ? 'Na-kopya!' : 'List Copied!'}</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5 text-rose-600" />
                  <span>{language === 'fil' ? `Kopyahin ang Shopping List (${insufficientCount})` : `Shopping List (${insufficientCount})`}</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyShoppingList}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2C2523] bg-[#FAF7F2] hover:bg-[#F3EFE7] border border-[#D7CBB9] rounded-lg transition-colors cursor-pointer"
            title="Copy entire floss list"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'fil' ? 'Na-kopyang Lahat!' : 'All Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{language === 'fil' ? 'Kopyahin Lahat' : 'Copy List'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2C2523] bg-[#FAF7F2] hover:bg-[#F3EFE7] border border-[#D7CBB9] rounded-lg transition-colors cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* VIEW SELECTOR: All Threads | Missing Threads (Shopping View) | In My Stash */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E8DFC9]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Tab 1: All Threads */}
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#2C2523] text-white shadow-xs'
                : 'bg-white text-[#5F554F] border border-[#D7CBB9] hover:bg-[#F4EFE6]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>{language === 'fil' ? 'Lahat ng Sinulid' : 'All Threads'}</span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-[#EAE2D5] text-[#2C2523]'
              }`}
            >
              {pattern.colorStats.length}
            </span>
          </button>

          {/* Tab 2: Missing Threads (Shopping View) */}
          <button
            type="button"
            onClick={() => setActiveTab('missing')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'missing'
                ? 'bg-rose-800 text-white shadow-xs'
                : insufficientCount > 0
                ? 'bg-rose-50 text-rose-900 border border-rose-300 hover:bg-rose-100 font-bold'
                : 'bg-white text-[#5F554F] border border-[#D7CBB9] hover:bg-[#F4EFE6]'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{language === 'fil' ? 'Mga Kulang na Sinulid (Shopping)' : 'Missing Threads (Shopping)'}</span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'missing'
                  ? 'bg-white/25 text-white'
                  : insufficientCount > 0
                  ? 'bg-rose-200 text-rose-950'
                  : 'bg-[#EAE2D5] text-[#2C2523]'
              }`}
            >
              {insufficientCount}
            </span>
          </button>

          {/* Tab 3: In My Stash */}
          <button
            type="button"
            onClick={() => setActiveTab('stash')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'stash'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-[#5F554F] border border-[#D7CBB9] hover:bg-[#F4EFE6]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'fil' ? 'Nasa Aking Stash' : 'In My Stash'}</span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'stash' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-900'
              }`}
            >
              {ownedCount}
            </span>
          </button>
        </div>

        {/* Stash Batch Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleMarkAllInStash}
            className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            title={language === 'fil' ? 'Markahan ang lahat ng kulay bilang mayroon na sa stash' : 'Mark all pattern colors as owned in stash'}
          >
            ✓ {language === 'fil' ? 'Lahat Mayroon Na' : 'Mark All Owned'}
          </button>

          {ownedCount > 0 && (
            <button
              type="button"
              onClick={handleClearStash}
              className="text-[11px] text-[#7A6E65] hover:text-rose-700 bg-white hover:bg-rose-50 border border-[#D7CBB9] px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1"
              title={language === 'fil' ? 'I-clear ang minarkahang stash para sa pattern na ito' : 'Clear stash markings for this pattern'}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{language === 'fil' ? 'I-reset ang Stash' : 'Reset Stash'}</span>
            </button>
          )}

          {onResetColorSwaps && swappedFromMap && Object.keys(swappedFromMap).length > 0 && (
            <button
              type="button"
              onClick={onResetColorSwaps}
              className="text-[11px] font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1"
              title={
                language === 'fil'
                  ? 'Ibalik sa orihinal na mga kulay ng DMC'
                  : 'Restore original generated DMC thread colors'
              }
            >
              <RefreshCw className="w-3 h-3" />
              <span>{language === 'fil' ? 'Ibalik Orihinal na Kulay' : 'Reset Swaps'}</span>
            </button>
          )}
        </div>
      </div>

      {/* MISSING THREADS SHOPPING HERO BANNER (When on Missing View or Shortages exist) */}
      {activeTab === 'missing' && (
        <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border border-rose-200 rounded-xl p-4.5 space-y-3 animate-fade-in shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-base text-[#2C2523] flex items-center gap-2">
                  <span>{language === 'fil' ? '🛒 Listahan ng Pamimili para sa mga Kulang na Sinulid' : '🛒 Missing Threads Shopping Assistant'}</span>
                  <span className="font-mono text-xs font-bold bg-rose-200 text-rose-950 px-2 py-0.5 rounded-full">
                    {insufficientCount} {language === 'fil' ? 'kulay' : 'colors needed'}
                  </span>
                </h4>
                <p className="text-xs text-[#5F554F] mt-0.5">
                  {language === 'fil'
                    ? `Kailangan mo ng ${totalShortageSkeins} kabuuang skeins upang makumpleto ang proyektong ito. I-check off ang mga sinulid kapag nabili na!`
                    : `You need ${totalShortageSkeins} total skeins to complete this design. Check off items as you purchase them to update your stash!`}
                </p>
              </div>
            </div>

            {/* Quick Price Estimate & Copy */}
            <div className="flex items-center gap-3 self-start md:self-auto bg-white/80 backdrop-blur-xs p-2.5 rounded-lg border border-[#E8DFC9]">
              <div className="text-right">
                <div className="text-[10px] text-[#7A6E65] uppercase font-bold tracking-wider">
                  {language === 'fil' ? 'Tinatayang Halaga' : 'Estimated Cost'}
                </div>
                <div className="font-mono text-sm font-bold text-[#2C2523]">
                  ~₱{(totalShortageSkeins * 35).toLocaleString()}{' '}
                  <span className="text-xs font-normal text-[#7A6E65]">
                    (~${(totalShortageSkeins * 1.4).toFixed(2)})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Sort Tool Strip */}
      <div className="space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8C8077] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && bestSearchMatch) {
                    e.preventDefault();
                    handleHighlightFromSearch(bestSearchMatch.color.code, true);
                  } else if (e.key === 'Escape') {
                    setSearchQuery('');
                  }
                }}
                placeholder={
                  language === 'fil'
                    ? 'Hanapin ang DMC code o pangalan (hal. 310, Blanc, Rose)...'
                    : 'Find DMC code or name (e.g. 310, Blanc, Rose)...'
                }
                className="w-full pl-9 pr-20 py-2 text-xs bg-[#FAF7F2] border border-[#D7CBB9] rounded-lg text-[#2C2523] placeholder-[#8C8077] focus:outline-hidden focus:border-[#B88E3C] focus:bg-white transition-colors"
                aria-label={language === 'fil' ? 'Maghanap ng DMC thread' : 'Search DMC thread by code or name'}
              />
              {searchQuery ? (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EAE2D5] text-[#2C2523]">
                    {displayedStats.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 rounded text-[#8C8077] hover:text-[#2C2523] hover:bg-[#EFEAE1] cursor-pointer"
                    aria-label={language === 'fil' ? 'I-clear ang search' : 'Clear search'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : null}
            </div>

            {searchQuery.trim() && bestSearchMatch && (
              <button
                type="button"
                onClick={() => handleHighlightFromSearch(bestSearchMatch.color.code, true)}
                className="px-2.5 py-2 rounded-lg bg-[#2C2523] hover:bg-[#433936] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer transition-colors"
                title={
                  language === 'fil'
                    ? `I-highlight ang DMC ${bestSearchMatch.color.code} sa StitchViewer grid`
                    : `Highlight DMC ${bestSearchMatch.color.code} in StitchViewer grid`
                }
              >
                <Crosshair className="w-3.5 h-3.5 text-[#E6C687]" />
                <span className="hidden sm:inline">
                  {language === 'fil' ? 'I-highlight' : 'Highlight'} #{bestSearchMatch.color.code}
                </span>
              </button>
            )}
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-[#7A6E65] font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#B88E3C]" />
              <span>{language === 'fil' ? 'Ayos:' : 'Sort:'}</span>
            </span>

            <button
              type="button"
              onClick={() => setSmartSort('frequency-desc')}
              className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                smartSort === 'frequency-desc'
                  ? 'bg-[#2C2523] text-white font-bold'
                  : 'bg-[#FAF7F2] text-[#5F554F] border border-[#E8E1D5] hover:bg-[#F2ECE1]'
              }`}
            >
              {language === 'fil' ? 'Dalas (Stitches)' : 'Most Stitches'}
            </button>

            <button
              type="button"
              onClick={handleToggleDmcSort}
              className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                smartSort === 'dmc-asc' || smartSort === 'dmc-desc'
                  ? 'bg-[#2C2523] text-white font-bold'
                  : 'bg-[#FAF7F2] text-[#5F554F] border border-[#E8E1D5] hover:bg-[#F2ECE1]'
              }`}
            >
              <span>DMC #</span>
              {smartSort === 'dmc-asc' && '↑'}
              {smartSort === 'dmc-desc' && '↓'}
            </button>

            {insufficientCount > 0 && (
              <button
                type="button"
                onClick={() => setSmartSort('shortage-desc')}
                className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                  smartSort === 'shortage-desc'
                    ? 'bg-rose-800 text-white font-bold'
                    : 'bg-rose-50 text-rose-900 border border-rose-300 hover:bg-rose-100'
                }`}
              >
                {language === 'fil' ? 'Pinakamalaking Kulang' : 'Highest Shortage'}
              </button>
            )}
          </div>
        </div>

        {/* Instant Search Quick-Select Chips (click to highlight immediately in StitchViewer) */}
        {searchQuery.trim() && displayedStats.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap px-1">
            <span className="text-[11px] text-[#7A6E65] font-medium">
              {language === 'fil' ? 'Mabilisang piliin:' : 'Quick highlight:'}
            </span>
            {displayedStats.slice(0, 6).map((stat) => {
              const isSelected = activeColorFilter === stat.color.code;
              return (
                <button
                  key={stat.color.code}
                  type="button"
                  onClick={() =>
                    isSelected
                      ? onSelectColor(null)
                      : handleHighlightFromSearch(stat.color.code, false)
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#2C2523] text-white border-[#2C2523] shadow-xs ring-1 ring-[#B88E3C]'
                      : 'bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#2C2523] border-[#D7CBB9]'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                    style={{ backgroundColor: stat.color.hex }}
                  />
                  <span className="font-mono font-bold">DMC {stat.color.code}</span>
                  <span className={isSelected ? 'text-[#E6C687]' : 'text-[#7A6E65]'}>
                    {stat.color.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active Grid Highlight Banner */}
        {activeFilterStat && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#FFFBEB] border border-amber-300 text-xs shadow-2xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className="w-5 h-5 rounded border border-black/20 shadow-2xs shrink-0"
                style={{ backgroundColor: activeFilterStat.color.hex }}
              />
              <span className="inline-flex items-center justify-center w-5 h-5 bg-white border border-amber-300 rounded font-bold text-xs text-[#2C2523]">
                {activeFilterStat.color.symbol}
              </span>
              <span className="font-bold text-[#2C2523] font-mono">
                DMC {activeFilterStat.color.code}
              </span>
              <span className="text-[#5F554F] font-medium">{activeFilterStat.color.name}</span>
              <span className="text-[11px] font-mono text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                <Sparkles className="w-3 h-3 inline mr-1 text-amber-600" />
                {language === 'fil'
                  ? `Naka-highlight sa Grid (${activeFilterStat.count.toLocaleString()} tahi)`
                  : `Highlighted in Grid (${activeFilterStat.count.toLocaleString()} stitches)`}
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => scrollToGridIfNeeded(true)}
                className="px-2.5 py-1 rounded-md bg-white hover:bg-amber-100 text-[#2C2523] border border-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{language === 'fil' ? 'Tingnan sa Grid' : 'View in Grid'}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-700" />
              </button>
              <button
                type="button"
                onClick={() => onSelectColor(null)}
                className="px-2.5 py-1 rounded-md bg-amber-900 hover:bg-amber-950 text-white font-semibold cursor-pointer transition-colors"
              >
                {language === 'fil' ? 'Alisin ang Highlight' : 'Clear'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* NO RESULTS FOR SEARCH QUERY */}
      {searchQuery.trim() && displayedStats.length === 0 && (
        <div className="p-6 text-center bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl space-y-2.5">
          <div className="w-10 h-10 rounded-full bg-white border border-[#D7CBB9] text-[#8C8077] flex items-center justify-center mx-auto">
            <Search className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h4 className="font-serif font-bold text-sm text-[#2C2523]">
              {language === 'fil'
                ? `Walang nahanap na DMC thread para sa "${searchQuery.trim()}"`
                : `No DMC thread found matching "${searchQuery.trim()}"`}
            </h4>
            <p className="text-xs text-[#7A6E65]">
              {activeTab !== 'all'
                ? language === 'fil'
                  ? 'Subukang maghanap sa tab na "Lahat ng Sinulid" o i-clear ang iyong search.'
                  : 'Try searching across "All Threads" or clearing your search filter.'
                : language === 'fil'
                ? 'Maghanap gamit ang numero ng DMC (hal. 310) o pangalan ng kulay (hal. Garnet).'
                : 'Try searching by DMC code (e.g. 310, Ecru) or thread color name.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            {activeTab !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="px-3 py-1.5 bg-[#2C2523] text-white text-xs font-semibold rounded-lg hover:bg-[#433936] cursor-pointer"
              >
                {language === 'fil' ? 'Hanapin sa Lahat ng Sinulid' : 'Search All Threads'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-3 py-1.5 bg-white border border-[#D7CBB9] text-[#2C2523] text-xs font-semibold rounded-lg hover:bg-[#F2ECE1] cursor-pointer"
            >
              {language === 'fil' ? 'I-clear ang Search' : 'Clear Search'}
            </button>
          </div>
        </div>
      )}

      {/* EMPTY STATE FOR MISSING VIEW (When all threads are owned) */}
      {activeTab === 'missing' && !searchQuery.trim() && displayedStats.length === 0 && (
        <div className="p-8 text-center bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-xl shadow-2xs">
            🎉
          </div>
          <div className="space-y-1">
            <h4 className="font-serif font-bold text-base text-emerald-950">
              {language === 'fil' ? 'Kumpleto ang Iyong Sinulid!' : 'All Threads Available in Your Stash!'}
            </h4>
            <p className="text-xs text-emerald-800 max-w-md mx-auto">
              {language === 'fil'
                ? 'Nasa iyo na ang lahat ng kinakailangang DMC floss para sa pattern na ito. Handa ka nang magsimulang mag-stitch!'
                : 'You own all required DMC colors for this pattern. No additional shopping required—you are ready to start stitching!'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className="px-4 py-2 bg-[#2C2523] text-white text-xs font-semibold rounded-lg hover:bg-[#433936] transition-colors cursor-pointer"
          >
            {language === 'fil' ? 'Tingnan ang Buong Talaan' : 'View Full Floss Legend'}
          </button>
        </div>
      )}

      {/* Main Floss Table */}
      {displayedStats.length > 0 && (
        <div className="overflow-x-auto border border-[#E8E1D5] rounded-xl shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#E8E1D5] text-[#5F554F] font-semibold select-none">
                <th className="py-2.5 px-3 w-12 text-center">Sym</th>
                <th className="py-2.5 px-3 w-14 text-center">Color</th>

                {/* Clickable DMC # Header */}
                <th
                  onClick={handleToggleDmcSort}
                  className="py-2.5 px-3 w-28 cursor-pointer hover:bg-[#F2ECE0] transition-colors group"
                  title="Click to sort by DMC numeric sequence"
                >
                  <div className="flex items-center gap-1">
                    <span>DMC #</span>
                    {smartSort === 'dmc-asc' ? (
                      <ArrowDown10 className="w-3.5 h-3.5 text-amber-700 font-bold" />
                    ) : smartSort === 'dmc-desc' ? (
                      <ArrowUp10 className="w-3.5 h-3.5 text-amber-700 font-bold" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-50 group-hover:opacity-100" />
                    )}
                  </div>
                </th>

                <th className="py-2.5 px-3">Floss Description</th>

                {/* Stitches */}
                <th
                  onClick={handleToggleFrequencySort}
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-[#F2ECE0] transition-colors group"
                  title="Click to sort by stitch count"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Stitches</span>
                    {smartSort === 'frequency-desc' ? (
                      <ArrowDownNarrowWide className="w-3.5 h-3.5 text-amber-700 font-bold" />
                    ) : smartSort === 'frequency-asc' ? (
                      <ArrowUpNarrowWide className="w-3.5 h-3.5 text-amber-700 font-bold" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-50 group-hover:opacity-100" />
                    )}
                  </div>
                </th>

                <th className="py-2.5 px-3 text-right">Coverage</th>

                {/* Projected Total Skeins */}
                <th
                  onClick={handleToggleProjectedSort}
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-[#F2ECE0] transition-colors group bg-[#F5EFE6]"
                  title="Predicted skeins with 15% safety buffer"
                >
                  <div className="flex items-center justify-end gap-1">
                    <Calculator className="w-3.5 h-3.5 text-[#B88E3C]" />
                    <span className="font-bold text-[#2C2523]">Projected</span>
                  </div>
                </th>

                {/* MY STASH TOGGLE & STATUS COLUMN */}
                <th className="py-2.5 px-4 text-center w-52 bg-[#FAF4E8] border-x border-[#E8DFC9]">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-[#2C2523]">
                    <Package className="w-3.5 h-3.5 text-[#B88E3C]" />
                    <span>{language === 'fil' ? 'Aking Stash (My Stash)' : 'My Stash'}</span>
                  </div>
                </th>

                <th className="py-2.5 px-3 w-24 text-center">
                  {language === 'fil' ? 'Aksyon' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0ECE1]">
              {displayedStats.map((stat) => {
                const isFiltered = activeColorFilter === stat.color.code;
                const isOwned = stat.ownedSkeins >= stat.projectedSkeins;
                const isInsufficient = stat.isShortage;

                return (
                  <tr
                    key={stat.color.code}
                    onClick={() => onSelectColor(isFiltered ? null : stat.color.code)}
                    className={`cursor-pointer transition-colors ${
                      isFiltered
                        ? 'bg-[#F5EEDB] font-medium'
                        : isInsufficient && activeTab === 'missing'
                        ? 'bg-rose-50/50 hover:bg-rose-100/50 border-l-3 border-l-rose-500'
                        : isInsufficient
                        ? 'hover:bg-[#FAF7F2] bg-white'
                        : 'hover:bg-emerald-50/30 bg-white'
                    }`}
                  >
                    {/* Symbol */}
                    <td className="py-2 px-3 text-center">
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-white border border-[#D7CBB9] rounded font-bold text-sm text-[#2C2523]">
                        {stat.color.symbol}
                      </span>
                    </td>

                    {/* Swatch */}
                    <td className="py-2 px-3 text-center">
                      <div
                        className="w-5 h-4 mx-auto rounded-xs border border-black/20 shadow-2xs"
                        style={{ backgroundColor: stat.color.hex }}
                      />
                    </td>

                    {/* DMC Code */}
                    <td className="py-2 px-3 font-mono font-bold text-[#2C2523]">
                      <span>{renderHighlightedText(stat.color.code, searchQuery)}</span>
                    </td>

                    {/* Name */}
                    <td className="py-2 px-3 text-[#2C2523]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium">
                          {renderHighlightedText(stat.color.name, searchQuery)}
                        </span>
                        {swappedFromMap?.[stat.color.code] && swappedFromMap[stat.color.code].length > 0 && (
                          <span
                            className="text-[10px] font-semibold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded"
                            title={
                              language === 'fil'
                                ? `Pinalitan mula sa DMC ${swappedFromMap[stat.color.code].join(', ')}`
                                : `Swapped from DMC ${swappedFromMap[stat.color.code].join(', ')}`
                            }
                          >
                            {language === 'fil' ? 'Pinalitan' : 'Swapped'}
                          </span>
                        )}
                        {isInsufficient && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                            {stat.ownedSkeins === 0
                              ? language === 'fil' ? 'Wala' : 'Missing'
                              : `-${stat.shortageSkeins} sk`}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Stitches */}
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-[#2C2523]">
                      {stat.count.toLocaleString()}
                    </td>

                    {/* Percentage */}
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-[#7A6E65]">
                      {stat.percentage.toFixed(1)}%
                    </td>

                    {/* Projected Total Skeins */}
                    <td className="py-2 px-3 text-right font-mono tabular-nums bg-[#FBF9F5]">
                      <span className="inline-block px-2 py-0.5 rounded font-bold text-xs bg-[#FAF7F2] text-[#2C2523] border border-[#E8E1D5]">
                        {stat.projectedSkeins} {stat.projectedSkeins === 1 ? 'sk' : 'sks'}
                      </span>
                    </td>

                    {/* MY STASH TOGGLE COLUMN */}
                    <td
                      className="py-2 px-3 text-center bg-[#FAF7F2]/60 border-x border-[#E8DFC9]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Instant Stash Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleStashItem(stat.color.code, stat.projectedSkeins)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                            isOwned
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                              : 'bg-white hover:bg-rose-50 text-rose-800 border border-rose-300'
                          }`}
                          title={
                            isOwned
                              ? language === 'fil'
                                ? 'Nasa Stash mo na! I-click upang alisin sa Stash.'
                                : 'Owned in stash! Click to remove from stash.'
                              : language === 'fil'
                              ? 'Kulang! I-click upang markahan bilang mayroon na sa Stash.'
                              : 'Missing from stash! Click to mark as owned.'
                          }
                        >
                          {isOwned ? (
                            <>
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span>{language === 'fil' ? 'Nasa Stash' : 'In Stash'}</span>
                              <span className="font-mono text-[10px] bg-emerald-200/80 text-emerald-950 px-1 rounded font-bold">
                                {stat.ownedSkeins}
                              </span>
                            </>
                          ) : (
                            <>
                              <Square className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>
                                {stat.ownedSkeins === 0
                                  ? language === 'fil' ? 'Wala sa Stash' : 'Missing'
                                  : `${stat.ownedSkeins}/${stat.projectedSkeins}`}
                              </span>
                              <span className="text-[10px] text-rose-700 font-bold">
                                (-{stat.shortageSkeins})
                              </span>
                            </>
                          )}
                        </button>

                        {/* Quick +/- Skeins Adjuster */}
                        <div className="flex items-center border border-[#D7CBB9] rounded-md bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleAdjustSkeins(stat.color.code, -1)}
                            disabled={stat.ownedSkeins === 0}
                            className="px-1.5 py-0.5 text-[#7A6E65] hover:text-[#2C2523] hover:bg-[#FAF7F2] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            title="Decrease owned skeins"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="font-mono text-[10px] font-bold px-1 min-w-[18px] text-center text-[#2C2523]">
                            {stat.ownedSkeins}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdjustSkeins(stat.color.code, 1)}
                            className="px-1.5 py-0.5 text-[#7A6E65] hover:text-[#2C2523] hover:bg-[#FAF7F2] cursor-pointer"
                            title="Increase owned skeins"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Actions: Swap DMC Thread + Isolate in Viewer */}
                    <td
                      className="py-2 px-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {onSwapThreadColor && (
                          <button
                            type="button"
                            onClick={() => setSwapModalSourceCode(stat.color.code)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-[#2C2523] bg-[#FAF7F2] hover:bg-amber-50 border border-[#D7CBB9] hover:border-[#B88E3C] transition-colors cursor-pointer"
                            title={
                              language === 'fil'
                                ? `Palitan ang DMC ${stat.color.code} ng ibang kulay`
                                : `Swap DMC ${stat.color.code} with another thread color`
                            }
                          >
                            <RefreshCw className="w-3 h-3 text-[#B88E3C]" />
                            <span>{language === 'fil' ? 'Palit' : 'Swap'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectColor(isFiltered ? null : stat.color.code)}
                          className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                            isFiltered
                              ? 'text-[#B88E3C] bg-white ring-1 ring-[#B88E3C]'
                              : 'text-[#8C8077] hover:text-[#2C2523]'
                          }`}
                          title={isFiltered ? 'Clear isolate filter' : 'Isolate color on canvas'}
                        >
                          <Filter className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Footer Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-[#7A6E65] border-t border-[#F0ECE1]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>
              {ownedCount} / {pattern.colorStats.length}{' '}
              {language === 'fil' ? 'kulay nasa stash' : 'colors in stash'}
            </span>
          </div>
          {insufficientCount > 0 && (
            <div className="flex items-center gap-1.5 text-rose-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              <span>
                {insufficientCount} {language === 'fil' ? 'kailangang bilhin' : 'to purchase'}{' '}
                (~{totalShortageSkeins} skeins)
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeTab !== 'missing' && insufficientCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('missing')}
              className="text-rose-800 hover:text-rose-950 font-bold underline cursor-pointer"
            >
              {language === 'fil' ? 'Buksan ang Shopping List →' : 'Open Shopping List View →'}
            </button>
          )}
        </div>
      </div>

      {/* DMC Thread Color Swap Modal */}
      {onSwapThreadColor && (
        <ThreadColorSwapModal
          isOpen={swapModalSourceCode !== null}
          onClose={() => setSwapModalSourceCode(null)}
          pattern={pattern}
          sourceCode={swapModalSourceCode}
          onConfirmSwap={onSwapThreadColor}
          language={language}
        />
      )}
    </div>
  );
};
