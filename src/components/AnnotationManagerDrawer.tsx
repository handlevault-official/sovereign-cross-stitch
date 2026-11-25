import React, { useState } from 'react';
import {
  X,
  FileText,
  Flag,
  Pin,
  Tag,
  CheckCircle2,
  Circle,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  Check,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { ProjectAnnotation, AnnotationType } from '../types';

interface AnnotationManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  annotations: ProjectAnnotation[];
  onToggleResolved: (id: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onJumpToCoordinate: (x: number, y: number) => void;
  onEditAnnotation: (annotation: ProjectAnnotation) => void;
  onClearAllAnnotations: () => void;
  language: 'en' | 'fil';
}

export const AnnotationManagerDrawer: React.FC<AnnotationManagerDrawerProps> = ({
  isOpen,
  onClose,
  annotations,
  onToggleResolved,
  onDeleteAnnotation,
  onJumpToCoordinate,
  onEditAnnotation,
  onClearAllAnnotations,
  language,
}) => {
  const [filterType, setFilterType] = useState<AnnotationType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const filtered = annotations.filter((ann) => {
    if (filterType !== 'all' && ann.type !== filterType) return false;
    if (statusFilter === 'active' && ann.resolved) return false;
    if (statusFilter === 'resolved' && !ann.resolved) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = ann.text.toLowerCase().includes(q);
      const matchCoord = `x:${ann.x + 1} y:${ann.y + 1}`.includes(q);
      return matchText || matchCoord;
    }
    return true;
  });

  const labelsCount = annotations.filter((a) => a.type === 'label').length;
  const notesCount = annotations.filter((a) => a.type === 'note').length;
  const flagsCount = annotations.filter((a) => a.type === 'flag').length;
  const markersCount = annotations.filter((a) => a.type === 'marker').length;
  const resolvedCount = annotations.filter((a) => a.resolved).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-2xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#E8E1D5] animate-slide-left">
        {/* Header */}
        <div className="p-5 bg-[#FAF7F2] border-b border-[#E8E1D5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2C2523] text-[#E6C687] flex items-center justify-center font-bold shadow-xs">
              📌
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#2C2523]">
                {language === 'fil' ? 'Mga Tala at Marker sa Pattern' : 'Stitch Annotations & Notes'}
              </h3>
              <p className="text-xs text-[#7A6E65]">
                {annotations.length}{' '}
                {language === 'fil' ? 'kabuuang paalala' : 'total markers'} · {resolvedCount}{' '}
                {language === 'fil' ? 'natapos' : 'resolved'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#7A6E65] hover:text-[#2C2523] rounded-lg hover:bg-[#EAE2D5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Search Strip */}
        <div className="p-4 bg-[#FBF9F5] border-b border-[#E8E1D5] space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8C8077] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'fil'
                  ? 'Maghanap sa tala o coordinates (X:12 Y:20)...'
                  : 'Search notes or coordinates...'
              }
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#D7CBB9] bg-white text-xs text-[#2C2523] focus:outline-none focus:ring-2 focus:ring-[#B88E3C]"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md font-medium shrink-0 transition-colors ${
                filterType === 'all'
                  ? 'bg-[#2C2523] text-white shadow-2xs'
                  : 'bg-white text-[#5F554F] border border-[#E8E1D5]'
              }`}
            >
              {language === 'fil' ? 'Lahat' : 'All'} ({annotations.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('label')}
              className={`px-2.5 py-1 rounded-md font-medium shrink-0 transition-colors flex items-center gap-1 ${
                filterType === 'label'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white text-[#5F554F] border border-[#E8E1D5]'
              }`}
            >
              <Tag className="w-3 h-3 text-emerald-400" />
              <span>Labels ({labelsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('note')}
              className={`px-2.5 py-1 rounded-md font-medium shrink-0 transition-colors flex items-center gap-1 ${
                filterType === 'note'
                  ? 'bg-amber-700 text-white shadow-2xs'
                  : 'bg-white text-[#5F554F] border border-[#E8E1D5]'
              }`}
            >
              <FileText className="w-3 h-3 text-amber-500" />
              <span>Notes ({notesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('flag')}
              className={`px-2.5 py-1 rounded-md font-medium shrink-0 transition-colors flex items-center gap-1 ${
                filterType === 'flag'
                  ? 'bg-red-700 text-white shadow-2xs'
                  : 'bg-white text-[#5F554F] border border-[#E8E1D5]'
              }`}
            >
              <Flag className="w-3 h-3 text-red-500" />
              <span>Flags ({flagsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('marker')}
              className={`px-2.5 py-1 rounded-md font-medium shrink-0 transition-colors flex items-center gap-1 ${
                filterType === 'marker'
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'bg-white text-[#5F554F] border border-[#E8E1D5]'
              }`}
            >
              <Pin className="w-3 h-3 text-blue-500" />
              <span>Pins ({markersCount})</span>
            </button>
          </div>
        </div>

        {/* Annotations List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-[#E8E1D5] flex items-center justify-center text-xl mx-auto">
                📝
              </div>
              <h4 className="font-serif font-bold text-sm text-[#2C2523]">
                {language === 'fil' ? 'Walang nahanap na marker' : 'No annotations found'}
              </h4>
              <p className="text-xs text-[#7A6E65] max-w-xs mx-auto">
                {language === 'fil'
                  ? 'I-on ang "Annotate Mode" sa toolbar at i-click ang anumang coordinate sa canvas upang maglagay ng tala o label.'
                  : 'Enable "Annotate Mode" in the viewer toolbar and click any stitch coordinate on the canvas to place a note or label.'}
              </p>
            </div>
          ) : (
            filtered.map((ann) => (
              <div
                key={ann.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  ann.resolved
                    ? 'bg-[#F9F8F6] border-[#E8E1D5] opacity-60'
                    : 'bg-white border-[#E0D7C9] hover:border-[#B88E3C] shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {/* Color Flag / Pin / Label indicator */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs mt-0.5 text-white"
                      style={{ backgroundColor: ann.color }}
                    >
                      {ann.type === 'label' ? (
                        <Tag className="w-3.5 h-3.5" />
                      ) : ann.type === 'flag' ? (
                        <Flag className="w-3.5 h-3.5" />
                      ) : ann.type === 'marker' ? (
                        <Pin className="w-3.5 h-3.5" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onJumpToCoordinate(ann.x, ann.y)}
                          className="font-mono text-xs font-bold text-[#B88E3C] hover:text-[#8C6B24] hover:underline flex items-center gap-1 cursor-pointer"
                          title="Jump directly to this coordinate on canvas"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>
                            X:{ann.x + 1}, Y:{ann.y + 1}
                          </span>
                        </button>

                        <span className="text-[10px] uppercase font-semibold tracking-wider text-[#8C8077] bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#E8E1D5]">
                          {ann.type}
                        </span>

                        {ann.resolved && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            ✓ {language === 'fil' ? 'Tapos' : 'Resolved'}
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-xs text-[#2C2523] leading-relaxed ${
                          ann.resolved ? 'line-through text-[#8C8077]' : ''
                        }`}
                      >
                        {ann.text}
                      </p>
                    </div>
                  </div>

                  {/* Quick toggle resolved */}
                  <button
                    type="button"
                    onClick={() => onToggleResolved(ann.id)}
                    className="p-1 text-[#7A6E65] hover:text-emerald-600 transition-colors cursor-pointer"
                    title={ann.resolved ? 'Mark active' : 'Mark resolved'}
                  >
                    {ann.resolved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-[#A09388]" />
                    )}
                  </button>
                </div>

                {/* Bottom Actions Row */}
                <div className="mt-3 pt-2 border-t border-[#F0ECE1] flex items-center justify-between text-[11px] text-[#7A6E65]">
                  <span>
                    {new Date(ann.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onJumpToCoordinate(ann.x, ann.y)}
                      className="font-medium text-[#2C2523] hover:text-[#B88E3C] flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{language === 'fil' ? 'Puntahan' : 'Jump to'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditAnnotation(ann)}
                      className="font-medium text-[#2C2523] hover:text-[#B88E3C] cursor-pointer"
                    >
                      {language === 'fil' ? 'I-edit' : 'Edit'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteAnnotation(ann.id)}
                      className="text-red-600 hover:text-red-700 cursor-pointer"
                      title="Delete marker"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {annotations.length > 0 && (
          <div className="p-4 bg-[#FAF7F2] border-t border-[#E8E1D5] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={onClearAllAnnotations}
              className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'fil' ? 'Burahin Lahat' : 'Clear All'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#2C2523] text-white rounded-lg font-serif font-bold text-xs hover:bg-[#433936]"
            >
              {language === 'fil' ? 'Isara' : 'Done'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
