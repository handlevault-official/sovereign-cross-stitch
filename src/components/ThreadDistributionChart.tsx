import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  PieChart as PieChartIcon,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Layers,
  FilterX,
} from 'lucide-react';
import { PatternData } from '../types';

interface ThreadDistributionChartProps {
  pattern: PatternData;
  language: 'en' | 'fil';
  activeColorFilter?: string | null;
  onSelectColor?: (code: string | null) => void;
}

interface PieSliceDatum {
  id: string;
  code: string;
  name: string;
  hex: string;
  symbol: string;
  count: number;
  percentage: number;
  skeinsNeeded: number;
  isOther?: boolean;
  groupedColorsCount?: number;
}

function getContrastTextColor(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#2C2523';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.56 ? '#2C2523' : '#FAF7F2';
}

export const ThreadDistributionChart: React.FC<ThreadDistributionChartProps> = ({
  pattern,
  language,
  activeColorFilter = null,
  onSelectColor,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showAllColors, setShowAllColors] = useState<boolean>(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  const sortedStats = useMemo(() => {
    return [...pattern.colorStats]
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [pattern.colorStats]);

  const totalStitches = useMemo(() => {
    const sum = sortedStats.reduce((acc, s) => acc + s.count, 0);
    return sum > 0 ? sum : Math.max(1, pattern.totalStitches);
  }, [sortedStats, pattern.totalStitches]);

  const canGroupLongTail = sortedStats.length > 14;

  const slices = useMemo<PieSliceDatum[]>(() => {
    const mapStat = (stat: (typeof sortedStats)[number]): PieSliceDatum => ({
      id: stat.color.code,
      code: stat.color.code,
      name: stat.color.name,
      hex: stat.color.hex,
      symbol: stat.color.symbol,
      count: stat.count,
      percentage: (stat.count / totalStitches) * 100,
      skeinsNeeded: stat.skeinsNeeded,
    });

    if (showAllColors || !canGroupLongTail) {
      return sortedStats.map(mapStat);
    }

    const topCount = 12;
    const primary = sortedStats.slice(0, topCount).map(mapStat);
    const tail = sortedStats.slice(topCount);

    if (tail.length === 0) return primary;

    const tailStitches = tail.reduce((acc, s) => acc + s.count, 0);
    const tailSkeins = tail.reduce((acc, s) => acc + s.skeinsNeeded, 0);

    return [
      ...primary,
      {
        id: '__other__',
        code: 'OTHER',
        name:
          language === 'fil'
            ? `Iba pang ${tail.length} na kulay`
            : `Other ${tail.length} accent colors`,
        hex: '#CFC5B4',
        symbol: '·',
        count: tailStitches,
        percentage: (tailStitches / totalStitches) * 100,
        skeinsNeeded: tailSkeins,
        isOther: true,
        groupedColorsCount: tail.length,
      },
    ];
  }, [sortedStats, showAllColors, canGroupLongTail, totalStitches, language]);

  const dominantSlice = useMemo(() => {
    if (sortedStats.length === 0) return null;
    const top = sortedStats[0];
    return {
      code: top.color.code,
      name: top.color.name,
      hex: top.color.hex,
      percentage: (top.count / totalStitches) * 100,
      count: top.count,
    };
  }, [sortedStats, totalStitches]);

  const spotlightSlice = useMemo<PieSliceDatum | null>(() => {
    if (hoveredId) {
      const found = slices.find((s) => s.id === hoveredId);
      if (found) return found;
    }
    if (activeColorFilter) {
      const foundInSlices = slices.find((s) => !s.isOther && s.code === activeColorFilter);
      if (foundInSlices) return foundInSlices;
      const foundInAll = sortedStats.find((s) => s.color.code === activeColorFilter);
      if (foundInAll) {
        return {
          id: foundInAll.color.code,
          code: foundInAll.color.code,
          name: foundInAll.color.name,
          hex: foundInAll.color.hex,
          symbol: foundInAll.color.symbol,
          count: foundInAll.count,
          percentage: (foundInAll.count / totalStitches) * 100,
          skeinsNeeded: foundInAll.skeinsNeeded,
        };
      }
    }
    return slices[0] || null;
  }, [hoveredId, activeColorFilter, slices, sortedStats, totalStitches]);

  // Build D3 Pie Chart SVG geometry whenever slices change
  useEffect(() => {
    if (!isExpanded || !svgRef.current) return;

    const svgEl = svgRef.current;
    const size = 280;
    const radius = 114;

    const svg = d3
      .select(svgEl)
      .attr('viewBox', `0 0 ${size} ${size}`)
      .attr('role', 'img');

    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${size / 2}, ${size / 2})`);

    // Subtle soft ambient ring behind the pie chart
    g.append('circle')
      .attr('r', radius + 4)
      .attr('fill', '#F4EFE6')
      .attr('stroke', '#E2D9C8')
      .attr('stroke-width', 1);

    const pieGenerator = d3
      .pie<PieSliceDatum>()
      .sort(null)
      .value((d) => d.count)
      .padAngle(0.008);

    const arcGenerator = d3
      .arc<d3.PieArcDatum<PieSliceDatum>>()
      .innerRadius(0)
      .outerRadius(radius);

    const labelArcGenerator = d3
      .arc<d3.PieArcDatum<PieSliceDatum>>()
      .innerRadius(radius * 0.52)
      .outerRadius(radius * 0.78);

    const pieData = pieGenerator(slices);

    const sliceGroups = g
      .selectAll<SVGGElement, d3.PieArcDatum<PieSliceDatum>>('g.pie-slice-group')
      .data(pieData, (d) => d.data.id)
      .join('g')
      .attr('class', 'pie-slice-group');

    sliceGroups
      .append('path')
      .attr('class', 'pie-slice-path')
      .attr('d', arcGenerator)
      .attr('fill', (d) => d.data.hex)
      .attr('stroke', '#FAF7F2')
      .attr('stroke-width', 1.5)
      .style('cursor', (d) => (d.data.isOther ? 'pointer' : onSelectColor ? 'pointer' : 'default'))
      .on('mouseenter', function (event: MouseEvent, d) {
        setHoveredId(d.data.id);
        if (chartContainerRef.current) {
          const rect = chartContainerRef.current.getBoundingClientRect();
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mousemove', function (event: MouseEvent) {
        if (chartContainerRef.current) {
          const rect = chartContainerRef.current.getBoundingClientRect();
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mouseleave', () => {
        setHoveredId(null);
        setTooltipPos(null);
      })
      .on('click', (_event: MouseEvent, d) => {
        if (d.data.isOther) {
          setShowAllColors(true);
          return;
        }
        if (onSelectColor) {
          onSelectColor(activeColorFilter === d.data.code ? null : d.data.code);
        }
      });

    // Percentage labels inside larger pie wedges (>= ~0.28 rad / ~4.5% share)
    sliceGroups
      .filter((d) => d.endAngle - d.startAngle >= 0.28)
      .append('text')
      .attr('class', 'pie-slice-label')
      .attr('transform', (d) => `translate(${labelArcGenerator.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .style('pointer-events', 'none')
      .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      .style('font-size', '10px')
      .style('font-weight', '700')
      .attr('fill', (d) => getContrastTextColor(d.data.hex))
      .text((d) => `${d.data.percentage.toFixed(0)}%`);
  }, [slices, isExpanded, activeColorFilter, onSelectColor]);

  // Smooth D3 transition when hovering or highlighting an active DMC color slice
  useEffect(() => {
    if (!isExpanded || !svgRef.current) return;

    const baseRadius = 114;
    const expandedRadius = 123;

    const baseArc = d3
      .arc<d3.PieArcDatum<PieSliceDatum>>()
      .innerRadius(0)
      .outerRadius(baseRadius);

    const expandedArc = d3
      .arc<d3.PieArcDatum<PieSliceDatum>>()
      .innerRadius(0)
      .outerRadius(expandedRadius);

    const svg = d3.select(svgRef.current);
    const focusId = hoveredId ?? activeColorFilter ?? null;

    svg
      .selectAll<SVGPathElement, d3.PieArcDatum<PieSliceDatum>>('path.pie-slice-path')
      .transition()
      .duration(160)
      .attr('d', (d) => {
        const isFocused =
          (hoveredId && d.data.id === hoveredId) ||
          (!hoveredId && activeColorFilter && !d.data.isOther && d.data.code === activeColorFilter);
        return (isFocused ? expandedArc(d) : baseArc(d)) || '';
      })
      .attr('opacity', (d) => {
        if (!focusId) return 1;
        const isFocused =
          (hoveredId && d.data.id === hoveredId) ||
          (!hoveredId && activeColorFilter && !d.data.isOther && d.data.code === activeColorFilter);
        return isFocused ? 1 : 0.42;
      })
      .attr('stroke', (d) => {
        const isFocused =
          (hoveredId && d.data.id === hoveredId) ||
          (!hoveredId && activeColorFilter && !d.data.isOther && d.data.code === activeColorFilter);
        return isFocused ? '#2C2523' : '#FAF7F2';
      })
      .attr('stroke-width', (d) => {
        const isFocused =
          (hoveredId && d.data.id === hoveredId) ||
          (!hoveredId && activeColorFilter && !d.data.isOther && d.data.code === activeColorFilter);
        return isFocused ? 2.2 : 1.5;
      });
  }, [hoveredId, activeColorFilter, isExpanded, slices]);

  if (sortedStats.length === 0) return null;

  const handleSelectOrInspect = (slice: PieSliceDatum) => {
    if (slice.isOther) {
      setShowAllColors(true);
      return;
    }
    if (onSelectColor) {
      onSelectColor(activeColorFilter === slice.code ? null : slice.code);
    }
  };

  return (
    <div className="bg-white border border-[#E8E1D5] rounded-xl p-5 space-y-4 shadow-2xs">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0ECE1] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] border border-[#E8E1D5] flex items-center justify-center text-[#B88E3C] shrink-0">
            <PieChartIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-lg text-[#2C2523] leading-snug">
              {language === 'fil'
                ? 'Distribusyon ng Kulay ng Sinulid (D3 Pie Chart)'
                : 'Thread Color Distribution (D3.js Pie Chart)'}
            </h4>
            <p className="text-[11px] text-[#7A6E65]">
              {language === 'fil'
                ? 'Visual na bahagi ng bawat DMC thread base sa kabuuang bilang ng tahi na kailangan.'
                : 'Visual breakdown of required stitch counts per DMC thread color across your pattern.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {dominantSlice && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#FAF7F2] border border-[#E8E1D5] text-[#2C2523]">
              <span
                className="w-2.5 h-2.5 rounded-xs border border-black/20 shrink-0"
                style={{ backgroundColor: dominantSlice.hex }}
              />
              <span>
                {language === 'fil' ? 'Pinakamarami:' : 'Top:'}{' '}
                <strong className="font-mono">DMC {dominantSlice.code}</strong>{' '}
                <span className="font-mono text-[#7A6E65]">({dominantSlice.percentage.toFixed(1)}%)</span>
              </span>
            </span>
          )}

          {canGroupLongTail && (
            <button
              type="button"
              onClick={() => setShowAllColors((prev) => !prev)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#FAF7F2] hover:bg-[#F0ECE1] border border-[#D7CBB9] text-[#2C2523] transition-colors cursor-pointer"
            >
              <Layers className="w-3 h-3 text-[#7A6E65]" />
              <span>
                {showAllColors
                  ? language === 'fil'
                    ? 'Igrupo ang Maliit (<Top 12)'
                    : 'Group Minor Colors'
                  : language === 'fil'
                  ? `Ipakita Lahat (${sortedStats.length})`
                  : `Show All (${sortedStats.length})`}
              </span>
            </button>
          )}

          {activeColorFilter && onSelectColor && (
            <button
              type="button"
              onClick={() => onSelectColor(null)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition-colors cursor-pointer"
            >
              <FilterX className="w-3 h-3" />
              <span>
                {language === 'fil'
                  ? `I-clear ang DMC ${activeColorFilter}`
                  : `Clear DMC ${activeColorFilter}`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg text-[#7A6E65] hover:text-[#2C2523] hover:bg-[#FAF7F2] border border-transparent hover:border-[#E8E1D5] transition-colors cursor-pointer"
            aria-label={isExpanded ? 'Collapse thread chart' : 'Expand thread chart'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: D3 SVG Pie Chart + Spotlight Readout */}
          <div className="lg:col-span-5 flex flex-col items-center gap-3">
            <div
              ref={chartContainerRef}
              className="relative w-full max-w-[280px] aspect-square flex items-center justify-center"
            >
              <svg
                ref={svgRef}
                className="w-full h-full overflow-visible drop-shadow-xs"
                aria-label={
                  language === 'fil'
                    ? 'Pie chart ng distribusyon ng kulay ng sinulid'
                    : 'Thread color distribution pie chart'
                }
              />

              {/* Floating D3 Hover Tooltip */}
              {hoveredId && tooltipPos && spotlightSlice && (
                <div
                  className="pointer-events-none absolute z-20 px-2.5 py-1.5 rounded-lg bg-[#2C2523]/95 text-[#FAF7F2] shadow-lg border border-[#E6C687]/40 text-[11px] whitespace-nowrap -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${Math.min(230, Math.max(50, tooltipPos.x))}px`,
                    top: `${Math.max(36, tooltipPos.y - 10)}px`,
                  }}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span
                      className="w-2.5 h-2.5 rounded-xs border border-white/30 shrink-0"
                      style={{ backgroundColor: spotlightSlice.hex }}
                    />
                    <span>
                      {spotlightSlice.isOther
                        ? spotlightSlice.name
                        : `DMC ${spotlightSlice.code} · ${spotlightSlice.name}`}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-[#E6C687] mt-0.5 tabular-nums">
                    {spotlightSlice.count.toLocaleString()}{' '}
                    {language === 'fil' ? 'tahi' : 'stitches'} ({spotlightSlice.percentage.toFixed(1)}%)
                  </div>
                </div>
              )}
            </div>

            {/* Active / Hovered Thread Spotlight Strip */}
            {spotlightSlice && (
              <div className="w-full p-3 rounded-lg bg-[#FAF7F2] border border-[#E8E1D5] flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-md border border-black/15 shadow-2xs shrink-0 flex items-center justify-center font-mono text-xs font-bold"
                    style={{
                      backgroundColor: spotlightSlice.hex,
                      color: getContrastTextColor(spotlightSlice.hex),
                    }}
                  >
                    {spotlightSlice.symbol}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#2C2523] truncate">
                      {spotlightSlice.isOther
                        ? spotlightSlice.name
                        : `DMC ${spotlightSlice.code} — ${spotlightSlice.name}`}
                    </div>
                    <div className="text-[11px] font-mono text-[#7A6E65] tabular-nums">
                      {spotlightSlice.count.toLocaleString()}{' '}
                      {language === 'fil' ? 'tahi' : 'stitches'} ·{' '}
                      {spotlightSlice.percentage.toFixed(1)}% · ~{spotlightSlice.skeinsNeeded}{' '}
                      {spotlightSlice.skeinsNeeded === 1
                        ? language === 'fil'
                          ? 'skein'
                          : 'skein'
                        : 'skeins'}
                    </div>
                  </div>
                </div>

                {onSelectColor && !spotlightSlice.isOther && (
                  <button
                    type="button"
                    onClick={() => handleSelectOrInspect(spotlightSlice)}
                    className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                      activeColorFilter === spotlightSlice.code
                        ? 'bg-[#2C2523] text-white border-[#2C2523]'
                        : 'bg-white text-[#2C2523] border-[#D7CBB9] hover:bg-[#F0ECE1]'
                    }`}
                    title={
                      language === 'fil'
                        ? 'I-highlight sa Stitch Viewer'
                        : 'Highlight this color in Stitch Viewer'
                    }
                  >
                    <Crosshair className="w-3 h-3 text-[#B88E3C]" />
                    <span>
                      {activeColorFilter === spotlightSlice.code
                        ? language === 'fil'
                          ? 'Naka-Filter'
                          : 'Filtered'
                        : language === 'fil'
                        ? 'I-highlight'
                        : 'Highlight'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: Scrollable Thread Share Breakdown List */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[#7A6E65] px-1">
              <span>
                {language === 'fil'
                  ? `Nakikita: ${slices.length} segment (${sortedStats.length} kabuuang kulay)`
                  : `Showing ${slices.length} slices (${sortedStats.length} total DMC colors)`}
              </span>
              <span className="font-mono tabular-nums font-semibold text-[#2C2523]">
                {totalStitches.toLocaleString()} {language === 'fil' ? 'kabuuang tahi' : 'total stitches'}
              </span>
            </div>

            <div className="max-h-[285px] overflow-y-auto pr-1 space-y-1.5">
              {slices.map((slice) => {
                const isSelected = !slice.isOther && activeColorFilter === slice.code;
                const isHovered = hoveredId === slice.id;

                return (
                  <button
                    key={slice.id}
                    type="button"
                    onMouseEnter={() => setHoveredId(slice.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => handleSelectOrInspect(slice)}
                    className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#2C2523] text-white border-[#2C2523] shadow-xs'
                        : isHovered
                        ? 'bg-[#FAF7F2] border-[#B88E3C] shadow-2xs'
                        : 'bg-[#FBF9F5] border-[#EBE4D8] hover:border-[#D7CBB9]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className="w-4 h-4 rounded-xs border border-black/20 shrink-0 flex items-center justify-center text-[9px] font-mono font-bold"
                        style={{
                          backgroundColor: slice.hex,
                          color: getContrastTextColor(slice.hex),
                        }}
                      >
                        {slice.symbol}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono text-xs font-bold shrink-0 ${
                              isSelected ? 'text-[#E6C687]' : 'text-[#2C2523]'
                            }`}
                          >
                            {slice.isOther ? `+${slice.groupedColorsCount}` : `DMC ${slice.code}`}
                          </span>
                          <span
                            className={`text-xs truncate ${
                              isSelected ? 'text-[#FAF7F2]' : 'text-[#5F554F]'
                            }`}
                          >
                            {slice.name}
                          </span>
                        </div>

                        {/* Proportional Stitch Bar */}
                        <div
                          className={`mt-1 w-full h-1.5 rounded-full overflow-hidden ${
                            isSelected ? 'bg-white/15' : 'bg-[#E8E1D5]'
                          }`}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(2, slice.percentage))}%`,
                              backgroundColor: isSelected ? '#E6C687' : slice.hex,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <div
                        className={`text-xs font-bold ${
                          isSelected ? 'text-white' : 'text-[#2C2523]'
                        }`}
                      >
                        {slice.count.toLocaleString()}
                        <span
                          className={`ml-1 text-[10px] font-normal ${
                            isSelected ? 'text-white/75' : 'text-[#8C8077]'
                          }`}
                        >
                          {language === 'fil' ? 'tahi' : 'sts'}
                        </span>
                      </div>
                      <div
                        className={`text-[10px] ${
                          isSelected ? 'text-[#E6C687]' : 'text-[#7A6E65]'
                        }`}
                      >
                        {slice.percentage.toFixed(1)}% · ~{slice.skeinsNeeded} sk
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
