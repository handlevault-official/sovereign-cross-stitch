import { DMC_PALETTE } from '../data/dmcPalette';
import { ComplexityAnalysis, DifficultyTier, DMCColor, FabricSpecs, PatternColorStats, PatternData, StitchGridCell } from '../types';

// Convert RGB to Lab for accurate perceptual color difference
function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  let rL = r / 255;
  let gL = g / 255;
  let bL = b / 255;

  rL = rL > 0.04045 ? Math.pow((rL + 0.055) / 1.055, 2.4) : rL / 12.92;
  gL = gL > 0.04045 ? Math.pow((gL + 0.055) / 1.055, 2.4) : gL / 12.92;
  bL = bL > 0.04045 ? Math.pow((bL + 0.055) / 1.055, 2.4) : bL / 12.92;

  rL *= 100;
  gL *= 100;
  bL *= 100;

  const x = rL * 0.4124 + gL * 0.3576 + bL * 0.1805;
  const y = rL * 0.2126 + gL * 0.7152 + bL * 0.0722;
  const z = rL * 0.0193 + gL * 0.1192 + bL * 0.9505;

  return [x, y, z];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const refX = 95.047;
  const refY = 100.0;
  const refZ = 108.883;

  let xR = x / refX;
  let yR = y / refY;
  let zR = z / refZ;

  xR = xR > 0.008856 ? Math.pow(xR, 1 / 3) : 7.787 * xR + 16 / 116;
  yR = yR > 0.008856 ? Math.pow(yR, 1 / 3) : 7.787 * yR + 16 / 116;
  zR = zR > 0.008856 ? Math.pow(zR, 1 / 3) : 7.787 * zR + 16 / 116;

  const L = 116 * yR - 16;
  const a = 500 * (xR - yR);
  const b = 200 * (yR - zR);

  return [L, a, b];
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

// Delta E (CIE76)
function deltaE(labA: [number, number, number], labB: [number, number, number]): number {
  const dL = labA[0] - labB[0];
  const da = labA[1] - labB[1];
  const db = labA[2] - labB[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

// Precompute DMC Lab values
const dmcLabCache = new Map<string, [number, number, number]>();
DMC_PALETTE.forEach((color) => {
  dmcLabCache.set(color.code, rgbToLab(color.r, color.g, color.b));
});

export function findClosestDMC(r: number, g: number, b: number, allowedPalette: DMCColor[] = DMC_PALETTE): DMCColor {
  const pixelLab = rgbToLab(r, g, b);
  let bestDist = Infinity;
  let bestColor = allowedPalette[0];

  for (const candidate of allowedPalette) {
    const candidateLab = dmcLabCache.get(candidate.code) || rgbToLab(candidate.r, candidate.g, candidate.b);
    const dist = deltaE(pixelLab, candidateLab);
    if (dist < bestDist) {
      bestDist = dist;
      bestColor = candidate;
    }
  }

  return bestColor;
}

export function calculateFabricSpecs(widthStitches: number, heightStitches: number, count: number): FabricSpecs {
  const widthInches = Number((widthStitches / count).toFixed(1));
  const heightInches = Number((heightStitches / count).toFixed(1));
  const widthCm = Number((widthInches * 2.54).toFixed(1));
  const heightCm = Number((heightInches * 2.54).toFixed(1));
  const cutFabricInchesW = Number((widthInches + 6).toFixed(1));
  const cutFabricInchesH = Number((heightInches + 6).toFixed(1));

  let recommendedFrame = '12" Round Working Hoop';
  if (widthInches > 20 || heightInches > 20) {
    recommendedFrame = `Custom Heirloom Frame (${Math.ceil(widthInches + 4)}" x ${Math.ceil(heightInches + 4)}")`;
  } else if (widthInches > 14 || heightInches > 14) {
    recommendedFrame = `16" x 20" Standard Frame`;
  } else if (widthInches > 9 || heightInches > 9) {
    recommendedFrame = `11" x 14" Standard Frame`;
  } else {
    recommendedFrame = `8" x 10" Standard Frame or 10" Hoop`;
  }

  return {
    count,
    widthInches,
    heightInches,
    widthCm,
    heightCm,
    cutFabricInchesW,
    cutFabricInchesH,
    recommendedFrame,
  };
}

export function analyzePatternComplexity(
  grid: StitchGridCell[][],
  width: number,
  height: number,
  colorCount: number
): ComplexityAnalysis {
  const totalStitches = width * height;
  let isolatedStitches = 0;

  // Scan 4-connected neighbors for identical color
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const code = grid[y][x].dmcCode;
      let matchingNeighbors = 0;
      if (x > 0 && grid[y][x - 1].dmcCode === code) matchingNeighbors++;
      if (x < width - 1 && grid[y][x + 1].dmcCode === code) matchingNeighbors++;
      if (y > 0 && grid[y - 1][x].dmcCode === code) matchingNeighbors++;
      if (y < height - 1 && grid[y + 1][x].dmcCode === code) matchingNeighbors++;

      // If stitch has 0 or 1 matching orthogonal neighbor, it is considered confetti (isolated speckle)
      if (matchingNeighbors <= 1) {
        isolatedStitches++;
      }
    }
  }

  const confettiPercentage = Number(((isolatedStitches / totalStitches) * 100).toFixed(1));

  let confettiLevel: 'Low (Smooth Blocks)' | 'Moderate (Fine Shading)' | 'High (Intricate Confetti)' = 'Low (Smooth Blocks)';
  if (confettiPercentage > 35) {
    confettiLevel = 'High (Intricate Confetti)';
  } else if (confettiPercentage > 18) {
    confettiLevel = 'Moderate (Fine Shading)';
  }

  // Scoring algorithm based on stitches, colors, and confetti
  let score = 0;
  if (totalStitches > 85000) score += 4;
  else if (totalStitches > 40000) score += 3;
  else if (totalStitches > 18000) score += 2;
  else score += 1;

  if (colorCount >= 36) score += 3;
  else if (colorCount >= 22) score += 2;
  else score += 1;

  if (confettiPercentage >= 35) score += 3;
  else if (confettiPercentage >= 18) score += 2;
  else score += 1;

  let tier: DifficultyTier = 'Intermediate';
  let tagalogTier = 'Pang-Gitna (Intermediate)';
  let estimatedMonths = '~2 – 5 Buwan (Classic Project)';
  let stitchingAdvice = 'Good balance of relaxing solid color blocks and detailed facial / floral accents.';
  let tagalogAdvice = 'Balanseng pananahi na may malalaking color blocks at kaunting pinong confetti shading sa mukha at bulaklak.';

  if (score <= 4 || (totalStitches <= 16000 && colorCount <= 18)) {
    tier = 'Beginner';
    tagalogTier = 'Pang-Baguhan (Beginner Friendly)';
    estimatedMonths = '~2 – 4 Linggo (Quick Keepsake)';
    stitchingAdvice = 'Wide color patches and minimal thread switching. Excellent for first-time heirloom creators!';
    tagalogAdvice = 'Malalapad ang mga patch ng kulay at kaunti ang pagpapalit ng sinulid. Tamang-tama para sa mga baguhan!';
  } else if (score >= 8 || totalStitches >= 60000 || colorCount >= 42) {
    tier = 'Masterpiece';
    tagalogTier = 'Heirloom Masterpiece (1-Taon)';
    estimatedMonths = '~8 – 14 Buwan (1-Year Commitment)';
    stitchingAdvice = 'Museum-grade photographic tapestry with dense confetti shading. Recommended: Floss organizer bobbins & parking method.';
    tagalogAdvice = 'Tunay na museum-grade obra na may detalyadong confetti shading. Inirerekomenda ang parking method at floss bobbins.';
  }

  return {
    tier,
    tagalogTier,
    confettiPercentage,
    confettiLevel,
    colorCount,
    totalStitches,
    estimatedMonths,
    stitchingAdvice,
    tagalogAdvice,
    score,
  };
}

/**
 * Smart Noise Reduction for Cross Stitch Patterns.
 * Automatically identifies isolated single-stitch "confetti" colors (speckles where a specified
 * number of adjacent stitches are of a different color) and replaces them with the surrounding dominant color.
 * If there is a tie among dominant colors, the color closest in perceptual Delta-E (Lab) is chosen
 * to ensure smooth and aesthetically natural gradient transitions.
 *
 * @param strength Number of cleanup passes (1 to 4)
 * @param confettiThreshold Numeric threshold (e.g., 5 to 8) specifying how many adjacent stitches
 *                           out of 8 must be different for a stitch to be flagged as noise.
 */
export function applySmartNoiseReduction(
  grid: StitchGridCell[][],
  palette: DMCColor[],
  strength: number,
  confettiThreshold: number = 7
): { cleanedGrid: StitchGridCell[][]; replacedCount: number } {
  if (strength <= 0 || grid.length === 0 || grid[0].length === 0) {
    return { cleanedGrid: grid, replacedCount: 0 };
  }

  const height = grid.length;
  const width = grid[0].length;
  const clampedThreshold = Math.max(4, Math.min(8, Math.round(confettiThreshold || 7)));

  // Palette map for quick Lab lookups
  const paletteMap = new Map<string, DMCColor>();
  palette.forEach((c) => paletteMap.set(c.code, c));

  // Clone grid
  let currentGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
  let totalReplaced = 0;

  // Number of passes based on strength (1 to 4)
  const passes = Math.min(4, Math.max(1, Math.round(strength)));

  for (let pass = 1; pass <= passes; pass++) {
    let passReplaced = 0;
    const nextGrid = currentGrid.map((row) => row.map((cell) => ({ ...cell })));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const centerCell = currentGrid[y][x];
        const centerColorCode = centerCell.dmcCode;
        const centerColor = paletteMap.get(centerColorCode) || palette[centerCell.colorIndex] || palette[0];
        const centerLab = dmcLabCache.get(centerColor.code) || rgbToLab(centerColor.r, centerColor.g, centerColor.b);

        // Gather neighbors in 3x3 window (excluding center)
        const neighborCounts = new Map<string, { count: number; colorIndex: number }>();
        let matchingNeighbors = 0;
        let matchingOrthogonal = 0;
        let totalNeighbors = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              totalNeighbors++;
              const nCell = currentGrid[ny][nx];
              const nCode = nCell.dmcCode;

              const isOrthogonal = dx === 0 || dy === 0;

              if (nCode === centerColorCode) {
                matchingNeighbors++;
                if (isOrthogonal) {
                  matchingOrthogonal++;
                }
              } else {
                const existing = neighborCounts.get(nCode) || { count: 0, colorIndex: nCell.colorIndex };
                // Give orthogonal neighbors slightly more weight (1.4x) to favor horizontal/vertical stitch continuity
                existing.count += isOrthogonal ? 1.4 : 1.0;
                neighborCounts.set(nCode, existing);
              }
            }
          }
        }

        // Determine if this cell is an isolated confetti stitch using the numeric sensitivity threshold:
        // How many adjacent stitches must be different for a color to be considered noise and auto-replaced.
        const differentNeighbors = totalNeighbors - matchingNeighbors;
        const requiredDifferent = totalNeighbors === 8
          ? clampedThreshold
          : Math.max(1, Math.round((clampedThreshold / 8) * totalNeighbors));

        let isConfetti = differentNeighbors >= requiredDifferent;

        // In subsequent passes (pass >= 2), also catch remaining isolated spurs that now meet the condition
        if (!isConfetti && pass >= 2) {
          if (matchingOrthogonal === 0 && differentNeighbors >= Math.max(requiredDifferent - 1, 4)) {
            isConfetti = true;
          }
        }

        if (isConfetti && neighborCounts.size > 0) {
          // Find dominant neighbor color
          let maxCount = -1;
          const candidates: { code: string; colorIndex: number }[] = [];

          for (const [nCode, data] of neighborCounts) {
            if (data.count > maxCount) {
              maxCount = data.count;
              candidates.length = 0;
              candidates.push({ code: nCode, colorIndex: data.colorIndex });
            } else if (Math.abs(data.count - maxCount) < 0.01) {
              candidates.push({ code: nCode, colorIndex: data.colorIndex });
            }
          }

          if (candidates.length > 0) {
            let bestCandidate = candidates[0];

            // If there's a tie, choose candidate with lowest perceptual color difference (Delta-E) to center pixel
            if (candidates.length > 1) {
              let minDeltaE = Infinity;
              for (const cand of candidates) {
                const candColor = paletteMap.get(cand.code) || palette[cand.colorIndex];
                if (candColor) {
                  const candLab = dmcLabCache.get(candColor.code) || rgbToLab(candColor.r, candColor.g, candColor.b);
                  const dist = deltaE(centerLab, candLab);
                  if (dist < minDeltaE) {
                    minDeltaE = dist;
                    bestCandidate = cand;
                  }
                }
              }
            }

            nextGrid[y][x] = {
              colorIndex: bestCandidate.colorIndex,
              dmcCode: bestCandidate.code,
              stitched: centerCell.stitched,
            };
            passReplaced++;
          }
        }
      }
    }

    currentGrid = nextGrid;
    totalReplaced += passReplaced;

    // Stop early if no more confetti was replaced in this pass
    if (passReplaced === 0) break;
  }

  return { cleanedGrid: currentGrid, replacedCount: totalReplaced };
}

/**
 * Applies Smart Noise Reduction to an existing PatternData object and recalculates
 * color frequencies, preview canvas image, and complexity metrics.
 */
export function cleanPatternConfetti(
  pattern: PatternData,
  strength: number,
  confettiThreshold: number = 7
): PatternData {
  if (strength <= 0) return pattern;

  const { cleanedGrid, replacedCount } = applySmartNoiseReduction(pattern.grid, pattern.palette, strength, confettiThreshold);
  if (replacedCount === 0) {
    return {
      ...pattern,
      noiseReductionLevel: strength,
      confettiThreshold,
    };
  }

  const totalStitches = pattern.width * pattern.height;
  const countMap = new Map<string, number>();

  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < pattern.width; x++) {
      const code = cleanedGrid[y][x].dmcCode;
      countMap.set(code, (countMap.get(code) || 0) + 1);
    }
  }

  const updatedStats = pattern.palette
    .map((color) => {
      const count = countMap.get(color.code) || 0;
      const percentage = Number(((count / totalStitches) * 100).toFixed(1));
      const skeinsNeeded = Math.max(1, Math.ceil(count / 1800));
      return {
        color,
        count,
        percentage,
        skeinsNeeded,
      };
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);

  let previewUrl = pattern.previewUrl;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = pattern.width;
    canvas.height = pattern.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imgData = ctx.createImageData(pattern.width, pattern.height);
      const palMap = new Map<string, DMCColor>();
      pattern.palette.forEach((c) => palMap.set(c.code, c));
      for (let y = 0; y < pattern.height; y++) {
        for (let x = 0; x < pattern.width; x++) {
          const cell = cleanedGrid[y][x];
          const col = palMap.get(cell.dmcCode) || pattern.palette[0];
          const idx = (y * pattern.width + x) * 4;
          imgData.data[idx] = col.r;
          imgData.data[idx + 1] = col.g;
          imgData.data[idx + 2] = col.b;
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      previewUrl = canvas.toDataURL('image/png');
    }
  } catch (e) {
    console.warn('Could not re-render preview image for cleaned pattern:', e);
  }

  const updatedComplexity = analyzePatternComplexity(cleanedGrid, pattern.width, pattern.height, pattern.palette.length);
  updatedComplexity.confettiReducedCount = (pattern.cleanedConfettiCount || 0) + replacedCount;

  return {
    ...pattern,
    grid: cleanedGrid,
    colorStats: updatedStats,
    previewUrl,
    complexity: updatedComplexity,
    noiseReductionLevel: strength,
    confettiThreshold,
    cleanedConfettiCount: (pattern.cleanedConfettiCount || 0) + replacedCount,
  };
}

export async function processImageToPattern(
  imageSource: string | File,
  targetWidth: number,
  targetHeight: number,
  maxColors: number,
  fabricCount: number,
  meta?: { title?: string; coupleNames?: string; weddingDate?: string },
  noiseReduction: number = 0,
  confettiThreshold: number = 7
): Promise<PatternData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // Image smoothing enabled for photographic resampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imgData.data;

        // Step 1: Initial pass to match all pixels to full DMC palette and gather frequencies
        const dmcCountMap = new Map<string, { color: DMCColor; count: number }>();

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Treat transparent or semi-transparent as white canvas
          const effR = a < 128 ? 255 : r;
          const effG = a < 128 ? 255 : g;
          const effB = a < 128 ? 255 : b;

          const closest = findClosestDMC(effR, effG, effB, DMC_PALETTE);
          const entry = dmcCountMap.get(closest.code) || { color: closest, count: 0 };
          entry.count += 1;
          dmcCountMap.set(closest.code, entry);
        }

        // Step 2: Sort colors by frequency and prune down to maxColors
        const sortedColors = Array.from(dmcCountMap.values())
          .sort((a, b) => b.count - a.count)
          .map((item) => item.color);

        const activePalette = sortedColors.slice(0, Math.min(maxColors, sortedColors.length));

        // Step 3: Second pass with Floyd-Steinberg dithering or nearest neighbor into activePalette
        const grid: StitchGridCell[][] = [];
        const finalColorCountMap = new Map<string, number>();

        // Copy pixel buffer as float for dithering error distribution
        const buffer = new Float32Array(targetWidth * targetHeight * 3);
        for (let y = 0; y < targetHeight; y++) {
          for (let x = 0; x < targetWidth; x++) {
            const idx = (y * targetWidth + x) * 4;
            const bIdx = (y * targetWidth + x) * 3;
            const a = data[idx + 3];
            buffer[bIdx] = a < 128 ? 255 : data[idx];
            buffer[bIdx + 1] = a < 128 ? 255 : data[idx + 1];
            buffer[bIdx + 2] = a < 128 ? 255 : data[idx + 2];
          }
        }

        for (let y = 0; y < targetHeight; y++) {
          const row: StitchGridCell[] = [];
          for (let x = 0; x < targetWidth; x++) {
            const bIdx = (y * targetWidth + x) * 3;
            const oldR = Math.max(0, Math.min(255, buffer[bIdx]));
            const oldG = Math.max(0, Math.min(255, buffer[bIdx + 1]));
            const oldB = Math.max(0, Math.min(255, buffer[bIdx + 2]));

            const match = findClosestDMC(oldR, oldG, oldB, activePalette);
            const paletteIdx = activePalette.findIndex((c) => c.code === match.code);

            row.push({
              colorIndex: paletteIdx >= 0 ? paletteIdx : 0,
              dmcCode: match.code,
              stitched: false,
            });

            finalColorCountMap.set(match.code, (finalColorCountMap.get(match.code) || 0) + 1);

            // Subtle error diffusion (0.4 strength to avoid noisy grain)
            const errR = (oldR - match.r) * 0.35;
            const errG = (oldG - match.g) * 0.35;
            const errB = (oldB - match.b) * 0.35;

            const distributeError = (nx: number, ny: number, factor: number) => {
              if (nx >= 0 && nx < targetWidth && ny >= 0 && ny < targetHeight) {
                const nIdx = (ny * targetWidth + nx) * 3;
                buffer[nIdx] += errR * factor;
                buffer[nIdx + 1] += errG * factor;
                buffer[nIdx + 2] += errB * factor;
              }
            };

            distributeError(x + 1, y, 7 / 16);
            distributeError(x - 1, y + 1, 3 / 16);
            distributeError(x, y + 1, 5 / 16);
            distributeError(x + 1, y + 1, 1 / 16);
          }
          grid.push(row);
        }

        // Apply Smart Noise Reduction (Confetti Cleaning)
        let cleanedCount = 0;
        if (noiseReduction > 0) {
          const cleanResult = applySmartNoiseReduction(grid, activePalette, noiseReduction, confettiThreshold);
          grid.splice(0, grid.length, ...cleanResult.cleanedGrid);
          cleanedCount = cleanResult.replacedCount;

          // Re-populate color counts from the cleaned grid
          finalColorCountMap.clear();
          for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
              const code = grid[y][x].dmcCode;
              finalColorCountMap.set(code, (finalColorCountMap.get(code) || 0) + 1);
            }
          }
        }

        const totalStitches = targetWidth * targetHeight;

        // Build stats
        const colorStats: PatternColorStats[] = activePalette
          .map((color) => {
            const count = finalColorCountMap.get(color.code) || 0;
            const percentage = Number(((count / totalStitches) * 100).toFixed(1));
            // Standard DMC skein = 8m (6 strands), used 2-strands = 24m. At 14ct ~1800 stitches/skein
            const skeinsNeeded = Math.max(1, Math.ceil(count / 1800));
            return {
              color,
              count,
              percentage,
              skeinsNeeded,
            };
          })
          .filter((stat) => stat.count > 0)
          .sort((a, b) => b.count - a.count);

        // Render preview canvas
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = targetWidth;
        previewCanvas.height = targetHeight;
        const pCtx = previewCanvas.getContext('2d');
        if (pCtx) {
          const pImgData = pCtx.createImageData(targetWidth, targetHeight);
          for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
              const cell = grid[y][x];
              const col = activePalette[cell.colorIndex] || activePalette[0];
              const pIdx = (y * targetWidth + x) * 4;
              pImgData.data[pIdx] = col.r;
              pImgData.data[pIdx + 1] = col.g;
              pImgData.data[pIdx + 2] = col.b;
              pImgData.data[pIdx + 3] = 255;
            }
          }
          pCtx.putImageData(pImgData, 0, 0);
        }

        const previewUrl = previewCanvas.toDataURL('image/png');

        // Analyze pattern complexity & confetti index
        const complexity = analyzePatternComplexity(grid, targetWidth, targetHeight, activePalette.length);
        if (cleanedCount > 0) {
          complexity.confettiReducedCount = cleanedCount;
        }

        resolve({
          id: `stitch-${Date.now()}`,
          title: meta?.title || 'Wedding Heirloom Cross Stitch',
          coupleNames: meta?.coupleNames || 'Sarah & David',
          weddingDate: meta?.weddingDate || '2026',
          width: targetWidth,
          height: targetHeight,
          grid,
          palette: activePalette,
          colorStats,
          totalStitches,
          previewUrl,
          fabricCount,
          createdDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          complexity,
          noiseReductionLevel: noiseReduction,
          confettiThreshold,
          cleanedConfettiCount: cleanedCount,
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => reject(new Error('Failed to load image source'));

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(imageSource);
    }
  });
}
