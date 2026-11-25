import React, { useState } from 'react';
import {
  FolderHeart,
  Calendar,
  Ruler,
  Palette,
  Trash2,
  ExternalLink,
  Download,
  Check,
  Sparkles,
  ArrowRight,
  Clock,
  Scale,
  Share2,
  Link2,
} from 'lucide-react';
import { PatternData, ProjectAnnotation, BackstitchSegment } from '../types';
import { calculateFabricSpecs } from '../utils/colorMatcher';
import { generatePatternPdf } from '../utils/pdfGenerator';
import { loadAnnotations, saveAnnotations } from '../utils/annotationStorage';
import { DesignComparisonModal } from './DesignComparisonModal';
import { ShareSavedDesignModal } from './ShareSavedDesignModal';

export interface SavedPatternEntry {
  id: string;
  title: string;
  coupleNames?: string;
  weddingDate?: string;
  width: number;
  height: number;
  palette: any[];
  colorStats: any[];
  totalStitches: number;
  previewUrl: string;
  fabricCount: number;
  createdDate: string;
  savedTimestamp: number;
  complexity?: any;
  gridIndices?: number[][]; // Compact representation
  grid?: any[][];
  annotations?: ProjectAnnotation[];
  backstitches?: BackstitchSegment[];
}

interface SavedDesignsGalleryProps {
  savedPatterns: SavedPatternEntry[];
  onLoadPattern: (pattern: PatternData) => void;
  onDeletePattern: (id: string) => void;
  onOpenShareModal?: (pattern: PatternData) => void;
  isPro: boolean;
  language: 'en' | 'fil';
}

export const SavedDesignsGallery: React.FC<SavedDesignsGalleryProps> = ({
  savedPatterns,
  onLoadPattern,
  onDeletePattern,
  onOpenShareModal,
  isPro,
  language,
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);
  const [comparisonAId, setComparisonAId] = useState<string | undefined>(undefined);
  const [comparisonBId, setComparisonBId] = useState<string | undefined>(undefined);
  const [sharingEntry, setSharingEntry] = useState<SavedPatternEntry | null>(null);

  const handleQuickDownloadPdf = async (entry: SavedPatternEntry) => {
    setDownloadingId(entry.id);
    try {
      // Reconstruct full pattern data if grid was saved as indices
      const palette = entry.palette;
      let grid = entry.grid;
      if (!grid && entry.gridIndices) {
        grid = entry.gridIndices.map((row) =>
          row.map((idx) => ({
            colorIndex: idx,
            dmcCode: palette[idx]?.code || palette[0]?.code,
            stitched: false,
          }))
        );
      }

      const patternAnnotations =
        entry.annotations && entry.annotations.length > 0
          ? entry.annotations
          : loadAnnotations(entry.id);

      const patternToExport: PatternData = {
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
        annotations: patternAnnotations,
        backstitches: entry.backstitches,
      };

      const blob = await generatePatternPdf(patternToExport, {
        isPro,
        language,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = (entry.coupleNames || entry.title).replace(/[^a-zA-Z0-9]/g, '_');
      a.download = isPro
        ? `${cleanTitle}_PRO_Wedding_Pattern.pdf`
        : `${cleanTitle}_Sample_Preview.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSelectToLoad = (entry: SavedPatternEntry) => {
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

    if (entry.annotations && entry.annotations.length > 0) {
      saveAnnotations(entry.id, entry.annotations);
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
      annotations: entry.annotations || loadAnnotations(entry.id),
      backstitches: entry.backstitches,
    };

    onLoadPattern(reconstructed);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E1D5] shadow-xs p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0ECE1] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8C7A6B] uppercase tracking-wider mb-1">
            <FolderHeart className="w-4 h-4 text-[#B88E3C]" />
            <span>{language === 'fil' ? 'Aking Mga Naka-save na Disenyo' : 'Saved Heirloom Designs Gallery'}</span>
          </div>
          <h2 className="font-serif text-3xl font-bold text-[#2C2523]">
            {language === 'fil' ? 'Mga Naka-save na Wedding Patterns' : 'Saved Wedding & Heirloom Patterns'}
          </h2>
          <p className="text-xs sm:text-sm text-[#5F554F] mt-1 max-w-2xl">
            {language === 'fil'
              ? 'Balikan at i-download ang inyong mga ginawang wedding cross-stitch patterns na naka-store sa inyong browser.'
              : 'Revisit, track stitching progress, or re-download your personalized wedding patterns stored in your browser.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {savedPatterns.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                setComparisonAId(savedPatterns[0]?.id);
                setComparisonBId(savedPatterns[1]?.id);
                setShowComparisonModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif font-bold text-white bg-[#2C2523] hover:bg-[#433936] rounded-lg shadow-xs transition-colors cursor-pointer"
              title={
                language === 'fil'
                  ? 'Paghambingin ang dalawang naka-save na pattern nang magkatabi'
                  : 'Compare two saved designs side-by-side'
              }
            >
              <Scale className="w-3.5 h-3.5 text-[#E6C687]" />
              <span>{language === 'fil' ? 'Paghambingin ang 2 Disenyo' : 'Compare Designs'}</span>
            </button>
          )}

          <span className="font-mono text-xs font-bold px-3 py-1 bg-[#FAF7F2] border border-[#E8E1D5] rounded-lg text-[#2C2523]">
            {savedPatterns.length} {language === 'fil' ? 'Naka-save' : 'Designs Stored'}
          </span>
        </div>
      </div>

      {/* Grid of Saved Designs */}
      {savedPatterns.length === 0 ? (
        /* Empty State */
        <div className="border-2 border-dashed border-[#D7CBB9] bg-[#FAF7F2] rounded-xl p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-white border border-[#E8E1D5] mx-auto flex items-center justify-center text-[#B88E3C] shadow-xs">
            <FolderHeart className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-xl font-bold text-[#2C2523]">
              {language === 'fil' ? 'Wala pang naka-save na disenyo' : 'No saved designs yet'}
            </h3>
            <p className="text-xs text-[#7A6E65] max-w-md mx-auto">
              {language === 'fil'
                ? 'Bumuo ng pattern sa itaas at i-click ang "I-save sa My Designs" upang itabi ito sa inyong personal na gallery.'
                : 'Generate a wedding cross-stitch pattern above and click "Save to Gallery" to bookmark and revisit your designs anytime.'}
            </p>
          </div>
          <button
            onClick={() => {
              document.getElementById('creator-workflow')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#2C2523] hover:bg-[#433936] rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <span>{language === 'fil' ? 'Bumuo ng Bagong Pattern' : 'Generate a Pattern Now'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedPatterns.map((item) => {
            const specs = calculateFabricSpecs(item.width, item.height, item.fabricCount);
            const totalSkeins = item.colorStats?.reduce((acc: number, c: any) => acc + (c.skeinsNeeded || 1), 0) || Math.ceil(item.totalStitches / 1800);
            const isDeleting = deleteConfirmId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-[#E8E1D5] hover:border-[#D7CBB9] shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Thumbnail Banner */}
                  <div className="relative aspect-4/3 bg-[#FAF7F2] overflow-hidden border-b border-[#E8E1D5]">
                    <img
                      src={item.previewUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />

                    {/* Difficulty Badge Overlay */}
                    {item.complexity && (
                      <div className="absolute top-2.5 left-2.5">
                        {item.complexity.tier === 'Beginner' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-300 backdrop-blur-xs">
                            Beginner
                          </span>
                        )}
                        {item.complexity.tier === 'Intermediate' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100/90 text-amber-900 border border-amber-300 backdrop-blur-xs">
                            Intermediate
                          </span>
                        )}
                        {item.complexity.tier === 'Masterpiece' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2C2523]/90 text-[#E6C687] border border-[#B88E3C] backdrop-blur-xs">
                            ★ Masterpiece
                          </span>
                        )}
                      </div>
                    )}

                    {/* Share Button Overlay */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSharingEntry(item);
                      }}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#2C2523] shadow-xs backdrop-blur-xs transition-all cursor-pointer border border-[#E8E1D5] hover:border-[#B88E3C] hover:text-[#B88E3C] hover:scale-105 active:scale-95"
                      title={language === 'fil' ? 'I-share ang disenyo o kopyahin ang link' : 'Share wedding design or copy direct link'}
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#B88E3C]" />
                    </button>

                    {/* Date Saved */}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs rounded text-[10px] text-white/90 font-mono">
                      {new Date(item.savedTimestamp).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h4 className="font-serif font-bold text-lg text-[#2C2523] leading-snug line-clamp-1">
                        {item.title}
                      </h4>
                      {(item.coupleNames || item.weddingDate) && (
                        <p className="text-xs text-[#7A6E65] line-clamp-1 mt-0.5">
                          {[item.coupleNames, item.weddingDate].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>

                    {/* Specs Matrix */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#F0ECE1]">
                      <div>
                        <span className="text-[#8C8077] block">Grid Size:</span>
                        <span className="font-mono font-bold text-[#2C2523]">
                          {item.width} × {item.height}
                        </span>
                        <span className="text-[10px] text-[#7A6E65] block">
                          ({item.totalStitches.toLocaleString()} stitches)
                        </span>
                      </div>

                      <div>
                        <span className="text-[#8C8077] block">Design Dimensions:</span>
                        <span className="font-mono font-bold text-[#2C2523]">
                          {specs.widthInches}" × {specs.heightInches}"
                        </span>
                        <span className="text-[10px] text-[#7A6E65] block">
                          {specs.widthCm} × {specs.heightCm} cm
                        </span>
                      </div>

                      <div className="pt-1">
                        <span className="text-[#8C8077] block">Fabric Count:</span>
                        <span className="font-medium text-[#2C2523]">
                          {item.fabricCount} Count Aida
                        </span>
                      </div>

                      <div className="pt-1">
                        <span className="text-[#8C8077] block">DMC Palette:</span>
                        <span className="font-medium text-[#2C2523]">
                          {item.palette?.length || 24} Colors · ~{totalSkeins} Skeins
                        </span>
                      </div>

                      {item.annotations && item.annotations.length > 0 && (
                        <div className="pt-1 flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-fit">
                          <span>🏷️</span>
                          <span className="font-semibold">
                            {item.annotations.length} {language === 'fil' ? 'Naka-save na Label / Tala' : 'Grid Labels & Notes'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 pt-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectToLoad(item)}
                      className="flex-1 py-2 px-3 text-xs font-serif font-bold text-white bg-[#2C2523] hover:bg-[#433936] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#E6C687]" />
                      <span>{language === 'fil' ? 'Buksan / I-load' : 'Open in Viewer'}</span>
                    </button>

                    {/* Share Button: Copy direct link & share preview image */}
                    <button
                      type="button"
                      onClick={() => setSharingEntry(item)}
                      className="p-2 text-[#5F554F] hover:text-[#2C2523] bg-[#FAF7F2] hover:bg-[#F3EFE7] border border-[#D7CBB9] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                      title={language === 'fil' ? 'I-share ang link o preview image ng pattern' : 'Share pattern direct link or preview image'}
                    >
                      <Share2 className="w-4 h-4 text-[#B88E3C]" />
                      <span className="text-xs font-semibold text-[#2C2523] hidden xl:inline">
                        {language === 'fil' ? 'I-share' : 'Share'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDownloadPdf(item)}
                      disabled={downloadingId === item.id}
                      className="p-2 text-[#5F554F] hover:text-[#2C2523] bg-[#FAF7F2] hover:bg-[#F3EFE7] border border-[#D7CBB9] rounded-lg transition-colors cursor-pointer"
                      title={language === 'fil' ? 'I-download ang PDF' : 'Download PDF Booklet'}
                    >
                      {downloadingId === item.id ? (
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>

                    {savedPatterns.length >= 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          setComparisonAId(item.id);
                          const other = savedPatterns.find((p) => p.id !== item.id);
                          setComparisonBId(other?.id);
                          setShowComparisonModal(true);
                        }}
                        className="p-2 text-[#5F554F] hover:text-[#2C2523] bg-[#FAF7F2] hover:bg-[#F3EFE7] border border-[#D7CBB9] rounded-lg transition-colors cursor-pointer"
                        title={
                          language === 'fil'
                            ? 'Paghambingin ang disenyong ito sa isa pa'
                            : 'Compare this design side-by-side'
                        }
                      >
                        <Scale className="w-4 h-4 text-[#B88E3C]" />
                      </button>
                    )}

                    {isDeleting ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onDeletePattern(item.id)}
                          className="px-2 py-1 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 text-[10px] text-[#5F554F] bg-[#FAF7F2] rounded border border-[#D7CBB9]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-2 text-[#8C8077] hover:text-red-600 bg-white hover:bg-red-50 border border-[#E8E1D5] rounded-lg transition-colors cursor-pointer"
                        title={language === 'fil' ? 'Alisin sa gallery' : 'Delete design'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Side-by-Side Design Comparison Modal */}
      <DesignComparisonModal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        savedPatterns={savedPatterns}
        onLoadPattern={onLoadPattern}
        language={language}
        initialAId={comparisonAId}
        initialBId={comparisonBId}
      />

      {/* Share Saved Design Modal */}
      <ShareSavedDesignModal
        isOpen={Boolean(sharingEntry)}
        onClose={() => setSharingEntry(null)}
        entry={sharingEntry}
        language={language}
        onOpenFullSocialStudio={onOpenShareModal}
      />
    </div>
  );
};
