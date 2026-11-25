import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Flag,
  Pin,
  Tag,
  Check,
  Trash2,
  Sparkles,
  MapPin,
  Bookmark,
} from 'lucide-react';
import { ProjectAnnotation, AnnotationType } from '../types';
import {
  ANNOTATION_COLORS,
  QUICK_NOTE_SUGGESTIONS,
  QUICK_LABEL_SUGGESTIONS,
  STITCH_TECHNIQUE_SUGGESTIONS,
} from '../utils/annotationStorage';

interface AnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  x: number; // 0-indexed coordinate
  y: number; // 0-indexed coordinate
  existingAnnotation?: ProjectAnnotation | null;
  onSave: (annotation: Omit<ProjectAnnotation, 'id' | 'createdAt'> & { id?: string }) => void;
  onDelete?: (id: string) => void;
  language: 'en' | 'fil';
}

export const AnnotationModal: React.FC<AnnotationModalProps> = ({
  isOpen,
  onClose,
  x,
  y,
  existingAnnotation,
  onSave,
  onDelete,
  language,
}) => {
  const [type, setType] = useState<AnnotationType>('note');
  const [color, setColor] = useState<string>(ANNOTATION_COLORS[0].hex);
  const [text, setText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingAnnotation) {
      setType(existingAnnotation.type);
      setColor(existingAnnotation.color);
      setText(existingAnnotation.text);
    } else {
      setType('note');
      setColor(ANNOTATION_COLORS[0].hex);
      setText('');
    }
    setError(null);
  }, [existingAnnotation, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError(
        language === 'fil'
          ? 'Pakilagay ang tala o paalala bago i-save.'
          : 'Please enter a note or description before saving.'
      );
      return;
    }

    onSave({
      id: existingAnnotation ? existingAnnotation.id : undefined,
      patternId: existingAnnotation ? existingAnnotation.patternId : '',
      x,
      y,
      type,
      color,
      text: text.trim(),
      resolved: existingAnnotation ? existingAnnotation.resolved : false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-2xl border border-[#E8E1D5] shadow-2xl max-w-md w-full overflow-hidden animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-[#FAF7F2] border-b border-[#E8E1D5] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2C2523] text-[#E6C687] flex items-center justify-center shadow-xs">
              {type === 'label' ? (
                <Tag className="w-4 h-4" />
              ) : type === 'flag' ? (
                <Flag className="w-4 h-4" />
              ) : type === 'marker' ? (
                <Pin className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#2C2523]">
                {existingAnnotation
                  ? language === 'fil'
                    ? type === 'label' ? 'I-edit ang Grid Label' : 'I-edit ang Tala sa Tahi'
                    : type === 'label' ? 'Edit Grid Text Label' : 'Edit Stitch Annotation'
                  : language === 'fil'
                  ? type === 'label' ? 'Magdagdag ng Grid Label' : 'Maglagay ng Tala / Marker'
                  : type === 'label' ? 'Add Grid Text Label' : 'Add Stitch Annotation'}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-[#7A6E65] font-mono">
                <MapPin className="w-3 h-3 text-[#B88E3C]" />
                <span>
                  Grid Coord: X:{x + 1}, Y:{y + 1}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#7A6E65] hover:text-[#2C2523] rounded-lg hover:bg-[#EAE2D5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Annotation Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#5F554F] uppercase tracking-wider mb-2">
              {language === 'fil' ? 'Uri ng Marker o Label' : 'Marker or Label Type'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setType('label')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  type === 'label'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold shadow-xs ring-1 ring-emerald-500'
                    : 'bg-white border-[#E8E1D5] text-[#7A6E65] hover:bg-[#FAF7F2]'
                }`}
              >
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>{language === 'fil' ? '🏷️ Grid Label' : '🏷️ Grid Label'}</span>
              </button>

              <button
                type="button"
                onClick={() => setType('note')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  type === 'note'
                    ? 'bg-amber-50 border-amber-400 text-amber-950 font-semibold shadow-xs ring-1 ring-amber-400'
                    : 'bg-white border-[#E8E1D5] text-[#7A6E65] hover:bg-[#FAF7F2]'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-600" />
                <span>{language === 'fil' ? '📝 Sticky Note' : '📝 Sticky Note'}</span>
              </button>

              <button
                type="button"
                onClick={() => setType('flag')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  type === 'flag'
                    ? 'bg-red-50 border-red-400 text-red-950 font-semibold shadow-xs ring-1 ring-red-400'
                    : 'bg-white border-[#E8E1D5] text-[#7A6E65] hover:bg-[#FAF7F2]'
                }`}
              >
                <Flag className="w-4 h-4 text-red-600" />
                <span>{language === 'fil' ? '🚩 Flag' : '🚩 Flag'}</span>
              </button>

              <button
                type="button"
                onClick={() => setType('marker')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  type === 'marker'
                    ? 'bg-blue-50 border-blue-400 text-blue-950 font-semibold shadow-xs ring-1 ring-blue-400'
                    : 'bg-white border-[#E8E1D5] text-[#7A6E65] hover:bg-[#FAF7F2]'
                }`}
              >
                <Pin className="w-4 h-4 text-blue-600" />
                <span>{language === 'fil' ? '📌 Pin Marker' : '📌 Pin Marker'}</span>
              </button>
            </div>
          </div>

          {/* Color Palette Picker */}
          <div>
            <label className="block text-xs font-semibold text-[#5F554F] uppercase tracking-wider mb-2">
              {language === 'fil' ? 'Kulay ng Label / Marker' : 'Label / Marker Color'}
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {ANNOTATION_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  title={c.name}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                    color === c.hex
                      ? 'border-[#2C2523] scale-115 shadow-sm'
                      : 'border-white hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {color === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Stitch Technique Presets (half-stitch, French knot, etc.) */}
          <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E8E1D5]">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#B88E3C]" />
              <label className="text-[11px] font-bold text-[#2C2523] uppercase tracking-wider">
                {language === 'fil' ? 'Mabilisang Uri ng Tahi (Stitch Technique)' : 'Special Stitch Technique:'}
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {STITCH_TECHNIQUE_SUGGESTIONS.map((tech) => {
                const label = language === 'fil' ? tech.fil : tech.en;
                const isSelected = text.toLowerCase().includes(tech.en.toLowerCase());
                return (
                  <button
                    key={tech.en}
                    type="button"
                    onClick={() => {
                      setText(tech.en);
                      if (error) setError(null);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#2C2523] text-[#FAF7F2] border-[#2C2523] shadow-xs font-semibold'
                        : 'bg-white border-[#E0D7C9] text-[#433936] hover:border-[#B88E3C] hover:bg-amber-50/50'
                    }`}
                  >
                    <span className="font-mono text-xs font-bold text-[#B88E3C]">{tech.icon}</span>
                    <span className="truncate">{tech.en}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note / Label Input */}
          <div>
            <label className="block text-xs font-semibold text-[#5F554F] uppercase tracking-wider mb-1.5">
              {type === 'label'
                ? language === 'fil'
                  ? 'Teksto ng Grid Label (Lalabas sa Chart at PDF)'
                  : 'Grid Label Text (Appears on Chart & PDF)'
                : language === 'fil'
                ? 'Mensahe o Paalala'
                : 'Note or Reminder Text'}
            </label>
            <textarea
              rows={type === 'label' ? 2 : 3}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              placeholder={
                type === 'label'
                  ? language === 'fil'
                    ? 'Halimbawa: Bridal Monogram, Wedding Date, Gold Filigree...'
                    : 'E.g., Bridal Monogram, Wedding Date, Gold Accent, French Knots...'
                  : language === 'fil'
                  ? 'Halimbawa: Ingatan ang shading dito, gamitin ang DMC 310...'
                  : 'E.g., Confetti zone, start French knot, check thread lot...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D7CBB9] focus:outline-none focus:ring-2 focus:ring-[#B88E3C] focus:border-transparent text-sm text-[#2C2523] bg-[#FAF7F2] placeholder-[#A09388] resize-none"
            />
            {error && <p className="text-xs text-red-600 font-medium mt-1">{error}</p>}
          </div>

          {/* Quick Suggestion Chips */}
          <div>
            <span className="block text-[11px] font-medium text-[#7A6E65] mb-1.5">
              💡 {type === 'label'
                ? language === 'fil'
                  ? 'Mga Mabilisang Suhestiyon sa Label ng Kasal:'
                  : 'Quick Wedding Label Suggestions:'
                : language === 'fil'
                ? 'Mga Mabilisang Paalala:'
                : 'Quick Suggestions:'}
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {(type === 'label' ? QUICK_LABEL_SUGGESTIONS : QUICK_NOTE_SUGGESTIONS).map((sug, idx) => {
                const label = language === 'fil' ? sug.fil : sug.en;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setText(label)}
                    className="text-[11px] px-2.5 py-1 bg-[#FAF7F2] hover:bg-[#EAE2D5] border border-[#E8E1D5] rounded-lg text-[#5F554F] transition-colors cursor-pointer text-left"
                  >
                    + {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-[#F0ECE1] flex items-center justify-between gap-3">
            {existingAnnotation && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(existingAnnotation.id);
                  onClose();
                }}
                className="px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'fil' ? 'Burahin' : 'Delete'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#7A6E65] hover:text-[#2C2523] rounded-lg hover:bg-[#FAF7F2] transition-colors"
              >
                {language === 'fil' ? 'Kanselahin' : 'Cancel'}
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-xl font-serif text-xs font-bold text-white bg-[#2C2523] hover:bg-[#433936] shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-[#E6C687]" />
                <span>
                  {existingAnnotation
                    ? language === 'fil'
                      ? 'I-update ang Tala'
                      : 'Update Note'
                    : language === 'fil'
                    ? 'I-save ang Marker'
                    : 'Save Annotation'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
