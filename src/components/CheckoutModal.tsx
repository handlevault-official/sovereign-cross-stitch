import React, { useState } from 'react';
import { X, Check, Copy, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlockPro: (refNumber: string) => void;
  language: 'en' | 'fil';
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onUnlockPro,
  language,
}) => {
  const [refNumber, setRefNumber] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText('09288212987');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNumber.trim()) {
      setError(
        language === 'fil'
          ? 'Paki-lagay ang inyong GCash Reference Number.'
          : 'Please enter your GCash Reference Number.'
      );
      return;
    }

    setVerifying(true);
    setError('');

    setTimeout(() => {
      setVerifying(false);
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#B88E3C', '#2C2523', '#E6C687', '#10B981'],
        });
      } catch {
        // Confetti fallback
      }
      onUnlockPro(refNumber.trim());
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#FAF7F2] rounded-xl border border-[#E8E1D5] shadow-2xl overflow-hidden">
        {/* Header banner */}
        <div className="bg-[#2C2523] text-white p-6 pb-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#C5BCB6] hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-[#E6C687] text-xs font-semibold tracking-wider uppercase mb-1">
            <Sparkles className="w-4 h-4" />
            <span>{language === 'fil' ? 'PRO Wedding & Commercial License' : 'PRO Wedding & Commercial License'}</span>
          </div>
          <h3 className="font-serif text-2xl font-bold tracking-tight text-white">
            {language === 'fil' ? 'I-activate ang Buong Heirloom Pattern Bundle' : 'Activate Full Heirloom Pattern Bundle'}
          </h3>
          <p className="text-xs text-[#D7CFC7] mt-1">
            {language === 'fil'
              ? 'Isang bayad (₱499 Lifetime Access) para sa walang limitasyong multi-page PDF patterns at commercial rights.'
              : 'One-time investment (₱499 Lifetime Access) for unlimited multi-page printable PDF booklets and commercial rights.'}
          </p>
        </div>

        {/* Benefits list */}
        <div className="p-6 space-y-5">
          <div className="bg-white border border-[#E8E1D5] rounded-lg p-4 space-y-2.5">
            <div className="text-xs font-bold text-[#7A6E65] uppercase tracking-wider mb-1">
              {language === 'fil' ? 'Kasama sa PRO Wedding Package:' : 'Included in PRO Wedding Package:'}
            </div>
            {[
              language === 'fil' ? 'Walang limitasyong Multi-Page PDF Pattern Booklets (walang watermark)' : 'Unlimited Multi-Page PDF Pattern Booklets (100% watermark-free)',
              language === 'fil' ? '10x10 Bold Grid Lines at Center-Mark Arrows para sa mabilisang pananahi' : '10x10 Bold Grid Lines & Center-Mark Arrows for seamless needlework',
              language === 'fil' ? 'Kumpletong DMC Floss Legend & eksaktong kalkulasyon ng Skeins' : 'Complete DMC Floss Legend & exact Skein yardage calculations',
              language === 'fil' ? 'Karapatang magbenta ng natapos na cross-stitch o pattern (Commercial License)' : 'Commercial rights to sell finished stitched pieces or custom charts',
              language === 'fil' ? 'Suporta para sa malalaking 300x450 stitches (1-Year Heirloom Tapestry)' : 'High-definition 300x450 stitch resolution (1-Year Heirloom Tapestry)',
            ].map((benefit, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-[#2C2523]">
                <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-emerald-700" />
                </div>
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          {/* GCash Payment Details */}
          <div className="bg-[#F3EFE7] border border-[#E0D7C9] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5F554F]">
                {language === 'fil' ? 'Paraan ng Pagbabayad:' : 'Payment Method:'}
              </span>
              <span className="text-xs font-bold text-[#2C2523] bg-white px-2 py-0.5 rounded border border-[#E0D7C9]">
                GCash (Philippines)
              </span>
            </div>

            <div className="flex items-center justify-between bg-white p-3 rounded border border-[#E0D7C9]">
              <div>
                <div className="text-[11px] text-[#7A6E65]">
                  {language === 'fil' ? 'Magpadala ng ₱499 sa GCash Number:' : 'Send ₱499 to GCash Number:'}
                </div>
                <div className="font-mono text-base font-bold text-[#2C2523] tracking-wide">
                  09288212987
                </div>
                <div className="text-[10px] text-[#8C8077]">
                  Account Name: Sovereign Studio / April A.
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#2C2523] bg-[#FAF7F2] hover:bg-[#EAE2D5] border border-[#D7CBB9] rounded transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopyahin</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Verification Form */}
          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#2C2523] mb-1">
                {language === 'fil' ? 'Ilagay ang GCash Reference Number:' : 'Enter GCash Reference Number:'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Halimbawa: 1029384756123"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7CBB9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B88E3C] focus:border-transparent font-mono"
                />
              </div>
              {error && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#7A6E65]">
              <span>Demo Quick-Fill:</span>
              <button
                type="button"
                onClick={() => setRefNumber('GCASH-8821-2987-PRO')}
                className="text-[#B88E3C] hover:underline font-medium"
              >
                Gamitin ang Demo Ref #
              </button>
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#2C2523] hover:bg-[#433936] active:scale-[0.99] rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-[#E6C687]" />
              <span>
                {verifying
                  ? (language === 'fil' ? 'Bine-verify ang bayad...' : 'Verifying payment...')
                  : (language === 'fil' ? 'I-verify ang Bayad (₱499)' : 'Verify Payment & Unlock PRO (₱499)')}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
