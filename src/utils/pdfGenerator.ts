import { jsPDF } from 'jspdf';
import { calculateFabricSpecs } from './colorMatcher';
import { calculateBackstitchStats } from './outlineDetector';
import { loadAnnotations } from './annotationStorage';
import { PatternData, ProjectAnnotation } from '../types';

export interface PDFExportOptions {
  isPro: boolean;
  language?: 'en' | 'fil';
  pageSize?: 'a4' | 'letter';
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }
  return [217, 119, 6];
}

export async function generatePatternPdf(pattern: PatternData, options: PDFExportOptions): Promise<Blob> {
  const { isPro, language = 'en', pageSize = 'a4' } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: pageSize,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  const fabricSpecs = calculateFabricSpecs(pattern.width, pattern.height, pattern.fabricCount);
  const totalSkeins = pattern.colorStats.reduce((acc, c) => acc + c.skeinsNeeded, 0);

  // Helper for text formatting
  const primaryColor = [44, 37, 35] as [number, number, number];
  const goldColor = [184, 142, 60] as [number, number, number];
  const mutedColor = [120, 113, 108] as [number, number, number];

  // ==========================================
  // PAGE 1: HEIRLOOM COVER PAGE
  // ==========================================
  doc.setFillColor(250, 247, 242);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative border
  doc.setDrawColor(215, 203, 185);
  doc.setLineWidth(0.8);
  doc.rect(margin - 4, margin - 4, contentWidth + 8, contentHeight + 8);
  doc.setDrawColor(184, 142, 60);
  doc.setLineWidth(0.3);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, contentHeight + 4);

  let curY = margin + 12;

  // Kicker
  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(...goldColor);
  const kicker = language === 'fil' ? 'SOVEREIGN WEDDING & HEIRLOOM CROSS STITCH PATTERN' : 'SOVEREIGN WEDDING & HEIRLOOM CROSS STITCH PATTERN';
  doc.text(kicker, pageWidth / 2, curY, { align: 'center' });

  curY += 10;

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.text(pattern.title, pageWidth / 2, curY, { align: 'center' });

  curY += 8;

  // Couple & Date
  if (pattern.coupleNames || pattern.weddingDate) {
    doc.setFont('times', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(...mutedColor);
    const sub = [pattern.coupleNames, pattern.weddingDate].filter(Boolean).join('  ·  ');
    doc.text(sub, pageWidth / 2, curY, { align: 'center' });
  }

  curY += 12;

  // Center Preview Image
  try {
    const imgW = 100;
    const imgH = 100 * (pattern.height / pattern.width);
    const clampedImgH = Math.min(imgH, 85);
    const clampedImgW = clampedImgH * (pattern.width / pattern.height);
    const imgX = (pageWidth - clampedImgW) / 2;

    doc.addImage(pattern.previewUrl, 'PNG', imgX, curY, clampedImgW, clampedImgH);

    // Frame around preview
    doc.setDrawColor(184, 142, 60);
    doc.setLineWidth(0.5);
    doc.rect(imgX - 1.5, curY - 1.5, clampedImgW + 3, clampedImgH + 3);

    curY += clampedImgH + 14;
  } catch {
    curY += 20;
  }

  // Specifications Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(228, 222, 212);
  doc.roundedRect(margin, curY, contentWidth, 68, 3, 3, 'FD');

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text(language === 'fil' ? 'Mga Detalye ng Pattern & Aida Specs' : 'Pattern Specifications & Fabric Dimensions', margin + 6, curY + 8);

  doc.setDrawColor(235, 230, 220);
  doc.setLineWidth(0.3);
  doc.line(margin + 6, curY + 11, margin + contentWidth - 6, curY + 11);

  // Specs Columns
  const specs = [
    [
      { label: language === 'fil' ? 'Grid / Stitch Count' : 'Grid / Stitch Count', val: `${pattern.width} x ${pattern.height} stitches (${pattern.totalStitches.toLocaleString()} total)` },
      { label: language === 'fil' ? 'AIDA Cloth Count' : 'AIDA Fabric Count', val: `${pattern.fabricCount} Count Standard Aida` },
      { label: language === 'fil' ? 'Laki ng Natahi (Design Area)' : 'Finished Design Area', val: `${fabricSpecs.widthInches}" x ${fabricSpecs.heightInches}" (${fabricSpecs.widthCm} x ${fabricSpecs.heightCm} cm)` },
      { label: language === 'fil' ? 'Antas ng Hirap (Difficulty)' : 'Difficulty Rating', val: `${pattern.complexity?.tier || 'Intermediate'} (${pattern.complexity?.confettiPercentage ?? 18}% Confetti)` },
    ],
    [
      { label: language === 'fil' ? 'Gupit ng Tela (+3" allowance)' : 'Cut Fabric (+3" margin)', val: `${fabricSpecs.cutFabricInchesW}" x ${fabricSpecs.cutFabricInchesH}" inches` },
      { label: language === 'fil' ? 'Kabuuang Kulay ng DMC' : 'Total DMC Thread Palette', val: `${pattern.palette.length} Colors` },
      { label: language === 'fil' ? 'Tinatayang Skeins (2 strands)' : 'Estimated DMC Skeins', val: `${totalSkeins} Skeins (8m standard)` },
      { label: language === 'fil' ? 'Tantiya ng Proyekto (Timeline)' : 'Project Expectation', val: `${pattern.complexity?.estimatedMonths || '~3-6 Months'}` },
    ]
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let rowY = curY + 18;
  specs[0].forEach((item, idx) => {
    // Col 1
    doc.setTextColor(...mutedColor);
    doc.text(item.label, margin + 6, rowY + idx * 14);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(item.val, margin + 6, rowY + idx * 14 + 5);
    doc.setFont('helvetica', 'normal');

    // Col 2
    const item2 = specs[1][idx];
    doc.setTextColor(...mutedColor);
    doc.text(item2.label, margin + contentWidth / 2 + 4, rowY + idx * 14);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(item2.val, margin + contentWidth / 2 + 4, rowY + idx * 14 + 5);
    doc.setFont('helvetica', 'normal');
  });

  // Footer on cover
  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...mutedColor);
  const footerText = isPro
    ? '★ Sovereign Heirloom Commercial License Active · Unlimited Reproduction & Sales Permitted'
    : '⚠ FREE PREVIEW EDITION · UPGRADE TO PRO WEDDING LICENSE (₱499) FOR UNLIMITED MULTI-PAGE PRINTABLE CHARTS';
  doc.text(footerText, pageWidth / 2, pageHeight - margin + 2, { align: 'center' });

  // If Free and not pro, we render Page 1 and a 1-page sample grid with watermark
  // Determine chart tile slicing
  // Standard chart page: 55 stitches wide x 75 stitches tall per page
  const tileCols = Math.ceil(pattern.width / 50);
  const tileRows = Math.ceil(pattern.height / 70);
  const totalChartPages = isPro ? tileCols * tileRows : 1;

  // ==========================================
  // PAGE 2: DMC FLOSS LEGEND TABLE
  // ==========================================
  doc.addPage();
  doc.setFillColor(250, 247, 242);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  let tableY = margin + 8;
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.text(language === 'fil' ? 'Talaan ng DMC Threads & Simbolo' : 'DMC Thread Legend & Symbol Key', margin, tableY);

  tableY += 6;
  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(...mutedColor);
  doc.text(
    language === 'fil'
      ? `Gamitin ang 2 strands ng floss para sa cross-stitch sa ${pattern.fabricCount}-count Aida.`
      : `Use 2 strands of floss for full cross stitches on ${pattern.fabricCount}-count Aida.`,
    margin,
    tableY
  );

  tableY += 8;

  // Table header
  doc.setFillColor(238, 232, 222);
  doc.rect(margin, tableY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);

  doc.text('Sym', margin + 3, tableY + 5);
  doc.text('Color', margin + 14, tableY + 5);
  doc.text('DMC #', margin + 26, tableY + 5);
  doc.text('Description / Name', margin + 46, tableY + 5);
  doc.text('Stitches', margin + 120, tableY + 5, { align: 'right' });
  doc.text('Coverage', margin + 145, tableY + 5, { align: 'right' });
  doc.text('Skeins (8m)', margin + contentWidth - 4, tableY + 5, { align: 'right' });

  tableY += 7;

  // Rows
  const maxTableRowsPerPage = 34;
  let rowsOnCurrentPage = 0;

  pattern.colorStats.forEach((stat) => {
    if (rowsOnCurrentPage >= maxTableRowsPerPage) {
      doc.addPage();
      doc.setFillColor(250, 247, 242);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      tableY = margin + 10;
      rowsOnCurrentPage = 0;
    }

    const rowH = 6.5;
    if (rowsOnCurrentPage % 2 === 1) {
      doc.setFillColor(245, 242, 237);
      doc.rect(margin, tableY, contentWidth, rowH, 'F');
    }

    // Symbol Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(200, 190, 180);
    doc.rect(margin + 2.5, tableY + 1.2, 4.5, 4.5, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(stat.color.symbol, margin + 4.75, tableY + 4.7, { align: 'center' });

    // Color Swatch
    doc.setFillColor(stat.color.r, stat.color.g, stat.color.b);
    doc.rect(margin + 14, tableY + 1.2, 6, 4.5, 'F');
    doc.setDrawColor(180, 170, 160);
    doc.rect(margin + 14, tableY + 1.2, 6, 4.5, 'D');

    // DMC #
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text(stat.color.code, margin + 26, tableY + 4.5);

    // Name
    doc.setFont('helvetica', 'normal');
    doc.text(stat.color.name, margin + 46, tableY + 4.5);

    // Stitches
    doc.setFont('courier', 'bold');
    doc.text(stat.count.toLocaleString(), margin + 120, tableY + 4.5, { align: 'right' });

    // Coverage
    doc.setFont('helvetica', 'normal');
    doc.text(`${stat.percentage.toFixed(1)}%`, margin + 145, tableY + 4.5, { align: 'right' });

    // Skeins
    doc.setFont('helvetica', 'bold');
    doc.text(`${stat.skeinsNeeded} skein${stat.skeinsNeeded > 1 ? 's' : ''}`, margin + contentWidth - 4, tableY + 4.5, { align: 'right' });

    tableY += rowH;
    rowsOnCurrentPage += 1;
  });

  // Table summary
  tableY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text(
    `${language === 'fil' ? 'KABUUANG TAHI' : 'TOTAL STITCHES'}: ${pattern.totalStitches.toLocaleString()}  |  ${pattern.palette.length} DMC PALETTE COLORS  |  ${totalSkeins} TOTAL SKEINS`,
    margin,
    tableY + 4
  );

  // ==========================================
  // DEDICATED PAGE: PROJECT NOTES & TIPS (STICKY NOTES & ANNOTATIONS)
  // ==========================================
  const resolvedAnnotations: ProjectAnnotation[] =
    pattern.annotations !== undefined ? pattern.annotations : loadAnnotations(pattern.id);

  // Sort annotations cleanly by Chart Sheet -> Row -> Col for easy lookup while stitching
  const sortedAnnotations = [...resolvedAnnotations].sort((a, b) => {
    const sheetA = Math.floor(a.y / 70) * tileCols + Math.floor(a.x / 50);
    const sheetB = Math.floor(b.y / 70) * tileCols + Math.floor(b.x / 50);
    if (sheetA !== sheetB) return sheetA - sheetB;
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  const renderProjectNotesPageFrame = (isContinuation = false) => {
    doc.addPage();
    doc.setFillColor(250, 247, 242);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Decorative Heirloom Border
    doc.setDrawColor(215, 203, 185);
    doc.setLineWidth(0.6);
    doc.rect(margin - 2, margin - 2, contentWidth + 4, contentHeight + 4);
    doc.setDrawColor(184, 142, 60);
    doc.setLineWidth(0.25);
    doc.rect(margin - 0.8, margin - 0.8, contentWidth + 1.6, contentHeight + 1.6);

    let y = margin + 8;

    // Header Kicker
    doc.setFont('times', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(...goldColor);
    doc.text(
      language === 'fil'
        ? 'MGA TALA SA PANANAHI, STICKY NOTES AT COORDINATE TIPS'
        : 'STITCHING ANNOTATIONS, STICKY NOTES & COORDINATE TIPS',
      margin + 2,
      y
    );

    y += 6.5;

    // Title
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    const notesTitle = language === 'fil' ? 'Mga Tala at Payo sa Proyekto' : 'Project Notes & Tips';
    doc.text(
      isContinuation ? `${notesTitle} (${language === 'fil' ? 'Karugtong' : 'Continued'})` : notesTitle,
      margin + 2,
      y
    );

    y += 5;
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.text(
      language === 'fil'
        ? 'Pinagsama-samang listahan ng lahat ng Sticky Notes, special stitches, at coordinate tips para sa mabilisang sanggunian.'
        : 'Compiled summary of all Sticky Notes, technique markers, and grid coordinate tips from your interactive Stitch Viewer.',
      margin + 2,
      y
    );

    // Bottom page footer
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.text(
      `Page ${doc.getCurrentPageInfo().pageNumber} · Sovereign Cross Stitch Generator · ${notesTitle}`,
      pageWidth / 2,
      pageHeight - margin + 2,
      { align: 'center' }
    );

    return y + 7;
  };

  let notesY = renderProjectNotesPageFrame(false);

  // Summary Metrics Cards (4-column strip)
  const stickyNotesCount = sortedAnnotations.filter((a) => a.type === 'note').length;
  const labelsFlagsPinsCount = sortedAnnotations.filter((a) => a.type !== 'note').length;
  const activeNotesCount = sortedAnnotations.filter((a) => !a.resolved).length;
  const resolvedNotesCount = sortedAnnotations.filter((a) => a.resolved).length;

  const nCardW = (contentWidth - 9) / 4;
  const nCardH = 14;
  const noteCards = [
    {
      kicker: language === 'fil' ? 'KABUUANG TALA' : 'TOTAL ENTRIES',
      val: `${sortedAnnotations.length}`,
      sub: language === 'fil' ? 'Naka-attach sa grid' : 'Pinned on grid',
    },
    {
      kicker: language === 'fil' ? 'STICKY NOTES' : 'STICKY NOTES',
      val: `${stickyNotesCount}`,
      sub: language === 'fil' ? 'Tips & techniques' : 'Tips & techniques',
    },
    {
      kicker: language === 'fil' ? 'LABELS & FLAGS' : 'LABELS & FLAGS',
      val: `${labelsFlagsPinsCount}`,
      sub: language === 'fil' ? 'Markers sa chart' : 'Chart markers',
    },
    {
      kicker: language === 'fil' ? 'STATUS' : 'PROGRESS STATUS',
      val: `${activeNotesCount} ${language === 'fil' ? 'Aktibo' : 'Active'}`,
      sub: `${resolvedNotesCount} ${language === 'fil' ? 'Tapos na' : 'Resolved'}`,
    },
  ];

  noteCards.forEach((card, idx) => {
    const cx = margin + idx * (nCardW + 3);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx, notesY, nCardW, nCardH, 1.2, 1.2, 'F');
    doc.setDrawColor(220, 210, 195);
    doc.setLineWidth(0.22);
    doc.roundedRect(cx, notesY, nCardW, nCardH, 1.2, 1.2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...goldColor);
    doc.text(card.kicker, cx + 3, notesY + 4.2);

    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(card.val, cx + 3, notesY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...mutedColor);
    doc.text(card.sub, cx + 3, notesY + 12.2);
  });

  notesY += nCardH + 7;

  if (sortedAnnotations.length === 0) {
    // Clean Empty State & Stitcher Tips Box when no user Sticky Notes have been added yet
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, notesY, contentWidth, 34, 2, 2, 'F');
    doc.setDrawColor(220, 210, 195);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, notesY, contentWidth, 34, 2, 2, 'D');

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text(
      language === 'fil'
        ? 'Wala pang nailalagay na Sticky Note o Anotasyon sa Pattern na Ito'
        : 'No Custom Sticky Notes or Annotations Recorded Yet',
      pageWidth / 2,
      notesY + 12,
      { align: 'center' }
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...mutedColor);
    const emptyMsg =
      language === 'fil'
        ? 'Buksan ang Sticky Note mode sa Interactive Stitch Viewer at i-click ang anumang coordinate upang magdagdag ng tip, French knot, o paalala bago mag-export muli ng PDF.'
        : 'Enable Sticky Note mode in the interactive Stitch Viewer and click any grid coordinate to attach custom tips, thread lot reminders, or special stitches — they will appear here automatically.';
    const wrappedEmpty = doc.splitTextToSize(emptyMsg, contentWidth - 20);
    doc.text(wrappedEmpty, pageWidth / 2, notesY + 19, { align: 'center' });

    notesY += 42;
  } else {
    // Section List Header
    doc.setFillColor(238, 232, 222);
    doc.rect(margin, notesY, contentWidth, 6.5, 'F');
    doc.setDrawColor(215, 203, 185);
    doc.setLineWidth(0.2);
    doc.rect(margin, notesY, contentWidth, 6.5, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...primaryColor);
    doc.text('#', margin + 3, notesY + 4.4);
    doc.text(language === 'fil' ? 'Uri at Lokasyon' : 'Type & Coordinate', margin + 10, notesY + 4.4);
    doc.text(language === 'fil' ? 'Sinulid (DMC)' : 'Thread (DMC)', margin + 62, notesY + 4.4);
    doc.text(language === 'fil' ? 'Tala, Tip o Tagubilin' : 'Sticky Note / Stitching Tip', margin + 92, notesY + 4.4);
    doc.text(language === 'fil' ? 'Status' : 'Status', margin + contentWidth - 3, notesY + 4.4, { align: 'right' });

    notesY += 8;

    sortedAnnotations.forEach((ann, idx) => {
      const [r, g, b] = hexToRgb(ann.color || '#D97706');
      const lText = (ann.text || '').toLowerCase();
      const typeLabel =
        ann.type === 'label'
          ? 'GRID LABEL'
          : ann.type === 'flag'
          ? 'FLAG'
          : ann.type === 'marker'
          ? 'PIN MARKER'
          : lText.includes('knot') || lText.includes('french')
          ? 'FRENCH KNOT'
          : lText.includes('half') || lText.includes('½')
          ? 'HALF-STITCH'
          : 'STICKY NOTE';

      const sheetR = Math.floor(ann.y / 70) + 1;
      const sheetC = Math.floor(ann.x / 50) + 1;
      const sheetNum = (sheetR - 1) * tileCols + sheetC;

      // Underlying DMC thread info at coordinate
      const cellRow = pattern.grid[ann.y];
      const cellData = cellRow ? cellRow[ann.x] : undefined;
      const cellColor = cellData ? pattern.palette[cellData.colorIndex] : undefined;

      // Wrap full note text across column width
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const noteTextWidth = contentWidth - 110;
      const wrappedNote = doc.splitTextToSize(ann.text || '', noteTextWidth);
      const textLinesCount = Math.max(1, wrappedNote.length);
      const cardH = Math.max(13.5, 5.5 + textLinesCount * 3.8);

      // Pagination check
      if (notesY + cardH > pageHeight - margin - 10) {
        notesY = renderProjectNotesPageFrame(true);
      }

      // Card container
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, notesY, contentWidth, cardH, 1.2, 1.2, 'F');
      doc.setDrawColor(225, 217, 204);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, notesY, contentWidth, cardH, 1.2, 1.2, 'D');

      // Left color accent bar matching user's sticky note color
      doc.setFillColor(r, g, b);
      doc.rect(margin, notesY, 2.2, cardH, 'F');

      // Index number
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...mutedColor);
      doc.text(`${idx + 1}.`, margin + 4, notesY + 5);

      // Type badge & Coordinate
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(r, g, b);
      doc.text(typeLabel, margin + 10, notesY + 4.8);

      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...primaryColor);
      doc.text(`Col ${ann.x + 1}, Row ${ann.y + 1}`, margin + 10, notesY + 9);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...mutedColor);
      doc.text(`Sheet ${sheetNum} (R${sheetR}, C${sheetC})`, margin + 10, notesY + 12.2);

      // Underlying DMC Color & Symbol
      if (cellColor) {
        doc.setFillColor(cellColor.r, cellColor.g, cellColor.b);
        doc.rect(margin + 62, notesY + 2.6, 4.2, 4.2, 'F');
        doc.setDrawColor(160, 150, 140);
        doc.setLineWidth(0.15);
        doc.rect(margin + 62, notesY + 2.6, 4.2, 4.2, 'D');

        doc.setFont('courier', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...primaryColor);
        doc.text(`DMC ${cellColor.code}`, margin + 67.5, notesY + 5.7);

        doc.setFont('times', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...mutedColor);
        doc.text(`Sym: ${cellColor.symbol}`, margin + 62, notesY + 10.2);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...mutedColor);
        doc.text('—', margin + 62, notesY + 6);
      }

      // Full Wrapped Note Text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(35, 30, 28);
      doc.text(wrappedNote, margin + 92, notesY + 5.2);

      // Status Pill
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      if (ann.resolved) {
        doc.setTextColor(16, 150, 100);
        doc.text(language === 'fil' ? '✓ Tapos na' : '✓ Resolved', margin + contentWidth - 3, notesY + 5.2, {
          align: 'right',
        });
      } else {
        doc.setTextColor(184, 142, 60);
        doc.text(language === 'fil' ? '● Aktibo' : '● Active', margin + contentWidth - 3, notesY + 5.2, {
          align: 'right',
        });
      }

      notesY += cardH + 2.2;
    });
  }

  // General Stitching Tips & Workshop Margin Box at bottom if space permits
  if (notesY + 34 <= pageHeight - margin - 10) {
    notesY += 4;
    doc.setFillColor(253, 250, 244);
    doc.roundedRect(margin, notesY, contentWidth, 28, 1.5, 1.5, 'F');
    doc.setDrawColor(215, 203, 185);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, notesY, contentWidth, 28, 1.5, 1.5, 'D');

    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...goldColor);
    doc.text(
      language === 'fil'
        ? 'MGA GABAY SA PAGSISIMULA AT HANDWRITTEN WORKSHOP NOTES'
        : 'STITCHER CHECKLIST & HANDWRITTEN WORKSHOP NOTES',
      margin + 4,
      notesY + 5.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 70, 60);
    doc.text(
      language === 'fil'
        ? `• Magsimula sa pulang center crosshairs (Col ${Math.floor(pattern.width / 2) + 1}, Row ${Math.floor(pattern.height / 2) + 1}) at i-highlight ang 10×10 grid lines sa bawat sheet.`
        : `• Begin at the red center crosshairs (Col ${Math.floor(pattern.width / 2) + 1}, Row ${Math.floor(pattern.height / 2) + 1}) and keep dye lots consistent across skeins.`,
      margin + 4,
      notesY + 11
    );

    // Subtle ruled lines for handwritten notes on printed booklet
    doc.setDrawColor(228, 220, 208);
    doc.setLineWidth(0.2);
    doc.line(margin + 4, notesY + 17.5, margin + contentWidth - 4, notesY + 17.5);
    doc.line(margin + 4, notesY + 23.5, margin + contentWidth - 4, notesY + 23.5);
  }

  // ==========================================
  // PAGE: DEDICATED BACKSTITCH & CONTOUR GUIDE
  // ==========================================
  if (pattern.backstitches && pattern.backstitches.length > 0) {
    const bsStats = calculateBackstitchStats(pattern.backstitches, pattern.fabricCount);

    doc.addPage();
    doc.setFillColor(250, 247, 242);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Decorative Heirloom Border
    doc.setDrawColor(215, 203, 185);
    doc.setLineWidth(0.6);
    doc.rect(margin - 2, margin - 2, contentWidth + 4, contentHeight + 4);

    let curY = margin + 8;

    // Header Kicker
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...goldColor);
    doc.text(
      language === 'fil'
        ? 'HEIRLOOM DECORATIVE CONTOUR & OUTLINE SPECIFICATION'
        : 'HEIRLOOM DECORATIVE CONTOUR & OUTLINE SPECIFICATION',
      margin,
      curY
    );

    curY += 6;

    // Page Title
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text(
      language === 'fil'
        ? 'GABAY SA PAG-BACKSTITCH AT DECORATIVE OUTLINES'
        : 'BACKSTITCH SPECIFICATION & CONTOUR GUIDE',
      margin,
      curY
    );

    curY += 5;

    // Subtitle
    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...mutedColor);
    doc.text(
      language === 'fil'
        ? 'Mga tiyak na tagubilin para sa balangkas ng silhouette, bridal monograms, at palamuting hangganan.'
        : 'Definitive needlework guide for silhouette outlines, facial contours, script lettering, and decorative borders.',
      margin,
      curY
    );

    curY += 7;

    // Summary Metric Cards Strip (4 columns)
    const cardW = (contentWidth - 9) / 4;
    const cardH = 14;

    const summaryCards = [
      {
        title: language === 'fil' ? 'TOTAL OUTLINES' : 'TOTAL OUTLINES',
        val: `${bsStats.totalSegments} Stitches`,
        sub: `${bsStats.totalStitchesLength} Units`,
      },
      {
        title: language === 'fil' ? 'THREAD LENGTH' : 'THREAD LENGTH',
        val: `${bsStats.lengthCm} cm`,
        sub: `${bsStats.lengthInches} inches`,
      },
      {
        title: language === 'fil' ? 'DMC COLORS' : 'DMC COLORS',
        val: `${bsStats.flossBreakdown.length} Shades`,
        sub: 'Backstitch Floss',
      },
      {
        title: language === 'fil' ? 'EST. SKEINS' : 'EST. SKEINS',
        val: `~${bsStats.flossBreakdown.reduce((s, f) => s + f.skeinsEstimated, 0)} Skein(s)`,
        sub: '8m 6-Strand',
      },
    ];

    summaryCards.forEach((card, idx) => {
      const cx = margin + idx * (cardW + 3);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cx, curY, cardW, cardH, 1.2, 1.2, 'F');
      doc.setDrawColor(220, 210, 195);
      doc.setLineWidth(0.2);
      doc.roundedRect(cx, curY, cardW, cardH, 1.2, 1.2, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...goldColor);
      doc.text(card.title, cx + 3, curY + 4);

      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text(card.val, cx + 3, curY + 8.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...mutedColor);
      doc.text(card.sub, cx + 3, curY + 12);
    });

    curY += cardH + 7;

    // ==========================================
    // BACKSTITCH FLOSS KEY TABLE
    // ==========================================
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(
      language === 'fil'
        ? 'TALAAN NG SINULID PARA SA BACKSTITCH (FLOSS KEY)'
        : 'BACKSTITCH FLOSS KEY & SPECIFICATION TABLE',
      margin,
      curY
    );

    curY += 4.5;

    // Table Header
    doc.setFillColor(238, 232, 222);
    doc.rect(margin, curY, contentWidth, 5.5, 'F');
    doc.setDrawColor(215, 203, 185);
    doc.setLineWidth(0.2);
    doc.rect(margin, curY, contentWidth, 5.5, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...primaryColor);
    doc.text('Color / Swatch', margin + 3, curY + 3.8);
    doc.text('DMC Code & Description', margin + 28, curY + 3.8);
    doc.text('Strands', margin + 82, curY + 3.8);
    doc.text('Line Weight / Style', margin + 105, curY + 3.8);
    doc.text('Segments', margin + 140, curY + 3.8);
    doc.text('Thread Length', margin + contentWidth - 4, curY + 3.8, { align: 'right' });

    curY += 5.5;

    bsStats.flossBreakdown.forEach((item, fIdx) => {
      const rowH = 6.2;
      if (fIdx % 2 === 1) {
        doc.setFillColor(246, 243, 238);
        doc.rect(margin, curY, contentWidth, rowH, 'F');
      }

      const [r, g, b] = hexToRgb(item.colorHex);

      // Swatch
      doc.setFillColor(r, g, b);
      doc.rect(margin + 3, curY + 1.2, 5, 3.8, 'F');
      doc.setDrawColor(44, 37, 35);
      doc.setLineWidth(0.15);
      doc.rect(margin + 3, curY + 1.2, 5, 3.8, 'D');

      // DMC Code & Name
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...primaryColor);
      doc.text(`DMC ${item.dmcCode}`, margin + 12, curY + 4.2);

      // Strands badge
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(item.strands === 2 ? 184 : 44, item.strands === 2 ? 142 : 37, item.strands === 2 ? 60 : 35);
      doc.text(
        item.strands === 1 ? '1 Strand (Fine)' : '2 Strands (Bold)',
        margin + 82,
        curY + 4.2
      );

      // Line style preview stroke
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(item.strands === 2 ? 0.75 : 0.4);
      doc.line(margin + 105, curY + 3.2, margin + 130, curY + 3.2);
      doc.setFillColor(r, g, b);
      doc.circle(margin + 105, curY + 3.2, 0.4, 'F');
      doc.circle(margin + 130, curY + 3.2, 0.4, 'F');

      // Segments
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...primaryColor);
      doc.text(`${item.segmentCount} stitches`, margin + 140, curY + 4.2);

      // Length
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.text(`${item.lengthCm} cm (~${item.skeinsEstimated} sk)`, margin + contentWidth - 4, curY + 4.2, { align: 'right' });

      curY += rowH;
    });

    curY += 7;

    // ==========================================
    // NEEDLEWORK TECHNIQUE & INSTRUCTIONS CARD
    // ==========================================
    doc.setFillColor(255, 255, 255);
    const techBoxH = 50;
    doc.roundedRect(margin, curY, contentWidth, techBoxH, 1.5, 1.5, 'F');
    doc.setDrawColor(215, 203, 185);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, curY, contentWidth, techBoxH, 1.5, 1.5, 'D');

    // Section title
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...goldColor);
    doc.text(
      language === 'fil'
        ? 'MGA TAGUBILIN SA WASTONG PAGTATAHI NG BACKSTITCH (TECHNIQUE GUIDE)'
        : 'HEIRLOOM BACKSTITCHING TECHNIQUE & NEEDLE GUIDE',
      margin + 4,
      curY + 5.5
    );

    let stepY = curY + 11;
    const steps = [
      {
        num: '1',
        title: language === 'fil' ? 'Kailan Dapat Tahiin:' : 'Sequence of Work:',
        desc:
          language === 'fil'
            ? 'Palaging tapusin muna ang lahat ng cross-stitches sa isang bahagi bago simulan ang backstitch. Huwag magtahi ng cross-stitch sa ibabaw ng backstitch.'
            : 'Always complete cross-stitches for the section first before adding backstitch lines, ensuring outlines rest cleanly on top of the stitched surface.',
      },
      {
        num: '2',
        title: language === 'fil' ? 'Tamang Karayom:' : 'Recommended Needles:',
        desc:
          language === 'fil'
            ? 'Gumamit ng blunt tapestry needle #26 o #28 para sa aida grid lines. Kung kinakailangang tumagos sa gitna ng telang aida, gumamit ng matulis na crewel needle #9.'
            : 'Use a tapestry needle size 26 or 28 with a blunt tip to glide easily between fabric holes; use a sharp crewel needle size 9 when piercing fabric threads.',
      },
      {
        num: '3',
        title: language === 'fil' ? 'Galaw ng Karayom (B -> A):' : 'Stitch Direction (Point B to A):',
        desc:
          language === 'fil'
            ? 'Itaas ang karayom sa unahang butas (Point B), at ibaba pabalik sa naunang butas (Point A). Pagkatapos, itaas sa Point C at ibaba sa Point B.'
            : 'Bring the needle up at the forward point (B), take it backward into the previous hole (A). Then advance forward to point (C) and back down into point (B).',
      },
      {
        num: '4',
        title: language === 'fil' ? 'Pantay na Hatak (Tension):' : 'Even Thread Tension:',
        desc:
          language === 'fil'
            ? 'Panatilihing magaan at pantay ang hatak ng sinulid upang hindi kumunot ang aida o mabunot ang katabing tahi.'
            : 'Maintain light, consistent tension so straight and diagonal outlines lie flush against the cloth without pulling or distorting adjacent cross-stitches.',
      },
    ];

    steps.forEach((step) => {
      // Step badge
      doc.setFillColor(184, 142, 60);
      doc.circle(margin + 7, stepY - 0.8, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text(step.num, margin + 7, stepY + 0.5, { align: 'center' });

      // Title & Desc
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...primaryColor);
      doc.text(step.title, margin + 11, stepY);

      const titleWidth = doc.getTextWidth(step.title);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(80, 70, 60);
      const wrappedDesc = doc.splitTextToSize(step.desc, contentWidth - 16 - titleWidth);
      doc.text(wrappedDesc, margin + 12 + titleWidth, stepY);

      stepY += 8.8;
    });

    curY += techBoxH + 6;

    // Bottom Footer for Backstitch Guide page
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.text(
      `Sovereign Cross Stitch Generator · Backstitch Specification Guide · ${pattern.title}`,
      pageWidth / 2,
      pageHeight - margin + 2,
      { align: 'center' }
    );
  }

  // ==========================================
  // PAGES 3+: MULTI-PAGE STITCH CHARTS
  // ==========================================
  // Slice into 50 x 70 stitch tiles
  const tileW = 50;
  const tileH = 70;

  let pageIndex = 1;
  for (let r = 0; r < tileRows; r++) {
    for (let c = 0; c < tileCols; c++) {
      if (!isPro && pageIndex > 1) {
        break; // Free tier only generates 1 sample chart page
      }

      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      const startX = c * tileW;
      const endX = Math.min(pattern.width, startX + tileW);
      const startY = r * tileH;
      const endY = Math.min(pattern.height, startY + tileH);

      const stitchesW = endX - startX;
      const stitchesH = endY - startY;

      // Header of Chart Sheet
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text(
        `${pattern.title}  —  Sheet ${pageIndex} of ${totalChartPages} (Row ${r + 1}, Col ${c + 1})`,
        margin,
        margin + 4
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...mutedColor);
      doc.text(
        `Stitches: Col ${startX + 1}–${endX} / Row ${startY + 1}–${endY} · 10x10 Bold Grid`,
        pageWidth - margin,
        margin + 4,
        { align: 'right' }
      );

      // Draw Grid
      const gridOriginX = margin + 6;
      const gridOriginY = margin + 12;
      const availableGridW = contentWidth - 12;
      const cellSize = Math.min(availableGridW / tileW, 4.2);

      const actualGridW = stitchesW * cellSize;
      const actualGridH = stitchesH * cellSize;

      // Coordinate numbers along Top
      doc.setFont('courier', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 100, 100);
      for (let x = 0; x < stitchesW; x++) {
        const absX = startX + x + 1;
        if (absX % 10 === 0 || absX === 1) {
          doc.text(absX.toString(), gridOriginX + x * cellSize + cellSize / 2, gridOriginY - 2, { align: 'center' });
        }
      }

      // Coordinate numbers along Left
      for (let y = 0; y < stitchesH; y++) {
        const absY = startY + y + 1;
        if (absY % 10 === 0 || absY === 1) {
          doc.text(absY.toString(), gridOriginX - 2, gridOriginY + y * cellSize + cellSize / 2 + 1, { align: 'right' });
        }
      }

      // Render cells
      doc.setFont('times', 'bold');
      doc.setFontSize(cellSize > 3.5 ? 7 : 5.5);

      for (let y = 0; y < stitchesH; y++) {
        const curRow = startY + y;
        for (let x = 0; x < stitchesW; x++) {
          const curCol = startX + x;
          const cell = pattern.grid[curRow][curCol];
          const color = pattern.palette[cell.colorIndex] || pattern.palette[0];

          const cellX = gridOriginX + x * cellSize;
          const cellY = gridOriginY + y * cellSize;

          // Light tinted background for readability
          doc.setFillColor(
            Math.floor(255 - (255 - color.r) * 0.18),
            Math.floor(255 - (255 - color.g) * 0.18),
            Math.floor(255 - (255 - color.b) * 0.18)
          );
          doc.rect(cellX, cellY, cellSize, cellSize, 'F');

          // Draw symbol
          doc.setTextColor(30, 30, 30);
          doc.text(color.symbol, cellX + cellSize / 2, cellY + cellSize * 0.72, { align: 'center' });
        }
      }

      // Draw Grid Lines: Thin for 1x1, Bold for 10x10
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.12);
      for (let x = 0; x <= stitchesW; x++) {
        doc.line(gridOriginX + x * cellSize, gridOriginY, gridOriginX + x * cellSize, gridOriginY + actualGridH);
      }
      for (let y = 0; y <= stitchesH; y++) {
        doc.line(gridOriginX, gridOriginY + y * cellSize, gridOriginX + actualGridW, gridOriginY + y * cellSize);
      }

      // Bold 10x10 lines
      doc.setDrawColor(80, 80, 80);
      doc.setLineWidth(0.4);
      for (let x = 0; x <= stitchesW; x++) {
        const absX = startX + x;
        if (absX % 10 === 0) {
          doc.line(gridOriginX + x * cellSize, gridOriginY, gridOriginX + x * cellSize, gridOriginY + actualGridH);
        }
      }
      for (let y = 0; y <= stitchesH; y++) {
        const absY = startY + y;
        if (absY % 10 === 0) {
          doc.line(gridOriginX, gridOriginY + y * cellSize, gridOriginX + actualGridW, gridOriginY + y * cellSize);
        }
      }

      // Center mark indicators (if center crosses this tile)
      const midX = Math.floor(pattern.width / 2);
      const midY = Math.floor(pattern.height / 2);

      if (midX >= startX && midX < endX) {
        const cx = gridOriginX + (midX - startX) * cellSize + cellSize / 2;
        doc.setFillColor(220, 30, 30);
        // Top triangle arrow pointing down
        doc.triangle(cx - 1.5, gridOriginY - 4, cx + 1.5, gridOriginY - 4, cx, gridOriginY - 1, 'F');
        // Bottom triangle arrow pointing up
        doc.triangle(cx - 1.5, gridOriginY + actualGridH + 4, cx + 1.5, gridOriginY + actualGridH + 4, cx, gridOriginY + actualGridH + 1, 'F');
      }

      if (midY >= startY && midY < endY) {
        const cy = gridOriginY + (midY - startY) * cellSize + cellSize / 2;
        doc.setFillColor(220, 30, 30);
        // Left triangle arrow pointing right
        doc.triangle(gridOriginX - 4, cy - 1.5, gridOriginX - 4, cy + 1.5, gridOriginX - 1, cy, 'F');
        // Right triangle arrow pointing left
        doc.triangle(gridOriginX + actualGridW + 4, cy - 1.5, gridOriginX + actualGridW + 4, cy + 1.5, gridOriginX + actualGridW + 1, cy, 'F');
      }

      // Render Decorative Backstitch Outlines onto this chart sheet
      if (pattern.backstitches && pattern.backstitches.length > 0) {
        const sheetBackstitches = pattern.backstitches.filter(
          (bs) =>
            Math.max(bs.x1, bs.x2) >= startX &&
            Math.min(bs.x1, bs.x2) <= endX &&
            Math.max(bs.y1, bs.y2) >= startY &&
            Math.min(bs.y1, bs.y2) <= endY
        );

        sheetBackstitches.forEach((bs) => {
          const [r, g, b] = hexToRgb(bs.color || '#1A1615');
          const p1x = gridOriginX + (bs.x1 - startX) * cellSize;
          const p1y = gridOriginY + (bs.y1 - startY) * cellSize;
          const p2x = gridOriginX + (bs.x2 - startX) * cellSize;
          const p2y = gridOriginY + (bs.y2 - startY) * cellSize;

          doc.setDrawColor(r, g, b);
          doc.setLineWidth(bs.strands === 2 ? 0.65 : 0.42);
          doc.line(p1x, p1y, p2x, p2y);

          // Endpoint puncture dots
          doc.setFillColor(r, g, b);
          doc.circle(p1x, p1y, 0.22, 'F');
          doc.circle(p2x, p2y, 0.22, 'F');
        });
      }

      // Render Custom Annotations & Text Labels onto this chart sheet
      const sheetAnnotations = (pattern.annotations || []).filter(
        (ann) => ann.x >= startX && ann.x < endX && ann.y >= startY && ann.y < endY
      );

      if (sheetAnnotations.length > 0) {
        sheetAnnotations.forEach((ann) => {
          const ax = gridOriginX + (ann.x - startX) * cellSize;
          const ay = gridOriginY + (ann.y - startY) * cellSize;
          const cx = ax + cellSize / 2;
          const cy = ay + cellSize / 2;
          const [r, g, b] = hexToRgb(ann.color || '#D97706');

          if (ann.type === 'label') {
            // Prominent border highlight on cell
            doc.setDrawColor(r, g, b);
            doc.setLineWidth(0.5);
            doc.rect(ax, ay, cellSize, cellSize, 'D');

            // Small dot in center of cell
            doc.setFillColor(r, g, b);
            doc.circle(cx, cy, Math.min(0.9, cellSize * 0.25), 'F');

            // Label callout badge
            const labelText = ann.text.length > 22 ? ann.text.substring(0, 20) + '..' : ann.text;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5);

            const textW = doc.getTextWidth(labelText);
            const badgeW = textW + 3.5;
            const badgeH = 3.6;

            let badgeX = cx - badgeW / 2;
            let badgeY = ay - badgeH - 1.5;
            if (badgeY < gridOriginY) {
              badgeY = ay + cellSize + 1.5;
            }
            badgeX = Math.max(gridOriginX, Math.min(gridOriginX + actualGridW - badgeW, badgeX));

            // Pointer line
            doc.setDrawColor(r, g, b);
            doc.setLineWidth(0.25);
            if (badgeY < ay) {
              doc.line(cx, badgeY + badgeH, cx, ay);
            } else {
              doc.line(cx, badgeY, cx, ay + cellSize);
            }

            // Badge Background
            doc.setFillColor(r, g, b);
            doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 0.8, 0.8, 'F');
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.15);
            doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 0.8, 0.8, 'D');

            // Text
            doc.setTextColor(255, 255, 255);
            doc.text(labelText, badgeX + 1.8, badgeY + badgeH * 0.72);
          } else if (ann.type === 'flag') {
            // Flag pole
            doc.setDrawColor(44, 37, 35);
            doc.setLineWidth(0.35);
            doc.line(ax + 0.6, ay + cellSize, ax + 0.6, ay - 2);

            // Flag triangle
            doc.setFillColor(r, g, b);
            doc.triangle(ax + 0.6, ay - 2, ax + 3.5, ay - 0.5, ax + 0.6, ay + 1, 'F');

            // Cell border
            doc.setDrawColor(r, g, b);
            doc.setLineWidth(0.4);
            doc.rect(ax, ay, cellSize, cellSize, 'D');
          } else if (ann.type === 'note') {
            const lowerText = ann.text.toLowerCase();
            const isFrenchKnot = lowerText.includes('knot') || lowerText.includes('french');
            const isHalfStitch = lowerText.includes('half') || lowerText.includes('½');

            if (isFrenchKnot) {
              // French Knot indicator: Concentric knot ring & bead core with 'FK' badge
              doc.setFillColor(r, g, b);
              doc.circle(cx, cy, Math.min(1.5, cellSize * 0.35), 'F');
              doc.setDrawColor(255, 255, 255);
              doc.setLineWidth(0.3);
              doc.circle(cx, cy, Math.min(1.5, cellSize * 0.35), 'D');
              doc.setFillColor(255, 255, 255);
              doc.circle(cx, cy, Math.min(0.5, cellSize * 0.12), 'F');

              // Small badge tag 'FK' at corner
              doc.setFillColor(44, 37, 35);
              doc.rect(ax + cellSize - 2.8, ay - 1.2, 3.2, 2.2, 'F');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(3.8);
              doc.setTextColor(255, 255, 255);
              doc.text('FK', ax + cellSize - 1.2, ay + 0.4, { align: 'center' });
            } else if (isHalfStitch) {
              // Half-Stitch indicator: Bold diagonal slash & '½' badge
              doc.setDrawColor(r, g, b);
              doc.setLineWidth(0.7);
              doc.line(ax + 0.6, ay + cellSize - 0.6, ax + cellSize - 0.6, ay + 0.6);

              // Small badge tag '½' at corner
              doc.setFillColor(184, 142, 60);
              doc.rect(ax + cellSize - 2.8, ay - 1.2, 3.2, 2.2, 'F');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(4.0);
              doc.setTextColor(255, 255, 255);
              doc.text('½', ax + cellSize - 1.2, ay + 0.4, { align: 'center' });
            } else {
              // Sticky Note badge
              doc.setFillColor(r, g, b);
              doc.rect(ax - 0.4, ay - 0.4, cellSize + 0.8, cellSize + 0.8, 'F');
              doc.setFillColor(255, 255, 255);
              doc.triangle(ax + cellSize + 0.4, ay - 0.4, ax + cellSize - 1, ay - 0.4, ax + cellSize + 0.4, ay + 1, 'F');

              // Re-render symbol in white on top of note
              const cell = pattern.grid[ann.y][ann.x];
              const color = pattern.palette[cell.colorIndex] || pattern.palette[0];
              doc.setFont('times', 'bold');
              doc.setFontSize(cellSize > 3.5 ? 6.5 : 5);
              doc.setTextColor(255, 255, 255);
              doc.text(color.symbol, ax + cellSize / 2, ay + cellSize * 0.72, { align: 'center' });
            }
          } else {
            // Pin marker
            doc.setFillColor(r, g, b);
            doc.circle(cx, cy, Math.min(1.4, cellSize * 0.35), 'F');
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.25);
            doc.circle(cx, cy, Math.min(1.4, cellSize * 0.35), 'D');
            doc.setFillColor(255, 255, 255);
            doc.circle(cx, cy, Math.min(0.5, cellSize * 0.12), 'F');
          }
        });

        // Bottom key strip on the chart sheet for annotations on this sheet
        const sheetAnnList = sheetAnnotations
          .slice(0, 4)
          .map((a) => {
            const lText = a.text.toLowerCase();
            const tag = lText.includes('knot') || lText.includes('french')
              ? '[FRENCH KNOT]'
              : lText.includes('half') || lText.includes('½')
              ? '[HALF-STITCH]'
              : a.type === 'label'
              ? '[LABEL]'
              : a.type === 'flag'
              ? '[FLAG]'
              : '[NOTE]';
            return `${tag} Col ${a.x + 1}, Row ${a.y + 1}: "${a.text.length > 24 ? a.text.slice(0, 22) + '..' : a.text}"`;
          })
          .join('   |   ');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(90, 70, 50);
        doc.setFillColor(253, 250, 245);
        doc.roundedRect(gridOriginX, gridOriginY + actualGridH + 6, actualGridW, 4.5, 0.8, 0.8, 'F');
        doc.setDrawColor(220, 210, 195);
        doc.setLineWidth(0.2);
        doc.roundedRect(gridOriginX, gridOriginY + actualGridH + 6, actualGridW, 4.5, 0.8, 0.8, 'D');
        doc.text(sheetAnnList, gridOriginX + 2.5, gridOriginY + actualGridH + 9.2);
      }

      // Free Tier Watermark
      if (!isPro) {
        doc.saveGraphicsState();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(28);
        doc.setTextColor(200, 50, 50);
        // Angle watermark
        doc.text(
          'SAMPLE PREVIEW ONLY · PRO UPGRADE REQUIRED',
          pageWidth / 2,
          pageHeight / 2,
          { align: 'center', angle: 45 }
        );
        doc.setFontSize(14);
        doc.text(
          'Unlock full multi-page booklet & DMC legend for ₱499',
          pageWidth / 2,
          pageHeight / 2 + 12,
          { align: 'center', angle: 45 }
        );
        doc.restoreGraphicsState();
      }

      // Bottom footer of each page
      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...mutedColor);
      doc.text(
        `Page ${doc.getCurrentPageInfo().pageNumber} · Sovereign Cross Stitch Generator · Sheet ${pageIndex} of ${totalChartPages}`,
        pageWidth / 2,
        pageHeight - margin + 2,
        { align: 'center' }
      );

      pageIndex++;
    }
  }

  return doc.output('blob');
}
