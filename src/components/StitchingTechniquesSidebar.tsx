import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Sparkles,
  ChevronRight,
  Info,
  CheckCircle2,
  Compass,
  Layers,
  Search,
  ExternalLink,
  HelpCircle,
  Scissors,
  Bookmark,
} from 'lucide-react';
import { PatternData, ComplexityAnalysis } from '../types';

interface StitchingTechniquesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: PatternData | null;
  language: 'en' | 'fil';
}

type TechniqueCategory = 'recommended' | 'all' | 'accents' | 'fractional' | 'foundations';

interface TechniqueItem {
  id: string;
  nameEn: string;
  nameFil: string;
  category: 'foundations' | 'accents' | 'fractional' | 'finishing';
  minComplexityTier: 'Beginner' | 'Intermediate' | 'Masterpiece';
  badgeEn: string;
  badgeFil: string;
  summaryEn: string;
  summaryFil: string;
  stepsEn: string[];
  stepsFil: string[];
  proTipsEn: string;
  proTipsFil: string;
  diagramType: 'frenchKnots' | 'backstitch' | 'fractional' | 'fullCross' | 'pinStitch' | 'loopStart';
}

const TECHNIQUES: TechniqueItem[] = [
  {
    id: 'full-cross',
    nameEn: 'Standard Full Cross Stitch (X)',
    nameFil: 'Buong Krus na Tahi (Full Cross)',
    category: 'foundations',
    minComplexityTier: 'Beginner',
    badgeEn: 'Foundation Stitch',
    badgeFil: 'Pundasyong Tahi',
    summaryEn: 'The core building block of all cross-stitch charts. Consistency in diagonal slant gives the piece its luxurious heirloom sheen.',
    summaryFil: 'Ang pangunahing tahi ng cross-stitch. Ang pare-parehong direksyon ng diagonal ay nagbibigay ng makinis at magandang kintab sa tela.',
    stepsEn: [
      '1. Bring needle up at lower-left hole (1) and go down at upper-right hole (2) to form bottom diagonal (/).',
      '2. Bring needle up at lower-right hole (3) and go down at upper-left hole (4) to complete top diagonal (\\).',
      '3. Maintain the exact same top-leg direction across all stitches on the canvas for a uniform reflective finish.',
    ],
    stepsFil: [
      '1. Ipasok ang karayom mula sa ilalim sa kaliwang ibaba (1) at itusok pababa sa kanang itaas (2) para sa unang hilig (/).',
      '2. Iahon ang karayom sa kanang ibaba (3) at itusok pababa sa kaliwang itaas (4) upang mabuo ang krus (\\).',
      '3. Panatilihing pare-pareho ang ibabaw na hilig sa buong proyekto para sa malinis at propesyonal na hitsura.',
    ],
    proTipsEn: 'Danish Method: Work a whole row of half stitches (///) first, then cross back (\\\\\\). This saves thread and keeps tension even.',
    proTipsFil: 'Paraang Danish: Magtahi muna ng buong hanay ng kalahating tahi (///), bago bumalik at buuin ang krus (\\\\\\). Makatitipid ito sa sinulid.',
    diagramType: 'fullCross',
  },
  {
    id: 'loop-start',
    nameEn: 'Zero-Knot Loop Start',
    nameFil: 'Pagsisimula Nang Walang Buhol (Loop Start)',
    category: 'foundations',
    minComplexityTier: 'Beginner',
    badgeEn: 'Clean Back Technique',
    badgeFil: 'Malinis na Likod',
    summaryEn: 'The cleanest way to anchor 2-strand threads without knots on the back of heirloom fabric.',
    summaryFil: 'Ang pinakamalinis na paraan upang simulan ang 2-strand na sinulid nang walang nakabukol na buhol sa likod ng tela.',
    stepsEn: [
      '1. Cut a single strand of DMC floss twice as long as desired. Fold it in half to create a loop at one end.',
      '2. Thread both cut ends through the eye of your needle, leaving the loop hanging at the tail.',
      '3. Bring needle up from the back at (1). Make your first diagonal leg into (2).',
      '4. On the back, pass your needle through the tail loop and pull gently until anchored flush against fabric.',
    ],
    stepsFil: [
      '1. Gumupit ng isang hibla ng DMC na doble ang haba. Itiklop ito sa gitna para magkaroon ng loop sa kabilang dulo.',
      '2. Isuot ang dalawang pinutol na dulo sa butas ng karayom, habang nakabitin ang loop sa dulo.',
      '3. Iahon ang karayom sa (1) at itusok sa (2). Sa likod ng tela, isuot ang karayom sa loop at hilahin nang banayad.',
      '4. Mahigpit at pantay itong nakakapit nang walang anumang buhol na makikita sa harap o likod.',
    ],
    proTipsEn: 'Keeps the backside of framed wedding tapestries perfectly flat, preventing unsightly lumps when stretched over acid-free backing boards.',
    proTipsFil: 'Pinapanatiling patag ang likod ng tapestry upang hindi magbukol kapag inilagay na sa frame.',
    diagramType: 'loopStart',
  },
  {
    id: 'french-knots',
    nameEn: 'French Knots (Bridal Pearls & Sparkles)',
    nameFil: 'Buhol-Pranses (French Knots & Perlas)',
    category: 'accents',
    minComplexityTier: 'Intermediate',
    badgeEn: 'Accent Texturing',
    badgeFil: 'Palamuting Tekstura',
    summaryEn: 'Creates tactile 3D raised beads ideal for bridal jewelry, ring sparkles, flower centers, and facial eye highlights.',
    summaryFil: 'Gumagawa ng nakaumbok na 3D beads na mainam para sa alahas ng ikakasal, kislap ng singsing, at gitna ng mga bulaklak.',
    stepsEn: [
      '1. Bring needle up through fabric at the exact point where the knot is required.',
      '2. Hold thread taut with your non-dominant hand. Point needle downward and wrap thread around needle 1 or 2 times.',
      '3. Insert needle tip immediately adjacent to exit hole (1-2 fabric threads away, NOT into the exact same hole).',
      '4. Pull gently until the wraps slide down flush to the fabric surface, then pull needle through to the back.',
    ],
    stepsFil: [
      '1. Iahon ang karayom sa telang paglalagyan ng buhol.',
      '2. Hawakang banat ang sinulid gamit ang kaliwang kamay. Ipulupot ang sinulid sa karayom ng 1 o 2 beses.',
      '3. Itusok ang dulo ng karayom katabi mismo ng pinaglabasan (huwag sa mismong butas upang hindi lumusot).',
      '4. Hilahin nang dahan-dahan ang karayom sa ilalim habang maingat na pinipigil ang buhol sa ibabaw ng tela.',
    ],
    proTipsEn: 'Do not wrap more than twice! If you need a larger pearl bead, use 3 strands of floss instead of extra wraps to avoid loose coils.',
    proTipsFil: 'Huwag magpulupot nang higit sa 2 beses! Kung nais ng mas malaking buhol, dagdagan ang hibla ng sinulid sa halip na ikot.',
    diagramType: 'frenchKnots',
  },
  {
    id: 'backstitch',
    nameEn: 'Backstitching (Outlines & Vow Calligraphy)',
    nameFil: 'Tahi-Pabalik (Backstitch para sa Letra)',
    category: 'accents',
    minComplexityTier: 'Beginner',
    badgeEn: 'Outlines & Lettering',
    badgeFil: 'Guhit at Letra',
    summaryEn: 'Sharp, crisp continuous line stitching essential for couple names, wedding dates, and delicate facial eyelashes/smiles.',
    summaryFil: 'Matalas at tuluy-tuloy na linyang tahi na mahalaga para sa mga pangalan, petsa ng kasal, at pinong detalye ng mukha.',
    stepsEn: [
      '1. Bring needle up at (2)—one stitch length forward along your drawn line.',
      '2. Insert needle backwards into (1) where the previous stitch ended.',
      '3. Bring needle up ahead at (3)—one stitch length forward from (2).',
      '4. Insert needle backwards into (2). Repeat along the contour line.',
    ],
    stepsFil: [
      '1. Iahon ang karayom sa (2)—isang tahi pasulong sa iyong linyang susundan.',
      '2. Itusok pabalik sa (1) kung saan nagtapos ang nakaraang tahi.',
      '3. Iahon muli pasulong sa (3)—isang tahi ang layo mula sa (2).',
      '4. Itusok pabalik sa (2). Ulitin hanggang mabuo ang buong salita o hugis.',
    ],
    proTipsEn: 'Use 1 strand of DMC for fine facial contours and wedding dates to prevent overpowering the cross-stitches beneath.',
    proTipsFil: 'Gumamit lamang ng 1 hibla ng DMC para sa letra at mukha upang hindi matakpan ang mga krus sa ilalim.',
    diagramType: 'backstitch',
  },
  {
    id: 'fractional',
    nameEn: 'Fractional Stitches (1/4 & 3/4 Curves)',
    nameFil: 'Hating Tahi (1/4 at 3/4 para sa Kurba)',
    category: 'fractional',
    minComplexityTier: 'Intermediate',
    badgeEn: 'Curved Shading',
    badgeFil: 'Makinis na Kurba',
    summaryEn: 'Eliminates the jagged "staircase" pixel effect on round shapes like cheekbones, wedding rings, and flower petals.',
    summaryFil: 'Tinatanggal ang matulis na "hagdan" effect sa mga bilog na hugis tulad ng pisngi, singsing, at mga talulot ng bulaklak.',
    stepsEn: [
      '1. Quarter Stitch (1/4): Bring needle up from corner (1) and pierce directly through the center fabric weave midpoint.',
      '2. Three-Quarter Stitch (3/4): Make a quarter stitch (1 to center), then make a full diagonal across the opposing corners (3 to 4).',
      '3. Combine two 3/4 stitches or a 1/4 + 3/4 of different colors in one grid box to transition colors smoothly along a curve.',
    ],
    stepsFil: [
      '1. Sangkapat na Tahi (1/4): Iahon mula sa sulok (1) at itusok sa mismong gitna ng hibla ng Aida cloth.',
      '2. Tatlong-kapat na Tahi (3/4): Gumawa muna ng 1/4 stitch, pagkatapos ay gumawa ng buong diagonal mula sulok (3) hanggang (4).',
      '3. Pagsamahin ang dalawang magkaibang kulay sa isang kahon para sa makinis na transisyon ng kulay ng balat o damit.',
    ],
    proTipsEn: 'A size 26 or 28 sharp needle or ball-point needle helps pierce between fabric threads accurately without splitting Aida strands.',
    proTipsFil: 'Gumamit ng mas manipis na karayom (Size 26 o 28) upang madaling maitusok sa gitna ng hibla ng Aida.',
    diagramType: 'fractional',
  },
  {
    id: 'pin-stitch',
    nameEn: 'Pin Stitch (Confetti Anchor & Finish)',
    nameFil: 'Tahi-Tusok para sa Confetti (Pin Stitch)',
    category: 'finishing',
    minComplexityTier: 'Masterpiece',
    badgeEn: 'Confetti Specialist',
    badgeFil: 'Eksperto sa Confetti',
    summaryEn: 'Anchors a single isolated confetti stitch invisibly right on the front, without carrying long thread tails across the back.',
    summaryFil: 'Ikinakapit ang nag-iisang confetti stitch sa harap nang walang mahahabang sinulid na tatawid sa likod ng tela.',
    stepsEn: [
      '1. Within a single Aida square, pierce the needle between the two center vertical threads of the fabric weave.',
      '2. Make a tiny vertical bite of 1 thread, pulling thread through almost to the end.',
      '3. Make a second tiny locking bite over the same thread to secure it.',
      '4. Complete your normal cross stitch directly on top of the pin stitch—the cross stitch completely conceals the anchor!',
    ],
    stepsFil: [
      '1. Sa loob ng iisang kahon ng Aida, itusok ang karayom sa pagitan ng dalawang gitnang hibla ng tela.',
      '2. Gumawa ng maliit na tahi sa isang hibla upang kumapit ang sinulid.',
      '3. Ulitin muli sa parehong hibla para sa matibay na kandado.',
      '4. Itahi ang karaniwang cross stitch sa ibabaw nito—ganap nitong matatakpan ang pin stitch nang walang bakas!',
    ],
    proTipsEn: 'Crucial for high-confetti wedding portraits. Prevents dark threads (e.g. DMC 310 tuxedo black) from shadowing through white wedding gown areas.',
    proTipsFil: 'Napakahalaga sa masalimuot na portrait upang maiwasan ang anino ng maitim na sinulid sa likod ng maputing damit-pangkasal.',
    diagramType: 'pinStitch',
  },
];

export const StitchingTechniquesSidebar: React.FC<StitchingTechniquesSidebarProps> = ({
  isOpen,
  onClose,
  pattern,
  language,
}) => {
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string>('full-cross');
  const [activeCategory, setActiveCategory] = useState<TechniqueCategory>('recommended');
  const [searchQuery, setSearchQuery] = useState('');

  const currentComplexity = pattern?.complexity;
  const currentTier = currentComplexity?.tier || 'Intermediate';

  const selectedTechnique =
    TECHNIQUES.find((t) => t.id === selectedTechniqueId) || TECHNIQUES[0];

  // Filter techniques based on category and search
  const filteredTechniques = TECHNIQUES.filter((t) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchEn = t.nameEn.toLowerCase().includes(q) || t.summaryEn.toLowerCase().includes(q);
      const matchFil = t.nameFil.toLowerCase().includes(q) || t.summaryFil.toLowerCase().includes(q);
      if (!matchEn && !matchFil) return false;
    }

    if (activeCategory === 'recommended') {
      if (currentTier === 'Beginner') {
        return t.id === 'full-cross' || t.id === 'loop-start' || t.id === 'backstitch';
      }
      if (currentTier === 'Intermediate') {
        return t.id === 'fractional' || t.id === 'french-knots' || t.id === 'backstitch' || t.id === 'full-cross';
      }
      // Masterpiece
      return true;
    }

    if (activeCategory === 'accents') return t.category === 'accents';
    if (activeCategory === 'fractional') return t.category === 'fractional';
    if (activeCategory === 'foundations') return t.category === 'foundations' || t.category === 'finishing';

    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs transition-opacity duration-300">
      {/* Click outside to close backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-2xl bg-[#FAF7F2] h-full shadow-2xl border-l border-[#E8E1D5] flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-white border-b border-[#E8E1D5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2C2523] text-[#FAF7F2] flex items-center justify-center font-serif text-lg shadow-sm">
              🧵
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-lg sm:text-xl text-[#2C2523]">
                  {language === 'fil' ? 'Gabay sa mga Paraan ng Pananahi' : 'Stitching Techniques Reference'}
                </h3>
              </div>
              <p className="text-xs text-[#7A6E65]">
                {language === 'fil'
                  ? 'Mga diagram at hakbang para sa French knots, backstitching, at fractional stitches.'
                  : 'Diagrams and instructions tailored to your pattern’s complexity level.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#7A6E65] hover:text-[#2C2523] hover:bg-[#FAF7F2] rounded-lg transition-colors cursor-pointer"
            title="Close Reference Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Complexity Recommendation Banner */}
        {currentComplexity && (
          <div className="bg-[#FAF7F2] border-b border-[#E8E1D5] px-5 py-3 sm:px-6 flex items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#8C7A6B] uppercase tracking-wider text-[11px]">
                {language === 'fil' ? 'Antas ng Pattern:' : 'Pattern Complexity:'}
              </span>
              <span className="font-serif font-bold text-[#2C2523]">
                {language === 'fil' ? currentComplexity.tagalogTier : currentComplexity.tier}
              </span>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-[#D5C9B8] text-[#2C2523]">
                {currentComplexity.score}/10
              </span>
            </div>

            <div className="text-[11px] text-[#7A6E65] hidden sm:block">
              {currentComplexity.confettiLevel}
            </div>
          </div>
        )}

        {/* Filter Tabs & Search */}
        <div className="p-4 sm:px-6 bg-[#FAF7F2] border-b border-[#E8E1D5] space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <button
              onClick={() => setActiveCategory('recommended')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeCategory === 'recommended'
                  ? 'bg-[#2C2523] text-white shadow-2xs font-semibold'
                  : 'bg-white text-[#5F554F] border border-[#E8E1D5] hover:bg-[#F2ECE1]'
              }`}
            >
              ⭐ {language === 'fil' ? 'Inirerekomenda sa Pattern' : 'Recommended for Pattern'}
            </button>
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[#2C2523] text-white shadow-2xs font-semibold'
                  : 'bg-white text-[#5F554F] border border-[#E8E1D5] hover:bg-[#F2ECE1]'
              }`}
            >
              {language === 'fil' ? 'Lahat ng Tahi (6)' : 'All Techniques (6)'}
            </button>
            <button
              onClick={() => setActiveCategory('accents')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeCategory === 'accents'
                  ? 'bg-[#2C2523] text-white shadow-2xs font-semibold'
                  : 'bg-white text-[#5F554F] border border-[#E8E1D5] hover:bg-[#F2ECE1]'
              }`}
            >
              {language === 'fil' ? 'Perlas & Letra' : 'Knots & Outlines'}
            </button>
            <button
              onClick={() => setActiveCategory('fractional')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeCategory === 'fractional'
                  ? 'bg-[#2C2523] text-white shadow-2xs font-semibold'
                  : 'bg-white text-[#5F554F] border border-[#E8E1D5] hover:bg-[#F2ECE1]'
              }`}
            >
              {language === 'fil' ? 'Hating Tahi (1/4 & 3/4)' : 'Fractionals'}
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8C8077] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={language === 'fil' ? 'Maghanap ng paraan ng pagtahi...' : 'Search technique instructions...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#D5C9B8] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#B88E3C] text-[#2C2523]"
            />
          </div>
        </div>

        {/* Body Container: Two Columns on Large, Stack on Small */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Technique Picker Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredTechniques.map((tech) => {
              const isSelected = tech.id === selectedTechnique.id;
              return (
                <button
                  key={tech.id}
                  onClick={() => setSelectedTechniqueId(tech.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white border-[#B88E3C] ring-2 ring-[#B88E3C]/20 shadow-xs'
                      : 'bg-white/80 border-[#E8E1D5] hover:border-[#D5C9B8] hover:bg-white'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-[#B88E3C] tracking-wider block mb-1">
                    {language === 'fil' ? tech.badgeFil : tech.badgeEn}
                  </span>
                  <span className="font-serif font-bold text-xs text-[#2C2523] line-clamp-1">
                    {language === 'fil' ? tech.nameFil : tech.nameEn}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Technique Display Card */}
          <div className="bg-white rounded-2xl border border-[#E8E1D5] p-5 sm:p-6 space-y-6 shadow-xs">
            {/* Technique Title & Summary */}
            <div className="space-y-1.5 border-b border-[#F0ECE1] pb-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#B88E3C] uppercase tracking-wider">
                  {language === 'fil' ? selectedTechnique.badgeFil : selectedTechnique.badgeEn}
                </span>
                <span className="text-[10px] font-mono text-[#7A6E65] px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#E8E1D5]">
                  Tier: {selectedTechnique.minComplexityTier}+
                </span>
              </div>
              <h4 className="font-serif font-bold text-xl text-[#2C2523]">
                {language === 'fil' ? selectedTechnique.nameFil : selectedTechnique.nameEn}
              </h4>
              <p className="text-xs sm:text-sm text-[#5F554F] leading-relaxed">
                {language === 'fil' ? selectedTechnique.summaryFil : selectedTechnique.summaryEn}
              </p>
            </div>

            {/* Visual Step-by-Step Stitch Diagram */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-[#7A6E65] uppercase tracking-wider block">
                {language === 'fil' ? 'Diagram ng Pagtahi sa Aida Cloth:' : 'Aida Fabric Step-by-Step Diagram:'}
              </span>

              <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-4 flex flex-col items-center justify-center">
                <StitchSvgDiagram diagramType={selectedTechnique.diagramType} language={language} />
              </div>
            </div>

            {/* Sequential Instructions */}
            <div className="space-y-3">
              <span className="text-[11px] font-semibold text-[#7A6E65] uppercase tracking-wider block">
                {language === 'fil' ? 'Mga Hakbang sa Pagsasagawa:' : 'Step-by-Step Execution:'}
              </span>

              <div className="space-y-2">
                {(language === 'fil' ? selectedTechnique.stepsFil : selectedTechnique.stepsEn).map(
                  (step, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl flex items-start gap-2.5 text-xs text-[#2C2523] leading-relaxed"
                    >
                      <div className="w-5 h-5 rounded-full bg-white border border-[#D5C9B8] flex items-center justify-center text-[10px] font-bold text-[#B88E3C] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div>{step}</div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Pro Artisan Tip */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 text-xs">
              <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                <span>💡</span>
                <span>{language === 'fil' ? 'Payo ng Dalubhasang Mananahi:' : 'Artisan Craft Tip:'}</span>
              </div>
              <p className="text-[11px] text-amber-950 leading-relaxed">
                {language === 'fil' ? selectedTechnique.proTipsFil : selectedTechnique.proTipsEn}
              </p>
            </div>
          </div>

          {/* Fabric & Needle Size Reference Table */}
          <div className="bg-white rounded-2xl border border-[#E8E1D5] p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-[#B88E3C]" />
              <h5 className="font-serif font-bold text-sm text-[#2C2523]">
                {language === 'fil' ? 'Talaan ng Tamang Karayom at Hibla' : 'Needle & Thread Pairing Guide'}
              </h5>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8E1D5] text-[#7A6E65] text-[10px] uppercase tracking-wider font-semibold">
                    <th className="py-1.5 pr-2">Aida Count</th>
                    <th className="py-1.5 px-2">Needle Size</th>
                    <th className="py-1.5 px-2">Cross Stitch</th>
                    <th className="py-1.5 pl-2">Backstitch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE1] font-mono text-[11px] text-[#2C2523]">
                  <tr className={pattern?.fabricCount === 14 ? 'bg-amber-50/60 font-bold' : ''}>
                    <td className="py-2 pr-2">14-Count {pattern?.fabricCount === 14 && '★'}</td>
                    <td className="py-2 px-2">Tapestry #24</td>
                    <td className="py-2 px-2">2 strands</td>
                    <td className="py-2 pl-2">1 strand</td>
                  </tr>
                  <tr className={pattern?.fabricCount === 16 ? 'bg-amber-50/60 font-bold' : ''}>
                    <td className="py-2 pr-2">16-Count {pattern?.fabricCount === 16 && '★'}</td>
                    <td className="py-2 px-2">Tapestry #24 / #26</td>
                    <td className="py-2 px-2">2 strands</td>
                    <td className="py-2 pl-2">1 strand</td>
                  </tr>
                  <tr className={pattern?.fabricCount === 18 ? 'bg-amber-50/60 font-bold' : ''}>
                    <td className="py-2 pr-2">18-Count {pattern?.fabricCount === 18 && '★'}</td>
                    <td className="py-2 px-2">Tapestry #26</td>
                    <td className="py-2 px-2">2 strands</td>
                    <td className="py-2 pl-2">1 strand</td>
                  </tr>
                  <tr className={pattern?.fabricCount === 22 ? 'bg-amber-50/60 font-bold' : ''}>
                    <td className="py-2 pr-2">22-Count Hardanger</td>
                    <td className="py-2 px-2">Tapestry #28</td>
                    <td className="py-2 px-2">1 strand</td>
                    <td className="py-2 pl-2">1 strand</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// SVG Diagram Component for Clean Visual Instructions
const StitchSvgDiagram: React.FC<{
  diagramType: TechniqueItem['diagramType'];
  language: 'en' | 'fil';
}> = ({ diagramType, language }) => {
  switch (diagramType) {
    case 'frenchKnots':
      return (
        <svg viewBox="0 0 320 180" className="w-full max-w-sm h-auto select-none">
          {/* Aida Grid Weave */}
          <rect x="20" y="20" width="280" height="140" rx="8" fill="#F4EEE4" stroke="#D7CBB9" strokeWidth="1.5" />
          <line x1="80" y1="20" x2="80" y2="160" stroke="#E3DACD" strokeWidth="1" />
          <line x1="160" y1="20" x2="160" y2="160" stroke="#E3DACD" strokeWidth="1" />
          <line x1="240" y1="20" x2="240" y2="160" stroke="#E3DACD" strokeWidth="1" />
          <line x1="20" y1="90" x2="300" y2="90" stroke="#E3DACD" strokeWidth="1" />

          {/* Hole Points */}
          <circle cx="160" cy="90" r="5" fill="#4A3E39" />
          <circle cx="168" cy="90" r="4" fill="#8C7A6B" />

          {/* Thread loop and wraps */}
          <path
            d="M 160 90 C 130 50, 110 30, 90 60 C 70 90, 110 130, 155 105"
            fill="none"
            stroke="#D97706"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Wraps around needle */}
          <ellipse cx="164" cy="72" rx="9" ry="5" fill="none" stroke="#D97706" strokeWidth="3" />
          <ellipse cx="164" cy="79" rx="9" ry="5" fill="none" stroke="#D97706" strokeWidth="3" />

          {/* Needle Graphic */}
          <line x1="164" y1="35" x2="166" y2="105" stroke="#475569" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="164" cy="40" rx="1.5" ry="4" fill="#FAF7F2" />

          {/* Annotations */}
          <text x="160" y="112" fontSize="10" fontWeight="bold" fill="#2C2523" textAnchor="middle">
            (1) Exit Hole
          </text>
          <text x="180" y="75" fontSize="10" fontWeight="bold" fill="#D97706">
            2× Coil Wrap
          </text>
          <text x="160" y="150" fontSize="11" fill="#7A6E65" textAnchor="middle">
            {language === 'fil' ? 'Itusok pabalik 1 hibla katabi ng butas' : 'Insert needle tip 1 thread adjacent to exit'}
          </text>
        </svg>
      );

    case 'backstitch':
      return (
        <svg viewBox="0 0 320 180" className="w-full max-w-sm h-auto select-none">
          {/* Aida Grid Weave */}
          <rect x="20" y="20" width="280" height="140" rx="8" fill="#F4EEE4" stroke="#D7CBB9" strokeWidth="1.5" />
          {/* Holes */}
          {[60, 110, 160, 210, 260].map((x) => (
            <circle key={x} cx={x} cy="90" r="5" fill="#4A3E39" />
          ))}

          {/* Previous complete stitch (60 to 110) */}
          <line x1="60" y1="90" x2="110" y2="90" stroke="#059669" strokeWidth="4" strokeLinecap="round" />

          {/* Active Backstitch (160 up, back into 110) */}
          <path
            d="M 160 90 Q 135 60 110 90"
            fill="none"
            stroke="#D97706"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="6 3"
          />
          <polygon points="120,80 110,90 125,93" fill="#D97706" />

          {/* Forward movement under fabric */}
          <path
            d="M 110 90 Q 160 120 210 90"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="4 4"
          />

          {/* Number tags */}
          <text x="110" y="112" fontSize="11" fontWeight="bold" fill="#2C2523" textAnchor="middle">
            (1) Down
          </text>
          <text x="160" y="75" fontSize="11" fontWeight="bold" fill="#D97706" textAnchor="middle">
            (2) Up
          </text>
          <text x="210" y="112" fontSize="11" fontWeight="bold" fill="#64748B" textAnchor="middle">
            (3) Next Up
          </text>

          <text x="160" y="150" fontSize="11" fill="#7A6E65" textAnchor="middle">
            {language === 'fil' ? 'Iahon sa 2 pasulong, itusok pabalik sa 1' : 'Come up 1 step ahead (2), plunge backward into (1)'}
          </text>
        </svg>
      );

    case 'fractional':
      return (
        <svg viewBox="0 0 320 180" className="w-full max-w-sm h-auto select-none">
          {/* Two Aida Boxes */}
          <rect x="40" y="25" width="110" height="110" rx="4" fill="#F4EEE4" stroke="#D7CBB9" strokeWidth="1.5" />
          <rect x="170" y="25" width="110" height="110" rx="4" fill="#F4EEE4" stroke="#D7CBB9" strokeWidth="1.5" />

          {/* Center markers */}
          <circle cx="95" cy="80" r="3" fill="#DC2626" />
          <circle cx="225" cy="80" r="3" fill="#DC2626" />

          {/* Box 1: Quarter Stitch (1/4) */}
          <line x1="40" y1="135" x2="95" y2="80" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />
          <circle cx="40" cy="135" r="4" fill="#2563EB" />

          <text x="95" y="155" fontSize="11" fontWeight="bold" fill="#2C2523" textAnchor="middle">
            Quarter Stitch (1/4)
          </text>
          <text x="95" y="70" fontSize="9" fontWeight="bold" fill="#DC2626" textAnchor="middle">
            Fabric Center
          </text>

          {/* Box 2: Three-Quarter Stitch (3/4) */}
          {/* Quarter leg */}
          <line x1="170" y1="135" x2="225" y2="80" stroke="#D97706" strokeWidth="4" strokeLinecap="round" />
          {/* Full opposing diagonal */}
          <line x1="170" y1="25" x2="280" y2="135" stroke="#D97706" strokeWidth="4" strokeLinecap="round" />

          <text x="225" y="155" fontSize="11" fontWeight="bold" fill="#2C2523" textAnchor="middle">
            Three-Quarter (3/4)
          </text>
          <text x="225" y="70" fontSize="9" fontWeight="bold" fill="#DC2626" textAnchor="middle">
            Pierce Center
          </text>
        </svg>
      );

    case 'pinStitch':
      return (
        <svg viewBox="0 0 320 180" className="w-full max-w-sm h-auto select-none">
          <rect x="60" y="25" width="200" height="120" rx="6" fill="#F4EEE4" stroke="#D7CBB9" strokeWidth="1.5" />
          {/* Corner holes */}
          <circle cx="85" cy="50" r="5" fill="#4A3E39" />
          <circle cx="235" cy="50" r="5" fill="#4A3E39" />
          <circle cx="85" cy="120" r="5" fill="#4A3E39" />
          <circle cx="235" cy="120" r="5" fill="#4A3E39" />

          {/* Center fabric weave threads */}
          <line x1="160" y1="40" x2="160" y2="130" stroke="#CBD5E1" strokeWidth="8" />

          {/* Pin Stitch lock */}
          <line x1="160" y1="70" x2="160" y2="100" stroke="#DC2626" strokeWidth="4" strokeLinecap="round" />
          <circle cx="160" cy="70" r="3.5" fill="#DC2626" />
          <circle cx="160" cy="100" r="3.5" fill="#DC2626" />

          {/* Overlay ghost of cross stitch */}
          <line x1="85" y1="120" x2="235" y2="50" stroke="#059669" strokeWidth="3" opacity="0.35" strokeDasharray="5 3" />
          <line x1="85" y1="50" x2="235" y2="120" stroke="#059669" strokeWidth="3" opacity="0.35" strokeDasharray="5 3" />

          <text x="160" y="60" fontSize="10" fontWeight="bold" fill="#DC2626" textAnchor="middle">
            Micro Locking Bite
          </text>
          <text x="160" y="160" fontSize="11" fill="#7A6E65" textAnchor="middle">
            {language === 'fil'
              ? 'Tusok sa gitnang hibla; tatakpan ito ng buong krus sa ibabaw'
              : 'Secures thread in center fabric thread; cross stitch conceals it'}
          </text>
        </svg>
      );

    case 'loopStart':
      return (
        <svg viewBox="0 0 320 180" className="w-full max-w-sm h-auto select-none">
          <rect x="40" y="25" width="240" height="120" rx="6" fill="#F4EEE4" stroke="#D7CBB9" strokeWidth="1.5" />
          <circle cx="80" cy="85" r="5" fill="#4A3E39" />
          <circle cx="240" cy="85" r="5" fill="#4A3E39" />

          {/* Loop Thread path */}
          <path
            d="M 240 85 C 210 130, 110 130, 80 85"
            fill="none"
            stroke="#059669"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Tail loop */}
          <circle cx="160" cy="120" r="8" fill="none" stroke="#D97706" strokeWidth="3" />
          {/* Needle passing through loop */}
          <line x1="140" y1="135" x2="180" y2="105" stroke="#475569" strokeWidth="3.5" strokeLinecap="round" />

          <text x="80" y="70" fontSize="11" fontWeight="bold" fill="#2C2523" textAnchor="middle">
            (1) Up
          </text>
          <text x="240" y="70" fontSize="11" fontWeight="bold" fill="#2C2523" textAnchor="middle">
            (2) Down
          </text>
          <text x="160" y="145" fontSize="10" fontWeight="bold" fill="#D97706" textAnchor="middle">
            Pass Needle Through Tail Loop
          </text>
          <text x="160" y="165" fontSize="11" fill="#7A6E65" textAnchor="middle">
            {language === 'fil' ? 'Isuot ang karayom sa loop sa likod ng tela' : 'Anchor flush against fabric back with zero knots'}
          </text>
        </svg>
      );

    default: // fullCross
      return (
        <svg viewBox="0 0 320 180" className="w-full max-w-sm h-auto select-none">
          <rect x="50" y="25" width="220" height="120" rx="6" fill="#F4EEE4" stroke="#D7CBB9" strokeWidth="1.5" />
          {/* 4 holes */}
          <circle cx="80" cy="115" r="6" fill="#4A3E39" />
          <circle cx="240" cy="55" r="6" fill="#4A3E39" />
          <circle cx="240" cy="115" r="6" fill="#4A3E39" />
          <circle cx="80" cy="55" r="6" fill="#4A3E39" />

          {/* Leg 1: (1) to (2) */}
          <line x1="80" y1="115" x2="240" y2="55" stroke="#D97706" strokeWidth="5" strokeLinecap="round" />
          {/* Leg 2: (3) to (4) */}
          <line x1="240" y1="115" x2="80" y2="55" stroke="#059669" strokeWidth="5" strokeLinecap="round" />

          {/* Number labels */}
          <text x="65" y="130" fontSize="12" fontWeight="bold" fill="#D97706">
            1
          </text>
          <text x="250" y="50" fontSize="12" fontWeight="bold" fill="#D97706">
            2
          </text>
          <text x="250" y="130" fontSize="12" fontWeight="bold" fill="#059669">
            3
          </text>
          <text x="65" y="50" fontSize="12" fontWeight="bold" fill="#059669">
            4
          </text>

          <text x="160" y="160" fontSize="11" fill="#7A6E65" textAnchor="middle">
            {language === 'fil' ? 'Unang Leg: 1 papuntang 2 · Pangalawang Leg: 3 papuntang 4' : 'Leg 1: (1) Up → (2) Down · Leg 2: (3) Up → (4) Down'}
          </text>
        </svg>
      );
  }
};
