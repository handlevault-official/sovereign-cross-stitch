import { PatternData, StitchGridCell, DMCColor, PatternColorStats, BackstitchSegment } from '../types';
import { DMC_PALETTE } from '../data/dmcPalette';
import { analyzePatternComplexity } from './colorMatcher';

/**
 * Recalculates all pattern statistics, palette indices, complexity metrics,
 * and thumbnail preview image after manual stitch edits.
 */
export function recalculatePattern(
  basePattern: PatternData,
  newGrid: StitchGridCell[][],
  customPalette?: DMCColor[],
  customBackstitches?: BackstitchSegment[]
): PatternData {
  const width = basePattern.width;
  const height = basePattern.height;

  // 1. Tally all dmcCodes in newGrid
  const countMap = new Map<string, number>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const code = newGrid[y][x].dmcCode;
      countMap.set(code, (countMap.get(code) || 0) + 1);
    }
  }

  // 2. Build color dictionary: DMC_PALETTE master + basePattern + custom additions
  const colorDictionary = new Map<string, DMCColor>();
  DMC_PALETTE.forEach((c) => colorDictionary.set(c.code, c));
  basePattern.palette.forEach((c) => colorDictionary.set(c.code, c));
  if (customPalette) {
    customPalette.forEach((c) => colorDictionary.set(c.code, c));
  }

  // 3. Active colors that appear at least once in the grid
  const activeDmcCodes = Array.from(countMap.keys());

  // Sort palette by frequency (most used first)
  activeDmcCodes.sort((a, b) => (countMap.get(b) || 0) - (countMap.get(a) || 0));

  const updatedPalette: DMCColor[] = activeDmcCodes.map((code, idx) => {
    const existing = colorDictionary.get(code);
    if (existing) return existing;

    // Fallback if custom unlisted code
    const fallbackSymbols = ['◆', '◇', '▲', '▼', '●', '○', '■', '□', '★', '☆', '✕', '✚'];
    return {
      code,
      name: `DMC ${code}`,
      hex: '#888888',
      r: 136,
      g: 136,
      b: 136,
      symbol: fallbackSymbols[idx % fallbackSymbols.length],
    };
  });

  const codeToPaletteIndex = new Map<string, number>();
  updatedPalette.forEach((c, idx) => codeToPaletteIndex.set(c.code, idx));

  // 4. Update grid cells with colorIndex aligned to updatedPalette
  const updatedGrid: StitchGridCell[][] = newGrid.map((row) =>
    row.map((cell) => ({
      ...cell,
      colorIndex: codeToPaletteIndex.get(cell.dmcCode) ?? 0,
    }))
  );

  const totalStitches = width * height;

  // 5. Calculate Color Stats (counts, percentages, skeins)
  const colorStats: PatternColorStats[] = updatedPalette.map((color) => {
    const count = countMap.get(color.code) || 0;
    const percentage = Number(((count / totalStitches) * 100).toFixed(1));
    const skeinsNeeded = Math.max(1, Math.ceil(count / 1800));
    return {
      color,
      count,
      percentage,
      skeinsNeeded,
    };
  });

  // 6. Generate updated previewUrl thumbnail
  let previewUrl = basePattern.previewUrl;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imgData = ctx.createImageData(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const cell = updatedGrid[y][x];
          const color = updatedPalette[cell.colorIndex] || updatedPalette[0];
          const pIdx = (y * width + x) * 4;
          imgData.data[pIdx] = color.r;
          imgData.data[pIdx + 1] = color.g;
          imgData.data[pIdx + 2] = color.b;
          imgData.data[pIdx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      previewUrl = canvas.toDataURL('image/png');
    }
  } catch (err) {
    console.error('Failed to regenerate previewUrl:', err);
  }

  // 7. Complexity analysis
  const complexity = analyzePatternComplexity(updatedGrid, width, height, updatedPalette.length);

  return {
    ...basePattern,
    grid: updatedGrid,
    palette: updatedPalette,
    colorStats,
    totalStitches,
    previewUrl,
    complexity,
    backstitches: customBackstitches !== undefined ? customBackstitches : basePattern.backstitches,
  };
}
