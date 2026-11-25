import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Copy,
  Check,
  Scissors,
  Sparkles,
  RotateCcw,
  Receipt,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FabricSpecs, PatternData } from '../types';

interface MaterialCostEstimatorProps {
  pattern: PatternData;
  fabricSpecs: FabricSpecs;
  language: 'en' | 'fil';
}

type CurrencyCode = 'PHP' | 'USD' | 'EUR' | 'GBP' | 'SGD' | 'AUD';
type FabricPricingMode = 'per-sqft' | 'per-cut';

interface MaterialCostSettings {
  currency: CurrencyCode;
  skeinPrice: number;
  fabricPricingMode: FabricPricingMode;
  fabricPrice: number;
  includeFramingMargin: boolean;
  extrasCost: number;
}

const CURRENCY_META: Record<
  CurrencyCode,
  { symbol: string; label: string; defaultSkein: number; defaultFabricSqFt: number; defaultFabricCut: number }
> = {
  PHP: { symbol: '₱', label: 'PHP (₱)', defaultSkein: 45, defaultFabricSqFt: 180, defaultFabricCut: 280 },
  USD: { symbol: '$', label: 'USD ($)', defaultSkein: 0.99, defaultFabricSqFt: 4.5, defaultFabricCut: 7.5 },
  EUR: { symbol: '€', label: 'EUR (€)', defaultSkein: 1.25, defaultFabricSqFt: 4.2, defaultFabricCut: 7.0 },
  GBP: { symbol: '£', label: 'GBP (£)', defaultSkein: 1.15, defaultFabricSqFt: 3.8, defaultFabricCut: 6.5 },
  SGD: { symbol: 'S$', label: 'SGD (S$)', defaultSkein: 1.4, defaultFabricSqFt: 5.5, defaultFabricCut: 9.0 },
  AUD: { symbol: 'A$', label: 'AUD (A$)', defaultSkein: 1.5, defaultFabricSqFt: 6.0, defaultFabricCut: 10.0 },
};

const STORAGE_KEY = 'sovereign_material_cost_settings_v1';

const DEFAULT_SETTINGS: MaterialCostSettings = {
  currency: 'PHP',
  skeinPrice: CURRENCY_META.PHP.defaultSkein,
  fabricPricingMode: 'per-sqft',
  fabricPrice: CURRENCY_META.PHP.defaultFabricSqFt,
  includeFramingMargin: true,
  extrasCost: 0,
};

export const MaterialCostEstimator: React.FC<MaterialCostEstimatorProps> = ({
  pattern,
  fabricSpecs,
  language,
}) => {
  const [settings, setSettings] = useState<MaterialCostSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
        };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_SETTINGS;
  });

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copiedQuote, setCopiedQuote] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
  }, [settings]);

  const currencyMeta = CURRENCY_META[settings.currency] || CURRENCY_META.PHP;

  const formatMoney = (amount: number) => {
    const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    return `${currencyMeta.symbol}${safe.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const calculations = useMemo(() => {
    const totalSkeins = pattern.colorStats.reduce((acc, c) => acc + c.skeinsNeeded, 0);
    const totalColors = pattern.palette.length;

    const fabricWidthIn = settings.includeFramingMargin
      ? fabricSpecs.cutFabricInchesW
      : fabricSpecs.widthInches;
    const fabricHeightIn = settings.includeFramingMargin
      ? fabricSpecs.cutFabricInchesH
      : fabricSpecs.heightInches;

    const fabricWidthCm = Number((fabricWidthIn * 2.54).toFixed(1));
    const fabricHeightCm = Number((fabricHeightIn * 2.54).toFixed(1));
    const areaSqInches = fabricWidthIn * fabricHeightIn;
    const areaSqFt = areaSqInches / 144;

    const safeSkeinPrice = Math.max(0, Number(settings.skeinPrice) || 0);
    const safeFabricPrice = Math.max(0, Number(settings.fabricPrice) || 0);
    const safeExtras = Math.max(0, Number(settings.extrasCost) || 0);

    const threadCost = totalSkeins * safeSkeinPrice;
    const fabricCost =
      settings.fabricPricingMode === 'per-sqft'
        ? areaSqFt * safeFabricPrice
        : safeFabricPrice;
    const totalMaterialCost = threadCost + fabricCost + safeExtras;

    const threadSharePct =
      totalMaterialCost > 0 ? Math.round((threadCost / totalMaterialCost) * 100) : 0;
    const fabricSharePct =
      totalMaterialCost > 0 ? Math.round((fabricCost / totalMaterialCost) * 100) : 0;
    const extrasSharePct = Math.max(0, 100 - threadSharePct - fabricSharePct);

    return {
      totalSkeins,
      totalColors,
      fabricWidthIn,
      fabricHeightIn,
      fabricWidthCm,
      fabricHeightCm,
      areaSqFt,
      threadCost,
      fabricCost,
      extrasCost: safeExtras,
      totalMaterialCost,
      threadSharePct,
      fabricSharePct,
      extrasSharePct,
    };
  }, [pattern, fabricSpecs, settings]);

  const handleCurrencyChange = (nextCurrency: CurrencyCode) => {
    const nextMeta = CURRENCY_META[nextCurrency];
    setSettings((prev) => ({
      ...prev,
      currency: nextCurrency,
      skeinPrice: nextMeta.defaultSkein,
      fabricPrice:
        prev.fabricPricingMode === 'per-sqft'
          ? nextMeta.defaultFabricSqFt
          : nextMeta.defaultFabricCut,
      extrasCost: 0,
    }));
  };

  const handleFabricModeChange = (mode: FabricPricingMode) => {
    setSettings((prev) => {
      if (prev.fabricPricingMode === mode) return prev;
      return {
        ...prev,
        fabricPricingMode: mode,
        fabricPrice:
          mode === 'per-sqft'
            ? currencyMeta.defaultFabricSqFt
            : currencyMeta.defaultFabricCut,
      };
    });
  };

  const handleResetDefaults = () => {
    setSettings({
      ...DEFAULT_SETTINGS,
      currency: settings.currency,
      skeinPrice: currencyMeta.defaultSkein,
      fabricPricingMode: 'per-sqft',
      fabricPrice: currencyMeta.defaultFabricSqFt,
      includeFramingMargin: true,
      extrasCost: 0,
    });
  };

  const handleCopyClientQuote = async () => {
    const lines =
      language === 'fil'
        ? [
            `📋 TANTIYA NG GASTOS SA MATERYALES — ${pattern.title}`,
            `Disenyo: ${pattern.width} × ${pattern.height} stitches (${pattern.totalStitches.toLocaleString()} kabuuang tahi)`,
            `Tela: ${pattern.fabricCount}-Count Aida (${calculations.fabricWidthIn}" × ${calculations.fabricHeightIn}" / ${calculations.fabricWidthCm} × ${calculations.fabricHeightCm} cm, ${calculations.areaSqFt.toFixed(2)} sq.ft)`,
            `• Sinulid (DMC Floss): ${calculations.totalSkeins} skeins (${calculations.totalColors} kulay) @ ${formatMoney(settings.skeinPrice)}/skein = ${formatMoney(calculations.threadCost)}`,
            `• Telang Aida: ${
              settings.fabricPricingMode === 'per-sqft'
                ? `${calculations.areaSqFt.toFixed(2)} sq.ft @ ${formatMoney(settings.fabricPrice)}/sq.ft`
                : `1 cut piece`
            } = ${formatMoney(calculations.fabricCost)}`,
            ...(calculations.extrasCost > 0
              ? [`• Karagdagang Gamit / Framing / Packaging = ${formatMoney(calculations.extrasCost)}`]
              : []),
            `💰 Kabuuang Tantiya ng Materyales: ${formatMoney(calculations.totalMaterialCost)}`,
          ]
        : [
            `📋 ESTIMATED COST OF MATERIALS — ${pattern.title}`,
            `Pattern: ${pattern.width} × ${pattern.height} stitches (${pattern.totalStitches.toLocaleString()} total stitches)`,
            `Fabric: ${pattern.fabricCount}-Count Aida (${calculations.fabricWidthIn}" × ${calculations.fabricHeightIn}" / ${calculations.fabricWidthCm} × ${calculations.fabricHeightCm} cm, ${calculations.areaSqFt.toFixed(2)} sq.ft)`,
            `• DMC Thread: ${calculations.totalSkeins} skeins (${calculations.totalColors} colors) @ ${formatMoney(settings.skeinPrice)}/skein = ${formatMoney(calculations.threadCost)}`,
            `• Aida Fabric: ${
              settings.fabricPricingMode === 'per-sqft'
                ? `${calculations.areaSqFt.toFixed(2)} sq.ft @ ${formatMoney(settings.fabricPrice)}/sq.ft`
                : `1 cut piece`
            } = ${formatMoney(calculations.fabricCost)}`,
            ...(calculations.extrasCost > 0
              ? [`• Extras / Hoop / Packaging = ${formatMoney(calculations.extrasCost)}`]
              : []),
            `💰 Total Estimated Material Cost: ${formatMoney(calculations.totalMaterialCost)}`,
          ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedQuote(true);
      setTimeout(() => setCopiedQuote(false), 2500);
    } catch {
      // fallback ignore
    }
  };

  return (
    <div className="bg-white border border-[#E8E1D5] rounded-xl overflow-hidden shadow-2xs">
      {/* Header Bar */}
      <div className="bg-[#FAF7F2] px-5 py-3.5 border-b border-[#E8E1D5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2C2523] text-[#E6C687] flex items-center justify-center shadow-xs shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-base sm:text-lg text-[#2C2523] leading-snug flex items-center gap-2 flex-wrap">
              <span>
                {language === 'fil'
                  ? 'Tantiya ng Gastos sa Materyales (Client Quote)'
                  : 'Estimated Cost of Materials (Client Quote)'}
              </span>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                {formatMoney(calculations.totalMaterialCost)}
              </span>
            </h4>
            <p className="text-[11px] text-[#7A6E65]">
              {language === 'fil'
                ? 'Ilagay ang lokal na presyo ng DMC skein at Aida cloth upang makuha ang eksaktong gastos para sa quote ng kliyente.'
                : 'Enter your local DMC skein and Aida fabric prices to calculate an accurate material quote for clients.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleCopyClientQuote}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2C2523] hover:bg-[#433936] text-white transition-colors cursor-pointer shadow-2xs"
          >
            {copiedQuote ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'fil' ? 'Nakopya ang Quote!' : 'Quote Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#E6C687]" />
                <span>{language === 'fil' ? 'Kopyahin ang Quote' : 'Copy Quote Summary'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg border border-[#E8E1D5] bg-white hover:bg-[#F2ECE1] text-[#5F554F] cursor-pointer transition-colors"
            title={isExpanded ? 'Collapse estimator' : 'Expand estimator'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 space-y-5">
          {/* Local Price Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Currency + Skein Price */}
            <div className="md:col-span-4 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E1D5] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-bold text-[#5F554F] uppercase tracking-wider">
                  {language === 'fil' ? 'Presyo Bawat DMC Skein' : 'DMC Skein Unit Price'}
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                  className="text-[11px] font-mono font-bold bg-white border border-[#D7CBB9] rounded px-1.5 py-0.5 text-[#2C2523] focus:outline-none focus:ring-1 focus:ring-[#B88E3C] cursor-pointer"
                  aria-label="Currency"
                >
                  {(Object.keys(CURRENCY_META) as CurrencyCode[]).map((code) => (
                    <option key={code} value={code}>
                      {CURRENCY_META[code].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-[#7A6E65]">
                  {currencyMeta.symbol}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={settings.skeinPrice}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      skeinPrice: Math.max(0, parseFloat(e.target.value) || 0),
                    }))
                  }
                  className="w-full pl-8 pr-16 py-2 bg-white border border-[#D7CBB9] rounded-lg font-mono font-bold text-sm text-[#2C2523] focus:outline-none focus:ring-2 focus:ring-[#B88E3C]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#8C8077]">
                  / skein
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#7A6E65]">
                <span>
                  {calculations.totalSkeins} skeins · {calculations.totalColors}{' '}
                  {language === 'fil' ? 'kulay' : 'colors'}
                </span>
                <span className="font-mono font-semibold text-[#2C2523]">
                  = {formatMoney(calculations.threadCost)}
                </span>
              </div>
            </div>

            {/* Aida Fabric Price */}
            <div className="md:col-span-5 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E1D5] space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-[11px] font-bold text-[#5F554F] uppercase tracking-wider">
                  {language === 'fil'
                    ? `Presyo ng ${pattern.fabricCount}-Count Aida`
                    : `${pattern.fabricCount}-Count Aida Fabric Price`}
                </label>

                <div className="inline-flex bg-white rounded-md border border-[#D7CBB9] p-0.5 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => handleFabricModeChange('per-sqft')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      settings.fabricPricingMode === 'per-sqft'
                        ? 'bg-[#2C2523] text-white'
                        : 'text-[#5F554F] hover:text-[#2C2523]'
                    }`}
                  >
                    {language === 'fil' ? 'Bawat sq.ft' : 'Per sq.ft'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFabricModeChange('per-cut')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      settings.fabricPricingMode === 'per-cut'
                        ? 'bg-[#2C2523] text-white'
                        : 'text-[#5F554F] hover:text-[#2C2523]'
                    }`}
                  >
                    {language === 'fil' ? 'Buong Piraso' : 'Flat Cut'}
                  </button>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-[#7A6E65]">
                  {currencyMeta.symbol}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.fabricPrice}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      fabricPrice: Math.max(0, parseFloat(e.target.value) || 0),
                    }))
                  }
                  className="w-full pl-8 pr-20 py-2 bg-white border border-[#D7CBB9] rounded-lg font-mono font-bold text-sm text-[#2C2523] focus:outline-none focus:ring-2 focus:ring-[#B88E3C]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#8C8077]">
                  {settings.fabricPricingMode === 'per-sqft' ? '/ sq.ft' : '/ cut'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px] text-[#7A6E65] flex-wrap">
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.includeFramingMargin}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        includeFramingMargin: e.target.checked,
                      }))
                    }
                    className="rounded border-[#D7CBB9] text-[#2C2523] focus:ring-[#B88E3C]"
                  />
                  <span>
                    {language === 'fil' ? '+3" framing margin' : '+3" framing border'} (
                    {calculations.fabricWidthIn}"×{calculations.fabricHeightIn}" ·{' '}
                    {calculations.areaSqFt.toFixed(2)} sq.ft)
                  </span>
                </label>
                <span className="font-mono font-semibold text-[#2C2523]">
                  = {formatMoney(calculations.fabricCost)}
                </span>
              </div>
            </div>

            {/* Optional Supplies / Framing / Packaging Extras */}
            <div className="md:col-span-3 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E1D5] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-bold text-[#5F554F] uppercase tracking-wider">
                  {language === 'fil' ? 'Iba Pang Gamit (Ops.)' : 'Extras / Needles (Opt.)'}
                </label>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-[10px] text-[#7A6E65] hover:text-[#2C2523] inline-flex items-center gap-1 cursor-pointer"
                  title="Reset unit prices to defaults"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{language === 'fil' ? 'I-reset' : 'Reset'}</span>
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-[#7A6E65]">
                  {currencyMeta.symbol}
                </span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={settings.extrasCost}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      extrasCost: Math.max(0, parseFloat(e.target.value) || 0),
                    }))
                  }
                  className="w-full pl-8 pr-14 py-2 bg-white border border-[#D7CBB9] rounded-lg font-mono font-bold text-sm text-[#2C2523] focus:outline-none focus:ring-2 focus:ring-[#B88E3C]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#8C8077]">
                  flat
                </span>
              </div>

              <p className="text-[10px] text-[#8C8077] leading-snug">
                {language === 'fil'
                  ? 'Karayom, hoop, o packaging para sa kliyente.'
                  : 'Needles, working hoop, or client packaging.'}
              </p>
            </div>
          </div>

          {/* Cost Breakdown Summary Strip */}
          <div className="bg-[#2C2523] text-[#FAF7F2] rounded-xl p-4 sm:p-5 space-y-3.5 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 items-center">
              <div className="bg-white/8 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-1.5 text-[11px] text-[#D7CBB9]">
                  <Sparkles className="w-3.5 h-3.5 text-[#E6C687]" />
                  <span>{language === 'fil' ? 'Sinulid (DMC Floss)' : 'DMC Thread Cost'}</span>
                </div>
                <div className="font-mono font-bold text-lg text-white mt-0.5">
                  {formatMoney(calculations.threadCost)}
                </div>
                <div className="text-[10px] text-[#C4B9AC]">
                  {calculations.totalSkeins} skeins ({calculations.threadSharePct}%)
                </div>
              </div>

              <div className="bg-white/8 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-1.5 text-[11px] text-[#D7CBB9]">
                  <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'fil' ? 'Telang Aida Cloth' : 'Aida Fabric Cost'}</span>
                </div>
                <div className="font-mono font-bold text-lg text-white mt-0.5">
                  {formatMoney(calculations.fabricCost)}
                </div>
                <div className="text-[10px] text-[#C4B9AC]">
                  {calculations.fabricWidthCm} × {calculations.fabricHeightCm} cm ({calculations.fabricSharePct}%)
                </div>
              </div>

              <div className="bg-white/8 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-1.5 text-[11px] text-[#D7CBB9]">
                  <Receipt className="w-3.5 h-3.5 text-amber-300" />
                  <span>{language === 'fil' ? 'Iba Pang Gamit' : 'Extras & Prep'}</span>
                </div>
                <div className="font-mono font-bold text-lg text-white mt-0.5">
                  {formatMoney(calculations.extrasCost)}
                </div>
                <div className="text-[10px] text-[#C4B9AC]">
                  {calculations.extrasCost > 0
                    ? `${calculations.extrasSharePct}% ${language === 'fil' ? 'ng gastos' : 'of total'}`
                    : language === 'fil'
                    ? 'Opsyonal'
                    : 'Optional'}
                </div>
              </div>

              <div className="sm:col-span-3 lg:col-span-1 bg-gradient-to-br from-[#B88E3C]/30 to-emerald-700/30 rounded-lg p-3.5 border border-[#E6C687]/40">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#E6C687]">
                  {language === 'fil' ? 'Kabuuang Materyales' : 'Total Material Cost'}
                </div>
                <div className="font-mono font-bold text-2xl text-white mt-0.5">
                  {formatMoney(calculations.totalMaterialCost)}
                </div>
                <div className="text-[10px] text-[#FAF7F2]/80">
                  {language === 'fil'
                    ? 'Basehang halaga bago ang labor fee'
                    : 'Materials baseline before labor'}
                </div>
              </div>
            </div>

            {/* Visual Cost Share Bar */}
            {calculations.totalMaterialCost > 0 && (
              <div className="space-y-1.5">
                <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden flex">
                  <div
                    className="h-full bg-[#E6C687] transition-all duration-300"
                    style={{ width: `${calculations.threadSharePct}%` }}
                    title={`Thread: ${calculations.threadSharePct}%`}
                  />
                  <div
                    className="h-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${calculations.fabricSharePct}%` }}
                    title={`Fabric: ${calculations.fabricSharePct}%`}
                  />
                  {calculations.extrasSharePct > 0 && (
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${calculations.extrasSharePct}%` }}
                      title={`Extras: ${calculations.extrasSharePct}%`}
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#C4B9AC]">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#E6C687]" />
                      {language === 'fil' ? 'Sinulid' : 'Thread'} ({calculations.threadSharePct}%)
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {language === 'fil' ? 'Tela' : 'Aida Fabric'} ({calculations.fabricSharePct}%)
                    </span>
                    {calculations.extrasSharePct > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        {language === 'fil' ? 'Extras' : 'Extras'} ({calculations.extrasSharePct}%)
                      </span>
                    )}
                  </div>
                  <span className="font-mono">
                    {pattern.totalStitches.toLocaleString()} stitches · {pattern.fabricCount}ct Aida
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
