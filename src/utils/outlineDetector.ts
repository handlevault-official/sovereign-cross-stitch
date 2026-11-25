import {
  StitchGridCell,
  DMCColor,
  SuggestedBackstitchPath,
  BackstitchSegment,
  BackstitchPoint,
} from '../types';

export interface OutlineDetectionOptions {
  contrastThreshold?: number; // 15 to 65, default 28
  minPathLength?: number; // minimum segments in a path, default 3
  suggestedDmc?: string; // default '310'
  suggestedHex?: string; // default '#1A1615'
  maxPaths?: number; // default 30
}

/**
 * Calculates human-perceived color contrast between two DMC colors (0 to 100).
 * Uses standard ITU-R BT.601 luminance and weighted Euclidean RGB difference.
 */
export function computeColorContrast(c1: DMCColor, c2: DMCColor): number {
  if (!c1 || !c2) return 0;
  if (c1.code === c2.code) return 0;

  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;

  // Perceptual color distance
  const dist = Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
  return Math.min(100, Math.round((dist / 255) * 100));
}

interface RawEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  contrast: number;
  edgeKey: string;
}

/**
 * Normalizes segment endpoints so edge keys are canonical
 */
function makeEdgeKey(x1: number, y1: number, x2: number, y2: number): string {
  if (x1 < x2 || (x1 === x2 && y1 < y2)) {
    return `${x1},${y1}-${x2},${y2}`;
  }
  return `${x2},${y2}-${x1},${y1}`;
}

/**
 * Analyzes the stitch grid and color boundaries to automatically detect outline-heavy
 * areas and generate continuous, chain-linked suggested backstitch paths.
 */
export function detectSuggestedBackstitchPaths(
  grid: StitchGridCell[][],
  palette: DMCColor[],
  width: number,
  height: number,
  options: OutlineDetectionOptions = {}
): SuggestedBackstitchPath[] {
  const {
    contrastThreshold = 26,
    minPathLength = 3,
    suggestedDmc = '310',
    suggestedHex = '#1A1615',
    maxPaths = 32,
  } = options;

  if (!grid || grid.length === 0 || width <= 1 || height <= 1) {
    return [];
  }

  // Quick color lookup map by index
  const paletteMap = new Map<number, DMCColor>();
  palette.forEach((c, idx) => paletteMap.set(idx, c));

  const candidateEdges = new Map<string, RawEdge>();

  // 1. Scan for boundary edges with contrast exceeding threshold
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const curCell = grid[y][x];
      const curColor = paletteMap.get(curCell.colorIndex) || palette[0];

      // Vertical boundary: between (x, y) and (x + 1, y)
      if (x + 1 < width) {
        const rightCell = grid[y][x + 1];
        const rightColor = paletteMap.get(rightCell.colorIndex) || palette[0];
        const contrast = computeColorContrast(curColor, rightColor);

        if (contrast >= contrastThreshold) {
          const x1 = x + 1;
          const y1 = y;
          const x2 = x + 1;
          const y2 = y + 1;
          const key = makeEdgeKey(x1, y1, x2, y2);
          candidateEdges.set(key, { x1, y1, x2, y2, contrast, edgeKey: key });
        }
      }

      // Horizontal boundary: between (x, y) and (x, y + 1)
      if (y + 1 < height) {
        const bottomCell = grid[y + 1][x];
        const bottomColor = paletteMap.get(bottomCell.colorIndex) || palette[0];
        const contrast = computeColorContrast(curColor, bottomColor);

        if (contrast >= contrastThreshold) {
          const x1 = x;
          const y1 = y + 1;
          const x2 = x + 1;
          const y2 = y + 1;
          const key = makeEdgeKey(x1, y1, x2, y2);
          candidateEdges.set(key, { x1, y1, x2, y2, contrast, edgeKey: key });
        }
      }
    }
  }

  if (candidateEdges.size === 0) {
    return [];
  }

  // 2. Build vertex adjacency graph
  type AdjEntry = { toKey: string; toX: number; toY: number; edge: RawEdge };
  const adj = new Map<string, AdjEntry[]>();

  candidateEdges.forEach((edge) => {
    const v1Key = `${edge.x1},${edge.y1}`;
    const v2Key = `${edge.x2},${edge.y2}`;

    if (!adj.has(v1Key)) adj.set(v1Key, []);
    if (!adj.has(v2Key)) adj.set(v2Key, []);

    adj.get(v1Key)!.push({ toKey: v2Key, toX: edge.x2, toY: edge.y2, edge });
    adj.get(v2Key)!.push({ toKey: v1Key, toX: edge.x1, toY: edge.y1, edge });
  });

  // 3. Trace continuous paths (Eulerian/depth walk)
  const visitedEdges = new Set<string>();
  const rawPaths: { points: BackstitchPoint[]; totalContrast: number }[] = [];

  // Helper to trace from a starting vertex
  const traceFrom = (startKey: string) => {
    const [sx, sy] = startKey.split(',').map(Number);
    const pathPoints: BackstitchPoint[] = [{ x: sx, y: sy }];
    let currentKey = startKey;
    let accumulatedContrast = 0;
    let keepWalking = true;

    while (keepWalking) {
      keepWalking = false;
      const neighbors = adj.get(currentKey) || [];

      // Prefer unvisited edges, sorted by highest contrast
      const candidates = neighbors
        .filter((n) => !visitedEdges.has(n.edge.edgeKey))
        .sort((a, b) => b.edge.contrast - a.edge.contrast);

      if (candidates.length > 0) {
        const nextStep = candidates[0];
        visitedEdges.add(nextStep.edge.edgeKey);
        pathPoints.push({ x: nextStep.toX, y: nextStep.toY });
        accumulatedContrast += nextStep.edge.contrast;
        currentKey = nextStep.toKey;
        keepWalking = true;
      }
    }

    if (pathPoints.length - 1 >= minPathLength) {
      rawPaths.push({
        points: pathPoints,
        totalContrast: accumulatedContrast / (pathPoints.length - 1),
      });
    }
  };

  // Pass A: Start with degree-1 endpoints (open line contours like lettering or floral stems)
  adj.forEach((edges, vKey) => {
    if (edges.length === 1) {
      const hasUnvisited = edges.some((e) => !visitedEdges.has(e.edge.edgeKey));
      if (hasUnvisited) {
        traceFrom(vKey);
      }
    }
  });

  // Pass B: Trace remaining components (degree-2 closed loops like rings or facial silhouettes)
  adj.forEach((edges, vKey) => {
    const hasUnvisited = edges.some((e) => !visitedEdges.has(e.edge.edgeKey));
    if (hasUnvisited) {
      traceFrom(vKey);
    }
  });

  // 4. Score, sort, and categorize candidate paths
  rawPaths.sort((a, b) => {
    const scoreA = a.points.length * 1.5 + a.totalContrast;
    const scoreB = b.points.length * 1.5 + b.totalContrast;
    return scoreB - scoreA;
  });

  const selectedPaths = rawPaths.slice(0, maxPaths);

  return selectedPaths.map((item, index) => {
    const segCount = item.points.length - 1;
    const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];

    for (let i = 0; i < segCount; i++) {
      segments.push({
        x1: item.points[i].x,
        y1: item.points[i].y,
        x2: item.points[i + 1].x,
        y2: item.points[i + 1].y,
      });
    }

    // Determine category based on contrast, length, and coordinate spread
    let category: 'silhouette' | 'contrast-edge' | 'detail' | 'monogram' = 'contrast-edge';
    let title = `Outline Path #${index + 1}`;
    let tagalogTitle = `Guhit ng Outline #${index + 1}`;

    const xs = item.points.map((p) => p.x);
    const ys = item.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX;
    const spanY = maxY - minY;

    if (item.totalContrast >= 45 && segCount >= 8) {
      category = 'silhouette';
      title = `Silhouette Outline #${index + 1} (${segCount} sts)`;
      tagalogTitle = `Pangunahing Silhouette #${index + 1} (${segCount} tahi)`;
    } else if (spanX <= 12 && spanY <= 12 && segCount >= 4) {
      category = 'detail';
      title = `Intricate Accent Contour #${index + 1} (${segCount} sts)`;
      tagalogTitle = `Pinong Detalye & Accent #${index + 1} (${segCount} tahi)`;
    } else if (segCount >= 12) {
      category = 'contrast-edge';
      title = `Major Color Boundary #${index + 1} (${segCount} sts)`;
      tagalogTitle = `Pangunahing Hangganan ng Kulay #${index + 1} (${segCount} tahi)`;
    } else {
      category = 'monogram';
      title = `Motif / Script Contour #${index + 1} (${segCount} sts)`;
      tagalogTitle = `Contour ng Monogram / Titik #${index + 1} (${segCount} tahi)`;
    }

    // Confidence metric (0-100)
    const confidence = Math.min(
      99,
      Math.round(Math.min(100, item.totalContrast * 0.7 + Math.min(30, segCount * 2)))
    );

    return {
      id: `suggested_backstitch_${Date.now()}_${index}`,
      title,
      tagalogTitle,
      category,
      colorContrastScore: Math.round(item.totalContrast),
      length: segCount,
      points: item.points,
      segments,
      suggestedDmc,
      suggestedHex,
      confidence,
      applied: false,
    };
  });
}

/**
 * Converts a suggested path into concrete BackstitchSegments ready to add into
 * the manual pattern backstitch layer.
 */
export function convertPathToBackstitchSegments(
  path: SuggestedBackstitchPath,
  colorHex?: string,
  dmcCode?: string,
  strands: number = 1
): BackstitchSegment[] {
  const chosenColor = colorHex || path.suggestedHex || '#1A1615';
  const chosenDmc = dmcCode || path.suggestedDmc || '310';

  return path.segments.map((seg, idx) => ({
    id: `bs_${path.id}_${idx}_${Date.now()}`,
    x1: seg.x1,
    y1: seg.y1,
    x2: seg.x2,
    y2: seg.y2,
    color: chosenColor,
    dmcCode: chosenDmc,
    strands,
  }));
}

/**
 * Generates decorative framing border backstitch outlines around the perimeter of the pattern.
 */
export function generateBorderBackstitches(
  width: number,
  height: number,
  inset: number = 2,
  colorHex: string = '#B88E3C',
  dmcCode: string = 'E3821', // Light Effects Gold or classic 310
  strands: 1 | 2 = 2,
  style: 'classic' | 'double' | 'mitered' = 'classic'
): BackstitchSegment[] {
  const segments: BackstitchSegment[] = [];
  const safeInset = Math.max(1, Math.min(Math.floor(Math.min(width, height) / 4), inset));

  const addLine = (x1: number, y1: number, x2: number, y2: number, tag: string) => {
    // Break line into 1-stitch segments for standard needle tracking
    const dx = Math.sign(x2 - x1);
    const dy = Math.sign(y2 - y1);
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));

    let cx = x1;
    let cy = y1;
    for (let i = 0; i < steps; i++) {
      const nx = cx + dx;
      const ny = cy + dy;
      segments.push({
        id: `bs_border_${tag}_${cx}_${cy}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x1: cx,
        y1: cy,
        x2: nx,
        y2: ny,
        color: colorHex,
        dmcCode,
        strands,
      });
      cx = nx;
      cy = ny;
    }
  };

  const xLeft = safeInset;
  const xRight = width - safeInset;
  const yTop = safeInset;
  const yBottom = height - safeInset;

  if (style === 'mitered') {
    // Notched heirloom corners
    const corner = Math.min(3, Math.floor((xRight - xLeft) / 6));
    // Top
    addLine(xLeft + corner, yTop, xRight - corner, yTop, 'top');
    // Top-right notch
    addLine(xRight - corner, yTop, xRight, yTop + corner, 'tr_miter');
    // Right
    addLine(xRight, yTop + corner, xRight, yBottom - corner, 'right');
    // Bottom-right notch
    addLine(xRight, yBottom - corner, xRight - corner, yBottom, 'br_miter');
    // Bottom
    addLine(xRight - corner, yBottom, xLeft + corner, yBottom, 'bottom');
    // Bottom-left notch
    addLine(xLeft + corner, yBottom, xLeft, yBottom - corner, 'bl_miter');
    // Left
    addLine(xLeft, yBottom - corner, xLeft, yTop + corner, 'left');
    // Top-left notch
    addLine(xLeft, yTop + corner, xLeft + corner, yTop, 'tl_miter');
  } else {
    // Primary rectangle frame
    addLine(xLeft, yTop, xRight, yTop, 'top');
    addLine(xRight, yTop, xRight, yBottom, 'right');
    addLine(xRight, yBottom, xLeft, yBottom, 'bottom');
    addLine(xLeft, yBottom, xLeft, yTop, 'left');

    if (style === 'double' && safeInset >= 2) {
      const innerInset = safeInset + 2;
      if (width - innerInset * 2 >= 6 && height - innerInset * 2 >= 6) {
        const ixL = innerInset;
        const ixR = width - innerInset;
        const iyT = innerInset;
        const iyB = height - innerInset;
        addLine(ixL, iyT, ixR, iyT, 'in_top');
        addLine(ixR, iyT, ixR, iyB, 'in_right');
        addLine(ixR, iyB, ixL, iyB, 'in_bottom');
        addLine(ixL, iyB, ixL, iyT, 'in_left');
      }
    }
  }

  return segments;
}

/**
 * Traces the complete outer perimeter of an object or color in the pattern to create
 * a decorative outline around that specific object.
 */
export function generateObjectColorOutline(
  grid: StitchGridCell[][],
  targetDmcCode: string,
  width: number,
  height: number,
  colorHex: string = '#1A1615',
  dmcCode: string = '310',
  strands: 1 | 2 = 1
): BackstitchSegment[] {
  if (!grid || grid.length === 0 || width <= 0 || height <= 0) return [];

  const segments: BackstitchSegment[] = [];
  const edgeSet = new Set<string>();

  const isTarget = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return grid[y]?.[x]?.dmcCode === targetDmcCode;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isTarget(x, y)) continue;

      // Check Top neighbor
      if (!isTarget(x, y - 1)) {
        const key = `${x},${y}-${x + 1},${y}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          segments.push({
            id: `bs_obj_${x}_${y}_t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            x1: x,
            y1: y,
            x2: x + 1,
            y2: y,
            color: colorHex,
            dmcCode,
            strands,
          });
        }
      }

      // Check Bottom neighbor
      if (!isTarget(x, y + 1)) {
        const key = `${x},${y + 1}-${x + 1},${y + 1}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          segments.push({
            id: `bs_obj_${x}_${y}_b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            x1: x,
            y1: y + 1,
            x2: x + 1,
            y2: y + 1,
            color: colorHex,
            dmcCode,
            strands,
          });
        }
      }

      // Check Left neighbor
      if (!isTarget(x - 1, y)) {
        const key = `${x},${y}-${x},${y + 1}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          segments.push({
            id: `bs_obj_${x}_${y}_l_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            x1: x,
            y1: y,
            x2: x,
            y2: y + 1,
            color: colorHex,
            dmcCode,
            strands,
          });
        }
      }

      // Check Right neighbor
      if (!isTarget(x + 1, y)) {
        const key = `${x + 1},${y}-${x + 1},${y + 1}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          segments.push({
            id: `bs_obj_${x}_${y}_r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            x1: x + 1,
            y1: y,
            x2: x + 1,
            y2: y + 1,
            color: colorHex,
            dmcCode,
            strands,
          });
        }
      }
    }
  }

  return segments;
}

export interface BackstitchStats {
  totalSegments: number;
  totalStitchesLength: number;
  lengthInches: number;
  lengthCm: number;
  flossBreakdown: {
    dmcCode: string;
    colorHex: string;
    strands: number;
    segmentCount: number;
    lengthStitches: number;
    lengthCm: number;
    skeinsEstimated: number;
  }[];
}

/**
 * Calculates comprehensive physical statistics and floss estimates for backstitches.
 */
export function calculateBackstitchStats(
  backstitches: BackstitchSegment[] = [],
  fabricCount: number = 14
): BackstitchStats {
  let totalSegments = backstitches.length;
  let totalStitchesLength = 0;

  const map = new Map<
    string,
    {
      dmcCode: string;
      colorHex: string;
      strands: number;
      segmentCount: number;
      lengthStitches: number;
    }
  >();

  for (const bs of backstitches) {
    const len = Math.hypot(bs.x2 - bs.x1, bs.y2 - bs.y1);
    totalStitchesLength += len;

    const key = `${bs.dmcCode || '310'}_${bs.strands || 1}_${bs.color || '#1A1615'}`;
    const entry = map.get(key) || {
      dmcCode: bs.dmcCode || '310',
      colorHex: bs.color || '#1A1615',
      strands: bs.strands || 1,
      segmentCount: 0,
      lengthStitches: 0,
    };
    entry.segmentCount++;
    entry.lengthStitches += len;
    map.set(key, entry);
  }

  const lengthInches = Number((totalStitchesLength / fabricCount).toFixed(1));
  const lengthCm = Number((lengthInches * 2.54).toFixed(1));

  const flossBreakdown = Array.from(map.values()).map((item) => {
    const itemInches = item.lengthStitches / fabricCount;
    const itemCm = Number((itemInches * 2.54).toFixed(1));
    // Each skein is 8 meters (800 cm) of 6-strand thread.
    // If using 1 strand, 800 cm of 6-strand yields 4,800 cm of single strand.
    // Factor in 1.8x for tails and back-crossing:
    const usableCmPerSkein = (800 * 6) / (item.strands || 1);
    const skeinsEstimated = Math.max(1, Math.ceil((itemCm * 1.8) / usableCmPerSkein));

    return {
      dmcCode: item.dmcCode,
      colorHex: item.colorHex,
      strands: item.strands,
      segmentCount: item.segmentCount,
      lengthStitches: Math.round(item.lengthStitches),
      lengthCm: itemCm,
      skeinsEstimated,
    };
  });

  return {
    totalSegments,
    totalStitchesLength: Math.round(totalStitchesLength),
    lengthInches,
    lengthCm,
    flossBreakdown,
  };
}
