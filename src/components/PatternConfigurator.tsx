import React, { useState } from 'react';
import { Ruler, Palette, Sparkles, Scissors, Info, Wand2, Check, SlidersHorizontal } from 'lucide-react';
import { calculateFabricSpecs } from '../utils/colorMatcher';
import { PatternData } from '../types';

interface PatternConfiguratorProps {
  gridPreset: string;
  setGridPreset: (preset: string) => void;
  customWidth: number;
  setCustomWidth: (w: number) => void;
  customHeight: number;
  setCustomHeight: (h: number) => void;
  fabricCount: number;
  setFabricCount: (count: number) => void;
  maxColors: number;
  setMaxColors: (colors: number) => void;
  noiseReduction: number;
  setNoiseReduction: (level: number) => void;
  confettiThreshold: number;
  setConfettiThreshold: (threshold: number) => void;
  onApplyNoiseReductionToActive?: (level: number, threshold: number) => void;
  activePattern?: PatternData | null;
  onGenerate: () => void;
  isGenerating: boolean;
  language: 'en' | 'fil';
}

export const PatternConfigurator: React.FC<PatternConfiguratorProps> = ({
  gridPreset,
  setGridPreset,
  customWidth,
  setCustomWidth,
  customHeight,
  setCustomHeight,
  fabricCount,
  setFabricCount,
  maxColors,
  setMaxColors,
  noiseReduction,
  setNoiseReduction,
  confettiThreshold,
  setConfettiThreshold,
  onApplyNoiseReductionToActive,
  activePattern,
  onGenerate,
  isGenerating,
  language,
}) => {
  const [justCleaned, setJustCleaned] = useState<boolean>(false);
  // Determine effective dimensions
  let effW = 150;
  let effH = 150;
  if (gridPreset === '300x450') {
    effW = 300;
    effH = 450;
  } else if (gridPreset === '200x300') {
    effW = 200;
    effH = 300;
  } else if (gridPreset === '150x150') {
    effW = 150;
    effH = 150;
  } else if (gridPreset === '100x100') {
    effW = 100;
    effH = 100;
  } else {
    effW = customWidth;
    effH = customHeight;
  }

  const specs = calculateFabricSpecs(effW, effH, fabricCount);
  const totalStitches = effW * effH;
  const estimatedSkeins = Math.ceil(totalStitches / 1800);

  return (
    <div className="bg-white rounded-xl border border-[#E8E1D5] shadow-xs p-6 space-y-6">
      {/* Title */}
      <div className="border-b border-[#F0ECE1] pb-4">
        <h2 className="font-serif text-2xl font-bold text-[#2C2523]">
          2. {language === 'fil' ? 'Pattern Specifications & Fabric Dimensions' : 'Pattern Specifications & Fabric Dimensions'}
        </h2>
        <p className="text-xs text-[#7A6E65] mt-0.5">
          {language === 'fil'
            ? 'I-set ang sukat ng grid, bilang ng Aida cloth, at limitasyon ng kulay ng DMC threads.'
            : 'Configure stitch grid resolution, Aida fabric count, and authentic DMC palette range.'}
        </p>
      </div>

      {/* Grid Dimensions & Aida Count Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column 1: Grid Dimensions */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-[#2C2523] uppercase tracking-wider">
            <Ruler className="w-3.5 h-3.5 text-[#B88E3C]" />
            <span>{language === 'fil' ? 'Grid / Stitch Dimensions:' : 'Grid / Stitch Dimensions:'}</span>
          </label>

          <select
            value={gridPreset}
            onChange={(e) => setGridPreset(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs font-medium bg-[#FAF7F2] border border-[#D7CBB9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B88E3C] text-[#2C2523]"
          >
            <option value="300x450">
              300 x 450 (1-Year Masterpiece / 135,000 stitches)
            </option>
            <option value="200x300">
              200 x 300 (Large Tapestry / 60,000 stitches)
            </option>
            <option value="150x150">
              150 x 150 (Medium Project / 22,500 stitches)
            </option>
            <option value="100x100">
              100 x 100 (Keepsake Sampler / 10,000 stitches)
            </option>
            <option value="custom">
              {language === 'fil' ? 'Custom Dimensions (Sariling Sukat)...' : 'Custom Dimensions...'}
            </option>
          </select>

          {gridPreset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] text-[#7A6E65] mb-1">
                  {language === 'fil' ? 'Lapad (Stitches):' : 'Width (Stitches):'}
                </label>
                <input
                  type="number"
                  min={50}
                  max={450}
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Math.max(40, parseInt(e.target.value) || 100))}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7CBB9] rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#7A6E65] mb-1">
                  {language === 'fil' ? 'Taas (Stitches):' : 'Height (Stitches):'}
                </label>
                <input
                  type="number"
                  min={50}
                  max={500}
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Math.max(40, parseInt(e.target.value) || 100))}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7CBB9] rounded-md font-mono"
                />
              </div>
            </div>
          )}

          <p className="text-[11px] text-[#8C8077] leading-relaxed">
            {language === 'fil'
              ? 'Ang 300x450 ay karaniwang tumatagal ng 8–12 buwan upang mabuo (perpekto bilang wedding keepsake).'
              : '300x450 is a museum-scale 1-year project with museum-level facial shading and floral detail.'}
          </p>
        </div>

        {/* Column 2: Fabric Count & Palette Range */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-[#2C2523] uppercase tracking-wider">
            <Scissors className="w-3.5 h-3.5 text-[#B88E3C]" />
            <span>{language === 'fil' ? 'AIDA Cloth Count:' : 'AIDA Fabric Count:'}</span>
          </label>

          <select
            value={fabricCount}
            onChange={(e) => setFabricCount(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 text-xs font-medium bg-[#FAF7F2] border border-[#D7CBB9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B88E3C] text-[#2C2523]"
          >
            <option value={14}>
              14 Count (Standard Heirloom - 14 stitches per inch)
            </option>
            <option value={16}>
              16 Count (Medium-Fine - 16 stitches per inch)
            </option>
            <option value={18}>
              18 Count (High Detail Miniature - 18 stitches per inch)
            </option>
            <option value={22}>
              22 Count (Hardanger Fabric - 22 stitches per inch)
            </option>
          </select>

          {/* Palette limit */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-[#5F554F]">
                <Palette className="w-3 h-3 text-[#B88E3C]" />
                <span>{language === 'fil' ? 'Max DMC Floss Colors:' : 'Max DMC Floss Colors:'}</span>
              </label>
              <span className="font-mono text-xs font-bold text-[#2C2523]">
                {maxColors} {language === 'fil' ? 'kulay' : 'colors'}
              </span>
            </div>
            <input
              type="range"
              min={12}
              max={60}
              step={2}
              value={maxColors}
              onChange={(e) => setMaxColors(Number(e.target.value))}
              className="w-full accent-[#2C2523] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#8C8077]">
              <span>12 (Simple)</span>
              <span>24 (Balanced)</span>
              <span>45 (High Photorealism)</span>
              <span>60 (Masterpiece)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Noise Reduction (Confetti Cleanup) Control Section */}
      <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-4.5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E1D5] pb-2.5">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-[#B88E3C]" />
            <h4 className="text-xs font-bold text-[#2C2523] uppercase tracking-wider">
              {language === 'fil'
                ? 'Smart Noise Reduction (Confetti Cleanup)'
                : 'Smart Noise Reduction (Confetti Cleanup)'}
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded border transition-colors ${
                noiseReduction === 0
                  ? 'bg-gray-100 text-gray-700 border-gray-300'
                  : noiseReduction === 2
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold ring-1 ring-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {noiseReduction === 0 && (language === 'fil' ? 'Naka-OFF (Likas na Detalye)' : 'OFF (Raw Photographic)')}
              {noiseReduction === 1 && (language === 'fil' ? 'Level 1: Banayad (1-Tahi)' : 'Level 1: Subtle (1-Stitch Speckles)')}
              {noiseReduction === 2 && (language === 'fil' ? 'Level 2: Balanse ★ (Rekomendado)' : 'Level 2: Balanced ★ (Recommended)')}
              {noiseReduction === 3 && (language === 'fil' ? 'Level 3: Malakas (Maliit na Speckles)' : 'Level 3: Strong (Merge Small Speckles)')}
              {noiseReduction === 4 && (language === 'fil' ? 'Level 4: Todo (Malalapad na Blocks)' : 'Level 4: Maximum (Smooth Color Blocks)')}
            </span>
          </div>
        </div>

        {/* Slider Input */}
        <div className="space-y-1.5">
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            value={noiseReduction}
            onChange={(e) => setNoiseReduction(Number(e.target.value))}
            className="w-full accent-[#B88E3C] cursor-pointer h-2 bg-[#E8E1D5] rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-[#8C8077]">
            <span className={noiseReduction === 0 ? 'font-bold text-[#2C2523]' : ''}>0 (Off)</span>
            <span className={noiseReduction === 1 ? 'font-bold text-[#2C2523]' : ''}>1 (Subtle)</span>
            <span className={noiseReduction === 2 ? 'font-bold text-amber-900 bg-amber-100/60 px-1 rounded' : ''}>
              2 (Balanced ★)
            </span>
            <span className={noiseReduction === 3 ? 'font-bold text-[#2C2523]' : ''}>3 (Strong)</span>
            <span className={noiseReduction === 4 ? 'font-bold text-[#2C2523]' : ''}>4 (Max Blocks)</span>
          </div>
        </div>

        {/* Dynamic Explanation Text */}
        <p className="text-[11px] text-[#5F554F] leading-relaxed">
          {noiseReduction === 0 &&
            (language === 'fil'
              ? 'Pinapanatili ang 100% ng orihinal na pixels kabilang ang maliliit na speckles. Maganda para sa photographic detail ngunit nangangailangan ng madalas na pagpapalit ng sinulid.'
              : 'Preserves 100% raw pixel speckles. Highest photographic fidelity, but requires frequent needle rethreading for single isolated stitches.')}
          {noiseReduction === 1 &&
            (language === 'fil'
              ? 'Tinatanggal ang mga nag-iisang 1-tahi speckles na walang katabing parehong kulay, at pinapalitan ng katabing nangingibabaw na DMC shade.'
              : 'Automatically eliminates single-stitch confetti with zero matching neighbors, replacing them with the dominant adjacent DMC color.')}
          {noiseReduction === 2 &&
            (language === 'fil'
              ? 'Rekomendado para sa heirloom projects. Awtomatikong pinagsasama ang mga nakahiwalay na confetti stitches sa katabing kulay gamit ang perceptual CIE Lab matching. Bawas pagod at walang bukol na sinulid!'
              : 'Recommended for heirloom wedding projects. Identifies isolated single-stitch confetti and blends them into surrounding dominant shades using perceptual CIE Lab color matching. Saves hours of stopping and knotting threads!')}
          {noiseReduction === 3 &&
            (language === 'fil'
              ? 'Mas malakas na paglilinis: Pinapalitan ang 1 at 2-tahi confetti specks sa malalaking background sections para sa mas tuloy-tuloy na pagtahi.'
              : 'Strong clean-up: Merges 1-stitch and 2-stitch color speckles into broader contiguous thread blocks for faster, more rhythmic stitching.')}
          {noiseReduction === 4 &&
            (language === 'fil'
              ? 'Maximum smoothing: Ginagawang malalapad na kulay ang disenyo para sa napakadali at nakakarelaks na pananahi, perpekto para sa mga baguhan.'
              : 'Maximum smoothing: Consolidates small color specks into large, relaxing color blocks. Perfect for first-time stitchers seeking a stress-free experience.')}
        </p>

        {/* Numeric Threshold Input for Confetti Sensitivity (How many adjacent stitches must differ) */}
        <div className={`p-3 rounded-lg border transition-all ${
          noiseReduction > 0
            ? 'bg-white border-[#E8E1D5] shadow-2xs space-y-2.5'
            : 'bg-[#F5EFE6]/60 border-[#E8E1D5]/70 opacity-60 pointer-events-none space-y-2.5'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#B88E3C]" />
              <label className="text-xs font-bold text-[#2C2523]">
                {language === 'fil'
                  ? 'Confetti Sensitivity Threshold (Ilang magkaibang katabing tahi):'
                  : 'Confetti Sensitivity Threshold (Different Adjacent Stitches):'}
              </label>
            </div>

            {/* Direct Numeric Stepper Input */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setConfettiThreshold(Math.max(5, confettiThreshold - 1))}
                disabled={confettiThreshold <= 5 || noiseReduction === 0}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-[#D7CBB9] bg-[#FAF7F2] text-[#2C2523] hover:bg-[#EAE2D5] disabled:opacity-35 disabled:cursor-not-allowed font-bold text-sm cursor-pointer transition-colors"
                title={language === 'fil' ? 'Bawasan ang threshold (Mas agresibo)' : 'Decrease threshold (More aggressive noise cleanup)'}
              >
                −
              </button>

              <div className="flex items-center gap-1 bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#D7CBB9]">
                <input
                  type="number"
                  min={5}
                  max={8}
                  step={1}
                  value={confettiThreshold}
                  disabled={noiseReduction === 0}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    if (!isNaN(parsed)) {
                      setConfettiThreshold(Math.max(5, Math.min(8, parsed)));
                    }
                  }}
                  className="w-8 text-center text-xs font-mono font-bold text-[#2C2523] bg-transparent focus:outline-none"
                />
                <span className="text-[11px] font-mono text-[#7A6E65]">/ 8</span>
              </div>

              <button
                type="button"
                onClick={() => setConfettiThreshold(Math.min(8, confettiThreshold + 1))}
                disabled={confettiThreshold >= 8 || noiseReduction === 0}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-[#D7CBB9] bg-[#FAF7F2] text-[#2C2523] hover:bg-[#EAE2D5] disabled:opacity-35 disabled:cursor-not-allowed font-bold text-sm cursor-pointer transition-colors"
                title={language === 'fil' ? 'Dagdagan ang threshold (Mas maingat)' : 'Increase threshold (More conservative isolation)'}
              >
                +
              </button>
            </div>
          </div>

          {/* Synced Threshold Slider */}
          <div className="space-y-1">
            <input
              type="range"
              min={5}
              max={8}
              step={1}
              value={confettiThreshold}
              disabled={noiseReduction === 0}
              onChange={(e) => setConfettiThreshold(Number(e.target.value))}
              className="w-full accent-[#B88E3C] cursor-pointer h-1.5 bg-[#E8E1D5] rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#8C8077]">
              <span className={confettiThreshold === 5 ? 'font-bold text-[#2C2523]' : ''}>5 (Aggressive)</span>
              <span className={confettiThreshold === 6 ? 'font-bold text-[#2C2523]' : ''}>6 (Moderate)</span>
              <span className={confettiThreshold === 7 ? 'font-bold text-amber-900 bg-amber-100/60 px-1 rounded' : ''}>7 (Standard ★)</span>
              <span className={confettiThreshold === 8 ? 'font-bold text-[#2C2523]' : ''}>8 (100% Isolated)</span>
            </div>
          </div>

          {/* Trigger Condition Explanation */}
          <div className="bg-[#FAF7F2] p-2.5 rounded-md border border-[#E8E1D5] text-[11px] text-[#5F554F] leading-relaxed">
            <span className="font-semibold text-[#2C2523]">
              {language === 'fil' ? 'Alituntunin ng Paglilinis:' : 'Noise Replacement Trigger:'}{' '}
            </span>
            {confettiThreshold === 8 &&
              (language === 'fil'
                ? 'Papalitan lamang kung ang lahat ng 8 katabing tahi ay may ibang kulay (0 kaparehong tahi / 100% nakahiwalay na confetti island).'
                : 'A stitch is only auto-replaced if all 8 adjacent stitches are different colors (0 matching neighbors / completely isolated 1-pixel island).')}
            {confettiThreshold === 7 &&
              (language === 'fil'
                ? 'Papalitan kung 7 o 8 katabing tahi ay may ibang kulay (hanggang 1 katabing magkapareho). Tamang balanse para sa malinis na kasal tapestry nang hindi nawawala ang detalye.'
                : 'A stitch is auto-replaced if 7 or 8 adjacent stitches are different colors (≤1 matching neighbor). The recommended golden ratio for heirloom wedding tapestries!')}
            {confettiThreshold === 6 &&
              (language === 'fil'
                ? 'Papalitan kung 6 o higit pang katabing tahi ay may ibang kulay (hanggang 2 katabing magkapareho). Nililinis ang 2-pixel specks at manipis na single-line spurs.'
                : 'A stitch is auto-replaced if 6 or more adjacent stitches are different colors (≤2 matching neighbors). Eliminates 2-pixel specks and thin single-line spurs.')}
            {confettiThreshold === 5 &&
              (language === 'fil'
                ? 'Papalitan kung 5 o higit pang katabing tahi ay may ibang kulay (mahigit kalahati ng katabi ay iba). Mabilis at nakakarelaks na pananahi na may makinis na color patches.'
                : 'A stitch is auto-replaced if 5 or more adjacent stitches are different colors (strict majority differs). Merges noisy gradient ridges into broad, easy-to-stitch blocks.')}
          </div>
        </div>

        {/* Active Pattern Feedback & Quick Apply Button */}
        {activePattern && (
          <div className="pt-2.5 border-t border-[#E8E1D5] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[#7A6E65]">
                {language === 'fil' ? 'Kasalukuyang Confetti:' : 'Active Pattern Confetti:'}
              </span>
              <span className="font-mono font-bold text-[#2C2523] bg-white px-2 py-0.5 rounded border border-[#E8E1D5]">
                {activePattern.complexity.confettiPercentage}% ({activePattern.complexity.confettiLevel})
              </span>
              {activePattern.cleanedConfettiCount && activePattern.cleanedConfettiCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>
                    {activePattern.cleanedConfettiCount.toLocaleString()} {language === 'fil' ? 'confetti nalinis' : 'confetti cleaned'}
                  </span>
                </span>
              )}
            </div>

            {onApplyNoiseReductionToActive && (
              <button
                type="button"
                onClick={() => {
                  onApplyNoiseReductionToActive(noiseReduction, confettiThreshold);
                  setJustCleaned(true);
                  setTimeout(() => setJustCleaned(false), 2200);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#2C2523] hover:bg-[#433936] text-white flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-[0.98]"
                title="Immediately apply this noise reduction level and confetti threshold to the currently generated pattern"
              >
                {justCleaned ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'fil' ? 'Nalinis Na!' : 'Pattern Cleaned!'}</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 text-[#E6C687]" />
                    <span>{language === 'fil' ? 'Ilapat sa Pattern Ngayon' : 'Apply to Active Pattern'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Live Physical Dimension Calculation Card */}
      <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-4.5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#E8E1D5] pb-2.5">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#B88E3C]" />
            <h4 className="text-xs font-bold text-[#2C2523] uppercase tracking-wider">
              {language === 'fil' ? 'Kalkulasyon ng Sukat ng Tela at Sinulid' : 'Calculated Physical Fabric & Skein Requirements'}
            </h4>
          </div>
          <span className="text-[11px] font-mono text-[#7A6E65]">
            {effW} × {effH} stitches
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-[11px] text-[#7A6E65]">
              {language === 'fil' ? 'Laki ng Natahi (Design)' : 'Finished Design Area'}
            </div>
            <div className="font-mono font-bold text-[#2C2523] text-sm mt-0.5">
              {specs.widthInches}" × {specs.heightInches}"
            </div>
            <div className="text-[10px] text-[#8C8077]">
              {specs.widthCm} × {specs.heightCm} cm
            </div>
          </div>

          <div>
            <div className="text-[11px] text-[#7A6E65]">
              {language === 'fil' ? 'Gupit ng Tela (+3" border)' : 'Cut Fabric Size'}
            </div>
            <div className="font-mono font-bold text-[#2C2523] text-sm mt-0.5">
              {specs.cutFabricInchesW}" × {specs.cutFabricInchesH}"
            </div>
            <div className="text-[10px] text-[#8C8077]">
              {language === 'fil' ? 'May 3" allowance bawat gilid' : 'Includes 3" frame margin'}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-[#7A6E65]">
              {language === 'fil' ? 'Tantiya ng Sinulid' : 'Estimated Thread'}
            </div>
            <div className="font-mono font-bold text-[#2C2523] text-sm mt-0.5">
              ~{estimatedSkeins} Skeins
            </div>
            <div className="text-[10px] text-[#8C8077]">
              8m standard DMC cotton
            </div>
          </div>

          <div>
            <div className="text-[11px] text-[#7A6E65]">
              {language === 'fil' ? 'Rekomendadong Frame' : 'Recommended Frame'}
            </div>
            <div className="font-medium text-[#2C2523] text-xs mt-0.5 line-clamp-2">
              {specs.recommendedFrame}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-[#E8E1D5] flex items-center justify-between">
          <span className="text-[11px] text-[#7A6E65]">
            {language === 'fil'
              ? 'Gusto mo bang subukan ang iba\'t ibang AIDA count o margin?'
              : 'Compare dimensions across all AIDA counts side-by-side?'}
          </span>
          <button
            type="button"
            onClick={() => {
              document.getElementById('calculator-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-xs font-semibold text-[#B88E3C] hover:text-[#9A732B] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{language === 'fil' ? 'Buksan ang Buong Calculator' : 'Open Full Fabric Calculator'}</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full py-3.5 px-6 rounded-xl font-serif text-base font-bold text-white bg-[#2C2523] hover:bg-[#433936] active:scale-[0.99] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-wait"
      >
        {isGenerating ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>
              {language === 'fil'
                ? 'Binubuo ang DMC Thread Legend at Multi-Page Grid...'
                : 'Quantizing DMC Palette & Assembling Multi-Page Grid...'}
            </span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-[#E6C687]" />
            <span>
              {language === 'fil'
                ? '✨ Bumuo ng Professional PDF Pattern'
                : '✨ Generate Professional PDF Pattern & Chart'}
            </span>
          </>
        )}
      </button>
    </div>
  );
};
