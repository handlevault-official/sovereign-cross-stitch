import React from 'react';
import { Layers, FileText, Lock, Check, Printer } from 'lucide-react';
import { PatternData } from '../types';

interface PageOverviewMapProps {
  pattern: PatternData;
  isPro: boolean;
  onOpenCheckout: () => void;
  onOpenPrintPreview?: (sheetNumber?: number) => void;
  language: 'en' | 'fil';
}

export const PageOverviewMap: React.FC<PageOverviewMapProps> = ({
  pattern,
  isPro,
  onOpenCheckout,
  onOpenPrintPreview,
  language,
}) => {
  const tileW = 50;
  const tileH = 70;
  const tileCols = Math.ceil(pattern.width / tileW);
  const tileRows = Math.ceil(pattern.height / tileH);
  const totalBookletSheets = tileCols * tileRows;

  return (
    <div className="bg-white rounded-xl border border-[#E8E1D5] shadow-xs p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0ECE1] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-2xl font-bold text-[#2C2523]">
              {language === 'fil' ? 'Booklet Page Layout & Tiling Map' : 'Printable Booklet Sheet Tiling Matrix'}
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#FAF7F2] border border-[#E8E1D5] rounded-md text-[#5F554F]">
              {totalBookletSheets} {language === 'fil' ? 'Pahina ng Chart' : 'Chart Sheets'}
            </span>
          </div>
          <p className="text-xs text-[#7A6E65] mt-1">
            {language === 'fil'
              ? 'Ang disenyo ay hinahati sa standard A4 / Letter pages na may 10x10 bold grid lines at 3-stitch overlapping margins.'
              : 'The heirloom tapestry is segmented into standard A4 / Letter sheets with 10x10 bold markers and 3-stitch overlap.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenPrintPreview && (
            <button
              onClick={() => onOpenPrintPreview()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2C2523] bg-[#FAF7F2] hover:bg-[#EFE9DF] border border-[#D7CBB9] rounded-lg transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-[#B88E3C]" />
              <span>{language === 'fil' ? 'Print Preview' : 'Print Preview'}</span>
            </button>
          )}

          {!isPro && (
            <button
              onClick={onOpenCheckout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>{language === 'fil' ? 'I-unlock ang Buong Booklet' : 'Unlock All Sheets (₱499)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tiling Matrix Visualization */}
      <div className="space-y-3">
        <div
          className="grid gap-2.5 max-w-xl mx-auto p-4 bg-[#FAF7F2] rounded-xl border border-[#E8E1D5]"
          style={{
            gridTemplateColumns: `repeat(${tileCols}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: tileRows }).map((_, r) =>
            Array.from({ length: tileCols }).map((_, c) => {
              const sheetNum = r * tileCols + c + 1;
              const isUnlocked = isPro || sheetNum === 1;

              const startX = c * tileW + 1;
              const endX = Math.min(pattern.width, (c + 1) * tileW);
              const startY = r * tileH + 1;
              const endY = Math.min(pattern.height, (r + 1) * tileH);

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => onOpenPrintPreview?.(sheetNum)}
                  className={`relative aspect-3/4 rounded-lg border p-2 flex flex-col justify-between transition-all cursor-pointer hover:border-[#B88E3C] hover:shadow-xs ${
                    isUnlocked
                      ? 'bg-white border-[#D7CBB9] shadow-2xs'
                      : 'bg-[#F2ECE3] border-dashed border-[#D2C5B5] opacity-75'
                  }`}
                  title={
                    language === 'fil'
                      ? `Pindutin para makita sa Print Preview (Sheet ${sheetNum})`
                      : `Click to view Sheet ${sheetNum} in Print Preview`
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-xs text-[#2C2523]">
                      Sheet {sheetNum}
                    </span>
                    {isUnlocked ? (
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    ) : (
                      <Lock className="w-3 h-3 text-[#A89C92]" />
                    )}
                  </div>

                  <div className="text-center py-2">
                    <FileText
                      className={`w-5 h-5 mx-auto ${
                        isUnlocked ? 'text-[#B88E3C]' : 'text-[#A89C92]'
                      }`}
                    />
                    <div className="text-[10px] font-mono text-[#7A6E65] mt-1">
                      X: {startX}–{endX}
                    </div>
                    <div className="text-[10px] font-mono text-[#7A6E65]">
                      Y: {startY}–{endY}
                    </div>
                  </div>

                  <div className="text-[9px] text-center font-medium text-[#8C8077] border-t border-[#F0ECE1] pt-1">
                    {isUnlocked
                      ? (sheetNum === 1 && !isPro ? 'Free Sample' : 'Print-Ready')
                      : 'PRO Unlocked'}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-[#7A6E65] pt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-xs bg-white border border-[#D7CBB9]" />
            <span>{language === 'fil' ? 'Kasama sa Download' : 'Available in Download'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-xs bg-[#F2ECE3] border border-dashed border-[#D2C5B5]" />
            <span>{language === 'fil' ? 'PRO Wedding Access Required' : 'Requires PRO Wedding License'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-[#B88E3C]" />
            <span>Standard Letter & A4 Ready (300 DPI)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
