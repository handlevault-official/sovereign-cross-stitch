import React, { useEffect, useRef } from 'react';
import { Sparkles, Trophy, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { PercentageMilestone } from '../types';

interface PercentageMilestoneCelebrationProps {
  milestone: PercentageMilestone;
  currentPercentage: number;
  stitchedCount: number;
  totalStitches: number;
  patternTitle: string;
  language: 'en' | 'fil';
  onClose: () => void;
}

export const PercentageMilestoneCelebration: React.FC<PercentageMilestoneCelebrationProps> = ({
  milestone,
  currentPercentage,
  stitchedCount,
  totalStitches,
  patternTitle,
  language,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Gentle celebratory audio chime using Web Audio API
  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.65);
      });
    } catch {
      // Audio playback fails gracefully if blocked by autoplay policy
    }
  }, []);

  // Confetti and celebratory particle physics simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [
      '#B88E3C', // Warm gold
      '#D97706', // Amber
      '#059669', // Emerald
      '#E11D48', // Rose
      '#4F46E5', // Indigo
      '#F59E0B', // Bright gold
      '#FAF7F2', // Linen white
    ];

    const particleCount = 110;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: window.innerWidth * (0.2 + Math.random() * 0.6),
      y: window.innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 14 - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 12,
      shape: Math.random() > 0.4 ? 'ribbon' : Math.random() > 0.5 ? 'cross' : 'circle',
      alpha: 1,
      decay: Math.random() * 0.004 + 0.002,
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28; // gravity
        p.vx *= 0.985; // drag
        p.rotation += p.vRotation;
        p.alpha = Math.max(0, p.alpha - p.decay);

        if (p.alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        if (p.shape === 'cross') {
          // Cross-stitch 'X' particle
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-p.size / 2, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.moveTo(p.size / 2, -p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.stroke();
        } else if (p.shape === 'ribbon') {
          // Confetti ribbon rectangle
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          // Shimmering circle/sparkle
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      {/* Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-10"
      />

      {/* Celebration Card Dialog */}
      <div className="relative z-20 bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-[#B88E3C] text-center space-y-5 animate-scale-up">
        {/* Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#8C8077] hover:text-[#2C2523] hover:bg-[#F2ECE1] rounded-lg transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Milestone Icon Halo */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 animate-ping opacity-30" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#B88E3C] via-amber-400 to-amber-200 p-0.5 shadow-xl flex items-center justify-center">
            <div className="w-full h-full bg-[#FAF7F2] rounded-2xl flex items-center justify-center text-3xl shadow-inner">
              {milestone.icon || '💍'}
            </div>
          </div>
        </div>

        {/* Header Text */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            <span>
              {language === 'fil'
                ? `Milestone Naabot: ${milestone.percentage}%`
                : `Milestone Achieved: ${milestone.percentage}%`}
            </span>
          </div>

          <h3 className="font-serif text-2xl font-bold text-[#2C2523] pt-2">
            {milestone.title}
          </h3>

          <p className="text-xs text-[#7A6E65]">
            {patternTitle}
          </p>
        </div>

        {/* Progress Metric Card */}
        <div className="bg-[#FAF7F2] border border-[#E8DFC9] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#5F554F]">
              {language === 'fil' ? 'Kasalukuyang Progreso:' : 'Current Progress:'}
            </span>
            <span className="font-bold text-[#2C2523] text-sm">
              {currentPercentage.toFixed(1)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-[#EAE2D5] rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-emerald-600 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, currentPercentage))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#7A6E65] pt-0.5">
            <span>
              <strong className="text-[#2C2523] font-mono">{stitchedCount.toLocaleString()}</strong> stitches finished
            </span>
            <span>
              {Math.max(0, totalStitches - stitchedCount).toLocaleString()} remaining
            </span>
          </div>
        </div>

        {/* Motivational wedding copy */}
        <p className="text-xs text-[#5F554F] italic px-2 leading-relaxed">
          {milestone.description || (
            language === 'fil'
              ? 'Napakahusay! Bawat tahi ay nagdadala ng mas malaking ganda at alaala sa iyong pamanang cross-stitch.'
              : 'Every single stitch brings you closer to a breathtaking wedding keepsake cherished for generations.'
          )}
        </p>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#2C2523] hover:bg-[#433936] text-white text-xs font-bold rounded-lg shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              {language === 'fil' ? 'Ipagpatuloy ang Pananahi' : 'Keep Stitching!'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
