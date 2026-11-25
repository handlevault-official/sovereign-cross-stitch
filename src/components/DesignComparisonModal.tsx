import React, { useState, useMemo } from 'react';
import {
  X,
  Columns2,
  Check,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Layers,
  Ruler,
  Clock,
  Palette,
  Scale,
  Award,
} from 'lucide-react';
import { PatternData } from '../types';
import { SavedPatternEntry } from './SavedDesignsGallery';
import { calculateFabricSpecs } from '../utils/colorMatcher';

interface DesignComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedPatterns: SavedPatternEntry[];
  currentPatternId?: string;
  onLoadPattern: (pattern: PatternData) => void;
  language: 'en' | 'fil';
  initialAId?: string;
  initialBId?: string;
}

export const DesignComparisonModal: React.FC<DesignComparisonModalProps> = ({
  isOpen,
  onClose,
  savedPatterns,
  currentPatternId,
  onLoadPattern,
  language,
  initialAId,
  initialBId,
}) => {
  // Default to first two designs if available
  const [selectedAId, setSelectedAId] = useState<string>(
    initialAId || savedPatterns[0]?.id || ''
  );
  const [selectedBId, setSelectedBId] = useState<string>(
    initialBId || (savedPatterns.length > 1 ? savedPatterns[1].id : savedPatterns[0]?.id || '')
  );

  // Sync state if initial IDs change
  React.useEffect(() => {
    if (initialAId) setSelectedAId(initialAId);
    if (initialBId) setSelectedBId(initialBId);
  }, [initialAId, initialBId]);

  if (!isOpen) return null;

  const designA = savedPatterns.find((p) => p.id === selectedAId) || savedPatterns[0];
  const designB =
    savedPatterns.find((p) => p.id === selectedBId) ||
    savedPatterns.find((p) => p.id !== selectedAId) ||
    savedPatterns[0];

  const specsA = designA ? calculateFabricSpecs(designA.width, designA.height, designA.fabricCount) : null;
  const specsB = designB ? calculateFabricSpecs(designB.width, designB.height, designB.fabricCount) : null;

  const skeinsA =
    designA?.colorStats?.reduce((acc: number, c: any) => acc + (c.skeinsNeeded || 1), 0) ||
    (designA ? Math.ceil(designA.totalStitches / 1800) : 0);

  const skeinsB =
    designB?.colorStats?.reduce((acc: number, c: any) => acc + (c.skeinsNeeded || 1), 0) ||
    (designB ? Math.ceil(designB.totalStitches / 1800) : 0);

  // Shared DMC color codes
  const sharedColors = useMemo(() => {
    if (!designA || !designB) return [];
    const setA = new Set(designA.palette.map((c: any) => c.code));
    return designB.palette.filter((c: any) => setA.has(c.code));
  }, [designA, designB]);

  const handleLoad = (entry: SavedPatternEntry) => {
    let grid = entry.grid;
    if (!grid && entry.gridIndices) {
      grid = entry.gridIndices.map((row) =>
        row.map((idx) => ({
          colorIndex: idx,
          dmcCode: entry.palette[idx]?.code || entry.palette[0]?.code,
          stitched: false,
        }))
      );
    }

    const reconstructed: PatternData = {
      id: entry.id,
      title: entry.title,
      coupleNames: entry.coupleNames,
      weddingDate: entry.weddingDate,
      width: entry.width,
      height: entry.height,
      grid: grid || [],
      palette: entry.palette,
      colorStats: entry.colorStats,
      totalStitches: entry.totalStitches,
      previewUrl: entry.previewUrl,
      fabricCount: entry.fabricCount,
      createdDate: entry.createdDate,
      complexity: entry.complexity,
    };

    onLoadPattern(reconstructed);
    onClose();
  };

  // Diff metrics
  const stitchDiff = (designB?.totalStitches || 0) - (designA?.totalStitches || 0);
  const stitchPercentDiff =
    designA?.totalStitches && designA.totalStitches > 0
      ? Math.round((stitchDiff / designA.totalStitches) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="bg-white rounded-2xl border border-[#E8E1D5] shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col my-auto max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-[#FAF7F2] border-b border-[#E8E1D5] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2C2523] text-[#E6C687] flex items-center justify-center shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg sm:text-xl text-[#2C2523]">
                {language === 'fil'
                  ? 'Paghambingin ang Dalawang Disenyo (Side-by-Side)'
                  : 'Side-by-Side Pattern Comparison'}
              </h3>
              <p className="text-xs text-[#7A6E65]">
                {language === 'fil'
                  ? 'Suriin ang grid, sukat ng tela, at complexity rating bago simulan ang pananahi.'
                  : 'Compare dimensions, fabric sizes, skeins, and difficulty ratings between saved projects.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#7A6E65] hover:text-[#2C2523] rounded-lg hover:bg-[#EAE2D5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Design Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FBF9F5] p-3.5 rounded-xl border border-[#E8E1D5]">
            <div>
              <label className="block text-xs font-bold text-[#5F554F] uppercase tracking-wider mb-1.5">
                {language === 'fil' ? 'Pumili ng Unang Disenyo (Design A):' : 'Select Design A:'}
              </label>
              <select
                value={selectedAId}
                onChange={(e) => setSelectedAId(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-lg border border-[#D7CBB9] text-xs font-semibold text-[#2C2523] focus:ring-2 focus:ring-[#B88E3C] focus:outline-none"
              >
                {savedPatterns.map((p) => (
                  <option key={`a-${p.id}`} value={p.id}>
                    {p.title} ({p.width}x{p.height} · {p.fabricCount}ct)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5F554F] uppercase tracking-wider mb-1.5">
                {language === 'fil' ? 'Pumili ng Pangalawang Disenyo (Design B):' : 'Select Design B:'}
              </label>
              <select
                value={selectedBId}
                onChange={(e) => setSelectedBId(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-lg border border-[#D7CBB9] text-xs font-semibold text-[#2C2523] focus:ring-2 focus:ring-[#B88E3C] focus:outline-none"
              >
                {savedPatterns.map((p) => (
                  <option key={`b-${p.id}`} value={p.id}>
                    {p.title} ({p.width}x{p.height} · {p.fabricCount}ct)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {designA && designB ? (
            <div className="space-y-6">
              {/* Top Side-by-Side Visual Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* DESIGN A CARD */}
                <div className="border border-[#E0D7C9] rounded-xl p-4 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF7F2] border border-[#D7CBB9] text-[#7A6E65]">
                      Design A
                    </span>
                    {designA.id === currentPatternId && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                        ✓ Currently Active
                      </span>
                    )}
                  </div>

                  <div className="aspect-16/10 rounded-lg overflow-hidden border border-[#E8E1D5] bg-[#FAF7F2]">
                    <img
                      src={designA.previewUrl}
                      alt={designA.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div>
                    <h4 className="font-serif font-bold text-base text-[#2C2523]">{designA.title}</h4>
                    {(designA.coupleNames || designA.weddingDate) && (
                      <p className="text-xs text-[#7A6E65] mt-0.5">
                        {[designA.coupleNames, designA.weddingDate].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLoad(designA)}
                    className="w-full py-2 px-3 text-xs font-serif font-bold text-white bg-[#2C2523] hover:bg-[#433936] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#E6C687]" />
                    <span>{language === 'fil' ? 'I-load ang Design A' : 'Load Design A into Viewer'}</span>
                  </button>
                </div>

                {/* DESIGN B CARD */}
                <div className="border border-[#E0D7C9] rounded-xl p-4 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF7F2] border border-[#D7CBB9] text-[#7A6E65]">
                      Design B
                    </span>
                    {designB.id === currentPatternId && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                        ✓ Currently Active
                      </span>
                    )}
                  </div>

                  <div className="aspect-16/10 rounded-lg overflow-hidden border border-[#E8E1D5] bg-[#FAF7F2]">
                    <img
                      src={designB.previewUrl}
                      alt={designB.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div>
                    <h4 className="font-serif font-bold text-base text-[#2C2523]">{designB.title}</h4>
                    {(designB.coupleNames || designB.weddingDate) && (
                      <p className="text-xs text-[#7A6E65] mt-0.5">
                        {[designB.coupleNames, designB.weddingDate].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLoad(designB)}
                    className="w-full py-2 px-3 text-xs font-serif font-bold text-white bg-[#2C2523] hover:bg-[#433936] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#E6C687]" />
                    <span>{language === 'fil' ? 'I-load ang Design B' : 'Load Design B into Viewer'}</span>
                  </button>
                </div>
              </div>

              {/* COMPARISON METRICS TABLE */}
              <div className="border border-[#E8E1D5] rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF7F2] border-b border-[#E8E1D5] text-[#5F554F] font-bold">
                      <th className="py-2.5 px-4 w-1/3">
                        {language === 'fil' ? 'Aspeto ng Paghahambing' : 'Comparison Metric'}
                      </th>
                      <th className="py-2.5 px-4 w-1/3 text-[#2C2523]">Design A</th>
                      <th className="py-2.5 px-4 w-1/3 text-[#2C2523]">Design B</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE1]">
                    {/* Grid Dimensions */}
                    <tr className="hover:bg-[#FAF7F2]">
                      <td className="py-2.5 px-4 font-semibold text-[#5F554F] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#B88E3C]" />
                        <span>Grid Dimensions</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[#2C2523]">
                        {designA.width} × {designA.height} stitches
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[#2C2523]">
                        {designB.width} × {designB.height} stitches
                      </td>
                    </tr>

                    {/* Total Stitches */}
                    <tr className="hover:bg-[#FAF7F2]">
                      <td className="py-2.5 px-4 font-semibold text-[#5F554F]">
                        {language === 'fil' ? 'Kabuuang Bilang ng Tahi' : 'Total Stitches'}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[#2C2523]">
                        {designA.totalStitches.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[#2C2523]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{designB.totalStitches.toLocaleString()}</span>
                          {stitchDiff !== 0 && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                stitchDiff > 0
                                  ? 'bg-amber-100 text-amber-900 font-bold'
                                  : 'bg-emerald-100 text-emerald-900 font-bold'
                              }`}
                            >
                              {stitchDiff > 0 ? `+${stitchPercentDiff}%` : `${stitchPercentDiff}%`}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Aida Fabric Count */}
                    <tr className="hover:bg-[#FAF7F2]">
                      <td className="py-2.5 px-4 font-semibold text-[#5F554F] flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5 text-[#B88E3C]" />
                        <span>Aida Fabric Count</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-[#2C2523]">
                        {designA.fabricCount} Count
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-[#2C2523]">
                        {designB.fabricCount} Count
                      </td>
                    </tr>

                    {/* Finished Stitched Dimensions */}
                    <tr className="hover:bg-[#FAF7F2]">
                      <td className="py-2.5 px-4 font-semibold text-[#5F554F]">
                        {language === 'fil' ? 'Sukat ng Burda (Inches)' : 'Embroidered Size (Inches)'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[#2C2523]">
                        {specsA?.widthInches}" × {specsA?.heightInches}"
                        <span className="text-[10px] text-[#8C8077] block">
                          ({specsA?.widthCm} × {specsA?.heightCm} cm)
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[#2C2523]">
                        {specsB?.widthInches}" × {specsB?.heightInches}"
                        <span className="text-[10px] text-[#8C8077] block">
                          ({specsB?.widthCm} × {specsB?.heightCm} cm)
                        </span>
                      </td>
                    </tr>

                    {/* Cut Fabric Size (+3" for framing) */}
                    <tr className="hover:bg-[#FAF7F2]">
                      <td className="py-2.5 px-4 font-semibold text-[#5F554F]">
                        {language === 'fil' ? 'Sukat ng Telang Puputulin (+3")' : 'Cut Fabric for Framing (+3")'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[#2C2523]">
                        {specsA?.cutFabricInchesW}" × {specsA?.cutFabricInchesH}"
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[#2C2523]">
                        {specsB?.cutFabricInchesW}" × {specsB?.cutFabricInchesH}"
                      </td>
                    </tr>

                    {/* DMC Palette Size */}
                    <tr className="hover:bg-[#FAF7F2]">
                      <td className="py-2.5 px-4 font-semibold text-[#5F554F] flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-[#B88E3C]" />
                        <span>DMC Palette Colors</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[#2C2523]">
                        {designA.palette.length} Colors
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[#2C2523]">
                        {designB.palette.length} Colors
                      </td>
                    </tr>

                    {/* Total Skeins Needed */}
                    <tr className="hover:bg-[#FAF7F2]">
                      <td className="py-2.5 px-4 font-semibold text-[#5F554F]">
                        {language === 'fil' ? 'Kailangang Sinulid (Skeins)' : 'Estimated Total Skeins'}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[#2C2523]">
                        ~{skeinsA} skeins
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[#2C2523]">
                        ~{skeinsB} skeins
                      </td>
                    </tr>

                    {/* Complexity Rating & Tier */}
                    <tr className="hover:bg-[#FAF7F2]">
                      <td className="py-2.5 px-4 font-semibold text-[#5F554F] flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-[#B88E3C]" />
                        <span>Difficulty Tier</span>
                      </td>
                      <td className="py-2.5 px-4">
                        {designA.complexity?.tier === 'Beginner' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Beginner
                          </span>
                        )}
                        {designA.complexity?.tier === 'Intermediate' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                            Intermediate
                          </span>
                        )}
                        {designA.complexity?.tier === 'Masterpiece' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2C2523] text-[#E6C687]">
                            ★ Heirloom Masterpiece
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {designB.complexity?.tier === 'Beginner' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Beginner
                          </span>
                        )}
                        {designB.complexity?.tier === 'Intermediate' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                            Intermediate
                          </span>
                        )}
                        {designB.complexity?.tier === 'Masterpiece' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2C2523] text-[#E6C687]">
                            ★ Heirloom Masterpiece
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Confetti Frequency */}
                    <tr className="hover:bg-[#FAF7F2]">
                      <td className="py-2.5 px-4 font-semibold text-[#5F554F]">Confetti Level</td>
                      <td className="py-2.5 px-4 text-[#2C2523]">
                        {designA.complexity ? `${designA.complexity.confettiPercentage}% · ${designA.complexity.confettiLevel}` : 'Standard'}
                      </td>
                      <td className="py-2.5 px-4 text-[#2C2523]">
                        {designB.complexity ? `${designB.complexity.confettiPercentage}% · ${designB.complexity.confettiLevel}` : 'Standard'}
                      </td>
                    </tr>

                    {/* Estimated Duration */}
                    <tr className="hover:bg-[#FAF7F2]">
                      <td className="py-2.5 px-4 font-semibold text-[#5F554F] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#B88E3C]" />
                        <span>Timeline Expectation</span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-[#2C2523]">
                        {designA.complexity?.estimatedMonths || '~3-5 Months'}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-[#2C2523]">
                        {designB.complexity?.estimatedMonths || '~3-5 Months'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Shared Thread Overlap Highlight */}
              <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#2C2523]">
                  <span>🧵</span>
                  <span>
                    {language === 'fil'
                      ? `Pagbabahagi ng Sinulid (${sharedColors.length} parehong DMC kulay)`
                      : `Floss Synergy (${sharedColors.length} shared DMC colors between designs)`}
                  </span>
                </div>
                <p className="text-[#7A6E65]">
                  {language === 'fil'
                    ? `Maaari mong gamitin ang parehong skeins para sa parehong disenyo nang walang pag-aaksaya.`
                    : `Both projects overlap on ${sharedColors.length} floss shades, making it economical to kit together.`}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {sharedColors.slice(0, 16).map((c: any) => (
                    <span
                      key={c.code}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#D7CBB9] font-mono text-[11px]"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/20"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>DMC {c.code}</span>
                    </span>
                  ))}
                  {sharedColors.length > 16 && (
                    <span className="text-[11px] text-[#7A6E65] pl-1">
                      +{sharedColors.length - 16} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-[#7A6E65]">
              {language === 'fil'
                ? 'Kailangan ng hindi bababa sa 2 naka-save na disenyo upang makapaghambing.'
                : 'At least two saved patterns are needed for comparison.'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#FAF7F2] border-t border-[#E8E1D5] px-6 py-3.5 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-serif text-xs font-bold text-white bg-[#2C2523] hover:bg-[#433936] transition-colors cursor-pointer"
          >
            {language === 'fil' ? 'Isara' : 'Close Comparison'}
          </button>
        </div>
      </div>
    </div>
  );
};
