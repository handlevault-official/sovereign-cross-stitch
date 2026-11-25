import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  Search,
  Filter,
  ArrowUpDown,
  ShoppingBag,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PatternData, ThreadStashEntry, DMCColor } from '../types';

interface ThreadShortageChartProps {
  pattern: PatternData;
  stash: Record<string, ThreadStashEntry>;
  onAddCode: (code: string, skeins?: number) => void;
  onUpdateSkeins: (code: string, delta: number) => void;
  onBulkAdd?: (codes: string[]) => void;
  language: 'en' | 'fil';
  pricePerSkein?: number;
}

export const ThreadShortageChart: React.FC<ThreadShortageChartProps> = ({
  pattern,
  stash,
  onAddCode,
  onUpdateSkeins,
  onBulkAdd,
  language,
  pricePerSkein = 40,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'shortages' | 'sufficient'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'deficit' | 'required' | 'code' | 'stitches'>('deficit');
  const [copiedList, setCopiedList] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Compute detailed comparison for every color in the pattern
  const comparisonData = useMemo(() => {
    return pattern.colorStats.map((stat) => {
      const code = stat.color.code;
      const stashEntry = stash[code];
      const inStash = stashEntry ? Math.max(0, stashEntry.skeins) : 0;
      const required = Math.max(1, stat.skeinsNeeded);
      const deficit = Math.max(0, required - inStash);
      const surplus = Math.max(0, inStash - required);
      const isShortage = inStash < required;
      const isCompletelyMissing = inStash === 0;

      return {
        color: stat.color,
        code,
        name: stat.color.name,
        hex: stat.color.hex,
        symbol: stat.color.symbol,
        symbolDark: stat.color.symbolDark,
        stitches: stat.count,
        percentage: stat.percentage,
        required,
        inStash,
        deficit,
        surplus,
        isShortage,
        isCompletelyMissing,
      };
    });
  }, [pattern.colorStats, stash]);

  // Aggregate stats
  const totalColors = comparisonData.length;
  const shortageColors = comparisonData.filter((d) => d.isShortage);
  const shortageCount = shortageColors.length;
  const fullyStockedCount = totalColors - shortageCount;
  const totalShortageSkeins = shortageColors.reduce((sum, d) => sum + d.deficit, 0);
  const totalRequiredSkeins = comparisonData.reduce((sum, d) => sum + d.required, 0);
  const totalStashSkeinsForPattern = comparisonData.reduce((sum, d) => sum + d.inStash, 0);
  const estimatedCost = totalShortageSkeins * pricePerSkein;

  // Max skeins for chart scaling (at least 4 for visual balance)
  const maxSkeinVal = useMemo(() => {
    let max = 4;
    comparisonData.forEach((d) => {
      if (d.required > max) max = d.required;
      if (d.inStash > max) max = d.inStash;
    });
    return max;
  }, [comparisonData]);

  // Filter and sort items
  const displayedItems = useMemo(() => {
    let list = comparisonData.filter((item) => {
      // Filter tab
      if (filterMode === 'shortages' && !item.isShortage) return false;
      if (filterMode === 'sufficient' && item.isShortage) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesName = item.name.toLowerCase().includes(q);
        if (!matchesCode && !matchesName) return false;
      }

      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'deficit':
          if (b.deficit !== a.deficit) return b.deficit - a.deficit;
          return b.required - a.required;
        case 'required':
          return b.required - a.required;
        case 'code':
          return a.code.localeCompare(b.code, undefined, { numeric: true });
        case 'stitches':
          return b.stitches - a.stitches;
        default:
          return 0;
      }
    });

    return list;
  }, [comparisonData, filterMode, searchQuery, sortBy]);

  // Handle adding all missing skeins
  const handleAddAllShortagesToStash = () => {
    shortageColors.forEach((item) => {
      onAddCode(item.code, item.deficit);
    });
  };

  // Copy shopping list of shortages
  const handleCopyShoppingList = () => {
    if (shortageColors.length === 0) return;
    const text = shortageColors
      .map(
        (c) =>
          `DMC ${c.code} - ${c.name}: Need ${c.deficit} skein(s) (Have ${c.inStash}/${c.required})`
      )
      .join('\n');

    navigator.clipboard.writeText(
      `🧵 DMC Floss Shopping List for "${pattern.title}"\nTotal Shortage: ${totalShortageSkeins} skeins (~₱${estimatedCost.toLocaleString()})\n\n${text}`
    );
    setCopiedList(true);
    setTimeout(() => setCopiedList(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E1D5] shadow-xs p-5 sm:p-7 space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#F0ECE1] pb-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#B88E3C] uppercase tracking-wider">
            <Package className="w-4 h-4" />
            <span>
              {language === 'fil'
                ? 'Paghahambing ng Sinulid at Imbentaryo'
                : 'Floss Requirements vs. Inventory'}
            </span>
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#2C2523]">
            {language === 'fil'
              ? 'Bar Chart ng Pangangailangan at Kakulangan sa DMC'
              : 'Thread Shortage & Skein Comparison Chart'}
          </h3>
          <p className="text-xs sm:text-sm text-[#5F554F] leading-relaxed">
            {language === 'fil'
              ? 'Ipinapakita ang eksaktong dami ng skeins na kailangan sa pattern laban sa mayroon ka na sa iyong My Thread Stash upang maiwasan ang maubusan habang nananahi.'
              : 'Direct comparative bar chart showing required skeins per DMC color versus your actual stash inventory to catch and resolve shortages early.'}
          </p>
        </div>

        {/* Action button & collapse */}
        <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
          {shortageCount > 0 && (
            <button
              type="button"
              onClick={handleCopyShoppingList}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#D5C9B8] text-[#2C2523] transition-colors shadow-2xs cursor-pointer"
            >
              {copiedList ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{language === 'fil' ? 'Nakopya!' : 'List Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#B88E3C]" />
                  <span>{language === 'fil' ? 'Kopyahin ang Listahan' : 'Copy Shopping List'}</span>
                </>
              )}
            </button>
          )}

          {shortageCount > 0 && (
            <button
              type="button"
              onClick={handleAddAllShortagesToStash}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#2C2523] hover:bg-[#433936] text-white transition-colors shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E6C687]" />
              <span>
                {language === 'fil'
                  ? `Punan Lahat (+${totalShortageSkeins} Skeins)`
                  : `Stock All Shortages (+${totalShortageSkeins})`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 text-[#7A6E65] hover:text-[#2C2523] rounded-lg border border-[#E8E1D5] bg-[#FAF7F2] transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Total Colors */}
            <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-[#7A6E65] uppercase tracking-wider block">
                {language === 'fil' ? 'Kabuuang Kulay' : 'Pattern Colors'}
              </span>
              <div className="font-mono text-xl sm:text-2xl font-bold text-[#2C2523]">
                {totalColors}
              </div>
              <span className="text-[11px] text-[#7A6E65]">
                {totalRequiredSkeins} {language === 'fil' ? 'skeins kailangan' : 'total skeins needed'}
              </span>
            </div>

            {/* Fully Stocked */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>{language === 'fil' ? 'May Sapat na Stock' : 'Fully Stocked'}</span>
              </span>
              <div className="font-mono text-xl sm:text-2xl font-bold text-emerald-950">
                {fullyStockedCount} <span className="text-xs font-normal text-emerald-700">/ {totalColors}</span>
              </div>
              <span className="text-[11px] text-emerald-700">
                {Math.round((fullyStockedCount / Math.max(1, totalColors)) * 100)}% {language === 'fil' ? 'kumpleto sa stash' : 'ready to stitch'}
              </span>
            </div>

            {/* Shortages Alert */}
            <div
              className={`rounded-xl p-3.5 space-y-1 border transition-colors ${
                shortageCount > 0
                  ? 'bg-rose-50/80 border-rose-200'
                  : 'bg-emerald-50/50 border-emerald-200'
              }`}
            >
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider block flex items-center gap-1 ${
                  shortageCount > 0 ? 'text-rose-800' : 'text-emerald-800'
                }`}
              >
                {shortageCount > 0 ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>{language === 'fil' ? 'May Kakulangan' : 'Shortage Colors'}</span>
              </span>
              <div
                className={`font-mono text-xl sm:text-2xl font-bold ${
                  shortageCount > 0 ? 'text-rose-950' : 'text-emerald-900'
                }`}
              >
                {shortageCount} {language === 'fil' ? 'kulay' : 'colors'}
              </div>
              <span
                className={`text-[11px] ${
                  shortageCount > 0 ? 'text-rose-700 font-medium' : 'text-emerald-700'
                }`}
              >
                {shortageCount > 0
                  ? `${totalShortageSkeins} skeins ${language === 'fil' ? 'ang kulang' : 'needed'}`
                  : language === 'fil'
                  ? 'Walang kulang na sinulid!'
                  : 'Zero shortages!'}
              </span>
            </div>

            {/* Estimated Purchase Cost */}
            <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-[#7A6E65] uppercase tracking-wider block flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-[#B88E3C]" />
                <span>{language === 'fil' ? 'Kailangang Bilhin' : 'Shortage Cost'}</span>
              </span>
              <div className="font-mono text-xl sm:text-2xl font-bold text-[#2C2523]">
                ₱{estimatedCost.toLocaleString()}
              </div>
              <span className="text-[11px] text-[#7A6E65]">
                {totalShortageSkeins} skeins × ₱{pricePerSkein}
              </span>
            </div>
          </div>

          {/* Controls: Filter Tabs, Search, and Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#E8E1D5] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filterMode === 'all'
                    ? 'bg-white text-[#2C2523] shadow-xs font-semibold'
                    : 'text-[#7A6E65] hover:text-[#2C2523]'
                }`}
              >
                {language === 'fil' ? 'Lahat ng Kulay' : 'All Colors'} ({totalColors})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('shortages')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                  filterMode === 'shortages'
                    ? 'bg-white text-rose-800 shadow-xs font-semibold'
                    : 'text-rose-700 hover:text-rose-900'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                <span>{language === 'fil' ? 'Kulang Lamang' : 'Shortages Only'}</span>
                {shortageCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-rose-100 text-rose-800">
                    {shortageCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('sufficient')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                  filterMode === 'sufficient'
                    ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{language === 'fil' ? 'May Sapat' : 'Sufficient'}</span>
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-emerald-100 text-emerald-800">
                  {fullyStockedCount}
                </span>
              </button>
            </div>

            {/* Search and Sort */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-[#8C8077] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={language === 'fil' ? 'Hanapin ang DMC...' : 'Filter DMC code...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#D5C9B8] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#B88E3C] focus:bg-white transition-all text-[#2C2523]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#7A6E65] shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#B88E3C]" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2 py-1.5 text-xs bg-[#FAF7F2] border border-[#D5C9B8] rounded-lg font-medium text-[#2C2523] focus:outline-hidden"
                >
                  <option value="deficit">{language === 'fil' ? 'Pinakamalaking Kulang' : 'Highest Deficit'}</option>
                  <option value="required">{language === 'fil' ? 'Kailangang Skeins' : 'Most Skeins Needed'}</option>
                  <option value="code">{language === 'fil' ? 'DMC Code (0-9)' : 'DMC Code (0-9)'}</option>
                  <option value="stitches">{language === 'fil' ? 'Dami ng Tahi' : 'Stitch Count'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Chart Legend & Scale Reference */}
          <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E8E1D5] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-sm bg-[#38302C]" />
                <span className="text-[#5F554F] font-medium">
                  {language === 'fil' ? 'Kailangang Skeins (Pattern)' : 'Required Skeins (Pattern)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-sm bg-emerald-600" />
                <span className="text-[#5F554F] font-medium">
                  {language === 'fil' ? 'Nasa Stash (Sapat)' : 'In Stash (Sufficient)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-sm bg-rose-500 border border-rose-300" />
                <span className="text-[#5F554F] font-medium">
                  {language === 'fil' ? 'Kakulangan (Kailangang bilhin)' : 'Shortage / Missing Deficit'}
                </span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[#7A6E65]">
              Max Scale: {maxSkeinVal} skeins
            </div>
          </div>

          {/* Comparative Bar Chart Rows */}
          <div className="space-y-3 pt-1">
            {displayedItems.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF7F2] rounded-xl border border-[#E8E1D5] space-y-2">
                <div className="text-2xl">✨</div>
                <h5 className="font-serif font-bold text-[#2C2523] text-sm">
                  {language === 'fil'
                    ? 'Walang tumutugmang kulay sa filter na ito'
                    : 'No colors matching the current filter'}
                </h5>
                <p className="text-xs text-[#7A6E65]">
                  {filterMode === 'shortages'
                    ? (language === 'fil' ? 'Mabuting balita! Walang anumang kulang sa iyong pattern.' : 'Great news! All thread requirements are satisfied in your stash.')
                    : (language === 'fil' ? 'Subukang alisin ang search query.' : 'Try adjusting your search query.')}
                </p>
              </div>
            ) : (
              displayedItems.map((item) => {
                // Calculate percentage widths for dual bars relative to maxSkeinVal
                const requiredWidthPercent = Math.min(100, (item.required / maxSkeinVal) * 100);
                const stashWidthPercent = Math.min(100, (item.inStash / maxSkeinVal) * 100);

                return (
                  <div
                    key={item.code}
                    className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                      item.isShortage
                        ? 'bg-white border-rose-200/90 hover:border-rose-300 shadow-2xs'
                        : 'bg-white border-[#E8E1D5] hover:border-[#D5C9B8]'
                    }`}
                  >
                    {/* Top Row: DMC Info, Stitch Stats, Status Badge, and Quick Stepper */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Swatch with symbol */}
                        <div
                          className="w-8 h-8 rounded-lg border border-[#D5C9B8] shadow-2xs flex items-center justify-center font-bold text-xs shrink-0"
                          style={{
                            backgroundColor: item.hex,
                            color: item.symbolDark ? '#111827' : '#FFFFFF',
                          }}
                        >
                          {item.symbol}
                        </div>

                        {/* Title and details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#2C2523]">
                              DMC {item.code}
                            </span>
                            <span className="text-xs text-[#5F554F] truncate font-medium">
                              {item.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#7A6E65] font-mono flex items-center gap-2">
                            <span>{item.stitches.toLocaleString()} stitches</span>
                            <span>·</span>
                            <span>{item.percentage}% of pattern</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Status Indicator & Stepper */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        {/* Status Chip */}
                        {item.isShortage ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>
                              {item.isCompletelyMissing
                                ? (language === 'fil' ? `Wala sa Stash (-${item.required})` : `Missing (${item.required} needed)`)
                                : (language === 'fil' ? `Kulang ng ${item.deficit}` : `Short by ${item.deficit} skein${item.deficit > 1 ? 's' : ''}`)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              {item.surplus > 0
                                ? (language === 'fil' ? `Sapat (+${item.surplus} sobra)` : `Stocked (+${item.surplus} surplus)`)
                                : (language === 'fil' ? 'Sapat sa Stash' : 'Fully Stocked')}
                            </span>
                          </div>
                        )}

                        {/* Quick Stepper on Stash */}
                        <div className="flex items-center bg-[#FAF7F2] border border-[#D7CBB9] rounded-lg">
                          <button
                            type="button"
                            onClick={() => onUpdateSkeins(item.code, -1)}
                            disabled={item.inStash <= 0}
                            className="w-6 h-6 flex items-center justify-center text-[#5F554F] hover:text-[#2C2523] disabled:opacity-30 disabled:hover:text-[#5F554F] cursor-pointer font-bold text-xs"
                            title="Decrease stash skeins"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-mono font-bold text-[#2C2523] text-xs">
                            {item.inStash}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateSkeins(item.code, 1)}
                            className="w-6 h-6 flex items-center justify-center text-[#5F554F] hover:text-[#2C2523] cursor-pointer font-bold text-xs"
                            title="Add 1 skein to stash"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Comparative Dual Bars */}
                    <div className="space-y-1.5 pt-1">
                      {/* Bar 1: Required Skeins */}
                      <div className="flex items-center gap-3">
                        <span className="w-20 text-[10px] uppercase font-bold text-[#7A6E65] tracking-wider shrink-0">
                          {language === 'fil' ? 'Kailangan' : 'Required'}
                        </span>
                        <div className="flex-1 h-3.5 bg-[#FAF7F2] rounded-md p-0.5 border border-[#E8E1D5] flex items-center relative overflow-hidden">
                          <div
                            className="h-full bg-[#38302C] rounded-sm transition-all duration-300 flex items-center justify-end pr-1.5 shadow-2xs"
                            style={{ width: `${Math.max(6, requiredWidthPercent)}%` }}
                          >
                            {requiredWidthPercent > 18 && (
                              <span className="text-[9px] font-mono font-bold text-[#FAF7F2]">
                                {item.required}
                              </span>
                            )}
                          </div>
                          {requiredWidthPercent <= 18 && (
                            <span className="text-[10px] font-mono font-bold text-[#2C2523] ml-1.5">
                              {item.required}
                            </span>
                          )}
                        </div>
                        <span className="w-14 text-right font-mono text-xs font-bold text-[#2C2523] shrink-0">
                          {item.required} {item.required === 1 ? 'skein' : 'skeins'}
                        </span>
                      </div>

                      {/* Bar 2: Actual Stash Skeins with Shortage Deficit Segment */}
                      <div className="flex items-center gap-3">
                        <span className="w-20 text-[10px] uppercase font-bold text-[#7A6E65] tracking-wider shrink-0">
                          {language === 'fil' ? 'Nasa Stash' : 'In Stash'}
                        </span>
                        <div className="flex-1 h-3.5 bg-[#FAF7F2] rounded-md p-0.5 border border-[#E8E1D5] flex items-center relative overflow-hidden">
                          {/* Stash owned portion */}
                          {item.inStash > 0 && (
                            <div
                              className={`h-full rounded-sm transition-all duration-300 flex items-center justify-end pr-1.5 shadow-2xs ${
                                item.isShortage ? 'bg-amber-600' : 'bg-emerald-600'
                              }`}
                              style={{ width: `${Math.max(6, stashWidthPercent)}%` }}
                            >
                              {stashWidthPercent > 18 && (
                                <span className="text-[9px] font-mono font-bold text-white">
                                  {item.inStash}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Shortage deficit portion */}
                          {item.isShortage && (
                            <div
                              className="h-full bg-rose-500/85 border-l border-white rounded-r-sm transition-all duration-300 flex items-center justify-center shadow-2xs"
                              style={{
                                width: `${Math.max(
                                  6,
                                  ((item.deficit) / maxSkeinVal) * 100
                                )}%`,
                              }}
                              title={`Deficit: ${item.deficit} skeins`}
                            >
                              <span className="text-[9px] font-mono font-bold text-white px-1">
                                -{item.deficit}
                              </span>
                            </div>
                          )}

                          {item.inStash === 0 && !item.isShortage && (
                            <span className="text-[10px] text-[#A89C92] ml-1.5">0 skeins</span>
                          )}
                        </div>

                        <span
                          className={`w-14 text-right font-mono text-xs font-bold shrink-0 ${
                            item.isShortage ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {item.inStash} {item.inStash === 1 ? 'skein' : 'skeins'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};
