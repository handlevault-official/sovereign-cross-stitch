import React, { useState, useEffect } from 'react';
import {
  Flag,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  Edit2,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Target,
  ArrowRight,
} from 'lucide-react';
import { PatternData, ProjectMilestone } from '../types';

interface MilestoneTrackerProps {
  pattern: PatternData;
  stitchedCells: Set<string>;
  onBatchMarkStitches: (keys: string[], mark: boolean) => void;
  highlightedMilestone: ProjectMilestone | null;
  onHighlightMilestone: (milestone: ProjectMilestone | null) => void;
  language: 'en' | 'fil';
}

const THEME_STYLES: Record<
  string,
  {
    barGradient: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    accentColor: string;
  }
> = {
  emerald: {
    barGradient: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    borderColor: 'border-emerald-200',
    accentColor: '#059669',
  },
  amber: {
    barGradient: 'from-amber-500 to-yellow-600',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    borderColor: 'border-amber-200',
    accentColor: '#D97706',
  },
  indigo: {
    barGradient: 'from-indigo-500 to-blue-600',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    borderColor: 'border-indigo-200',
    accentColor: '#4F46E5',
  },
  rose: {
    barGradient: 'from-rose-500 to-pink-600',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    borderColor: 'border-rose-200',
    accentColor: '#E11D48',
  },
  cyan: {
    barGradient: 'from-cyan-500 to-sky-600',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-800',
    borderColor: 'border-cyan-200',
    accentColor: '#0891B2',
  },
};

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({
  pattern,
  stitchedCells,
  onBatchMarkStitches,
  highlightedMilestone,
  onHighlightMilestone,
  language,
}) => {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>(() => {
    try {
      const stored = localStorage.getItem(`sovereign_milestones_${pattern.id}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return [];
  });

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formMinX, setFormMinX] = useState(0);
  const [formMaxX, setFormMaxX] = useState(pattern.width - 1);
  const [formMinY, setFormMinY] = useState(0);
  const [formMaxY, setFormMaxY] = useState(Math.round(pattern.height * 0.33));
  const [formTheme, setFormTheme] = useState<'emerald' | 'amber' | 'indigo' | 'rose' | 'cyan'>('emerald');

  // Sync to localStorage
  const saveMilestonesToStorage = (updated: ProjectMilestone[]) => {
    setMilestones(updated);
    try {
      localStorage.setItem(`sovereign_milestones_${pattern.id}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  };

  // Re-read storage if pattern ID changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`sovereign_milestones_${pattern.id}`);
      if (stored) {
        setMilestones(JSON.parse(stored));
      } else {
        setMilestones([]);
      }
    } catch {
      setMilestones([]);
    }
  }, [pattern.id]);

  // Preset generator for default milestones
  const handleAutoGenerateMilestones = () => {
    const w = pattern.width;
    const h = pattern.height;

    const defaults: ProjectMilestone[] = [
      {
        id: `ms-${Date.now()}-1`,
        patternId: pattern.id,
        title: language === 'fil' ? 'Itaas na Bahagi (Floral & Crown)' : 'Upper Garland & Florals',
        tagalogTitle: 'Itaas na Bahagi (Floral & Crown)',
        minX: 0,
        maxX: w - 1,
        minY: 0,
        maxY: Math.floor(h * 0.33),
        colorTheme: 'rose',
        createdAt: Date.now(),
      },
      {
        id: `ms-${Date.now()}-2`,
        patternId: pattern.id,
        title: language === 'fil' ? 'Gitnang Mukha at Mga Anyo' : 'Center Figures & Faces',
        tagalogTitle: 'Gitnang Mukha at Mga Anyo',
        minX: Math.floor(w * 0.15),
        maxX: Math.floor(w * 0.85),
        minY: Math.floor(h * 0.28),
        maxY: Math.floor(h * 0.72),
        colorTheme: 'amber',
        createdAt: Date.now() + 1,
      },
      {
        id: `ms-${Date.now()}-3`,
        patternId: pattern.id,
        title: language === 'fil' ? 'Pangalan, Petsa at Babang Harang' : 'Vow Monogram, Names & Date',
        tagalogTitle: 'Pangalan, Petsa at Babang Harang',
        minX: 0,
        maxX: w - 1,
        minY: Math.floor(h * 0.7),
        maxY: h - 1,
        colorTheme: 'emerald',
        createdAt: Date.now() + 2,
      },
    ];

    saveMilestonesToStorage(defaults);
  };

  const handleOpenCreate = () => {
    setEditingMilestoneId(null);
    setFormTitle('');
    setFormMinX(0);
    setFormMaxX(pattern.width - 1);
    setFormMinY(0);
    setFormMaxY(Math.round(pattern.height * 0.33));
    setFormTheme('emerald');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (m: ProjectMilestone) => {
    setEditingMilestoneId(m.id);
    setFormTitle(m.title);
    setFormMinX(m.minX);
    setFormMaxX(m.maxX);
    setFormMinY(m.minY);
    setFormMaxY(m.maxY);
    setFormTheme(m.colorTheme || 'emerald');
    setIsEditorOpen(true);
  };

  const handleApplyPresetCoordinates = (presetType: string) => {
    const w = pattern.width;
    const h = pattern.height;
    switch (presetType) {
      case 'faces':
        setFormTitle(language === 'fil' ? 'Kumpletuhin ang Mukha' : 'Complete Faces & Figures');
        setFormMinX(Math.floor(w * 0.2));
        setFormMaxX(Math.floor(w * 0.8));
        setFormMinY(Math.floor(h * 0.25));
        setFormMaxY(Math.floor(h * 0.68));
        setFormTheme('amber');
        break;
      case 'background':
        setFormTitle(language === 'fil' ? 'Tapusin ang Background' : 'Finish Background & Field');
        setFormMinX(0);
        setFormMaxX(w - 1);
        setFormMinY(0);
        setFormMaxY(h - 1);
        setFormTheme('cyan');
        break;
      case 'top':
        setFormTitle(language === 'fil' ? 'Itaas na Korona at Bulaklak' : 'Upper Floral Garland');
        setFormMinX(0);
        setFormMaxX(w - 1);
        setFormMinY(0);
        setFormMaxY(Math.floor(h * 0.33));
        setFormTheme('rose');
        break;
      case 'bottom':
        setFormTitle(language === 'fil' ? 'Pangalan at Petsa ng Kasal' : 'Wedding Date & Monogram');
        setFormMinX(0);
        setFormMaxX(w - 1);
        setFormMinY(Math.floor(h * 0.7));
        setFormMaxY(h - 1);
        setFormTheme('emerald');
        break;
      case 'leftBorder':
        setFormTitle(language === 'fil' ? 'Kaliwang Harang' : 'Left Border Frame');
        setFormMinX(0);
        setFormMaxX(Math.floor(w * 0.15));
        setFormMinY(0);
        setFormMaxY(h - 1);
        setFormTheme('indigo');
        break;
    }
  };

  const handleSaveMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = formTitle.trim() || (language === 'fil' ? 'Bagong Milestone' : 'Custom Milestone');
    const clampedMinX = Math.max(0, Math.min(pattern.width - 1, formMinX));
    const clampedMaxX = Math.max(clampedMinX, Math.min(pattern.width - 1, formMaxX));
    const clampedMinY = Math.max(0, Math.min(pattern.height - 1, formMinY));
    const clampedMaxY = Math.max(clampedMinY, Math.min(pattern.height - 1, formMaxY));

    if (editingMilestoneId) {
      const updated = milestones.map((m) =>
        m.id === editingMilestoneId
          ? {
              ...m,
              title: cleanTitle,
              minX: clampedMinX,
              maxX: clampedMaxX,
              minY: clampedMinY,
              maxY: clampedMaxY,
              colorTheme: formTheme,
            }
          : m
      );
      saveMilestonesToStorage(updated);
      if (highlightedMilestone?.id === editingMilestoneId) {
        onHighlightMilestone({
          id: editingMilestoneId,
          patternId: pattern.id,
          title: cleanTitle,
          minX: clampedMinX,
          maxX: clampedMaxX,
          minY: clampedMinY,
          maxY: clampedMaxY,
          colorTheme: formTheme,
        });
      }
    } else {
      const newMilestone: ProjectMilestone = {
        id: `ms-${Date.now()}`,
        patternId: pattern.id,
        title: cleanTitle,
        minX: clampedMinX,
        maxX: clampedMaxX,
        minY: clampedMinY,
        maxY: clampedMaxY,
        colorTheme: formTheme,
        createdAt: Date.now(),
      };
      saveMilestonesToStorage([...milestones, newMilestone]);
    }

    setIsEditorOpen(false);
    setEditingMilestoneId(null);
  };

  const handleDeleteMilestone = (id: string) => {
    const updated = milestones.filter((m) => m.id !== id);
    saveMilestonesToStorage(updated);
    if (highlightedMilestone?.id === id) {
      onHighlightMilestone(null);
    }
  };

  const handleBatchToggleMilestone = (m: ProjectMilestone, markAll: boolean) => {
    const minX = Math.max(0, Math.min(pattern.width - 1, m.minX));
    const maxX = Math.max(minX, Math.min(pattern.width - 1, m.maxX));
    const minY = Math.max(0, Math.min(pattern.height - 1, m.minY));
    const maxY = Math.max(minY, Math.min(pattern.height - 1, m.maxY));

    const keys: string[] = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        keys.push(`${x},${y}`);
      }
    }
    onBatchMarkStitches(keys, markAll);
  };

  // Helper to compute progress for a milestone
  const getMilestoneStats = (m: ProjectMilestone) => {
    const minX = Math.max(0, Math.min(pattern.width - 1, m.minX));
    const maxX = Math.max(minX, Math.min(pattern.width - 1, m.maxX));
    const minY = Math.max(0, Math.min(pattern.height - 1, m.minY));
    const maxY = Math.max(minY, Math.min(pattern.height - 1, m.maxY));

    const totalInRegion = (maxX - minX + 1) * (maxY - minY + 1);
    let stitchedInRegion = 0;

    if (stitchedCells.size < totalInRegion) {
      stitchedCells.forEach((key) => {
        const comma = key.indexOf(',');
        const x = Number(key.slice(0, comma));
        const y = Number(key.slice(comma + 1));
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          stitchedInRegion++;
        }
      });
    } else {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (stitchedCells.has(`${x},${y}`)) {
            stitchedInRegion++;
          }
        }
      }
    }

    const percentage = totalInRegion > 0 ? (stitchedInRegion / totalInRegion) * 100 : 0;
    const isDone = stitchedInRegion >= totalInRegion;

    return {
      totalInRegion,
      stitchedInRegion,
      percentage: Math.min(100, percentage),
      isDone,
      minX,
      maxX,
      minY,
      maxY,
    };
  };

  const completedCount = milestones.filter((m) => getMilestoneStats(m).isDone).length;

  return (
    <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-4 sm:p-5 space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8DFC9] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white border border-[#D7CBB9] flex items-center justify-center text-[#B88E3C] shadow-2xs">
            <Flag className="w-4 h-4 fill-[#B88E3C]/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h5 className="font-serif font-bold text-base text-[#2C2523]">
                {language === 'fil' ? 'Mga Milestone ng Proyekto' : 'Project Milestones'}
              </h5>
              {milestones.length > 0 && (
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#D7CBB9] text-[#2C2523]">
                  {completedCount} / {milestones.length} {language === 'fil' ? 'tapos' : 'done'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#7A6E65]">
              {language === 'fil'
                ? 'Magtakda ng coordinate range (hal. Mukha, Background, Letra) at subaybayan ang progress ng bawat bahagi.'
                : 'Target specific coordinate ranges (e.g., Complete Faces, Finish Background) with dedicated progress bars.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {milestones.length > 0 && (
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 text-[#7A6E65] hover:text-[#2C2523] rounded-lg border border-[#E8E1D5] bg-white transition-colors"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#2C2523] text-white hover:bg-[#433936] transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#E6C687]" />
            <span>{language === 'fil' ? 'Magdagdag ng Milestone' : 'Add Milestone'}</span>
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Milestones List or Empty State */}
          {milestones.length === 0 ? (
            <div className="bg-white border border-[#E8E1D5] rounded-xl p-5 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#FAF7F2] border border-[#E8E1D5] flex items-center justify-center text-[#B88E3C] mx-auto">
                <Target className="w-5 h-5" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h6 className="font-serif font-bold text-sm text-[#2C2523]">
                  {language === 'fil' ? 'Wala pang mga itinakdang milestone' : 'No custom milestones set yet'}
                </h6>
                <p className="text-xs text-[#7A6E65] leading-relaxed">
                  {language === 'fil'
                    ? 'Hatiin ang malaking pattern sa mga kayang bahagi tulad ng mukha, bulaklak, o background para mas madaling matapos.'
                    : 'Break down your large wedding pattern into manageable milestones like faces, floral garlands, or background.'}
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleAutoGenerateMilestones}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#D5C9B8] text-[#2C2523] transition-colors shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#B88E3C]" />
                  <span>{language === 'fil' ? 'I-generate ang 3 Karaniwang Bahagi' : 'Auto-Generate 3 Milestones'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#2C2523] text-white hover:bg-[#433936] transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-[#E6C687]" />
                  <span>{language === 'fil' ? 'Bumuo ng Sariling Milestone' : 'Create Custom Milestone'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {milestones.map((m) => {
                const stats = getMilestoneStats(m);
                const theme = THEME_STYLES[m.colorTheme || 'emerald'] || THEME_STYLES.emerald;
                const isHighlighted = highlightedMilestone?.id === m.id;

                return (
                  <div
                    key={m.id}
                    className={`bg-white rounded-xl border p-4 space-y-3 transition-all ${
                      isHighlighted
                        ? 'border-[#B88E3C] ring-2 ring-[#B88E3C]/25 shadow-sm'
                        : stats.isDone
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : 'border-[#E8E1D5] hover:border-[#D5C9B8]'
                    }`}
                  >
                    {/* Card Top: Title, Coordinates, and Tools */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: theme.accentColor }}
                          />
                          <h6 className="font-serif font-bold text-sm text-[#2C2523] truncate" title={m.title}>
                            {m.title}
                          </h6>
                        </div>

                        <div className="text-[10px] font-mono text-[#7A6E65] flex items-center gap-1">
                          <span>
                            X: {stats.minX}–{stats.maxX}
                          </span>
                          <span>·</span>
                          <span>
                            Y: {stats.minY}–{stats.maxY}
                          </span>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onHighlightMilestone(isHighlighted ? null : m)}
                          className={`p-1 rounded text-xs transition-colors ${
                            isHighlighted
                              ? 'bg-[#B88E3C] text-white'
                              : 'text-[#7A6E65] hover:text-[#2C2523] hover:bg-[#FAF7F2]'
                          }`}
                          title={isHighlighted ? 'Remove highlight on grid' : 'Highlight region on stitch viewer'}
                        >
                          {isHighlighted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(m)}
                          className="p-1 rounded text-[#7A6E65] hover:text-[#2C2523] hover:bg-[#FAF7F2] transition-colors"
                          title="Edit coordinates or name"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteMilestone(m.id)}
                          className="p-1 rounded text-[#8C8077] hover:text-red-700 hover:bg-red-50 transition-colors"
                          title="Delete milestone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Numerical Metrics */}
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-mono text-sm font-bold text-[#2C2523]">
                          {stats.percentage.toFixed(1)}%
                        </span>
                        <span className="font-mono text-[11px] text-[#7A6E65]">
                          {stats.stitchedInRegion.toLocaleString()} / {stats.totalInRegion.toLocaleString()}
                        </span>
                      </div>

                      {/* Animated Progress Bar */}
                      <div className="w-full h-2.5 bg-[#EAE2D5] rounded-full overflow-hidden p-0.5 border border-[#D7CBB9]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 bg-gradient-to-r ${theme.barGradient}`}
                          style={{ width: `${stats.percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer State & Batch Actions */}
                    <div className="pt-2 border-t border-[#F0ECE1] flex items-center justify-between gap-2 text-[11px]">
                      {stats.isDone ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{language === 'fil' ? 'Kumpleto!' : 'Milestone Done!'}</span>
                        </span>
                      ) : (
                        <span className="text-[#7A6E65]">
                          {(stats.totalInRegion - stats.stitchedInRegion).toLocaleString()} {language === 'fil' ? 'natitira' : 'stitches left'}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        {!stats.isDone ? (
                          <button
                            type="button"
                            onClick={() => handleBatchToggleMilestone(m, true)}
                            className="px-2 py-0.5 bg-[#FAF7F2] hover:bg-emerald-50 hover:text-emerald-800 text-[#5F554F] border border-[#E8E1D5] rounded text-[10px] font-medium transition-colors"
                            title="Mark all stitches in this region as done"
                          >
                            {language === 'fil' ? 'I-marka Lahat' : 'Mark Region'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBatchToggleMilestone(m, false)}
                            className="px-2 py-0.5 bg-[#FAF7F2] hover:bg-red-50 hover:text-red-700 text-[#7A6E65] border border-[#E8E1D5] rounded text-[10px] font-medium transition-colors"
                            title="Unmark all stitches in this region"
                          >
                            {language === 'fil' ? 'I-unmark' : 'Unmark'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Milestone Creator & Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8E1D5] shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-3">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-[#B88E3C]" />
                <h4 className="font-serif font-bold text-lg text-[#2C2523]">
                  {editingMilestoneId
                    ? (language === 'fil' ? 'I-edit ang Milestone' : 'Edit Project Milestone')
                    : (language === 'fil' ? 'Bagong Milestone ng Proyekto' : 'Define Custom Project Milestone')}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1 rounded-md text-[#7A6E65] hover:text-[#2C2523] hover:bg-[#FAF7F2]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMilestone} className="space-y-4">
              {/* Milestone Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#2C2523]">
                  {language === 'fil' ? 'Pangalan ng Milestone:' : 'Milestone Title / Feature Name:'}
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={language === 'fil' ? 'hal. Complete Faces o Finish Background' : 'e.g., Complete Faces, Finish Background'}
                  className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#D5C9B8] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#B88E3C] focus:bg-white transition-all text-[#2C2523]"
                />
              </div>

              {/* Quick Section Presets */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[#7A6E65] uppercase tracking-wider">
                  {language === 'fil' ? 'Mabilisang Preset sa Coordinate:' : 'Quick Coordinate Presets:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleApplyPresetCoordinates('faces')}
                    className="p-1.5 rounded-lg border border-[#E8E1D5] bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#2C2523] text-left transition-colors font-medium truncate"
                  >
                    👑 {language === 'fil' ? 'Mga Mukha' : 'Complete Faces'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetCoordinates('background')}
                    className="p-1.5 rounded-lg border border-[#E8E1D5] bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#2C2523] text-left transition-colors font-medium truncate"
                  >
                    🌌 {language === 'fil' ? 'Background' : 'Finish Background'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetCoordinates('top')}
                    className="p-1.5 rounded-lg border border-[#E8E1D5] bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#2C2523] text-left transition-colors font-medium truncate"
                  >
                    🌿 {language === 'fil' ? 'Itaas na Garland' : 'Upper Garland'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetCoordinates('bottom')}
                    className="p-1.5 rounded-lg border border-[#E8E1D5] bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#2C2523] text-left transition-colors font-medium truncate"
                  >
                    📜 {language === 'fil' ? 'Pangalan at Petsa' : 'Date & Names'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetCoordinates('leftBorder')}
                    className="p-1.5 rounded-lg border border-[#E8E1D5] bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#2C2523] text-left transition-colors font-medium truncate"
                  >
                    🖼️ {language === 'fil' ? 'Harang / Border' : 'Left Border'}
                  </button>
                </div>
              </div>

              {/* Coordinate Ranges Inputs */}
              <div className="grid grid-cols-2 gap-4 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E1D5]">
                {/* Horizontal X Range */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#2C2523] flex items-center justify-between">
                    <span>X Range (Column)</span>
                    <span className="font-mono text-[11px] text-[#7A6E65]">
                      0 – {pattern.width - 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1">
                      <span className="text-[10px] text-[#7A6E65] block mb-0.5">Min X</span>
                      <input
                        type="number"
                        min="0"
                        max={formMaxX}
                        value={formMinX}
                        onChange={(e) => setFormMinX(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs font-mono bg-white border border-[#D5C9B8] rounded"
                      />
                    </div>
                    <span className="text-[#8C8077] pt-4">to</span>
                    <div className="flex-1">
                      <span className="text-[10px] text-[#7A6E65] block mb-0.5">Max X</span>
                      <input
                        type="number"
                        min={formMinX}
                        max={pattern.width - 1}
                        value={formMaxX}
                        onChange={(e) => setFormMaxX(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs font-mono bg-white border border-[#D5C9B8] rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Vertical Y Range */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#2C2523] flex items-center justify-between">
                    <span>Y Range (Row)</span>
                    <span className="font-mono text-[11px] text-[#7A6E65]">
                      0 – {pattern.height - 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1">
                      <span className="text-[10px] text-[#7A6E65] block mb-0.5">Min Y</span>
                      <input
                        type="number"
                        min="0"
                        max={formMaxY}
                        value={formMinY}
                        onChange={(e) => setFormMinY(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs font-mono bg-white border border-[#D5C9B8] rounded"
                      />
                    </div>
                    <span className="text-[#8C8077] pt-4">to</span>
                    <div className="flex-1">
                      <span className="text-[10px] text-[#7A6E65] block mb-0.5">Max Y</span>
                      <input
                        type="number"
                        min={formMinY}
                        max={pattern.height - 1}
                        value={formMaxY}
                        onChange={(e) => setFormMaxY(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs font-mono bg-white border border-[#D5C9B8] rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[#7A6E65] uppercase tracking-wider">
                  {language === 'fil' ? 'Kulay ng Bar at Sagisag:' : 'Progress Bar Color Theme:'}
                </label>
                <div className="flex items-center gap-3">
                  {(['emerald', 'amber', 'indigo', 'rose', 'cyan'] as const).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormTheme(color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${
                        formTheme === color ? 'border-[#2C2523] scale-110 shadow-xs' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: THEME_STYLES[color].accentColor }}
                    >
                      {formTheme === color && <span className="w-2 h-2 rounded-full bg-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Count Preview */}
              <div className="bg-[#FAF7F2] p-3 rounded-lg border border-[#E8E1D5] flex items-center justify-between text-xs">
                <span className="text-[#7A6E65]">
                  {language === 'fil' ? 'Sakop na tahi sa milestone na ito:' : 'Total stitches in coordinate box:'}
                </span>
                <span className="font-mono font-bold text-[#2C2523]">
                  {(Math.max(0, formMaxX - formMinX + 1) * Math.max(0, formMaxY - formMinY + 1)).toLocaleString()} stitches
                </span>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#7A6E65] hover:text-[#2C2523] transition-colors"
                >
                  {language === 'fil' ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#2C2523] text-white hover:bg-[#433936] transition-colors shadow-2xs"
                >
                  {editingMilestoneId
                    ? (language === 'fil' ? 'I-save ang Pagbabago' : 'Update Milestone')
                    : (language === 'fil' ? 'Idagdag ang Milestone' : 'Save Milestone')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
