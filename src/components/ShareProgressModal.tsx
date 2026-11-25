import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Sparkles,
  Image as ImageIcon,
  Instagram,
  Facebook,
  RefreshCw,
} from 'lucide-react';
import { PatternData, DMCColor } from '../types';

export interface ShareProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: PatternData;
  stitchedCells: Set<string>;
  todayStitches?: number;
  language: 'en' | 'fil';
}

type PostFormat = 'square' | 'story' | 'landscape';
type CardTheme = 'linen' | 'blush' | 'midnight' | 'sage';
type PostPlatform = 'instagram' | 'facebook';

const FORMAT_SPECS: Record<
  PostFormat,
  { width: number; height: number; label: string; badge: string }
> = {
  square: { width: 1080, height: 1080, label: 'Square (1:1)', badge: 'IG & FB Feed' },
  story: { width: 1080, height: 1920, label: 'Story (9:16)', badge: 'Stories & Reels' },
  landscape: { width: 1200, height: 630, label: 'Wide (1.91:1)', badge: 'FB Link / X' },
};

const THEMES: Record<
  CardTheme,
  {
    name: string;
    bg: string;
    card: string;
    border: string;
    accent: string;
    progressStart: string;
    progressEnd: string;
    textMain: string;
    textMuted: string;
    trackBg: string;
  }
> = {
  linen: {
    name: 'Warm Linen',
    bg: '#FAF7F2',
    card: '#FFFFFF',
    border: '#D7CBB9',
    accent: '#B88E3C',
    progressStart: '#10B981',
    progressEnd: '#047857',
    textMain: '#2C2523',
    textMuted: '#6E625A',
    trackBg: '#EAE2D5',
  },
  blush: {
    name: 'Bridal Blush',
    bg: '#FDF7F8',
    card: '#FFFFFF',
    border: '#E8CCD5',
    accent: '#C76A82',
    progressStart: '#D946EF',
    progressEnd: '#BE185D',
    textMain: '#361E26',
    textMuted: '#7D5864',
    trackBg: '#F5E1E7',
  },
  midnight: {
    name: 'Midnight Gala',
    bg: '#131722',
    card: '#1C2233',
    border: '#36415E',
    accent: '#E6C687',
    progressStart: '#34D399',
    progressEnd: '#10B981',
    textMain: '#F8FAFC',
    textMuted: '#A7B4CE',
    trackBg: '#29324A',
  },
  sage: {
    name: 'Botanical Sage',
    bg: '#F4F7F4',
    card: '#FFFFFF',
    border: '#C8D4C7',
    accent: '#4D7C5B',
    progressStart: '#22C55E',
    progressEnd: '#15803D',
    textMain: '#1E2A20',
    textMuted: '#566959',
    trackBg: '#E1EAE2',
  },
};

export const ShareProgressModal: React.FC<ShareProgressModalProps> = ({
  isOpen,
  onClose,
  pattern,
  stitchedCells,
  todayStitches = 0,
  language,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [format, setFormat] = useState<PostFormat>('square');
  const [themeKey, setThemeKey] = useState<CardTheme>('linen');
  const [platform, setPlatform] = useState<PostPlatform>('instagram');
  const [showLiveMask, setShowLiveMask] = useState<boolean>(true);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const totalStitches = Math.max(1, pattern.totalStitches);
  const stitchedCount = stitchedCells.size;
  const percentage = Math.min(100, (stitchedCount / totalStitches) * 100);
  const percentageLabel = `${percentage.toFixed(1)}%`;
  const remainingCount = Math.max(0, totalStitches - stitchedCount);

  const buildDefaultCaption = useCallback(
    (targetPlatform: PostPlatform) => {
      const projectName = pattern.coupleNames
        ? `${pattern.coupleNames}'s Wedding Keepsake`
        : pattern.title || 'Wedding Cross-Stitch Project';
      const dateStr = pattern.weddingDate ? ` (${pattern.weddingDate})` : '';
      const todayLine =
        todayStitches > 0
          ? language === 'fil'
            ? `\n⚡ +${todayStitches.toLocaleString()} tahi ang nadagdag ngayong araw!`
            : `\n⚡ +${todayStitches.toLocaleString()} stitches added today!`
          : '';

      if (language === 'fil') {
        if (targetPlatform === 'instagram') {
          return `🧵✨ Update sa aming cross-stitch: ${percentageLabel} nang tapos!\n\nGinagawa ang "${projectName}"${dateStr} — ${stitchedCount.toLocaleString()} sa ${totalStitches.toLocaleString()} na tahi ang kumpleto na gamit ang ${pattern.palette.length} na kulay ng DMC floss sa ${pattern.fabricCount}ct Aida.${todayLine}\n\n${remainingCount > 0 ? `${remainingCount.toLocaleString()} tahi na lang ang natitira — tuloy-tuloy lang bawat X! 💛` : '🎉 100% Kumpleto na at handa nang i-frame!'}\n\n#CrossStitchProgress #WIPWednesday #WeddingCrossStitch #DMCThreads #HandmadeKeepsake #CrossStitchPH`;
        }
        return `Ibinabahagi ang progreso ng aming handcrafted project: "${projectName}"${dateStr} ay ${percentageLabel} nang tapos (${stitchedCount.toLocaleString()} / ${totalStitches.toLocaleString()} stitches)!${todayLine}\n\nGumagamit ng ${pattern.palette.length} na kulay ng DMC thread sa ${pattern.fabricCount}-count Aida (${pattern.width}×${pattern.height} stitches). ${remainingCount > 0 ? `${remainingCount.toLocaleString()} na tahi pa ang natitira!` : 'Tapos na tapos na!'} 🧵💛\n\n#CrossStitch #HandcraftedKeepsake #DMCFloss #WeddingCrossStitch`;
      }

      if (targetPlatform === 'instagram') {
        return `🧵✨ Stitch Progress Check: ${percentageLabel} Complete!\n\nWorking on "${projectName}"${dateStr} — ${stitchedCount.toLocaleString()} of ${totalStitches.toLocaleString()} stitches done across ${pattern.palette.length} DMC floss colors on ${pattern.fabricCount}ct Aida.${todayLine}\n\n${remainingCount > 0 ? `${remainingCount.toLocaleString()} stitches left to go — loving watching every detail come to life! 💛` : '🎉 100% Finished and ready for framing!'}\n\n#CrossStitchProgress #WIPWednesday #WeddingCrossStitch #DMCThreads #CrossStitcherOfInstagram #HandmadeKeepsake`;
      }
      return `Sharing an update on my "${projectName}"${dateStr} cross-stitch heirloom: now ${percentageLabel} complete (${stitchedCount.toLocaleString()} / ${totalStitches.toLocaleString()} stitches)!${todayLine}\n\nStitched on ${pattern.fabricCount}-count Aida (${pattern.width}×${pattern.height}) with ${pattern.palette.length} authentic DMC shades. ${remainingCount > 0 ? `${remainingCount.toLocaleString()} stitches remaining!` : 'All stitches complete!'} 🧵✨\n\n#CrossStitch #StitchingProgress #WeddingKeepsake #HandmadeArt`;
    },
    [pattern, stitchedCount, totalStitches, percentageLabel, remainingCount, todayStitches, language]
  );

  const [captionText, setCaptionText] = useState<string>(() => buildDefaultCaption('instagram'));

  useEffect(() => {
    if (isOpen) {
      setCaptionText(buildDefaultCaption(platform));
    }
  }, [isOpen, platform, buildDefaultCaption]);

  // Draw rounded rectangle helper
  const fillRoundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  };

  // Render live progress image onto canvas
  const renderProgressCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = FORMAT_SPECS[format];
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const t = THEMES[themeKey];

    // 1. Background
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, width, height);

    // Subtle linen weave texture
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.16;
    for (let x = 0; x < width; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Outer & inner editorial frame
    const margin = Math.round(Math.min(width, height) * 0.036);
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 3.5;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(margin + 8, margin + 8, width - (margin + 8) * 2, height - (margin + 8) * 2);

    // Palette lookup for live pattern preview
    const paletteMap = new Map<string, DMCColor>();
    pattern.palette.forEach((c) => paletteMap.set(c.code, c));

    const drawPatternThumbnail = (boxX: number, boxY: number, boxW: number, boxH: number) => {
      // Shadow card container
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = t.card;
      fillRoundRect(ctx, boxX, boxY, boxW, boxH, 20);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = t.border;
      ctx.lineWidth = 2;
      fillRoundRect(ctx, boxX, boxY, boxW, boxH, 20);
      ctx.stroke();

      // Inner fit bounds
      const pad = 18;
      const innerW = boxW - pad * 2;
      const innerH = boxH - pad * 2;
      const patAspect = pattern.width / Math.max(1, pattern.height);
      const boxAspect = innerW / Math.max(1, innerH);

      let drawW = innerW;
      let drawH = innerH;
      if (patAspect > boxAspect) {
        drawH = innerW / patAspect;
      } else {
        drawW = innerH * patAspect;
      }
      const startX = boxX + pad + (innerW - drawW) / 2;
      const startY = boxY + pad + (innerH - drawH) / 2;

      // Crisp offscreen pattern bitmap
      const off = document.createElement('canvas');
      off.width = pattern.width;
      off.height = pattern.height;
      const oCtx = off.getContext('2d');
      if (oCtx) {
        oCtx.fillStyle = t.card;
        oCtx.fillRect(0, 0, off.width, off.height);
        for (let py = 0; py < pattern.height; py++) {
          for (let px = 0; px < pattern.width; px++) {
            const cell = pattern.grid[py][px];
            const color = paletteMap.get(cell.dmcCode) || pattern.palette[0];
            const isDone = stitchedCells.has(`${px},${py}`);
            if (showLiveMask && stitchedCount > 0 && !isDone) {
              oCtx.globalAlpha = 0.24;
            } else {
              oCtx.globalAlpha = 1;
            }
            oCtx.fillStyle = color.hex;
            oCtx.fillRect(px, py, 1, 1);
          }
        }
        oCtx.globalAlpha = 1;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, startX, startY, drawW, drawH);
        ctx.restore();
      }

      // Live Progress Badge on Thumbnail Corner
      const badgeText =
        showLiveMask && stitchedCount > 0 ? 'LIVE STITCH PROGRESS' : 'PATTERN PREVIEW';
      ctx.save();
      ctx.font = 'bold 16px sans-serif';
      const tw = ctx.measureText(badgeText).width + 24;
      ctx.fillStyle = t.textMain;
      fillRoundRect(ctx, boxX + 20, boxY + 20, tw, 32, 16);
      ctx.fill();
      ctx.fillStyle = t.card;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, boxX + 20 + tw / 2, boxY + 36);
      ctx.restore();
    };

    const drawProgressRing = (cx: number, cy: number, radius: number, thickness: number) => {
      // Track
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = t.trackBg;
      ctx.lineWidth = thickness;
      ctx.stroke();

      // Arc
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * Math.min(100, Math.max(0, percentage))) / 100;
      if (percentage > 0) {
        const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
        grad.addColorStop(0, t.progressStart);
        grad.addColorStop(1, t.progressEnd);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.strokeStyle = grad;
        ctx.lineWidth = thickness;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Center Percentage Text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = t.textMain;
      ctx.font = `bold ${Math.round(radius * 0.48)}px Georgia, serif`;
      ctx.fillText(percentageLabel, cx, cy - radius * 0.08);

      ctx.fillStyle = t.textMuted;
      ctx.font = `bold ${Math.round(radius * 0.17)}px sans-serif`;
      ctx.fillText('COMPLETE', cx, cy + radius * 0.28);
    };

    const drawProgressBar = (bx: number, by: number, bw: number, bh: number) => {
      ctx.fillStyle = t.trackBg;
      fillRoundRect(ctx, bx, by, bw, bh, bh / 2);
      ctx.fill();

      const fillW = Math.max(percentage > 0 ? bh : 0, (bw * Math.min(100, percentage)) / 100);
      if (fillW > 0) {
        const grad = ctx.createLinearGradient(bx, by, bx + bw, by);
        grad.addColorStop(0, t.progressStart);
        grad.addColorStop(1, t.progressEnd);
        ctx.fillStyle = grad;
        fillRoundRect(ctx, bx, by, fillW, bh, bh / 2);
        ctx.fill();
      }
    };

    const projectTitle = pattern.coupleNames || pattern.title || 'Wedding Cross Stitch';
    const subTitle = pattern.weddingDate
      ? `${pattern.weddingDate} · ${pattern.fabricCount}ct Aida (${pattern.width}×${pattern.height})`
      : `${pattern.fabricCount}ct Aida · ${pattern.width}×${pattern.height} Stitches`;

    if (format === 'landscape') {
      // Wide layout: Left = pattern preview, Right = ring + progress stats
      const leftW = 460;
      const leftX = margin + 40;
      const boxY = margin + 38;
      const boxH = height - (margin + 38) * 2;
      drawPatternThumbnail(leftX, boxY, leftW, boxH);

      const rightX = leftX + leftW + 44;
      const rightW = width - rightX - margin - 40;
      const centerRightX = rightX + rightW / 2;

      ctx.textAlign = 'center';
      ctx.fillStyle = t.accent;
      ctx.font = 'bold 18px Georgia, serif';
      ctx.fillText('✦ STITCH PROGRESS UPDATE ✦', centerRightX, margin + 62);

      ctx.fillStyle = t.textMain;
      ctx.font = 'bold 34px Georgia, serif';
      ctx.fillText(projectTitle, centerRightX, margin + 106, rightW);

      ctx.fillStyle = t.textMuted;
      ctx.font = 'italic 18px Georgia, serif';
      ctx.fillText(subTitle, centerRightX, margin + 138, rightW);

      drawProgressRing(centerRightX, height / 2 + 12, 92, 18);

      const barY = height - margin - 118;
      drawProgressBar(rightX + 20, barY, rightW - 40, 20);

      ctx.fillStyle = t.textMain;
      ctx.font = 'bold 24px monospace';
      ctx.fillText(
        `${stitchedCount.toLocaleString()} / ${totalStitches.toLocaleString()} stitches`,
        centerRightX,
        barY + 46
      );

      ctx.fillStyle = t.textMuted;
      ctx.font = '16px sans-serif';
      ctx.fillText(
        `${remainingCount.toLocaleString()} remaining · ${pattern.palette.length} DMC colors`,
        centerRightX,
        barY + 76
      );
    } else if (format === 'story') {
      // Vertical 9:16 Story layout
      ctx.textAlign = 'center';
      ctx.fillStyle = t.accent;
      ctx.font = 'bold 26px Georgia, serif';
      ctx.fillText('✦ STITCH PROGRESS CHECK ✦', width / 2, margin + 84);

      ctx.fillStyle = t.textMain;
      ctx.font = 'bold 54px Georgia, serif';
      ctx.fillText(projectTitle, width / 2, margin + 150, width - margin * 2 - 80);

      ctx.fillStyle = t.textMuted;
      ctx.font = 'italic 26px Georgia, serif';
      ctx.fillText(subTitle, width / 2, margin + 202, width - margin * 2 - 80);

      const thumbW = width - margin * 2 - 110;
      const thumbH = 780;
      drawPatternThumbnail((width - thumbW) / 2, margin + 255, thumbW, thumbH);

      // Ring + Stats Card below
      const ringY = margin + 255 + thumbH + 225;
      drawProgressRing(width / 2, ringY, 150, 26);

      const barW = width - margin * 2 - 140;
      const barX = (width - barW) / 2;
      const barY = ringY + 205;
      drawProgressBar(barX, barY, barW, 28);

      ctx.fillStyle = t.textMain;
      ctx.font = 'bold 34px monospace';
      ctx.fillText(
        `${stitchedCount.toLocaleString()} / ${totalStitches.toLocaleString()} stitches`,
        width / 2,
        barY + 70
      );

      ctx.fillStyle = t.textMuted;
      ctx.font = '24px sans-serif';
      const detailLine =
        todayStitches > 0
          ? `+${todayStitches.toLocaleString()} stitched today · ${remainingCount.toLocaleString()} to go`
          : `${remainingCount.toLocaleString()} stitches remaining · ${pattern.palette.length} DMC colors`;
      ctx.fillText(detailLine, width / 2, barY + 116);

      ctx.fillStyle = t.accent;
      ctx.font = 'bold 20px Georgia, serif';
      ctx.fillText('SOVEREIGN NEEDLEWORK STUDIO', width / 2, height - margin - 52);
    } else {
      // 1:1 Square Feed layout (1080x1080)
      ctx.textAlign = 'center';
      ctx.fillStyle = t.accent;
      ctx.font = 'bold 21px Georgia, serif';
      ctx.fillText('✦ WORK IN PROGRESS · STITCH UPDATE ✦', width / 2, margin + 56);

      ctx.fillStyle = t.textMain;
      ctx.font = 'bold 44px Georgia, serif';
      ctx.fillText(projectTitle, width / 2, margin + 106, width - margin * 2 - 80);

      ctx.fillStyle = t.textMuted;
      ctx.font = 'italic 22px Georgia, serif';
      ctx.fillText(subTitle, width / 2, margin + 144, width - margin * 2 - 80);

      // Main Preview Box
      const thumbW = width - margin * 2 - 100;
      const thumbH = 470;
      const thumbX = (width - thumbW) / 2;
      const thumbY = margin + 178;
      drawPatternThumbnail(thumbX, thumbY, thumbW, thumbH);

      // Bottom Metrics Row: Left = Ring Gauge, Right = Progress Bar & Counts
      const metricsY = thumbY + thumbH + 34;
      const ringRadius = 94;
      const ringCx = margin + 165;
      const ringCy = metricsY + 118;
      drawProgressRing(ringCx, ringCy, ringRadius, 20);

      const infoX = ringCx + ringRadius + 55;
      const infoW = width - infoX - margin - 50;

      ctx.textAlign = 'left';
      ctx.fillStyle = t.textMuted;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('STITCHES COMPLETED', infoX, metricsY + 42);

      ctx.fillStyle = t.textMain;
      ctx.font = 'bold 34px monospace';
      ctx.fillText(
        `${stitchedCount.toLocaleString()} / ${totalStitches.toLocaleString()}`,
        infoX,
        metricsY + 84,
        infoW
      );

      drawProgressBar(infoX, metricsY + 110, infoW, 24);

      ctx.fillStyle = t.textMuted;
      ctx.font = '20px sans-serif';
      const subMetric =
        todayStitches > 0
          ? `+${todayStitches.toLocaleString()} today · ${remainingCount.toLocaleString()} remaining`
          : `${remainingCount.toLocaleString()} remaining · ${pattern.palette.length} DMC colors`;
      ctx.fillText(subMetric, infoX, metricsY + 162, infoW);

      // Footer
      ctx.textAlign = 'center';
      ctx.fillStyle = t.accent;
      ctx.font = 'bold 17px Georgia, serif';
      ctx.fillText('CRAFTED STITCH BY STITCH · SOVEREIGN NEEDLEWORK STUDIO', width / 2, height - margin - 28);
    }
  }, [
    format,
    themeKey,
    pattern,
    stitchedCells,
    stitchedCount,
    totalStitches,
    remainingCount,
    percentage,
    percentageLabel,
    todayStitches,
    showLiveMask,
  ]);

  useEffect(() => {
    if (isOpen) {
      renderProgressCanvas();
    }
  }, [isOpen, renderProgressCanvas]);

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderProgressCanvas();
    const safeName = (pattern.coupleNames || pattern.title || 'stitch-progress')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}-${Math.round(percentage)}pct-${format}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShareFeedback(
      language === 'fil'
        ? 'Na-download na ang PNG progress card! Handa nang i-upload sa Instagram o Facebook.'
        : 'Progress image downloaded! Ready to upload to Instagram or Facebook.'
    );
    setTimeout(() => setShareFeedback(null), 4000);
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(captionText);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2200);
    } catch {
      setShareFeedback(
        language === 'fil'
          ? 'Piliin at i-copy ang caption mula sa text box.'
          : 'Please copy the caption text directly from the box.'
      );
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderProgressCanvas();

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png')
        );
        if (blob) {
          const file = new File([blob], `stitch-progress-${Math.round(percentage)}pct.png`, {
            type: 'image/png',
          });
          const canShareFiles =
            typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
          if (canShareFiles) {
            await navigator.share({
              title: `${pattern.coupleNames || pattern.title} (${percentageLabel})`,
              text: captionText,
              files: [file],
            });
            return;
          }
        }
        await navigator.share({
          title: `${pattern.coupleNames || pattern.title} (${percentageLabel})`,
          text: captionText,
        });
        return;
      } catch {
        // User cancelled or native share unsupported; fall back to copy + download notice
      }
    }

    await handleCopyCaption();
    handleDownloadImage();
  };

  const canUseWebShare = useMemo(
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    []
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-[#D7CBB9] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#FAF7F2] px-5 py-4 border-b border-[#E8E1D5] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2C2523] text-[#E6C687] flex items-center justify-center shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-lg text-[#2C2523]">
                  {language === 'fil' ? 'I-share ang Stitch Progress' : 'Share Stitch Progress'}
                </h3>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {percentageLabel}
                </span>
              </div>
              <p className="text-xs text-[#7A6E65]">
                {language === 'fil'
                  ? 'Gumawa ng progress graphic card at handang caption para sa Instagram o Facebook.'
                  : 'Generate a shareable progress percentage card & pre-filled post for Instagram or Facebook.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white border border-[#E8E1D5] hover:bg-[#F2ECE1] text-[#5F554F] hover:text-[#2C2523] flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Live Generated Progress Image Preview */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#2C2523] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#B88E3C]" />
                <span>{language === 'fil' ? 'Preview ng Progress Card' : 'Progress Image Card'}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowLiveMask((prev) => !prev)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
                  showLiveMask
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-[#FAF7F2] text-[#5F554F] border-[#E0D7C9]'
                }`}
              >
                {showLiveMask
                  ? language === 'fil' ? '✓ Live Mask: ON' : '✓ Live Stitch Mask: ON'
                  : language === 'fil' ? 'Buong Disenyo' : 'Full Pattern Preview'}
              </button>
            </div>

            <div className="bg-[#EFEAE1] border border-[#D7CBB9] rounded-xl p-3 flex items-center justify-center min-h-[280px] max-h-[380px] overflow-hidden">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[348px] w-auto h-auto rounded-lg shadow-md object-contain"
              />
            </div>

            {/* Format & Theme Selectors */}
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(FORMAT_SPECS) as PostFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className={`px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                    format === fmt
                      ? 'bg-[#2C2523] text-white border-[#2C2523] shadow-xs'
                      : 'bg-[#FAF7F2] text-[#2C2523] border-[#E0D7C9] hover:bg-[#F2ECE1]'
                  }`}
                >
                  <div className="text-[11px] font-bold">{FORMAT_SPECS[fmt].label}</div>
                  <div
                    className={`text-[10px] ${
                      format === fmt ? 'text-[#E6C687]' : 'text-[#7A6E65]'
                    }`}
                  >
                    {FORMAT_SPECS[fmt].badge}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(Object.keys(THEMES) as CardTheme[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setThemeKey(key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer transition-all ${
                    themeKey === key
                      ? 'border-[#2C2523] bg-[#FAF7F2] text-[#2C2523] font-bold ring-1 ring-[#2C2523]'
                      : 'border-[#E8E1D5] bg-white text-[#5F554F] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/15"
                    style={{ backgroundColor: THEMES[key].bg }}
                  />
                  <span>{THEMES[key].name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Pre-filled Social Media Post & Share Actions */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              {/* Platform Preset Toggle */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-[#2C2523]">
                  {language === 'fil' ? 'Pre-filled Social Post:' : 'Pre-filled Social Media Post:'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPlatform('instagram')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                      platform === 'instagram'
                        ? 'bg-gradient-to-r from-pink-600 to-amber-500 text-white border-transparent shadow-xs'
                        : 'bg-[#FAF7F2] text-[#5F554F] border-[#E0D7C9] hover:text-[#2C2523]'
                    }`}
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    <span>Instagram</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatform('facebook')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                      platform === 'facebook'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-[#FAF7F2] text-[#5F554F] border-[#E0D7C9] hover:text-[#2C2523]'
                    }`}
                  >
                    <Facebook className="w-3.5 h-3.5" />
                    <span>Facebook</span>
                  </button>
                </div>
              </div>

              {/* Editable Caption Box */}
              <div className="relative">
                <textarea
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  rows={8}
                  className="w-full p-3 text-xs leading-relaxed text-[#2C2523] bg-[#FAF7F2] border border-[#D7CBB9] rounded-xl focus:outline-hidden focus:border-[#B88E3C] focus:bg-white resize-none font-sans"
                  aria-label={language === 'fil' ? 'Caption para sa social media' : 'Social media post caption'}
                />
                <button
                  type="button"
                  onClick={() => setCaptionText(buildDefaultCaption(platform))}
                  className="mt-1.5 text-[11px] text-[#7A6E65] hover:text-[#2C2523] flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>
                    {language === 'fil'
                      ? 'I-regenerate gamit ang kasalukuyang data'
                      : 'Reset caption to latest stitch stats'}
                  </span>
                </button>
              </div>

              {/* Live Data Summary Strip */}
              <div className="grid grid-cols-3 gap-2 text-center bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E8E1D5]">
                <div>
                  <div className="text-[10px] text-[#7A6E65] uppercase">Progress</div>
                  <div className="font-mono font-bold text-sm text-emerald-800">{percentageLabel}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#7A6E65] uppercase">Completed</div>
                  <div className="font-mono font-bold text-sm text-[#2C2523]">
                    {stitchedCount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#7A6E65] uppercase">Remaining</div>
                  <div className="font-mono font-bold text-sm text-[#5F554F]">
                    {remainingCount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2 border-t border-[#F0ECE1]">
              {shareFeedback && (
                <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{shareFeedback}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="py-2.5 px-4 rounded-xl bg-[#2C2523] hover:bg-[#433936] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4 text-[#E6C687]" />
                  <span>
                    {language === 'fil' ? 'I-download ang PNG Image' : 'Download Progress Image'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    copiedCaption
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-white hover:bg-[#FAF7F2] text-[#2C2523] border-[#D7CBB9]'
                  }`}
                >
                  {copiedCaption ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{language === 'fil' ? 'Nakopya na!' : 'Caption Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#B88E3C]" />
                      <span>{language === 'fil' ? 'Kopyahin ang Post Text' : 'Copy Post Caption'}</span>
                    </>
                  )}
                </button>
              </div>

              {canUseWebShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>
                    {language === 'fil'
                      ? 'Direktang I-share sa Instagram / Facebook App'
                      : 'Share Image & Post Directly'}
                  </span>
                </button>
              )}

              <p className="text-[11px] text-[#8C8077] text-center">
                {language === 'fil'
                  ? 'Tip: I-download ang PNG image at i-copy ang caption para i-post sa Instagram o Facebook.'
                  : 'Download the PNG card and copy the pre-filled caption to post directly on Instagram or Facebook.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
