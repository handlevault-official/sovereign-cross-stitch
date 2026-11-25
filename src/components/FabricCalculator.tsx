import React, { useState } from 'react';
import { Ruler, Scissors, Sparkles, Layers, ArrowRight, Check, HelpCircle, Frame, Coins, ShoppingBag, Tag, Calculator } from 'lucide-react';
import { DMCColor, PatternData } from '../types';
import { FabricPreviewCanvas } from './FabricPreviewCanvas';

interface FabricCalculatorProps {
  initialWidth?: number;
  initialHeight?: number;
  initialCount?: number;
  actualSkeins?: number;
  palette?: DMCColor[];
  pattern?: PatternData | null;
  onApplyToGenerator?: (width: number, height: number, count: number) => void;
  language: 'en' | 'fil';
}

const FABRIC_COUNTS = [
  { count: 11, label: '11 Count Aida', desc: 'Large stitches, beginner friendly', strands: '3 strands', needle: 'Size 24' },
  { count: 14, label: '14 Count Aida (Standard)', desc: 'Most popular for wedding heirlooms & portraits', strands: '2 strands', needle: 'Size 24' },
  { count: 16, label: '16 Count Aida', desc: 'Crisp, fine detailing without eye strain', strands: '2 strands', needle: 'Size 26' },
  { count: 18, label: '18 Count Aida (Fine)', desc: 'High definition, museum miniature scale', strands: '2 strands', needle: 'Size 26 / 28' },
  { count: 22, label: '22 Count Hardanger', desc: 'Very fine fabric for delicate embroidery', strands: '1-2 strands', needle: 'Size 28' },
  { count: 28, label: '28 Count Linen (over 2)', desc: 'Evenweave linen stitched over 2 threads (14ct equiv)', strands: '2 strands', needle: 'Size 26' },
];

const PRESETS = [
  { label: '300 × 450 (1-Year Masterpiece)', w: 300, h: 450 },
  { label: '200 × 300 (Large Tapestry)', w: 200, h: 300 },
  { label: '150 × 150 (Medium Project)', w: 150, h: 150 },
  { label: '100 × 100 (Keepsake Sampler)', w: 100, h: 100 },
];

export const FabricCalculator: React.FC<FabricCalculatorProps> = ({
  initialWidth = 150,
  initialHeight = 150,
  initialCount = 14,
  actualSkeins,
  palette,
  pattern,
  onApplyToGenerator,
  language,
}) => {
  const [widthStitches, setWidthStitches] = useState<number>(initialWidth);
  const [heightStitches, setHeightStitches] = useState<number>(initialHeight);
  const [selectedCount, setSelectedCount] = useState<number>(initialCount);
  const [marginInches, setMarginInches] = useState<number>(3); // 3 inches margin on all sides for framing
  const [appliedToast, setAppliedToast] = useState(false);

  // Market Price per DMC Skein & Budget Planning
  const [currency, setCurrency] = useState<'₱' | '$'>('₱');
  const [pricePerSkein, setPricePerSkein] = useState<number>(55); // Default ~₱55 PHP per skein
  const [includeFramingInBudget, setIncludeFramingInBudget] = useState<boolean>(true);

  // Stitched Design Dimensions
  // Effective count: if 28 count over 2 threads, effective count is 14
  const effectiveCount = selectedCount === 28 ? 14 : selectedCount;

  const widthInches = widthStitches / effectiveCount;
  const heightInches = heightStitches / effectiveCount;

  const widthCm = widthInches * 2.54;
  const heightCm = heightInches * 2.54;

  // Cut Fabric with Margins (adds margin on left+right and top+bottom)
  const cutWidthInches = widthInches + marginInches * 2;
  const cutHeightInches = heightInches + marginInches * 2;

  const cutWidthCm = cutWidthInches * 2.54;
  const cutHeightCm = cutHeightInches * 2.54;

  const totalStitches = widthStitches * heightStitches;
  const estimatedSkeins = Math.max(1, Math.ceil(totalStitches / 1800));
  // Effective skeins count: prioritize actual palette skeins if supplied
  const effectiveSkeins = actualSkeins !== undefined && actualSkeins > 0 ? actualSkeins : estimatedSkeins;

  // Cost calculations
  const totalFlossCost = effectiveSkeins * pricePerSkein;

  // Estimated Aida cloth cost based on total cut area (sq inches)
  const cutAreaSqInches = cutWidthInches * cutHeightInches;
  const estimatedFabricCost = currency === '₱'
    ? Math.round(Math.max(120, cutAreaSqInches * 0.55))
    : Math.round(Math.max(4, cutAreaSqInches * 0.012) * 10) / 10;

  // Estimated Framing / Mounting cost based on recommended frame size
  let estimatedFramingCost = 0;
  if (currency === '₱') {
    if (widthInches > 22 || heightInches > 22) estimatedFramingCost = 950;
    else if (widthInches > 16 || heightInches > 16) estimatedFramingCost = 650;
    else if (widthInches > 11 || heightInches > 11) estimatedFramingCost = 450;
    else if (widthInches > 8 || heightInches > 8) estimatedFramingCost = 320;
    else estimatedFramingCost = 180;
  } else {
    if (widthInches > 22 || heightInches > 22) estimatedFramingCost = 35;
    else if (widthInches > 16 || heightInches > 16) estimatedFramingCost = 25;
    else if (widthInches > 11 || heightInches > 11) estimatedFramingCost = 18;
    else if (widthInches > 8 || heightInches > 8) estimatedFramingCost = 12;
    else estimatedFramingCost = 8;
  }

  // Total project cost
  const totalMaterialsCost = totalFlossCost + estimatedFabricCost;
  const totalProjectCost = totalMaterialsCost + (includeFramingInBudget ? estimatedFramingCost : 0);
  const costPerStitch = totalStitches > 0 ? totalProjectCost / totalStitches : 0;

  // Determine recommended frame
  let recommendedFrame = '12" Round Working Hoop';
  if (widthInches > 22 || heightInches > 22) {
    recommendedFrame = `Custom Heirloom Frame (${Math.ceil(widthInches + 4)}" × ${Math.ceil(heightInches + 4)}")`;
  } else if (widthInches > 16 || heightInches > 16) {
    recommendedFrame = '20" × 24" Standard Frame with Mat';
  } else if (widthInches > 11 || heightInches > 11) {
    recommendedFrame = '16" × 20" Standard Frame with Mat';
  } else if (widthInches > 8 || heightInches > 8) {
    recommendedFrame = '11" × 14" Standard Frame';
  } else {
    recommendedFrame = '8" × 10" Standard Frame or 10" Hoop';
  }

  const handleCurrencyChange = (newCurr: '₱' | '$') => {
    setCurrency(newCurr);
    if (newCurr === '₱' && pricePerSkein < 10) {
      setPricePerSkein(55);
    } else if (newCurr === '$' && pricePerSkein > 10) {
      setPricePerSkein(1.25);
    }
  };

  const handleApply = () => {
    if (onApplyToGenerator) {
      onApplyToGenerator(widthStitches, heightStitches, selectedCount);
      setAppliedToast(true);
      setTimeout(() => setAppliedToast(false), 3000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E1D5] shadow-xs p-6 sm:p-8 space-y-8">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0ECE1] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8C7A6B] uppercase tracking-wider mb-1">
            <Ruler className="w-4 h-4 text-[#B88E3C]" />
            <span>{language === 'fil' ? 'Kalkulador ng Sukat ng Tela' : 'Fabric & Stitched Dimension Calculator'}</span>
          </div>
          <h2 className="font-serif text-3xl font-bold text-[#2C2523]">
            {language === 'fil'
              ? 'Tukuyin ang Huling Sukat ng Inyong Cross Stitch'
              : 'Calculate Final Stitched Dimensions'}
          </h2>
          <p className="text-xs sm:text-sm text-[#5F554F] mt-1 max-w-2xl">
            {language === 'fil'
              ? 'I-kalkula ang eksaktong sukat ng natapos na tahi sa inches at centimeters base sa napiling AIDA cloth count at grid size, kasama ang allowance sa pag-frame.'
              : 'Determine the exact finished embroidery dimensions in both inches and centimeters based on your chosen AIDA cloth count and grid dimensions, including framing allowances.'}
          </p>
        </div>

        {onApplyToGenerator && (
          <button
            onClick={handleApply}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-serif text-xs font-bold text-white bg-[#2C2523] hover:bg-[#433936] shadow-sm transition-all whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            {appliedToast ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{language === 'fil' ? 'Nai-apply sa Generator!' : 'Applied to Generator!'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#E6C687]" />
                <span>{language === 'fil' ? 'I-apply sa Pattern Generator' : 'Apply to Pattern Generator'}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 2-Column Controls: Grid Size Inputs & Fabric Count Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Input Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Grid Dimensions */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-[#2C2523] uppercase tracking-wider">
              1. {language === 'fil' ? 'Pumili ng Grid Size o Sukat (Stitches):' : 'Select Grid Size (Stitch Dimensions):'}
            </label>

            {/* Quick Presets */}
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const isActive = widthStitches === p.w && heightStitches === p.h;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setWidthStitches(p.w);
                      setHeightStitches(p.h);
                    }}
                    className={`py-2 px-3 text-xs rounded-lg border text-left transition-all ${
                      isActive
                        ? 'border-[#2C2523] bg-[#FAF7F2] font-semibold text-[#2C2523] ring-1 ring-[#2C2523]'
                        : 'border-[#E8E1D5] bg-white text-[#5F554F] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <div className="font-mono text-xs">{p.w} × {p.h}</div>
                    <div className="text-[10px] text-[#7A6E65] truncate">{p.label.split('(')[1]?.replace(')', '') || ''}</div>
                  </button>
                );
              })}
            </div>

            {/* Custom inputs */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-medium text-[#5F554F] mb-1">
                  {language === 'fil' ? 'Lapad (Stitches):' : 'Width (Stitches):'}
                </label>
                <input
                  type="number"
                  min={20}
                  max={600}
                  value={widthStitches}
                  onChange={(e) => setWidthStitches(Math.max(10, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7CBB9] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#B88E3C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#5F554F] mb-1">
                  {language === 'fil' ? 'Taas (Stitches):' : 'Height (Stitches):'}
                </label>
                <input
                  type="number"
                  min={20}
                  max={800}
                  value={heightStitches}
                  onChange={(e) => setHeightStitches(Math.max(10, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7CBB9] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#B88E3C]"
                />
              </div>
            </div>
            <div className="text-[11px] font-mono text-[#8C8077]">
              Total Stitches: <span className="font-bold text-[#2C2523]">{totalStitches.toLocaleString()}</span>
            </div>
          </div>

          {/* Fabric Count Selector */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-[#2C2523] uppercase tracking-wider">
              2. {language === 'fil' ? 'Pumili ng AIDA Cloth Count:' : 'Select AIDA Cloth Count:'}
            </label>

            <div className="space-y-2">
              {FABRIC_COUNTS.map((f) => {
                const isSelected = selectedCount === f.count;
                return (
                  <div
                    key={f.count}
                    onClick={() => setSelectedCount(f.count)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#2C2523] bg-[#FAF7F2] shadow-2xs ring-1 ring-[#2C2523]'
                        : 'border-[#E8E1D5] bg-white hover:border-[#D7CBB9] hover:bg-[#FAF7F2]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#2C2523]">
                        {f.label}
                      </span>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-white border border-[#E8E1D5] text-[#7A6E65]">
                        {f.strands}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A6E65] mt-0.5">
                      {f.desc} · Needle: {f.needle}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Framing Margin Allowance with Numeric Input Field */}
          <div className="space-y-3 pt-2 bg-[#FAF7F2] p-4 rounded-xl border border-[#E8E1D5]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#2C2523] uppercase tracking-wider flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-[#B88E3C]" />
                <span>
                  3. {language === 'fil' ? 'Karagdagang Margin para sa Pag-frame:' : 'Additional Framing Margin:'}
                </span>
              </label>
              <span className="text-xs font-mono font-bold text-[#B88E3C]">
                +{marginInches}" ({Number((marginInches * 2.54).toFixed(1))} cm) / side
              </span>
            </div>

            {/* Numeric Input Field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-[#5F554F]">
                {language === 'fil'
                  ? 'Ilagay ang sukat ng margin (inches bawat gilid):'
                  : 'Specify margin allowance (inches per side):'}
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min={0.5}
                  max={12}
                  step={0.5}
                  value={marginInches}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setMarginInches(isNaN(val) ? 0 : Math.max(0, val));
                  }}
                  className="w-full pl-3.5 pr-20 py-2 text-sm font-mono font-bold bg-white border border-[#D7CBB9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B88E3C] text-[#2C2523]"
                  placeholder="e.g. 3"
                />
                <span className="absolute right-3 text-xs font-semibold text-[#7A6E65] pointer-events-none">
                  inches / side
                </span>
              </div>
            </div>

            {/* Quick Presets Buttons (2", 3", 4") */}
            <div className="space-y-1">
              <div className="text-[10px] text-[#7A6E65] font-medium">
                {language === 'fil' ? 'Mga Mabilisang Preset:' : 'Quick Presets:'}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { m: 2, label: '2" (5.1 cm)', tag: 'Minimal' },
                  { m: 3, label: '3" (7.6 cm)', tag: 'Standard' },
                  { m: 4, label: '4" (10.2 cm)', tag: 'Heirloom' },
                  { m: 5, label: '5" (12.7 cm)', tag: 'Wide Mat' },
                ].map(({ m, label, tag }) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMarginInches(m)}
                    className={`py-1.5 px-2 text-xs rounded-lg border text-center transition-all cursor-pointer ${
                      marginInches === m
                        ? 'border-[#2C2523] bg-[#2C2523] text-white font-medium shadow-xs'
                        : 'border-[#E8E1D5] bg-white text-[#5F554F] hover:bg-[#F5EFE6]'
                    }`}
                  >
                    <div className="font-mono text-xs">{m}"</div>
                    <div className="text-[9px] opacity-80 truncate">{tag}</div>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-[#8C8077] leading-relaxed">
              {language === 'fil'
                ? '💡 Ang margin na ito ay awtomatikong idinaragdag sa kaliwa, kanan, itaas, at ibaba (+2 × margin) para sa kabuuang sukat ng bibilhing tela.'
                : '💡 This margin is added to all four borders (+2 × margin to width and height) to calculate the full piece of cloth needed for mounting & framing.'}
            </p>
          </div>

          {/* DMC Skein Market Price & Project Budget Planner */}
          <div className="space-y-3 pt-2 bg-[#FAF7F2] p-4 rounded-xl border border-[#E8E1D5]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#2C2523] uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-[#B88E3C]" />
                <span>
                  4. {language === 'fil' ? 'Presyo ng DMC Floss sa Merkado:' : 'DMC Skein Market Price:'}
                </span>
              </label>

              {/* Currency Selector (₱ / $) */}
              <div className="flex items-center bg-white border border-[#D7CBB9] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => handleCurrencyChange('₱')}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-all ${
                    currency === '₱'
                      ? 'bg-[#2C2523] text-white shadow-xs'
                      : 'text-[#7A6E65] hover:text-[#2C2523]'
                  }`}
                >
                  ₱ PHP
                </button>
                <button
                  type="button"
                  onClick={() => handleCurrencyChange('$')}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-all ${
                    currency === '$'
                      ? 'bg-[#2C2523] text-white shadow-xs'
                      : 'text-[#7A6E65] hover:text-[#2C2523]'
                  }`}
                >
                  $ USD
                </button>
              </div>
            </div>

            {/* Price Numeric Input Field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-[#5F554F]">
                {language === 'fil'
                  ? 'Kasalukuyang presyo bawat skein ng DMC (8 metro):'
                  : 'Current market retail price per DMC skein (8m):'}
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm font-bold text-[#7A6E65] pointer-events-none">
                  {currency}
                </span>
                <input
                  type="number"
                  min={0.1}
                  max={currency === '₱' ? 500 : 20}
                  step={currency === '₱' ? 1 : 0.05}
                  value={pricePerSkein}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setPricePerSkein(isNaN(val) ? 0 : Math.max(0, val));
                  }}
                  className="w-full pl-8 pr-20 py-2 text-sm font-mono font-bold bg-white border border-[#D7CBB9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B88E3C] text-[#2C2523]"
                  placeholder={currency === '₱' ? '55' : '1.25'}
                />
                <span className="absolute right-3 text-xs font-semibold text-[#7A6E65] pointer-events-none">
                  / skein
                </span>
              </div>
            </div>

            {/* Quick Price Presets */}
            <div className="space-y-1">
              <div className="text-[10px] text-[#7A6E65] font-medium">
                {language === 'fil' ? 'Mga Karaniwang Presyo sa Merkado:' : 'Typical Market Benchmarks:'}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(currency === '₱'
                  ? [
                      { p: 45, label: '₱45', tag: 'Wholesale' },
                      { p: 55, label: '₱55', tag: 'Standard' },
                      { p: 65, label: '₱65', tag: 'Mall Retail' },
                    ]
                  : [
                      { p: 0.99, label: '$0.99', tag: 'Big Box Sale' },
                      { p: 1.25, label: '$1.25', tag: 'Standard' },
                      { p: 1.50, label: '$1.50', tag: 'Specialty' },
                    ]
                ).map(({ p, label, tag }) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPricePerSkein(p)}
                    className={`py-1.5 px-2 text-xs rounded-lg border text-center transition-all cursor-pointer ${
                      pricePerSkein === p
                        ? 'border-[#2C2523] bg-[#2C2523] text-white font-medium shadow-xs'
                        : 'border-[#E8E1D5] bg-white text-[#5F554F] hover:bg-[#F5EFE6]'
                    }`}
                  >
                    <div className="font-mono text-xs">{label}</div>
                    <div className="text-[9px] opacity-80 truncate">{tag}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Framing in Budget Toggle */}
            <div className="pt-2 border-t border-[#E8E1D5] flex items-center justify-between">
              <label className="text-[11px] text-[#5F554F] font-medium flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeFramingInBudget}
                  onChange={(e) => setIncludeFramingInBudget(e.target.checked)}
                  className="rounded border-[#D7CBB9] text-[#2C2523] focus:ring-[#B88E3C]"
                />
                <span>
                  {language === 'fil'
                    ? 'Isama ang gastos sa framing sa badyet'
                    : 'Include framing in project budget'}
                </span>
              </label>
              <span className="text-[10px] font-mono text-[#7A6E65]">
                ~{currency}{currency === '₱' ? estimatedFramingCost.toLocaleString() : estimatedFramingCost.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Dimension Result Cards & Diagram (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Big Result Display Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Design Area (Natahing Laki) */}
            <div className="bg-[#FAF7F2] border border-[#E0D7C9] rounded-xl p-5 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#7A6E65] uppercase tracking-wider">
                  {language === 'fil' ? 'Natahing Sukat (Design Area)' : 'Final Stitched Design Area'}
                </span>
                <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#E0D7C9] text-[#7A6E65]">
                  {selectedCount} Count Aida
                </span>
              </div>

              {/* Inches */}
              <div>
                <div className="text-[11px] text-[#7A6E65]">Inches:</div>
                <div className="font-mono text-2xl sm:text-3xl font-bold text-[#2C2523] tracking-tight">
                  {widthInches.toFixed(2)}" × {heightInches.toFixed(2)}"
                </div>
              </div>

              {/* Centimeters */}
              <div className="pt-1 border-t border-[#E8E1D5]">
                <div className="text-[11px] text-[#7A6E65]">Centimeters:</div>
                <div className="font-mono text-xl font-bold text-[#B88E3C] tracking-tight">
                  {widthCm.toFixed(1)} cm × {heightCm.toFixed(1)} cm
                </div>
              </div>

              <div className="text-[10px] text-[#8C8077] pt-1">
                Aspect Ratio: {(widthStitches / heightStitches).toFixed(2)}:1 · Exact stitch area without fabric border
              </div>
            </div>

            {/* Total Cut Fabric Size (Laki ng Telang Bibilhin) */}
            <div className="bg-white border-2 border-[#2C2523] rounded-xl p-5 space-y-2 relative shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2C2523] uppercase tracking-wider">
                  {language === 'fil' ? 'Gupit ng Tela (Cut Fabric)' : 'Total Cut Fabric Needed'}
                </span>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                  +{marginInches}" margin included
                </span>
              </div>

              {/* Inches */}
              <div>
                <div className="text-[11px] text-[#7A6E65]">
                  {language === 'fil' ? 'Sukat ng Bibilhing Tela (Inches):' : 'Fabric to Purchase (Inches):'}
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-bold text-[#2C2523] tracking-tight">
                  {cutWidthInches.toFixed(2)}" × {cutHeightInches.toFixed(2)}"
                </div>
              </div>

              {/* Centimeters */}
              <div className="pt-1 border-t border-[#F0ECE1]">
                <div className="text-[11px] text-[#7A6E65]">
                  {language === 'fil' ? 'Sukat sa Centimeters:' : 'Fabric to Purchase (Centimeters):'}
                </div>
                <div className="font-mono text-xl font-bold text-[#2C2523] tracking-tight">
                  {cutWidthCm.toFixed(1)} cm × {cutHeightCm.toFixed(1)} cm
                </div>
              </div>

              <div className="text-[10px] text-[#8C8077] pt-1">
                Laging mag-iwan ng 3 pulgada (7.5 cm) sa bawat gilid para sa pag-stretch sa frame.
              </div>
            </div>
          </div>

          {/* Total Project Cost & Budget Summary Card */}
          <div className="bg-gradient-to-br from-[#FAF7F2] via-white to-[#F6F1E8] border-2 border-[#B88E3C]/40 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 relative overflow-hidden">
            {/* Top ribbon / badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E1D5] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#2C2523] text-[#E6C687] flex items-center justify-center shadow-xs">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#2C2523]">
                    {language === 'fil' ? 'Tantyang Gastos sa Proyekto (Total Project Cost)' : 'Estimated Total Project Cost & Budget'}
                  </h3>
                  <div className="text-[11px] text-[#7A6E65]">
                    {language === 'fil'
                      ? 'Kalkulasyon ng badyet base sa presyo ng DMC floss at laki ng tela'
                      : 'Comprehensive budget planning based on floss market rates & cut fabric'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-white border border-[#D7CBB9] text-[#2C2523] shadow-2xs">
                  {effectiveSkeins} {language === 'fil' ? 'Skeins Kailangan' : 'Skeins Needed'}
                </span>
                {actualSkeins && actualSkeins > 0 ? (
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                    {language === 'fil' ? 'Mula sa Pattern' : 'From Active Palette'}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Prominent Price & Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* Grand Total Highlight Card */}
              <div className="md:col-span-5 bg-white border border-[#E0D7C9] rounded-xl p-4 sm:p-5 shadow-2xs space-y-1 text-center md:text-left">
                <div className="text-[11px] font-bold text-[#7A6E65] uppercase tracking-wider">
                  {language === 'fil' ? 'Kabuuang Tantiya ng Gastos:' : 'Total Estimated Project Cost:'}
                </div>
                <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[#2C2523] tracking-tight">
                  {currency === '₱' ? `₱${Math.round(totalProjectCost).toLocaleString()}` : `$${totalProjectCost.toFixed(2)}`}
                </div>
                <div className="text-[11px] font-mono text-[#8C8077] pt-1 border-t border-[#F0ECE1]">
                  ≈ {currency}{costPerStitch < 1 ? costPerStitch.toFixed(3) : costPerStitch.toFixed(2)} {language === 'fil' ? 'bawat tahi' : 'per stitch'} ({totalStitches.toLocaleString()} sts)
                </div>
              </div>

              {/* Itemized Cost Breakdown */}
              <div className="md:col-span-7 space-y-2 text-xs">
                {/* 1. Floss Thread */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/90 border border-[#E8E1D5]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🧵</span>
                    <div>
                      <div className="font-semibold text-[#2C2523]">
                        {language === 'fil' ? 'DMC Cotton Embroidery Floss' : 'DMC Stranded Cotton Floss'}
                      </div>
                      <div className="text-[10px] text-[#7A6E65]">
                        {effectiveSkeins} skeins × {currency}{currency === '₱' ? pricePerSkein : pricePerSkein.toFixed(2)}/skein
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-[#2C2523] text-sm">
                    {currency === '₱' ? `₱${Math.round(totalFlossCost).toLocaleString()}` : `$${totalFlossCost.toFixed(2)}`}
                  </div>
                </div>

                {/* 2. Aida Cloth Fabric */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/90 border border-[#E8E1D5]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">✂️</span>
                    <div>
                      <div className="font-semibold text-[#2C2523]">
                        {selectedCount} Count Aida Cloth ({cutWidthInches.toFixed(1)}" × {cutHeightInches.toFixed(1)}")
                      </div>
                      <div className="text-[10px] text-[#7A6E65]">
                        {language === 'fil' ? 'Tantyang tela kasama ang margin' : `Cut fabric piece (~${Math.round(cutAreaSqInches)} sq. in)`}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-[#2C2523] text-sm">
                    ~{currency === '₱' ? `₱${Math.round(estimatedFabricCost).toLocaleString()}` : `$${estimatedFabricCost.toFixed(2)}`}
                  </div>
                </div>

                {/* 3. Framing & Mounting (Optional / Included) */}
                <div className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                  includeFramingInBudget ? 'bg-white/90 border-[#E8E1D5]' : 'bg-[#F2ECE1]/50 border-dashed border-[#D7CBB9] opacity-75'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🖼️</span>
                    <div>
                      <div className="font-semibold text-[#2C2523]">
                        {recommendedFrame}
                      </div>
                      <div className="text-[10px] text-[#7A6E65]">
                        {includeFramingInBudget
                          ? (language === 'fil' ? 'Kasama sa kabuuang badyet' : 'Included in total project budget')
                          : (language === 'fil' ? 'Hindi kasama sa badyet' : 'Excluded from total')}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-[#2C2523] text-sm">
                    {includeFramingInBudget ? (
                      `~${currency === '₱' ? `₱${Math.round(estimatedFramingCost).toLocaleString()}` : `$${estimatedFramingCost.toFixed(2)}`}`
                    ) : (
                      <span className="text-[#8C8077] line-through text-xs">
                        {currency === '₱' ? `₱${Math.round(estimatedFramingCost).toLocaleString()}` : `$${estimatedFramingCost.toFixed(2)}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Budget Advice & Wholesale Tip */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
              <span className="text-base shrink-0">💡</span>
              <div className="space-y-0.5">
                <div className="font-bold text-amber-900">
                  {language === 'fil' ? 'Tip sa Pagtitipid ng Gastos sa Cross Stitch:' : 'Needlework Budgeting Tip:'}
                </div>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  {language === 'fil'
                    ? `Ang pagbili ng DMC skeins sa wholesale o pack bundles (hal. Divisoria o online distributors sa halagang ₱45/skein) ay makatitipid ng humigit-kumulang ₱${Math.round(effectiveSkeins * (pricePerSkein - 45) > 0 ? effectiveSkeins * (pricePerSkein - 45) : effectiveSkeins * 10).toLocaleString()} para sa proyektong ito!`
                    : `Purchasing DMC floss in multi-skein bulk packs or from wholesale needlework stockists can save 15%–25% on thread supplies. Always keep at least 3 inches of fabric margin to avoid costly re-framing.`}
                </p>
              </div>
            </div>
          </div>

          {/* Visual Fabric Diagram */}
          <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Frame className="w-4 h-4 text-[#B88E3C]" />
                <h4 className="text-xs font-bold text-[#2C2523] uppercase tracking-wider">
                  {language === 'fil' ? 'Biswal na Diagram ng Tela at Natahing Disenyo' : 'Visual Fabric & Frame Layout Diagram'}
                </h4>
              </div>
              <span className="text-xs font-semibold text-[#5F554F]">
                {recommendedFrame}
              </span>
            </div>

            {/* SVG Diagram */}
            <div className="relative w-full aspect-16/9 bg-white border border-[#E0D7C9] rounded-lg p-4 flex items-center justify-center overflow-hidden">
              <svg
                viewBox="0 0 500 280"
                className="w-full h-full max-h-56"
              >
                {/* Outer Fabric Rectangle */}
                <rect
                  x="50"
                  y="25"
                  width="400"
                  height="230"
                  fill="#FAF7F2"
                  stroke="#D7CBB9"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  rx="4"
                />

                {/* Inner Stitched Design Area */}
                <rect
                  x="100"
                  y="55"
                  width="300"
                  height="170"
                  fill="#EFEAE1"
                  stroke="#2C2523"
                  strokeWidth="2"
                  rx="2"
                />

                {/* Center crosshair */}
                <line x1="250" y1="55" x2="250" y2="225" stroke="#DC2626" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="100" y1="140" x2="400" y2="140" stroke="#DC2626" strokeWidth="1" strokeDasharray="2 2" />

                {/* Dimension callout labels */}
                {/* Design width label */}
                <text x="250" y="130" textAnchor="middle" fill="#2C2523" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
                  {widthInches.toFixed(1)}" × {heightInches.toFixed(1)}"
                </text>
                <text x="250" y="152" textAnchor="middle" fill="#B88E3C" fontSize="11" fontWeight="600" fontFamily="sans-serif">
                  ({widthCm.toFixed(1)} cm × {heightCm.toFixed(1)} cm)
                </text>
                <text x="250" y="170" textAnchor="middle" fill="#7A6E65" fontSize="10" fontFamily="sans-serif">
                  {widthStitches} × {heightStitches} Stitches ({selectedCount}ct Aida)
                </text>

                {/* Margin callouts */}
                <text x="75" y="145" textAnchor="middle" fill="#8C8077" fontSize="9" fontFamily="sans-serif">
                  +{marginInches}"
                </text>
                <text x="425" y="145" textAnchor="middle" fill="#8C8077" fontSize="9" fontFamily="sans-serif">
                  +{marginInches}"
                </text>
                <text x="250" y="44" textAnchor="middle" fill="#8C8077" fontSize="9" fontFamily="sans-serif">
                  +{marginInches}" Framing Margin
                </text>
                <text x="250" y="246" textAnchor="middle" fill="#2C2523" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
                  Cut Fabric: {cutWidthInches.toFixed(1)}" × {cutHeightInches.toFixed(1)}" ({cutWidthCm.toFixed(1)} × {cutHeightCm.toFixed(1)} cm)
                </text>
              </svg>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div>
                <span className="text-[11px] text-[#7A6E65]">Recommended Frame:</span>
                <div className="font-semibold text-[#2C2523] mt-0.5">{recommendedFrame}</div>
              </div>
              <div>
                <span className="text-[11px] text-[#7A6E65]">Estimated Skeins:</span>
                <div className="font-semibold text-[#2C2523] mt-0.5">~{effectiveSkeins} DMC Skeins (8m)</div>
              </div>
              <div>
                <span className="text-[11px] text-[#7A6E65]">Floss Thread Cost:</span>
                <div className="font-semibold text-[#B88E3C] font-mono mt-0.5">
                  {currency}{currency === '₱' ? Math.round(totalFlossCost).toLocaleString() : totalFlossCost.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-[#7A6E65]">Floss Strands:</span>
                <div className="font-semibold text-[#2C2523] mt-0.5">
                  {FABRIC_COUNTS.find((c) => c.count === selectedCount)?.strands || '2 strands'}
                </div>
              </div>
            </div>
          </div>

          {/* Visual Fabric Color & Grid Weave Preview Component */}
          <FabricPreviewCanvas
            fabricCount={selectedCount}
            palette={palette || pattern?.palette}
            language={language}
          />

          {/* Side-by-Side Comparison Matrix across Cloth Counts */}
          <div className="bg-white border border-[#E8E1D5] rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-[#FAF7F2] px-4 py-2.5 border-b border-[#E8E1D5] flex items-center justify-between">
              <h5 className="font-serif font-bold text-sm text-[#2C2523]">
                {language === 'fil'
                  ? 'Paghahambing ng Sukat at Gastos sa Iba\'t Ibang AIDA Cloth'
                  : 'Size & Cost Comparison Across Fabric Counts'}
              </h5>
              <span className="text-[11px] font-mono text-[#7A6E65]">
                {widthStitches} × {heightStitches} stitches · {currency}{currency === '₱' ? pricePerSkein : pricePerSkein.toFixed(2)}/skein
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF7F2]/60 text-[#7A6E65] border-b border-[#E8E1D5]">
                    <th className="py-2 px-3 font-semibold">Cloth Count</th>
                    <th className="py-2 px-3 font-semibold text-right">Inches</th>
                    <th className="py-2 px-3 font-semibold text-right">Centimeters</th>
                    <th className="py-2 px-3 font-semibold text-right">Cut Fabric (+{marginInches}")</th>
                    <th className="py-2 px-3 font-semibold text-right">Est. Budget</th>
                    <th className="py-2 px-3 font-semibold text-center">Strands</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE1]">
                  {FABRIC_COUNTS.map((f) => {
                    const eff = f.count === 28 ? 14 : f.count;
                    const wIn = widthStitches / eff;
                    const hIn = heightStitches / eff;
                    const wC = wIn * 2.54;
                    const hC = hIn * 2.54;
                    const isCurrent = f.count === selectedCount;

                    const rowCutW = wIn + marginInches * 2;
                    const rowCutH = hIn + marginInches * 2;
                    const rowArea = rowCutW * rowCutH;
                    const rowFabCost = currency === '₱'
                      ? Math.round(Math.max(120, rowArea * 0.55))
                      : Math.round(Math.max(4, rowArea * 0.012) * 10) / 10;
                    const rowTotalBudget = totalFlossCost + rowFabCost + (includeFramingInBudget ? estimatedFramingCost : 0);

                    return (
                      <tr
                        key={f.count}
                        onClick={() => setSelectedCount(f.count)}
                        className={`cursor-pointer transition-colors ${
                          isCurrent
                            ? 'bg-[#F7F3EC] font-semibold text-[#2C2523]'
                            : 'hover:bg-[#FAF7F2] text-[#5F554F]'
                        }`}
                      >
                        <td className="py-2 px-3 flex items-center gap-1.5">
                          {isCurrent && <span className="text-[#B88E3C] font-bold">●</span>}
                          <span>{f.label}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {wIn.toFixed(1)}" × {hIn.toFixed(1)}"
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-[#B88E3C]">
                          {wC.toFixed(1)} × {hC.toFixed(1)} cm
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-[#7A6E65]">
                          {rowCutW.toFixed(1)}" × {rowCutH.toFixed(1)}"
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-[#2C2523]">
                          ~{currency}{currency === '₱' ? Math.round(rowTotalBudget).toLocaleString() : rowTotalBudget.toFixed(0)}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[11px]">
                          {f.strands}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
