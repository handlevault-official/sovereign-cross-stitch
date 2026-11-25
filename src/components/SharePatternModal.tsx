import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Sparkles,
  MessageCircle,
  FileCode2
} from 'lucide-react';
import { PatternData } from '../types';
import { calculateFabricSpecs } from '../utils/colorMatcher';

export interface SharePatternModalProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: PatternData;
  language: 'en' | 'fil';
  isPro: boolean;
}

type CardFormat = 'pinterest' | 'square' | 'story' | 'landscape';
type CardTheme = 'ivory' | 'blush' | 'midnight' | 'sage';

export const SharePatternModal: React.FC<SharePatternModalProps> = ({
  isOpen,
  onClose,
  pattern,
  language,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<CardFormat>('pinterest');
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>('ivory');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedPinText, setCopiedPinText] = useState<boolean>(false);
  const [copiedEmbed, setCopiedEmbed] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [pinterestPinnedNotice, setPinterestPinnedNotice] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'pinterest' | 'social' | 'link' | 'embed'>('pinterest');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Calculate fabric dimensions
  const specs = calculateFabricSpecs(pattern.width, pattern.height, pattern.fabricCount || 14);

  // Generate shareable link
  const getShareableUrl = () => {
    try {
      const baseUrl = window.location.origin + window.location.pathname;
      const params = new URLSearchParams();
      params.set('share', 'true');
      params.set('title', pattern.title || 'Wedding Cross Stitch');
      if (pattern.coupleNames) params.set('couple', pattern.coupleNames);
      if (pattern.weddingDate) params.set('date', pattern.weddingDate);
      params.set('w', pattern.width.toString());
      params.set('h', pattern.height.toString());
      params.set('count', (pattern.fabricCount || 14).toString());
      params.set('colors', (pattern.palette?.length || 0).toString());
      if (pattern.complexity?.tier) params.set('tier', pattern.complexity.tier);
      return `${baseUrl}?${params.toString()}`;
    } catch {
      return window.location.href;
    }
  };

  const shareUrl = getShareableUrl();

  // Pre-formatted Pinterest description
  const getPinterestDescription = () => {
    const coupleText = pattern.coupleNames ? `${pattern.coupleNames}'s Wedding` : (pattern.title || 'Wedding Cross Stitch');
    const dateText = pattern.weddingDate ? ` (${pattern.weddingDate})` : '';
    const tierText = pattern.complexity?.tier ? ` | ${pattern.complexity.tier} Difficulty` : '';
    return `🌿 DIY Wedding Cross Stitch Pattern: ${coupleText}${dateText}. An heirloom needlework project with ${pattern.palette?.length || 12} authentic DMC floss colors, ${pattern.width}×${pattern.height} stitches (${specs.widthInches}" × ${specs.heightInches}" on ${pattern.fabricCount || 14}ct Aida)${tierText}. Includes printable chart & floss inventory guide! #weddingcrossstitch #crossstitchpattern #dmcthreads #weddingkeepsake #diywedding #crossstitchwedding #embroiderypattern #weddingcrafts`;
  };

  // Dimensions based on card format
  const getFormatDimensions = (format: CardFormat) => {
    switch (format) {
      case 'pinterest':
        return { width: 1000, height: 1500, label: 'Pinterest Pin (2:3 Vertical)', badge: 'Optimal for Pinterest' };
      case 'square':
        return { width: 1080, height: 1080, label: 'Square (1:1 Feed)', badge: 'Instagram & Facebook' };
      case 'story':
        return { width: 1080, height: 1920, label: 'Vertical Story (9:16)', badge: 'Stories & Reels' };
      case 'landscape':
        return { width: 1200, height: 630, label: 'Landscape (1.91:1)', badge: 'X (Twitter) & Web Cards' };
    }
  };

  // Color palettes for themes
  const getThemePalette = (theme: CardTheme) => {
    switch (theme) {
      case 'ivory':
        return {
          bg: '#FAF7F2',
          bgCard: '#FFFFFF',
          border: '#D7CBB9',
          accent: '#B88E3C',
          textMain: '#2C2523',
          textMuted: '#6B5D55',
          goldBadge: '#E6C687',
          ribbonBg: '#2C2523',
          ribbonText: '#F7EDD8',
        };
      case 'blush':
        return {
          bg: '#FDF7F8',
          bgCard: '#FFFFFF',
          border: '#E8CCD5',
          accent: '#C76A82',
          textMain: '#361E26',
          textMuted: '#7D5864',
          goldBadge: '#F5B7C7',
          ribbonBg: '#592233',
          ribbonText: '#FDECEF',
        };
      case 'midnight':
        return {
          bg: '#141824',
          bgCard: '#1C2233',
          border: '#37415E',
          accent: '#7FA4E8',
          textMain: '#F2F5FD',
          textMuted: '#A0ADC9',
          goldBadge: '#9AB7ED',
          ribbonBg: '#28334E',
          ribbonText: '#FFFFFF',
        };
      case 'sage':
        return {
          bg: '#F5F7F4',
          bgCard: '#FFFFFF',
          border: '#CAD4C8',
          accent: '#5E7D63',
          textMain: '#222F24',
          textMuted: '#586A5A',
          goldBadge: '#ABC2AF',
          ribbonBg: '#344938',
          ribbonText: '#F0F5F1',
        };
    }
  };

  // Render high-quality canvas card
  const renderCanvasCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = getFormatDimensions(selectedFormat);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = getThemePalette(selectedTheme);

    // 1. Background fill
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    // Subtle background linen/grid texture
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15;
    const step = 40;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // 2. Ornate Border Frame
    const margin = width * 0.04;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(margin + 8, margin + 8, width - (margin + 8) * 2, height - (margin + 8) * 2);

    // Corner flourishes
    const drawCornerFlourish = (cx: number, cy: number, rot: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(24, 0);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 24);
      ctx.stroke();
      ctx.restore();
    };

    drawCornerFlourish(margin + 8, margin + 8, 0);
    drawCornerFlourish(width - margin - 8, margin + 8, Math.PI / 2);
    drawCornerFlourish(width - margin - 8, height - margin - 8, Math.PI);
    drawCornerFlourish(margin + 8, height - margin - 8, (3 * Math.PI) / 2);

    // 3. Header Top Ribbon / Eyebrow
    const topY = margin + 50;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Top Brand Tag
    ctx.fillStyle = theme.accent;
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('✦ SOVEREIGN NEEDLEWORK STUDIO ✦', width / 2, topY);

    // Main Title / Couple Names
    const coupleText = pattern.coupleNames || pattern.title || 'Wedding Cross Stitch Heirloom';
    ctx.fillStyle = theme.textMain;
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText(coupleText, width / 2, topY + 54);

    // Date & Keepsake Tag
    const subText = pattern.weddingDate
      ? `Heirloom Wedding Edition · ${pattern.weddingDate}`
      : 'Bespoke Wedding Cross Stitch Keepsake';
    ctx.fillStyle = theme.textMuted;
    ctx.font = 'italic 24px Georgia, serif';
    ctx.fillText(subText, width / 2, topY + 98);

    // 4. Central Pattern Image Card
    const previewBoxY = topY + 140;
    const previewBoxH = selectedFormat === 'pinterest' ? height * 0.44 : (selectedFormat === 'story' ? height * 0.42 : height * 0.38);
    const previewBoxW = width - (margin * 2 + 60);
    const previewBoxX = (width - previewBoxW) / 2;

    // Card shadow & container
    ctx.fillStyle = theme.bgCard;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.fillRect(previewBoxX, previewBoxY, previewBoxW, previewBoxH);
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(previewBoxX, previewBoxY, previewBoxW, previewBoxH);

    // Render preview thumbnail or grid rendering
    if (pattern.previewUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const imgAspect = img.width / img.height;
        const boxAspect = (previewBoxW - 24) / (previewBoxH - 24);
        let dw = previewBoxW - 24;
        let dh = previewBoxH - 24;
        if (imgAspect > boxAspect) {
          dh = dw / imgAspect;
        } else {
          dw = dh * imgAspect;
        }
        const dx = previewBoxX + (previewBoxW - dw) / 2;
        const dy = previewBoxY + (previewBoxH - dh) / 2;

        ctx.drawImage(img, dx, dy, dw, dh);
      };
      img.src = pattern.previewUrl;
    } else {
      ctx.fillStyle = theme.textMuted;
      ctx.font = '22px Georgia, serif';
      ctx.fillText('Cross Stitch Motif Preview', width / 2, previewBoxY + previewBoxH / 2);
    }

    // 5. Specs & Dimensions Badges
    const specsY = previewBoxY + previewBoxH + 40;
    const badges = [
      { label: 'STITCH COUNT', val: `${pattern.width} × ${pattern.height}` },
      { label: 'FABRIC', val: `${pattern.fabricCount || 14}ct Aida` },
      { label: 'SIZE', val: `${specs.widthInches}" × ${specs.heightInches}"` },
      { label: 'DIFFICULTY', val: pattern.complexity?.tier || 'Masterpiece' },
      { label: 'DMC COLORS', val: `${pattern.palette?.length || 16} Skeins` },
    ];

    const badgeWidth = (width - margin * 2 - 40) / badges.length;
    badges.forEach((b, idx) => {
      const bx = margin + 20 + idx * badgeWidth;
      ctx.fillStyle = theme.bgCard;
      ctx.fillRect(bx + 4, specsY, badgeWidth - 8, 70);
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 4, specsY, badgeWidth - 8, 70);

      ctx.fillStyle = theme.accent;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(b.label, bx + badgeWidth / 2, specsY + 24);

      ctx.fillStyle = theme.textMain;
      ctx.font = 'bold 18px Georgia, serif';
      ctx.fillText(b.val, bx + badgeWidth / 2, specsY + 50);
    });

    // 6. DMC Palette Swatches Strip
    const paletteY = specsY + 95;
    ctx.fillStyle = theme.textMuted;
    ctx.font = 'italic 16px Georgia, serif';
    ctx.fillText('✦ Authentic DMC Stranded Cotton Palette ✦', width / 2, paletteY);

    const swatches = pattern.palette ? pattern.palette.slice(0, 10) : [];
    const swatchW = 50;
    const swatchH = 26;
    const swatchGap = 12;
    const totalPaletteW = swatches.length * (swatchW + swatchGap) - swatchGap;
    const startSwatchX = (width - totalPaletteW) / 2;

    swatches.forEach((color, i) => {
      const sx = startSwatchX + i * (swatchW + swatchGap);
      const sy = paletteY + 16;

      ctx.fillStyle = color.hex || '#E8E1D5';
      ctx.fillRect(sx, sy, swatchW, swatchH);
      ctx.strokeStyle = '#00000033';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, swatchW, swatchH);

      ctx.fillStyle = theme.textMain;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(color.code, sx + swatchW / 2, sy + swatchH + 16);
    });

    // 7. Footer Banner & Callout
    const footerY = height - margin - 50;

    ctx.fillStyle = theme.ribbonBg;
    ctx.fillRect(margin + 20, footerY - 45, width - (margin + 20) * 2, 54);

    ctx.fillStyle = theme.ribbonText;
    ctx.font = 'bold 19px Georgia, serif';
    ctx.fillText('📌 Save to Your Wedding Crafts Pinterest Board · Free Printable Chart', width / 2, footerY - 18);

    ctx.fillStyle = theme.textMuted;
    ctx.font = '14px Georgia, serif';
    ctx.fillText('Created with Sovereign Cross Stitch Generator · Standard 10×10 Grid & Commercial PDF Ready', width / 2, footerY + 30);
  };

  // Re-render when format or theme changes
  useEffect(() => {
    if (isOpen && pattern) {
      const timer = setTimeout(() => {
        renderCanvasCard();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, pattern, selectedFormat, selectedTheme]);

  if (!isOpen) return null;

  // Handle Copy Link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Handle Copy Pinterest Description
  const handleCopyPinText = async () => {
    try {
      await navigator.clipboard.writeText(getPinterestDescription());
      setCopiedPinText(true);
      setTimeout(() => setCopiedPinText(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Handle 1-Click "Pin to Pinterest"
  const handlePinToPinterest = () => {
    const description = getPinterestDescription();
    const mediaUrl = pattern.previewUrl || encodeURIComponent(shareUrl);
    const pinterestUrl = `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(mediaUrl)}&description=${encodeURIComponent(description)}`;

    // Copy pin description to clipboard for easy pasting
    navigator.clipboard?.writeText(description).catch(() => {});
    setPinterestPinnedNotice(true);

    window.open(pinterestUrl, '_blank', 'width=750,height=600,toolbar=no,menubar=no,scrollbars=yes');
  };

  // Handle Download High-Res Preview Card PNG
  const handleDownloadCard = () => {
    setIsGeneratingImage(true);
    const canvas = canvasRef.current;
    if (!canvas) {
      setIsGeneratingImage(false);
      return;
    }

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const filename = `wedding-cross-stitch-${selectedFormat}-${(pattern.coupleNames || pattern.title || 'pattern').toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading card:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Handle Native Web Share
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Wedding Cross Stitch: ${pattern.coupleNames || pattern.title}`,
          text: getPinterestDescription(),
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  // Social Share URLs
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out our custom DIY wedding cross stitch heirloom pattern! 🧵✨ ${pattern.coupleNames || pattern.title}`)}&url=${encodeURIComponent(shareUrl)}&hashtags=crossstitch,weddingcrafts,dmcfloss`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out our wedding cross stitch pattern! 💍 ${pattern.coupleNames || pattern.title}: ${shareUrl}`)}`;

  // Embed HTML snippet
  const embedCode = `<iframe src="${shareUrl}" width="600" height="450" frameborder="0" title="${pattern.coupleNames || pattern.title} Cross Stitch Pattern"></iframe>`;

  const formatInfo = getFormatDimensions(selectedFormat);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#FAF7F2] rounded-2xl max-w-5xl w-full border border-[#D7CBB9] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-white border-b border-[#E8E1D5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E60023]/10 border border-[#E60023]/20 flex items-center justify-center text-[#E60023]">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-lg text-[#2C2523]">
                  {language === 'fil' ? 'I-share ang Pattern & Pin sa Pinterest' : 'Share Pattern & Pin to Pinterest'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E60023] text-white">
                  Pinterest Ready
                </span>
              </div>
              <p className="text-xs text-[#7A6E65]">
                {language === 'fil'
                  ? 'Bumuo ng high-resolution social preview card at Pinterest pin para sa iyong wedding design'
                  : 'Generate high-resolution social preview cards and Pinterest board pins for your wedding design'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#8C8077] hover:text-[#2C2523] hover:bg-[#FAF7F2] rounded-xl transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 bg-white border-b border-[#E8E1D5] flex gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('pinterest')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'pinterest'
                ? 'border-[#E60023] text-[#E60023]'
                : 'border-transparent text-[#7A6E65] hover:text-[#2C2523]'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-[#E60023] text-white text-[10px] flex items-center justify-center font-bold">
              P
            </span>
            <span>Pin to Pinterest</span>
          </button>

          <button
            onClick={() => setActiveTab('social')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'social'
                ? 'border-[#B88E3C] text-[#2C2523]'
                : 'border-transparent text-[#7A6E65] hover:text-[#2C2523]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Social Media & Download</span>
          </button>

          <button
            onClick={() => setActiveTab('link')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'link'
                ? 'border-[#B88E3C] text-[#2C2523]'
                : 'border-transparent text-[#7A6E65] hover:text-[#2C2523]'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Shareable Link</span>
          </button>

          <button
            onClick={() => setActiveTab('embed')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'embed'
                ? 'border-[#B88E3C] text-[#2C2523]'
                : 'border-transparent text-[#7A6E65] hover:text-[#2C2523]'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Embed & Forums</span>
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Live Card Preview & Controls */}
          <div className="lg:col-span-7 flex flex-col items-center">
            
            {/* Format Selector Tabs */}
            <div className="w-full bg-white p-2 rounded-xl border border-[#E8E1D5] mb-4 flex items-center justify-between gap-1 text-xs">
              <span className="font-serif font-bold text-xs text-[#2C2523] px-2 hidden sm:inline">
                Card Ratio:
              </span>
              <div className="flex flex-1 justify-end gap-1">
                {(['pinterest', 'square', 'story', 'landscape'] as CardFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setSelectedFormat(fmt)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                      selectedFormat === fmt
                        ? fmt === 'pinterest'
                          ? 'bg-[#E60023] text-white shadow-xs font-bold'
                          : 'bg-[#2C2523] text-white shadow-xs font-bold'
                        : 'text-[#6B5D55] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {fmt === 'pinterest' && <span className="text-xs">📌</span>}
                    <span className="capitalize">{fmt}</span>
                    <span className="opacity-75 text-[10px]">
                      {fmt === 'pinterest' ? '2:3' : fmt === 'square' ? '1:1' : fmt === 'story' ? '9:16' : '16:9'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selector */}
            <div className="w-full mb-4 flex items-center justify-between gap-2 px-1 text-xs text-[#6B5D55]">
              <span className="font-semibold">Heirloom Aesthetic:</span>
              <div className="flex items-center gap-2">
                {[
                  { id: 'ivory', name: 'Ivory & Gold', dot: '#B88E3C' },
                  { id: 'blush', name: 'Blush Rose', dot: '#C76A82' },
                  { id: 'midnight', name: 'Midnight Navy', dot: '#7FA4E8' },
                  { id: 'sage', name: 'Botanical Sage', dot: '#5E7D63' },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setSelectedTheme(th.id as CardTheme)}
                    className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedTheme === th.id
                        ? 'border-[#2C2523] bg-white text-[#2C2523] font-bold shadow-2xs'
                        : 'border-transparent text-[#7A6E65] hover:border-[#D7CBB9]'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/10"
                      style={{ backgroundColor: th.dot }}
                    />
                    <span>{th.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Visual Canvas Preview Container */}
            <div className="relative w-full bg-[#332C2A] rounded-2xl p-4 sm:p-6 shadow-inner flex items-center justify-center min-h-[380px] max-h-[500px] overflow-hidden">
              <canvas
                ref={canvasRef}
                className="max-h-[460px] max-w-full rounded-lg shadow-2xl object-contain border border-white/10"
              />

              {/* Floating Download Button */}
              <button
                onClick={handleDownloadCard}
                disabled={isGeneratingImage}
                className="absolute bottom-4 right-4 bg-white/95 hover:bg-white text-[#2C2523] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg border border-[#D7CBB9] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                title="Download high-resolution PNG image"
              >
                <Download className="w-3.5 h-3.5 text-[#B88E3C]" />
                <span>Save PNG ({formatInfo.width}×{formatInfo.height})</span>
              </button>
            </div>

            {/* Format spec footer */}
            <div className="mt-3 flex items-center justify-between w-full text-[11px] text-[#8C8077] px-2">
              <span>{formatInfo.label} · {formatInfo.badge}</span>
              <span className="font-mono">{formatInfo.width} × {formatInfo.height} px (High Res)</span>
            </div>
          </div>

          {/* Right Column: Actions, Pinterest Integration & Share Links */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
            
            {/* Primary Action Card: Pinterest Board Showcase */}
            <div className="bg-white rounded-2xl p-5 border border-[#E8CCD5] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#E60023] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    P
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-[#2C2523]">
                      Pin to Pinterest Board
                    </h4>
                    <span className="text-[10px] text-[#E60023] font-semibold">
                      Rank #1 in Wedding DIY Searches
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-50 text-[#E60023] font-bold border border-red-100">
                  2:3 Vertical
                </span>
              </div>

              <p className="text-xs text-[#6B5D55] leading-relaxed">
                Pinterest is the primary platform where brides and embroidery crafters discover DIY wedding keepsakes. Pinning this 2:3 preview card to your Pinterest board stores this pattern with live floss and dimension specs.
              </p>

              {/* Big Pin To Pinterest Button */}
              <button
                onClick={handlePinToPinterest}
                className="w-full py-3.5 px-4 rounded-xl font-serif text-sm font-bold text-white bg-[#E60023] hover:bg-[#BD081C] active:scale-[0.99] shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span className="text-base">📌</span>
                <span>Pin to Pinterest Now</span>
                <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
              </button>

              {/* Pinned Feedback Notice */}
              {pinterestPinnedNotice && (
                <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#E60023] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Pinterest Pin Window Opened!</p>
                    <p className="text-[11px] text-red-800">
                      We pre-filled your pin description and hashtags. If prompted, select your favorite wedding or embroidery board!
                    </p>
                  </div>
                </div>
              )}

              {/* Pinterest Description Preview & Copy */}
              <div className="space-y-1.5 pt-2 border-t border-[#F2ECE4]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#2C2523]">Pre-formatted Pin Description:</span>
                  <button
                    onClick={handleCopyPinText}
                    className="text-[#E60023] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    {copiedPinText ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Description</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5] text-[11px] text-[#6B5D55] font-mono leading-relaxed line-clamp-3">
                  {getPinterestDescription()}
                </div>
              </div>

              {/* Recommended Pinterest Boards */}
              <div className="pt-2 border-t border-[#F2ECE4]">
                <span className="text-[11px] font-semibold text-[#8C8077] block mb-1.5">
                  Suggested Pinterest Boards:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '👰 Wedding Inspiration',
                    '🧵 DIY Wedding Crafts',
                    '✨ Cross Stitch Patterns',
                    '🎁 Handmade Anniversary Gifts',
                    '🎨 Heirloom Embroidery',
                  ].map((board) => (
                    <span
                      key={board}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#FAF7F2] text-[#6B5D55] border border-[#E8E1D5]"
                    >
                      {board}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Secondary Share Links & Quick Channels */}
            <div className="bg-white rounded-2xl p-5 border border-[#E8E1D5] shadow-xs space-y-4">
              <h4 className="font-serif font-bold text-sm text-[#2C2523] flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#B88E3C]" />
                <span>Instant Social Sharing</span>
              </h4>

              {/* Quick Share Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Native Web Share */}
                <button
                  onClick={handleNativeShare}
                  className="p-2.5 rounded-xl border border-[#D7CBB9] hover:bg-[#FAF7F2] text-[#2C2523] text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <Share2 className="w-4 h-4 text-[#B88E3C]" />
                  <span>Share...</span>
                </button>

                {/* Facebook */}
                <a
                  href={facebookShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-[#D7CBB9] hover:bg-[#FAF7F2] text-[#1877F2] text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <span className="font-bold text-sm">f</span>
                  <span>Facebook</span>
                </a>

                {/* X (Twitter) */}
                <a
                  href={twitterShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-[#D7CBB9] hover:bg-[#FAF7F2] text-[#000000] text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <span className="font-bold text-sm">𝕏</span>
                  <span>Post</span>
                </a>

                {/* WhatsApp */}
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-[#D7CBB9] hover:bg-[#FAF7F2] text-[#25D366] text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              </div>

              {/* Shareable Link Input */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-[#2C2523] flex items-center justify-between">
                  <span>Direct Shareable Link:</span>
                  {copiedLink && <span className="text-emerald-700 font-bold text-[11px]">Copied to clipboard!</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 bg-[#FAF7F2] border border-[#D7CBB9] rounded-xl text-xs font-mono text-[#433936] select-all focus:outline-hidden"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-[#2C2523] hover:bg-[#433936] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Embed / Forum code snippet toggle */}
              {activeTab === 'embed' && (
                <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8E1D5] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#2C2523]">HTML Embed Snippet:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(embedCode);
                        setCopiedEmbed(true);
                        setTimeout(() => setCopiedEmbed(false), 2000);
                      }}
                      className="text-[#B88E3C] hover:underline text-[11px] font-semibold cursor-pointer"
                    >
                      {copiedEmbed ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="text-[10px] bg-white p-2 rounded-lg border border-[#D7CBB9] overflow-x-auto text-[#6B5D55]">
                    {embedCode}
                  </pre>
                </div>
              )}
            </div>

            {/* Download Card Master Button */}
            <button
              onClick={handleDownloadCard}
              disabled={isGeneratingImage}
              className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-[#2C2523] bg-white hover:bg-[#FAF7F2] border border-[#D7CBB9] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Download className="w-4 h-4 text-[#B88E3C]" />
              <span>Download {formatInfo.label} (PNG)</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#FAF7F2] border-t border-[#E8E1D5] flex items-center justify-between text-xs text-[#7A6E65] shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#B88E3C]" />
            <span>High-resolution rasterization ready for Pinterest & social sharing</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white border border-[#D7CBB9] text-[#2C2523] hover:bg-[#FAF7F2] font-medium cursor-pointer transition-all"
          >
            {language === 'fil' ? 'Isara' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
