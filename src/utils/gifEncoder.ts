import { GifWriter } from 'omggif';

/**
 * Creates an animated GIF from an array of image data URLs.
 * Uses a lightweight, fast color quantization and LZW encoding via omggif.
 */
export async function createGifFromImageUrls(
  imageUrls: string[],
  options: {
    width?: number;
    height?: number;
    delayMs?: number; // Delay between frames in milliseconds
    onProgress?: (progress: number, status: string) => void;
  } = {}
): Promise<{ blob: Blob; url: string }> {
  const targetWidth = options.width || 400;
  const targetHeight = options.height || 300;
  const delayHundredths = Math.max(5, Math.round((options.delayMs || 600) / 10));

  options.onProgress?.(5, 'Loading snapshot frames...');

  // Pre-load all images
  const loadedImages: HTMLImageElement[] = await Promise.all(
    imageUrls.map(
      (url) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to load image frame'));
          img.src = url;
        })
    )
  );

  options.onProgress?.(25, 'Rendering frames to canvas...');

  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = targetWidth;
  offscreenCanvas.height = targetHeight;
  const ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // Allocate conservative memory buffer for GIF: width * height * 3 * frames + header
  const maxGifBytes = targetWidth * targetHeight * 2 * loadedImages.length + 65536;
  const buffer = new Uint8Array(maxGifBytes);
  const gifWriter = new GifWriter(buffer, targetWidth, targetHeight, { loop: 0 });

  for (let i = 0; i < loadedImages.length; i++) {
    const img = loadedImages[i];
    options.onProgress?.(
      25 + Math.round(((i + 1) / loadedImages.length) * 55),
      `Processing frame ${i + 1} of ${loadedImages.length}...`
    );

    // Clear and draw frame
    ctx.fillStyle = '#FAF7F2';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Calculate aspect ratio fit
    const imgAspect = img.width / img.height;
    const canvasAspect = targetWidth / targetHeight;
    let dw = targetWidth;
    let dh = targetHeight;
    let dx = 0;
    let dy = 0;

    if (imgAspect > canvasAspect) {
      dh = targetWidth / imgAspect;
      dy = (targetHeight - dh) / 2;
    } else {
      dw = targetHeight * imgAspect;
      dx = (targetWidth - dw) / 2;
    }

    ctx.drawImage(img, dx, dy, dw, dh);

    // Get RGBA pixel data
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imageData.data;

    // Fast 256-color quantization
    const { palette, indexedPixels } = quantizeTo256Colors(data, targetWidth, targetHeight);

    // Add frame to GIF
    gifWriter.addFrame(0, 0, targetWidth, targetHeight, indexedPixels as unknown as number[], {
      palette,
      delay: delayHundredths,
    });
  }

  options.onProgress?.(95, 'Finalizing GIF stream...');
  const writtenLength = gifWriter.end();
  const gifData = buffer.subarray(0, writtenLength);

  const blob = new Blob([gifData], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);

  options.onProgress?.(100, 'Complete!');
  return { blob, url };
}

/**
 * Fast color quantization that selects up to 256 representative RGB colors
 * and maps each pixel to the nearest palette index.
 */
function quantizeTo256Colors(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { palette: number[]; indexedPixels: Uint8Array } {
  const pixelCount = width * height;
  const colorCounts = new Map<number, number>();

  // Sample colors into 5-bit quantized bins (32 levels per channel = 32768 total)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] >> 3;
    const g = data[i + 1] >> 3;
    const b = data[i + 2] >> 3;
    const key = (r << 10) | (g << 5) | b;
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
  }

  // Sort by popularity and take top 256
  const sortedBins = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 256);

  // If less than 256 colors, pad with black
  const palette: number[] = [];
  const paletteRGB: [number, number, number][] = [];

  sortedBins.forEach(([key]) => {
    const r = ((key >> 10) & 31) << 3;
    const g = ((key >> 5) & 31) << 3;
    const b = (key & 31) << 3;
    paletteRGB.push([r, g, b]);
    // omggif expects colors packed as 0xRRGGBB
    palette.push((r << 16) | (g << 8) | b);
  });

  while (palette.length < 2) {
    palette.push(0x000000);
    paletteRGB.push([0, 0, 0]);
  }

  // Create lookup table for 5-bit bins to fast-index map
  const binToIndexCache = new Map<number, number>();

  const indexedPixels = new Uint8Array(pixelCount);
  let pixelIdx = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const binKey = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

    let bestIdx = binToIndexCache.get(binKey);
    if (bestIdx === undefined) {
      // Find closest color in paletteRGB using squared Euclidean distance
      let minDist = Infinity;
      bestIdx = 0;
      for (let p = 0; p < paletteRGB.length; p++) {
        const [pr, pg, pb] = paletteRGB[p];
        const dist = (r - pr) * (r - pr) + (g - pg) * (g - pg) + (b - pb) * (b - pb);
        if (dist < minDist) {
          minDist = dist;
          bestIdx = p;
          if (dist === 0) break;
        }
      }
      binToIndexCache.set(binKey, bestIdx);
    }

    indexedPixels[pixelIdx++] = bestIdx;
  }

  return { palette, indexedPixels };
}
