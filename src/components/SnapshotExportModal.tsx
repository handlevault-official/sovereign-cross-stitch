import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Film,
  Play,
  Pause,
  Download,
  Sparkles,
  X,
  Grid,
  Layers,
  Calendar,
  CheckCircle2,
  Image as ImageIcon,
  Clock,
  Sliders,
  RotateCcw,
  Check,
} from 'lucide-react';
import { PatternData, ProjectSnapshot } from '../types';
import { createGifFromImageUrls } from '../utils/gifEncoder';

interface SnapshotExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: ProjectSnapshot[];
  pattern: PatternData;
  language: 'en' | 'fil';
}

type ExportTab = 'gif' | 'collage';
type CollageLayout = 'grid' | 'filmstrip' | 'timeline';
type CollageTheme = 'linen' | 'gold' | 'minimal' | 'midnight';

export const SnapshotExportModal: React.FC<SnapshotExportModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  pattern,
  language,
}) => {
  // Sort snapshots chronologically (oldest to newest for growth visualization)
  const sortedSnapshots = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);

  const [activeTab, setActiveTab] = useState<ExportTab>('gif');

  // --- GIF & Timelapse State ---
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [frameSpeedMs, setFrameSpeedMs] = useState<number>(700); // 1200, 700, 400, 200
  const [showOverlaysInGif, setShowOverlaysInGif] = useState<boolean>(true);
  const [isExportingGif, setIsExportingGif] = useState<boolean>(false);
  const [gifExportProgress, setGifExportProgress] = useState<number>(0);
  const [gifExportStatus, setGifExportStatus] = useState<string>('');
  const [exportedGifUrl, setExportedGifUrl] = useState<string | null>(null);

  // --- Collage State ---
  const [collageLayout, setCollageLayout] = useState<CollageLayout>('grid');
  const [collageTheme, setCollageTheme] = useState<CollageTheme>('linen');
  const [collageTitle, setCollageTitle] = useState<string>(
    `${pattern.title} — Embroidery Journey`
  );
  const [collageSubtitle, setCollageSubtitle] = useState<string>(
    language === 'fil' ? 'Pamanang Kasal · Bawat Tahi' : 'Heirloom Wedding Keepsake · Growth Timeline'
  );
  const [showPercentages, setShowPercentages] = useState<boolean>(true);
  const [showDates, setShowDates] = useState<boolean>(true);
  const [showNotes, setShowNotes] = useState<boolean>(true);
  const [isGeneratingCollage, setIsGeneratingCollage] = useState<boolean>(false);

  const collageCanvasRef = useRef<HTMLCanvasElement>(null);

  // Sync title when pattern changes
  useEffect(() => {
    setCollageTitle(`${pattern.title} — Embroidery Journey`);
  }, [pattern.title]);

  // Timelapse playback loop
  useEffect(() => {
    if (!isOpen || activeTab !== 'gif' || !isPlaying || sortedSnapshots.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % sortedSnapshots.length);
    }, frameSpeedMs);

    return () => clearInterval(interval);
  }, [isOpen, activeTab, isPlaying, sortedSnapshots.length, frameSpeedMs]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (exportedGifUrl) {
        URL.revokeObjectURL(exportedGifUrl);
      }
    };
  }, [exportedGifUrl]);

  // --- Handle Animated GIF Generation ---
  const handleExportGif = async () => {
    if (sortedSnapshots.length === 0) return;
    setIsExportingGif(true);
    setGifExportProgress(0);
    setGifExportStatus(language === 'fil' ? 'Inihahanda ang mga frame...' : 'Preparing frames...');

    try {
      // If overlays are enabled, render each snapshot with burned-in percentage and date badges
      let framesToEncode: string[] = [];

      if (showOverlaysInGif) {
        setGifExportStatus(language === 'fil' ? 'Inilalapat ang milestone overlay...' : 'Rendering milestone overlays...');
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = 440;
        overlayCanvas.height = 330;
        const octx = overlayCanvas.getContext('2d');

        if (!octx) throw new Error('Canvas 2D unsupported');

        for (let i = 0; i < sortedSnapshots.length; i++) {
          const snap = sortedSnapshots[i];
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const im = new Image();
            im.crossOrigin = 'anonymous';
            im.onload = () => resolve(im);
            im.onerror = reject;
            im.src = snap.previewUrl;
          });

          // Background
          octx.fillStyle = '#FAF7F2';
          octx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);

          // Fit image
          const aspect = img.width / img.height;
          let dw = overlayCanvas.width;
          let dh = overlayCanvas.height;
          let dx = 0;
          let dy = 0;
          if (aspect > overlayCanvas.width / overlayCanvas.height) {
            dh = overlayCanvas.width / aspect;
            dy = (overlayCanvas.height - dh) / 2;
          } else {
            dw = overlayCanvas.height * aspect;
            dx = (overlayCanvas.width - dw) / 2;
          }
          octx.drawImage(img, dx, dy, dw, dh);

          // Overlay badge (Top Left: Percentage)
          octx.fillStyle = 'rgba(44, 37, 35, 0.88)';
          octx.beginPath();
          octx.roundRect(12, 12, 120, 28, 6);
          octx.fill();

          octx.fillStyle = '#FBBF24'; // Warm gold
          octx.font = 'bold 13px monospace';
          octx.textAlign = 'left';
          octx.fillText(`${snap.percentage.toFixed(1)}% Done`, 22, 31);

          // Overlay badge (Bottom Right: Date & Stitches)
          const text = `${snap.dateFormatted}`;
          octx.font = '11px sans-serif';
          const textWidth = octx.measureText(text).width;

          octx.fillStyle = 'rgba(250, 247, 242, 0.9)';
          octx.beginPath();
          octx.roundRect(overlayCanvas.width - textWidth - 28, overlayCanvas.height - 34, textWidth + 18, 24, 6);
          octx.fill();

          octx.fillStyle = '#2C2523';
          octx.textAlign = 'right';
          octx.fillText(text, overlayCanvas.width - 20, overlayCanvas.height - 18);

          framesToEncode.push(overlayCanvas.toDataURL('image/png'));
        }
      } else {
        framesToEncode = sortedSnapshots.map((s) => s.previewUrl);
      }

      const { blob, url } = await createGifFromImageUrls(framesToEncode, {
        width: 440,
        height: 330,
        delayMs: frameSpeedMs,
        onProgress: (pct, status) => {
          setGifExportProgress(pct);
          setGifExportStatus(status);
        },
      });

      setExportedGifUrl(url);

      // Trigger direct download
      const link = document.createElement('a');
      const safeTitle = pattern.title.replace(/[^a-zA-Z0-9-_]/g, '_');
      link.download = `${safeTitle}_growth_timelapse.gif`;
      link.href = url;
      link.click();
    } catch (err) {
      console.error('GIF Export error', err);
      alert(language === 'fil' ? 'Nabigong lumikha ng GIF.' : 'Failed to generate animated GIF.');
    } finally {
      setIsExportingGif(false);
    }
  };

  // --- Render High-Resolution Collage to Canvas ---
  const renderCollageCanvas = useCallback(async () => {
    const canvas = collageCanvasRef.current;
    if (!canvas || sortedSnapshots.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsGeneratingCollage(true);

    try {
      const snapCount = sortedSnapshots.length;

      // Theme colors
      const themeConfig = {
        linen: {
          bg: '#FAF7F2',
          cardBg: '#FFFFFF',
          border: '#E8E1D5',
          accent: '#B88E3C',
          textTitle: '#2C2523',
          textSub: '#7A6E65',
          cardBorder: '#D7CBB9',
        },
        gold: {
          bg: '#FDFBF7',
          cardBg: '#FFFFFF',
          border: '#D4AF37',
          accent: '#996515',
          textTitle: '#1F1B16',
          textSub: '#856A3D',
          cardBorder: '#E6CA65',
        },
        minimal: {
          bg: '#F8F9FA',
          cardBg: '#FFFFFF',
          border: '#E2E8F0',
          accent: '#0F172A',
          textTitle: '#0F172A',
          textSub: '#64748B',
          cardBorder: '#CBD5E1',
        },
        midnight: {
          bg: '#18181B',
          cardBg: '#27272A',
          border: '#3F3F46',
          accent: '#F59E0B',
          textTitle: '#F4F4F5',
          textSub: '#A1A1AA',
          cardBorder: '#52525B',
        },
      }[collageTheme];

      // Layout geometry
      let cols = 2;
      let rows = 2;
      let cardWidth = 360;
      let cardHeight = 270;
      const margin = 32;
      const gap = 20;
      const headerHeight = 110;
      const footerHeight = 45;

      if (collageLayout === 'filmstrip') {
        cols = snapCount;
        rows = 1;
        cardWidth = 320;
        cardHeight = 240;
      } else if (collageLayout === 'timeline') {
        cols = Math.min(3, Math.max(1, Math.ceil(snapCount / 2)));
        rows = Math.ceil(snapCount / cols);
        cardWidth = 380;
        cardHeight = 310;
      } else {
        // Grid
        if (snapCount <= 2) {
          cols = snapCount;
          rows = 1;
        } else if (snapCount <= 4) {
          cols = 2;
          rows = 2;
        } else if (snapCount <= 6) {
          cols = 3;
          rows = 2;
        } else if (snapCount <= 9) {
          cols = 3;
          rows = 3;
        } else {
          cols = 4;
          rows = Math.ceil(snapCount / 4);
        }
      }

      const totalWidth = margin * 2 + cols * cardWidth + (cols - 1) * gap;
      const totalHeight = margin * 2 + headerHeight + rows * cardHeight + (rows - 1) * gap + footerHeight;

      canvas.width = totalWidth;
      canvas.height = totalHeight;

      // Draw background mat
      ctx.fillStyle = themeConfig.bg;
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      // Outer border frame
      ctx.strokeStyle = themeConfig.border;
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, totalWidth - 20, totalHeight - 20);

      // Inner hairline
      ctx.strokeStyle = themeConfig.accent;
      ctx.lineWidth = 1;
      ctx.strokeRect(16, 16, totalWidth - 32, totalHeight - 32);

      // Header section
      ctx.textAlign = 'center';
      ctx.fillStyle = themeConfig.textTitle;
      ctx.font = 'bold 26px serif';
      ctx.fillText(collageTitle, totalWidth / 2, margin + 42);

      ctx.fillStyle = themeConfig.textSub;
      ctx.font = '13px sans-serif';
      ctx.fillText(collageSubtitle, totalWidth / 2, margin + 68);

      // Divider line
      ctx.strokeStyle = themeConfig.border;
      ctx.beginPath();
      ctx.moveTo(totalWidth / 2 - 140, margin + 82);
      ctx.lineTo(totalWidth / 2 + 140, margin + 82);
      ctx.stroke();

      // Pre-load snapshot images
      const images: HTMLImageElement[] = await Promise.all(
        sortedSnapshots.map(
          (s) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = s.previewUrl;
            })
        )
      );

      // Draw cards
      for (let i = 0; i < sortedSnapshots.length; i++) {
        const snap = sortedSnapshots[i];
        const img = images[i];
        const col = i % cols;
        const row = Math.floor(i / cols);

        const cardX = margin + col * (cardWidth + gap);
        const cardY = margin + headerHeight + row * (cardHeight + gap);

        // Card container shadow and background
        ctx.fillStyle = themeConfig.cardBg;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 10);
        ctx.fill();

        ctx.strokeStyle = themeConfig.cardBorder;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Image viewport
        const imgMargin = 10;
        const imgWidth = cardWidth - imgMargin * 2;
        const imgHeight = cardHeight - 75; // Leave bottom room for caption & percentage

        // Draw image keeping aspect ratio
        const imgAspect = img.width / img.height;
        let dw = imgWidth;
        let dh = imgHeight;
        let dx = cardX + imgMargin;
        let dy = cardY + imgMargin;

        if (imgAspect > imgWidth / imgHeight) {
          dh = imgWidth / imgAspect;
          dy += (imgHeight - dh) / 2;
        } else {
          dw = imgHeight * imgAspect;
          dx += (imgWidth - dw) / 2;
        }

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cardX + imgMargin, cardY + imgMargin, imgWidth, imgHeight, 6);
        ctx.clip();
        ctx.fillStyle = collageTheme === 'midnight' ? '#18181B' : '#FAF7F2';
        ctx.fillRect(cardX + imgMargin, cardY + imgMargin, imgWidth, imgHeight);
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();

        // Overlay: Percentage tag top-left of image
        if (showPercentages) {
          ctx.fillStyle = 'rgba(44, 37, 35, 0.9)';
          ctx.beginPath();
          ctx.roundRect(cardX + imgMargin + 6, cardY + imgMargin + 6, 70, 22, 4);
          ctx.fill();

          ctx.fillStyle = '#FBBF24';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${snap.percentage.toFixed(1)}%`, cardX + imgMargin + 41, cardY + imgMargin + 21);
        }

        // Overlay: Step indicator top-right of image
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.roundRect(cardX + cardWidth - imgMargin - 65, cardY + imgMargin + 6, 59, 20, 4);
        ctx.fill();

        ctx.fillStyle = '#2C2523';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Milestone ${i + 1}`, cardX + cardWidth - imgMargin - 35, cardY + imgMargin + 20);

        // Card Caption Area (Bottom)
        ctx.textAlign = 'left';

        // Date
        if (showDates) {
          ctx.fillStyle = themeConfig.accent;
          ctx.font = 'bold 11px monospace';
          ctx.fillText(snap.dateFormatted, cardX + imgMargin + 2, cardY + cardHeight - 44);
        }

        // Stitched count
        ctx.fillStyle = themeConfig.textSub;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(
          `${snap.stitchedCount.toLocaleString()} / ${snap.totalStitches.toLocaleString()} sts`,
          cardX + cardWidth - imgMargin - 2,
          cardY + cardHeight - 44
        );

        // Note / Title line
        if (showNotes) {
          ctx.fillStyle = themeConfig.textTitle;
          ctx.font = 'italic 11px serif';
          ctx.textAlign = 'left';
          const captionText = snap.note || `Stage ${i + 1} milestone`;
          ctx.fillText(
            captionText.length > 42 ? captionText.slice(0, 40) + '…' : captionText,
            cardX + imgMargin + 2,
            cardY + cardHeight - 20
          );
        }
      }

      // Footer signature
      ctx.textAlign = 'center';
      ctx.fillStyle = themeConfig.textSub;
      ctx.font = '11px sans-serif';
      ctx.fillText(
        `Generated from Sovereign Stitch Heirloom Studio · ${snapCount} visual milestones preserved`,
        totalWidth / 2,
        totalHeight - margin / 2
      );
    } catch (e) {
      console.error('Collage render error', e);
    } finally {
      setIsGeneratingCollage(false);
    }
  }, [
    sortedSnapshots,
    collageLayout,
    collageTheme,
    collageTitle,
    collageSubtitle,
    showPercentages,
    showDates,
    showNotes,
  ]);

  // Re-render collage when layout / settings change
  useEffect(() => {
    if (isOpen && activeTab === 'collage' && sortedSnapshots.length > 0) {
      renderCollageCanvas();
    }
  }, [isOpen, activeTab, renderCollageCanvas, sortedSnapshots.length]);

  // Download High-Res Collage PNG
  const handleDownloadCollage = () => {
    const canvas = collageCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    const safeTitle = pattern.title.replace(/[^a-zA-Z0-9-_]/g, '_');
    link.download = `${safeTitle}_milestones_collage.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-[#D7CBB9]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#FAF7F2] px-5 py-3.5 border-b border-[#E8E1D5] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-serif font-bold text-base text-[#2C2523]">
                  {language === 'fil'
                    ? 'I-export ang Animated GIF at Collage'
                    : 'Export Animated GIF & Milestone Collage'}
                </h4>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  {sortedSnapshots.length} {sortedSnapshots.length === 1 ? 'frame' : 'frames'}
                </span>
              </div>
              <p className="text-xs text-[#7A6E65]">
                {language === 'fil'
                  ? 'I-visualize ang pag-unlad ng iyong burda sa paglipas ng panahon bilang animated timelapse o commemorative collage.'
                  : 'Visualize your pattern growth over time as an animated timelapse GIF or commemorative collage.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white border border-[#E8DFC9] hover:bg-[#F2ECE1] text-[#5F554F] hover:text-[#2C2523] flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#FAF7F2]/60 px-5 pt-2 border-b border-[#E8E1D5] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('gif')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
              activeTab === 'gif'
                ? 'bg-white text-[#2C2523] border-[#B88E3C] shadow-xs'
                : 'text-[#5F554F] hover:text-[#2C2523] border-transparent hover:bg-white/50'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-amber-700" />
            <span>{language === 'fil' ? '🎬 Animated Timelapse GIF' : '🎬 Animated Timelapse GIF'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('collage')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
              activeTab === 'collage'
                ? 'bg-white text-[#2C2523] border-[#B88E3C] shadow-xs'
                : 'text-[#5F554F] hover:text-[#2C2523] border-transparent hover:bg-white/50'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-amber-700" />
            <span>{language === 'fil' ? '🖼️ Milestone Collage' : '🖼️ Milestone Collage'}</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 bg-[#FAF7F2]/30">
          {sortedSnapshots.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-xl border-2 border-dashed border-[#D7CBB9] space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h5 className="font-serif font-bold text-base text-[#2C2523]">
                {language === 'fil' ? 'Walang nahanap na snapshot' : 'No progress snapshots found yet'}
              </h5>
              <p className="text-xs text-[#7A6E65] max-w-sm mx-auto">
                {language === 'fil'
                  ? 'Gamitin ang "Snapshot" button sa Stitch Viewer habang nananahi upang kumuha ng visual milestones na pwede mong i-export bilang GIF o collage!'
                  : 'Capture a few progress milestones using the "Snapshot" camera button in the Stitch Viewer to create your animated timelapse and collage!'}
              </p>
            </div>
          ) : activeTab === 'gif' ? (
            /* =========================================================================
               TAB 1: ANIMATED TIMELAPSE GIF
               ========================================================================= */
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* GIF Preview Viewport */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="relative bg-[#2C2523] rounded-xl overflow-hidden aspect-4/3 flex items-center justify-center shadow-md border border-[#D7CBB9]">
                    {sortedSnapshots[currentFrameIndex] && (
                      <img
                        src={sortedSnapshots[currentFrameIndex].previewUrl}
                        alt={`Timelapse frame ${currentFrameIndex + 1}`}
                        className="max-h-full max-w-full object-contain p-2"
                      />
                    )}

                    {/* Burned-in preview badge */}
                    {showOverlaysInGif && sortedSnapshots[currentFrameIndex] && (
                      <div className="absolute top-3 left-3 bg-[#2C2523]/85 text-white backdrop-blur-xs px-2.5 py-1 rounded text-xs font-mono font-bold shadow-xs">
                        {sortedSnapshots[currentFrameIndex].percentage.toFixed(1)}% Done
                      </div>
                    )}

                    {showOverlaysInGif && sortedSnapshots[currentFrameIndex] && (
                      <div className="absolute bottom-3 right-3 bg-white/90 text-[#2C2523] backdrop-blur-xs px-2.5 py-1 rounded text-[11px] font-mono shadow-xs">
                        {sortedSnapshots[currentFrameIndex].dateFormatted}
                      </div>
                    )}

                    {/* Play/Pause Watermark Overlay when paused */}
                    {!isPlaying && (
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-white/90 text-[#2C2523] flex items-center justify-center shadow-lg">
                          <Pause className="w-5 h-5 fill-current" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Playback Scrubber & Player Controls */}
                  <div className="bg-white p-3.5 rounded-xl border border-[#E8E1D5] space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="w-8 h-8 rounded-lg bg-[#2C2523] hover:bg-[#433936] text-white flex items-center justify-center transition-colors cursor-pointer"
                          title={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                        <span className="font-bold text-[#2C2523]">
                          Frame {currentFrameIndex + 1} / {sortedSnapshots.length}
                        </span>
                      </div>

                      <span className="text-[#7A6E65]">
                        {sortedSnapshots[currentFrameIndex]?.stitchedCount.toLocaleString()} stitches
                      </span>
                    </div>

                    {/* Timeline slider */}
                    <input
                      type="range"
                      min={0}
                      max={sortedSnapshots.length - 1}
                      value={currentFrameIndex}
                      onChange={(e) => {
                        setIsPlaying(false);
                        setCurrentFrameIndex(Number(e.target.value));
                      }}
                      className="w-full accent-[#B88E3C] cursor-pointer"
                    />

                    {/* Milestone Frame Thumbnails Track */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      {sortedSnapshots.map((snap, idx) => (
                        <button
                          key={snap.id}
                          type="button"
                          onClick={() => {
                            setCurrentFrameIndex(idx);
                            setIsPlaying(false);
                          }}
                          className={`w-11 h-9 rounded border overflow-hidden shrink-0 transition-all cursor-pointer ${
                            currentFrameIndex === idx
                              ? 'border-amber-600 ring-2 ring-amber-300 scale-105 shadow-xs'
                              : 'border-[#D7CBB9] opacity-60 hover:opacity-100'
                          }`}
                          title={`Milestone ${idx + 1}: ${snap.percentage.toFixed(1)}%`}
                        >
                          <img
                            src={snap.previewUrl}
                            alt="thumb"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* GIF Export Configuration Panel */}
                <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-[#E8E1D5] space-y-4 shadow-xs">
                  <div className="border-b border-[#F0ECE1] pb-2">
                    <h5 className="font-serif font-bold text-sm text-[#2C2523]">
                      {language === 'fil' ? 'Mga Setting ng Timelapse GIF' : 'Timelapse GIF Settings'}
                    </h5>
                    <p className="text-[11px] text-[#7A6E65]">
                      {language === 'fil'
                        ? 'I-adjust ang bilis ng frames at mga visual overlay.'
                        : 'Adjust playback speed and milestone metadata overlays.'}
                    </p>
                  </div>

                  {/* Frame Speed Presets */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#2C2523] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>{language === 'fil' ? 'Bilis ng Bawat Frame:' : 'Frame Transition Speed:'}</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: '1.2s Slow', ms: 1200 },
                        { label: '0.7s Normal', ms: 700 },
                        { label: '0.4s Fast', ms: 400 },
                        { label: '0.2s Hyper', ms: 200 },
                      ].map((s) => (
                        <button
                          key={s.ms}
                          type="button"
                          onClick={() => setFrameSpeedMs(s.ms)}
                          className={`px-2 py-1.5 text-[11px] font-mono rounded-lg border text-center transition-colors cursor-pointer ${
                            frameSpeedMs === s.ms
                              ? 'bg-[#2C2523] text-white border-[#2C2523] font-bold shadow-2xs'
                              : 'bg-[#FAF7F2] text-[#5F554F] border-[#E0D7C9] hover:bg-[#F2ECE1]'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle Milestone Metadata Overlay */}
                  <div className="pt-2 border-t border-[#F0ECE1] space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-[#2C2523]">
                      <input
                        type="checkbox"
                        checked={showOverlaysInGif}
                        onChange={(e) => setShowOverlaysInGif(e.target.checked)}
                        className="rounded border-[#D7CBB9] text-amber-600 focus:ring-amber-500"
                      />
                      <span>
                        {language === 'fil'
                          ? 'Isama ang Percentage & Date badge sa GIF'
                          : 'Burn milestone percentage & date badges into GIF'}
                      </span>
                    </label>
                    <p className="text-[11px] text-[#8C8077] pl-5">
                      {language === 'fil'
                        ? 'Nagpapakita ng banner sa bawat frame para sa magandang pagbabago ng porsyento.'
                        : 'Displays elegant milestone badges indicating percentage growth on every frame.'}
                    </p>
                  </div>

                  {/* Export Status & Progress Bar */}
                  {isExportingGif && (
                    <div className="bg-[#FAF7F2] p-3 rounded-lg border border-[#E8DFC9] space-y-2 animate-pulse">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#2C2523] font-bold">{gifExportStatus}</span>
                        <span className="text-amber-800 font-bold">{gifExportProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#EAE2D5] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all duration-200"
                          style={{ width: `${gifExportProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Export Trigger Button */}
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={handleExportGif}
                      disabled={isExportingGif || sortedSnapshots.length === 0}
                      className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>
                        {isExportingGif
                          ? (language === 'fil' ? 'Bumubuo ng Animated GIF...' : 'Generating Animated GIF...')
                          : (language === 'fil' ? 'I-download ang Animated GIF' : 'Export & Download Animated GIF')}
                      </span>
                    </button>
                    <p className="text-[10px] text-center text-[#8C8077] mt-1.5 italic">
                      {language === 'fil'
                        ? 'Standard GIF format · Madaling ibahagi sa Messenger, email, at social media.'
                        : 'Pure standard GIF format · Universally shareable across devices and messages.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =========================================================================
               TAB 2: MILESTONE COLLAGE
               ========================================================================= */
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Collage Preview Canvas Container */}
                <div className="lg:col-span-8 space-y-3">
                  <div className="bg-[#EAE2D5] p-3 rounded-xl border border-[#D7CBB9] overflow-auto max-h-[460px] flex items-center justify-center shadow-inner">
                    <canvas
                      ref={collageCanvasRef}
                      className="max-w-full h-auto rounded-lg shadow-md border border-black/10"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#7A6E65]">
                    <span>
                      {sortedSnapshots.length} {language === 'fil' ? 'milestones kasama sa collage' : 'milestones included in collage'}
                    </span>
                    <button
                      type="button"
                      onClick={renderCollageCanvas}
                      className="text-[#2C2523] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{language === 'fil' ? 'I-refresh ang Preview' : 'Refresh Preview'}</span>
                    </button>
                  </div>
                </div>

                {/* Collage Settings Panel */}
                <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-[#E8E1D5] space-y-4 shadow-xs">
                  <div className="border-b border-[#F0ECE1] pb-2">
                    <h5 className="font-serif font-bold text-sm text-[#2C2523]">
                      {language === 'fil' ? 'Mga Setting ng Collage' : 'Collage Poster Settings'}
                    </h5>
                    <p className="text-[11px] text-[#7A6E65]">
                      {language === 'fil'
                        ? 'I-customize ang layout, pamagat, at kulay ng mat frame.'
                        : 'Customize framing mat, layout arrangement, and titles.'}
                    </p>
                  </div>

                  {/* Titles */}
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#2C2523] block">
                        {language === 'fil' ? 'Pamagat ng Collage:' : 'Collage Title:'}
                      </label>
                      <input
                        type="text"
                        value={collageTitle}
                        onChange={(e) => setCollageTitle(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-[#D7CBB9] rounded-lg bg-[#FAF7F2] text-[#2C2523] focus:outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#2C2523] block">
                        {language === 'fil' ? 'Subtitle / Dedication:' : 'Subtitle / Couple Names:'}
                      </label>
                      <input
                        type="text"
                        value={collageSubtitle}
                        onChange={(e) => setCollageSubtitle(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-[#D7CBB9] rounded-lg bg-[#FAF7F2] text-[#2C2523] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Layout selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#2C2523] block">
                      {language === 'fil' ? 'Ayos ng Layout:' : 'Arrangement Style:'}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'grid', label: 'Grid' },
                        { id: 'filmstrip', label: 'Filmstrip' },
                        { id: 'timeline', label: 'Story' },
                      ].map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setCollageLayout(l.id as CollageLayout)}
                          className={`px-2 py-1 text-xs rounded-lg border font-medium transition-colors cursor-pointer ${
                            collageLayout === l.id
                              ? 'bg-[#2C2523] text-white border-[#2C2523]'
                              : 'bg-[#FAF7F2] text-[#5F554F] border-[#E0D7C9] hover:bg-[#F2ECE1]'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Theme Mat Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#2C2523] block">
                      {language === 'fil' ? 'Tema ng Mat Frame:' : 'Mat Frame Theme:'}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'linen', label: 'Warm Linen', color: '#FAF7F2' },
                        { id: 'gold', label: 'Antique Gold', color: '#B88E3C' },
                        { id: 'minimal', label: 'Clean White', color: '#FFFFFF' },
                        { id: 'midnight', label: 'Midnight Dark', color: '#18181B' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setCollageTheme(t.id as CollageTheme)}
                          className={`px-2 py-1.5 text-xs rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                            collageTheme === t.id
                              ? 'bg-amber-100 text-amber-950 border-amber-400 font-bold'
                              : 'bg-[#FAF7F2] text-[#5F554F] border-[#E0D7C9] hover:bg-[#F2ECE1]'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-black/20"
                            style={{ backgroundColor: t.color }}
                          />
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle Labels */}
                  <div className="pt-2 border-t border-[#F0ECE1] space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-[#2C2523]">
                      <input
                        type="checkbox"
                        checked={showPercentages}
                        onChange={(e) => setShowPercentages(e.target.checked)}
                        className="rounded border-[#D7CBB9] text-amber-600 focus:ring-amber-500"
                      />
                      <span>{language === 'fil' ? 'Ipakita ang % badge' : 'Show percentage badge'}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-[#2C2523]">
                      <input
                        type="checkbox"
                        checked={showDates}
                        onChange={(e) => setShowDates(e.target.checked)}
                        className="rounded border-[#D7CBB9] text-amber-600 focus:ring-amber-500"
                      />
                      <span>{language === 'fil' ? 'Ipakita ang petsa' : 'Show timestamp date'}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-[#2C2523]">
                      <input
                        type="checkbox"
                        checked={showNotes}
                        onChange={(e) => setShowNotes(e.target.checked)}
                        className="rounded border-[#D7CBB9] text-amber-600 focus:ring-amber-500"
                      />
                      <span>{language === 'fil' ? 'Ipakita ang milestone notes' : 'Show milestone notes'}</span>
                    </label>
                  </div>

                  {/* Download Collage Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleDownloadCollage}
                      disabled={isGeneratingCollage || sortedSnapshots.length === 0}
                      className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>
                        {language === 'fil' ? 'I-download ang High-Res Collage (PNG)' : 'Download High-Res Collage (PNG)'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#FAF7F2] px-5 py-3 border-t border-[#E8E1D5] flex items-center justify-between text-xs text-[#7A6E65]">
          <span>
            {language === 'fil'
              ? 'Ang parehong GIF at Collage ay perpekto para sa wedding album at mga alaala.'
              : 'Preserve these exports for wedding albums, invitations, or social progress updates.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-[#F2ECE1] text-[#2C2523] border border-[#E8DFC9] rounded-lg transition-colors cursor-pointer font-medium"
          >
            {language === 'fil' ? 'Isara' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
