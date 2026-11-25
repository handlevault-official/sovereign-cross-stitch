import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Sparkles,
  Image as ImageIcon,
  Heart,
  Link2,
  Smartphone,
  Eye,
} from 'lucide-react';
import { SavedPatternEntry } from './SavedDesignsGallery';
import { PatternData } from '../types';
import { calculateFabricSpecs } from '../utils/colorMatcher';

interface ShareSavedDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: SavedPatternEntry | null;
  language: 'en' | 'fil';
  onOpenFullSocialStudio?: (pattern: PatternData) => void;
}

export const ShareSavedDesignModal: React.FC<ShareSavedDesignModalProps> = ({
  isOpen,
  onClose,
  entry,
  language,
  onOpenFullSocialStudio,
}) => {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSharingImage, setIsSharingImage] = useState<boolean>(false);

  if (!isOpen || !entry) return null;

  const specs = calculateFabricSpecs(entry.width, entry.height, entry.fabricCount || 14);
  const coupleLabel = entry.coupleNames || entry.title;
  const cleanTitle = coupleLabel.replace(/[^a-zA-Z0-9]/g, '_');

  // Build direct shareable link
  const getDirectLink = () => {
    try {
      const baseUrl = window.location.origin + window.location.pathname;
      const params = new URLSearchParams();
      params.set('pattern', entry.id);
      return `${baseUrl}?${params.toString()}`;
    } catch {
      return window.location.href;
    }
  };

  const directLink = getDirectLink();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // 1. Copy Direct Link to Clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(directLink);
      setCopiedLink(true);
      showToast(
        language === 'fil'
          ? 'Direktang link ng pattern nakopya na sa clipboard!'
          : 'Direct pattern link copied to clipboard!'
      );
      setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      // Fallback
      const input = document.getElementById('direct-pattern-link-input') as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopiedLink(true);
        showToast(
          language === 'fil'
            ? 'Direktang link ng pattern nakopya na sa clipboard!'
            : 'Direct pattern link copied to clipboard!'
        );
        setTimeout(() => setCopiedLink(false), 2400);
      }
    }
  };

  // Convert dataURL / preview URL to Blob for sharing/copying
  const getPreviewBlob = async (): Promise<Blob> => {
    if (entry.previewUrl.startsWith('data:')) {
      const res = await fetch(entry.previewUrl);
      return await res.blob();
    }
    // Canvas fallback if needed
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = entry.previewUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 600;
    canvas.height = img.naturalHeight || 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
    }
    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
    });
  };

  // 2. Share Preview Image via Web Share API
  const handleShareImage = async () => {
    setIsSharingImage(true);
    try {
      const blob = await getPreviewBlob();
      const file = new File([blob], `${cleanTitle}_Preview.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${entry.title} - Wedding Cross Stitch`,
          text: `Wedding heirloom cross-stitch design: ${coupleLabel} (${specs.widthInches}" × ${specs.heightInches}" on ${entry.fabricCount}ct Aida).`,
          files: [file],
          url: directLink,
        });
        showToast(language === 'fil' ? 'Matagumpay na na-share!' : 'Shared successfully!');
      } else if (navigator.share) {
        // Fallback to URL and text if file sharing not permitted
        await navigator.share({
          title: `${entry.title} - Wedding Cross Stitch`,
          text: `Wedding heirloom cross-stitch design: ${coupleLabel}`,
          url: directLink,
        });
        showToast(language === 'fil' ? 'Matagumpay na na-share!' : 'Shared successfully!');
      } else {
        // Fallback to downloading image and copying link
        handleDownloadImage();
        await handleCopyLink();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Sharing failed, falling back to download:', err);
        handleDownloadImage();
      }
    } finally {
      setIsSharingImage(false);
    }
  };

  // 3. Download Preview Image (PNG)
  const handleDownloadImage = () => {
    try {
      const a = document.createElement('a');
      a.href = entry.previewUrl;
      a.download = `${cleanTitle}_Wedding_CrossStitch_Preview.png`;
      a.click();
      showToast(
        language === 'fil'
          ? 'Nai-download ang preview image!'
          : 'Preview image downloaded!'
      );
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // 4. Copy Image to Clipboard
  const handleCopyImageToClipboard = async () => {
    try {
      const blob = await getPreviewBlob();
      // Ensure PNG format for ClipboardItem
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);
        setCopiedImage(true);
        showToast(
          language === 'fil'
            ? 'Preview image nakopya na sa clipboard! Pwede mo itong i-paste sa chats o documents.'
            : 'Preview image copied to clipboard! You can paste it into chats or documents.'
        );
        setTimeout(() => setCopiedImage(false), 2400);
      } else {
        handleDownloadImage();
      }
    } catch (err) {
      console.warn('Copy image to clipboard not supported, downloading instead:', err);
      handleDownloadImage();
    }
  };

  // 5. Pin to Pinterest
  const handlePinToPinterest = () => {
    const description = `🌿 DIY Wedding Cross Stitch Pattern: ${coupleLabel}. Heirloom needlework project with ${entry.palette?.length || 24} DMC threads, ${entry.width}x${entry.height} stitches (${specs.widthInches}" x ${specs.heightInches}" on ${entry.fabricCount}ct Aida). #weddingcrossstitch #crossstitchpattern #dmcthreads #weddingkeepsake #diywedding`;
    const pinUrl = `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(
      directLink
    )}&media=${encodeURIComponent(entry.previewUrl)}&description=${encodeURIComponent(description)}`;
    window.open(pinUrl, '_blank', 'noopener,noreferrer');
  };

  // Reconstruct full pattern for full social studio
  const handleLaunchFullStudio = () => {
    if (!onOpenFullSocialStudio) return;

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

    onClose();
    onOpenFullSocialStudio(reconstructed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E8E1D5] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#FAF7F2] border-b border-[#E8E1D5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E1D5] flex items-center justify-center text-[#B88E3C] shadow-2xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#B88E3C] bg-white px-2 py-0.5 rounded border border-[#E8E1D5]">
                  {language === 'fil' ? 'I-share ang Disenyo' : 'Share Wedding Pattern'}
                </span>
                <span className="text-xs text-[#7A6E65] font-mono">
                  {entry.fabricCount}ct Aida
                </span>
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2C2523] mt-0.5 line-clamp-1">
                {coupleLabel}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#7A6E65] hover:text-[#2C2523] hover:bg-white rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          
          {/* Section 1: Preview Image with Quick Actions */}
          <div className="bg-[#FAF7F2] rounded-xl border border-[#E8E1D5] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2C2523]">
                <ImageIcon className="w-4 h-4 text-[#B88E3C]" />
                <span>
                  {language === 'fil'
                    ? 'Preview Image ng Wedding Design'
                    : 'Wedding Design Preview Image'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#7A6E65]">
                {specs.widthInches}" × {specs.heightInches}" ({entry.width} × {entry.height} sts)
              </span>
            </div>

            {/* Framed Image Display */}
            <div className="relative aspect-16/10 rounded-lg overflow-hidden border-2 border-white shadow-xs bg-[#FAF7F2] flex items-center justify-center group">
              <img
                src={entry.previewUrl}
                alt={entry.title}
                className="w-full h-full object-contain"
              />

              {/* Quick overlay specs badge */}
              <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 bg-black/75 backdrop-blur-xs text-white rounded text-[11px] font-mono flex items-center gap-2">
                <span>{entry.palette?.length || 24} DMC Colors</span>
                <span>·</span>
                <span>{entry.totalStitches?.toLocaleString()} stitches</span>
              </div>

              {entry.weddingDate && (
                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-white/90 backdrop-blur-xs text-[#2C2523] border border-[#E8E1D5] rounded text-[11px] font-serif font-bold">
                  {entry.weddingDate}
                </div>
              )}
            </div>

            {/* Preview Image Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Native Web Share */}
              <button
                type="button"
                onClick={handleShareImage}
                disabled={isSharingImage}
                className="py-2.5 px-3 text-xs font-serif font-bold text-white bg-[#2C2523] hover:bg-[#433936] rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                title={language === 'fil' ? 'I-share sa apps (Instagram, Messenger, atbp.)' : 'Share via apps (Instagram, Messages, WhatsApp)'}
              >
                {isSharingImage ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Smartphone className="w-3.5 h-3.5 text-[#E6C687]" />
                )}
                <span>{language === 'fil' ? 'I-share ang Larawan' : 'Share Image via Apps'}</span>
              </button>

              {/* Download PNG */}
              <button
                type="button"
                onClick={handleDownloadImage}
                className="py-2.5 px-3 text-xs font-semibold text-[#2C2523] bg-white hover:bg-[#FAF7F2] border border-[#D7CBB9] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                title={language === 'fil' ? 'I-download ang High-Res PNG' : 'Download high-resolution preview PNG'}
              >
                <Download className="w-3.5 h-3.5 text-[#5F554F]" />
                <span>{language === 'fil' ? 'I-download (PNG)' : 'Download PNG'}</span>
              </button>

              {/* Copy Image to Clipboard */}
              <button
                type="button"
                onClick={handleCopyImageToClipboard}
                className={`py-2.5 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98 ${
                  copiedImage
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-white hover:bg-[#FAF7F2] text-[#2C2523] border border-[#D7CBB9]'
                }`}
                title={language === 'fil' ? 'Kopyahin ang image sa clipboard' : 'Copy image directly to clipboard'}
              >
                {copiedImage ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-bold text-emerald-700">
                      {language === 'fil' ? 'Nakopya!' : 'Image Copied!'}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#5F554F]" />
                    <span>{language === 'fil' ? 'Kopyahin ang Image' : 'Copy Image'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 2: Direct Pattern Link */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="direct-pattern-link-input"
                className="flex items-center gap-2 text-xs font-bold text-[#2C2523]"
              >
                <Link2 className="w-4 h-4 text-[#B88E3C]" />
                <span>{language === 'fil' ? 'Direktang Link sa Pattern' : 'Direct Link to Pattern'}</span>
              </label>
              <span className="text-[11px] text-[#7A6E65]">
                {language === 'fil' ? 'Bukas sa Stitch Viewer' : 'Opens directly in Stitch Viewer'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  id="direct-pattern-link-input"
                  type="text"
                  readOnly
                  value={directLink}
                  className="w-full pl-3 pr-8 py-2 text-xs font-mono text-[#2C2523] bg-[#FAF7F2] border border-[#D7CBB9] rounded-lg focus:outline-none select-all"
                />
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2 text-xs font-serif font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#B88E3C] hover:bg-[#9E772F] text-white'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{language === 'fil' ? 'Nakopya!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{language === 'fil' ? 'Kopyahin ang Link' : 'Copy Link'}</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-[#7A6E65] leading-relaxed pt-0.5">
              {language === 'fil'
                ? 'Maaaring i-share ang link na ito sa iyong kapareha, abay, o kapwa stitcher upang direktang mabuksan at masuri ang pattern.'
                : 'Share this link with your partner, bridal party, or fellow stitchers to view and inspect this pattern anytime.'}
            </p>
          </div>

          {/* Section 3: Social & Pinterest Extras */}
          <div className="pt-2 border-t border-[#F0ECE1] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePinToPinterest}
              className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#E60023] hover:bg-[#BD081C] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <span className="text-xs">📌</span>
              <span>{language === 'fil' ? 'I-pin sa Pinterest' : 'Pin to Pinterest Board'}</span>
            </button>

            {onOpenFullSocialStudio && (
              <button
                type="button"
                onClick={handleLaunchFullStudio}
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold text-[#2C2523] bg-[#FAF7F2] hover:bg-[#EFE9DF] border border-[#D7CBB9] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#B88E3C]" />
                <span>
                  {language === 'fil'
                    ? 'Bumuo ng Pinterest/Story Card (Social Studio)'
                    : 'Social Card Studio (Pinterest / Stories)'}
                </span>
                <ExternalLink className="w-3 h-3 text-[#7A6E65]" />
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAF7F2] border-t border-[#E8E1D5] flex items-center justify-between text-xs text-[#7A6E65] shrink-0">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-[#B88E3C]" />
            <span>Sovereign Wedding Cross Stitch Heirloom</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-[#2C2523] hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#E8E1D5]"
          >
            {language === 'fil' ? 'Isara' : 'Close'}
          </button>
        </div>

        {/* Toast Notification Alert */}
        {toastMessage && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#2C2523] text-white text-xs font-medium rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
