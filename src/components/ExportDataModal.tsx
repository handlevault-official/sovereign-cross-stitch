import React, { useState, useMemo } from 'react';
import {
  X,
  FileCode2,
  Table,
  ListOrdered,
  ShoppingBag,
  Download,
  Copy,
  Check,
  Sparkles,
  Info,
  Terminal,
  Settings2,
} from 'lucide-react';
import { PatternData } from '../types';
import {
  generatePatternJson,
  generateFlossInventoryCsv,
  generateGridMatrixCsv,
  generateCoordinateListCsv,
  generateStreamlitPythonScript,
  generateRequirementsTxt,
  downloadTextFile,
  CsvGridOptions,
  JsonExportOptions,
} from '../utils/exportData';

export type ExportFormatType = 'json' | 'csv-grid' | 'csv-coords' | 'csv-floss' | 'python-streamlit';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: PatternData;
  language: 'en' | 'fil';
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({
  isOpen,
  onClose,
  pattern,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<ExportFormatType>('json');
  const [copied, setCopied] = useState<boolean>(false);

  // JSON Export Options
  const [jsonIncludeCoordinates, setJsonIncludeCoordinates] = useState<boolean>(
    pattern.totalStitches <= 45000 // default true for small/medium, false for ultra large to keep JSON light
  );
  const [jsonIncludeCompact, setJsonIncludeCompact] = useState<boolean>(true);

  // CSV Grid Options
  const [csvRepresentation, setCsvRepresentation] = useState<'dmcCode' | 'symbol' | 'codeAndSymbol'>('dmcCode');
  const [csvDelimiter, setCsvDelimiter] = useState<',' | '\t' | ';'>(';');

  // Compute export content dynamically
  const exportResult = useMemo(() => {
    const sanitizedTitle = pattern.title.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (activeTab === 'json') {
      const jsonOptions: JsonExportOptions = {
        includeGridCoordinates: jsonIncludeCoordinates,
        includeCompactMatrix: jsonIncludeCompact,
        includeMetadata: true,
        includeFlossStats: true,
      };
      const content = generatePatternJson(pattern, jsonOptions);
      return {
        content,
        filename: `${sanitizedTitle}_pattern_data.json`,
        mimeType: 'application/json',
        extension: 'json',
      };
    }

    if (activeTab === 'csv-grid') {
      const gridOptions: CsvGridOptions = {
        cellRepresentation: csvRepresentation,
        delimiter: csvDelimiter,
      };
      const content = generateGridMatrixCsv(pattern, gridOptions);
      return {
        content,
        filename: `${sanitizedTitle}_stitch_grid_matrix.csv`,
        mimeType: 'text/csv',
        extension: 'csv',
      };
    }

    if (activeTab === 'csv-coords') {
      const content = generateCoordinateListCsv(pattern);
      return {
        content,
        filename: `${sanitizedTitle}_stitch_coordinates.csv`,
        mimeType: 'text/csv',
        extension: 'csv',
      };
    }

    if (activeTab === 'python-streamlit') {
      const content = generateStreamlitPythonScript(pattern);
      return {
        content,
        filename: `${sanitizedTitle}_streamlit_app.py`,
        mimeType: 'text/x-python',
        extension: 'py',
      };
    }

    // Default: csv-floss
    const content = generateFlossInventoryCsv(pattern);
    return {
      content,
      filename: `${sanitizedTitle}_dmc_floss_inventory.csv`,
      mimeType: 'text/csv',
      extension: 'csv',
    };
  }, [
    activeTab,
    pattern,
    jsonIncludeCoordinates,
    jsonIncludeCompact,
    csvRepresentation,
    csvDelimiter,
  ]);

  // Preview snippet (first 35 lines)
  const previewSnippet = useMemo(() => {
    const lines = exportResult.content.split('\n');
    const totalLines = lines.length;
    const truncated = lines.slice(0, 35).join('\n');
    return {
      text: truncated,
      totalLines,
      isTruncated: totalLines > 35,
    };
  }, [exportResult.content]);

  // Estimated file size
  const approximateSize = useMemo(() => {
    const bytes = new Blob([exportResult.content]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, [exportResult.content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportResult.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownload = () => {
    downloadTextFile(exportResult.filename, exportResult.content, exportResult.mimeType);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-[#FAF7F2] rounded-2xl border border-[#D7CBB9] shadow-2xl w-full max-w-4xl overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-white px-6 py-4 border-b border-[#E8E1D5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8E1D5] flex items-center justify-center text-[#B88E3C] shadow-2xs">
              <Terminal className="w-5 h-5 text-[#8C7A6B]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl font-bold text-[#2C2523]">
                  {language === 'fil' ? 'I-export ang Pattern Data' : 'Export Pattern Data'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FAF7F2] border border-[#E8E1D5] text-[#5F554F]">
                  CSV / JSON
                </span>
              </div>
              <p className="text-xs text-[#7A6E65]">
                {language === 'fil'
                  ? 'Para sa mga advanced embroiderers, Excel sheets, o third-party embroidery software.'
                  : 'For advanced stitchers, external embroidery suites, spreadsheets & machine automation.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F0ECE1] text-[#7A6E65] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="bg-[#FAF7F2] px-6 pt-4 border-b border-[#E8E1D5] flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-t border-x transition-all cursor-pointer ${
              activeTab === 'json'
                ? 'bg-white text-[#2C2523] border-[#E8E1D5] shadow-xs font-bold'
                : 'text-[#7A6E65] hover:text-[#2C2523] border-transparent'
            }`}
          >
            <FileCode2 className="w-4 h-4 text-[#B88E3C]" />
            <span>{language === 'fil' ? 'JSON (Full Specification)' : 'JSON (Full Specification)'}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
              .json
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('csv-grid')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-t border-x transition-all cursor-pointer ${
              activeTab === 'csv-grid'
                ? 'bg-white text-[#2C2523] border-[#E8E1D5] shadow-xs font-bold'
                : 'text-[#7A6E65] hover:text-[#2C2523] border-transparent'
            }`}
          >
            <Table className="w-4 h-4 text-emerald-600" />
            <span>{language === 'fil' ? 'CSV (2D Grid Matrix)' : 'CSV (2D Grid Matrix)'}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900">
              .csv
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('csv-coords')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-t border-x transition-all cursor-pointer ${
              activeTab === 'csv-coords'
                ? 'bg-white text-[#2C2523] border-[#E8E1D5] shadow-xs font-bold'
                : 'text-[#7A6E65] hover:text-[#2C2523] border-transparent'
            }`}
          >
            <ListOrdered className="w-4 h-4 text-sky-600" />
            <span>{language === 'fil' ? 'CSV (Stitch Coordinates List)' : 'CSV (Stitch Coordinates)'}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-100 text-sky-900">
              .csv
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('csv-floss')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-t border-x transition-all cursor-pointer ${
              activeTab === 'csv-floss'
                ? 'bg-white text-[#2C2523] border-[#E8E1D5] shadow-xs font-bold'
                : 'text-[#7A6E65] hover:text-[#2C2523] border-transparent'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-purple-600" />
            <span>{language === 'fil' ? 'CSV (DMC Thread Inventory)' : 'CSV (Floss Inventory)'}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-900">
              .csv
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('python-streamlit')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-t border-x transition-all cursor-pointer ${
              activeTab === 'python-streamlit'
                ? 'bg-white text-[#2C2523] border-[#E8E1D5] shadow-xs font-bold'
                : 'text-[#7A6E65] hover:text-[#2C2523] border-transparent'
            }`}
          >
            <Terminal className="w-4 h-4 text-rose-600" />
            <span>Python (Streamlit / Pillow / NumPy / Pandas)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-100 text-rose-900">
              .py
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-white">
          {/* Format Details & Options Bar */}
          <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-serif font-bold text-sm text-[#2C2523] flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-[#8C7A6B]" />
                  <span>
                    {activeTab === 'json' && (language === 'fil' ? 'Mga Opsyon sa JSON Export' : 'JSON Schema Export Settings')}
                    {activeTab === 'csv-grid' && (language === 'fil' ? 'Mga Opsyon sa Grid Matrix' : '2D Matrix Spreadsheet Options')}
                    {activeTab === 'csv-coords' && (language === 'fil' ? 'Stitch Coordinates List Format' : 'Coordinate Row Options')}
                    {activeTab === 'csv-floss' && (language === 'fil' ? 'DMC Thread Inventory Spec' : 'Thread Inventory Options')}
                    {activeTab === 'python-streamlit' && (language === 'fil' ? 'Python Streamlit / Pillow / NumPy / Pandas App' : 'Python Streamlit, Pillow, NumPy & Pandas Script')}
                  </span>
                </h4>
                <p className="text-[11px] text-[#7A6E65] mt-0.5">
                  {activeTab === 'json' &&
                    (language === 'fil'
                      ? 'Kumpletong machine-readable format na may couple metadata, AIDA fabric sizing, DMC palette, at stitches.'
                      : 'Includes full metadata, dimensional specs, authentic DMC palette colors, and stitch arrays.')}
                  {activeTab === 'csv-grid' &&
                    (language === 'fil'
                      ? 'Naka-ayos tulad ng spreadsheet: X column headers at Y row numbers para madaling i-view sa Excel.'
                      : 'Grid layout with X columns and Y rows. Open directly in Excel, Google Sheets, or matrix chart programs.')}
                  {activeTab === 'csv-coords' &&
                    (language === 'fil'
                      ? 'Bawat stitch ay may sariling row (X, Y, DMC Code, Pangalan, Hex, Simbolo). Akma para sa script automation.'
                      : 'Each cross-stitch has its own coordinate row. Perfect for automated plotters and custom converters.')}
                  {activeTab === 'csv-floss' &&
                    (language === 'fil'
                      ? 'Shopping checklist at bobbin tracking ng bawat kulay ng sinulid at kailangang skeins.'
                      : 'Summary list of DMC threads with exact stitch count, percentages, and 8-meter skein requirements.')}
                  {activeTab === 'python-streamlit' &&
                    (language === 'fil'
                      ? 'Kumpletong Python standalone script gamit ang Streamlit (UI), Pillow (Pagguhit at Resampling), NumPy (Matrix math), at Pandas (Data analysis).'
                      : 'Ready-to-run Python standalone application powered by Streamlit (web UI), Pillow (image ops), NumPy (matrix arrays), and Pandas (inventory analysis).')}
                </p>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <span className="px-2.5 py-1 rounded-md bg-white border border-[#E8E1D5] text-[11px] font-mono text-[#5F554F]">
                  📦 {approximateSize}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white border border-[#E8E1D5] text-[11px] font-mono text-[#5F554F]">
                  🧵 {pattern.totalStitches.toLocaleString()} stitches
                </span>
              </div>
            </div>

            {/* Specific Config controls based on active tab */}
            {activeTab === 'json' && (
              <div className="pt-2 border-t border-[#F0ECE1] flex flex-wrap items-center gap-4 text-xs text-[#2C2523]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jsonIncludeCompact}
                    onChange={(e) => setJsonIncludeCompact(e.target.checked)}
                    className="rounded border-[#D7CBB9] text-[#2C2523] focus:ring-[#8C7A6B]"
                  />
                  <span>
                    {language === 'fil' ? 'Isama ang Compact Index Matrix' : 'Include Compact 2D Index Matrix'}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jsonIncludeCoordinates}
                    onChange={(e) => setJsonIncludeCoordinates(e.target.checked)}
                    className="rounded border-[#D7CBB9] text-[#2C2523] focus:ring-[#8C7A6B]"
                  />
                  <span>
                    {language === 'fil'
                      ? 'Isama ang Buong Coordinate List (X, Y bawat stitch)'
                      : 'Include Individual Stitch Coordinates List'}
                  </span>
                </label>
              </div>
            )}

            {activeTab === 'csv-grid' && (
              <div className="pt-2 border-t border-[#F0ECE1] flex flex-wrap items-center gap-4 text-xs text-[#2C2523]">
                <div className="flex items-center gap-2">
                  <span className="text-[#7A6E65]">
                    {language === 'fil' ? 'Nilalaman ng Cell:' : 'Cell Values:'}
                  </span>
                  <select
                    value={csvRepresentation}
                    onChange={(e) => setCsvRepresentation(e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg border border-[#D7CBB9] bg-white text-xs text-[#2C2523] focus:outline-none"
                  >
                    <option value="dmcCode">DMC Code (e.g., 310, 816, B5200)</option>
                    <option value="symbol">Stitch Symbol (e.g., ●, ■, ◆, ★)</option>
                    <option value="codeAndSymbol">DMC Code & Symbol (e.g., 310:●)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[#7A6E65]">
                    {language === 'fil' ? 'Delimiter:' : 'Delimiter:'}
                  </span>
                  <select
                    value={csvDelimiter}
                    onChange={(e) => setCsvDelimiter(e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg border border-[#D7CBB9] bg-white text-xs text-[#2C2523] focus:outline-none font-mono"
                  >
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="&#9;">Tab (\t)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'python-streamlit' && (
              <div className="pt-2 border-t border-[#F0ECE1] flex flex-wrap items-center justify-between gap-3 text-xs text-[#2C2523]">
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-[#1E1A18] text-amber-300 px-2.5 py-1 rounded-md text-[11px] shadow-2xs">
                    pip install streamlit pillow numpy pandas
                  </span>
                  <span className="text-[#7A6E65] text-[11px] hidden sm:inline">
                    · Run with <code className="font-bold text-[#2C2523]">streamlit run app.py</code>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => downloadTextFile('requirements.txt', generateRequirementsTxt(), 'text/plain')}
                  className="px-2.5 py-1 text-[11px] font-mono bg-white border border-[#D7CBB9] hover:bg-[#FAF7F2] rounded-md text-[#2C2523] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-rose-600" />
                  <span>Download requirements.txt</span>
                </button>
              </div>
            )}
          </div>

          {/* Software Compatibility Pills */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[#8C7A6B] uppercase tracking-wider">
              {language === 'fil' ? 'Software Compatibility:' : 'Compatible Software & Tools:'}
            </span>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-900 font-semibold">
                Streamlit · Pillow · NumPy · Pandas
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E8E1D5] text-[#5F554F]">
                Excel / Sheets / Calc
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E8E1D5] text-[#5F554F]">
                PCStitch & WinStitch
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E8E1D5] text-[#5F554F]">
                Pattern Maker for Cross Stitch
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E8E1D5] text-[#5F554F]">
                Ink/Stitch & PyEmbroidery
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E8E1D5] text-[#5F554F]">
                Python 3.9+, Jupyter & REST APIs
              </span>
            </div>
          </div>

          {/* Code / Data Preview Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#7A6E65]">
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-[#2C2523]">
                  {exportResult.filename}
                </span>
                <span>•</span>
                <span>
                  {previewSnippet.isTruncated
                    ? `${previewSnippet.totalLines.toLocaleString()} total lines (showing first 35)`
                    : `${previewSnippet.totalLines} lines`}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-[#5F554F] hover:text-[#2C2523] cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">
                      {language === 'fil' ? 'Nakopya!' : 'Copied!'}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{language === 'fil' ? 'Kopyahin' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative rounded-xl border border-[#2C2523]/10 bg-[#1E1E1E] text-slate-200 p-4 font-mono text-xs overflow-x-auto max-h-60 shadow-inner">
              <pre className="whitespace-pre leading-relaxed">{previewSnippet.text}</pre>
              {previewSnippet.isTruncated && (
                <div className="sticky bottom-0 left-0 right-0 py-1.5 px-3 bg-gradient-to-t from-[#1E1E1E] via-[#1E1E1E]/95 to-transparent text-[11px] text-slate-400 text-center font-sans">
                  ... {previewSnippet.totalLines - 35} more lines in full export file ...
                </div>
              )}
            </div>
          </div>

          {/* Practical Usage Tips */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">
                {language === 'fil' ? 'Gabay sa Paggamit ng Data:' : 'Embroidery Workflow Guide:'}
              </span>
              <p className="text-amber-900/90 text-[11px] leading-relaxed">
                {activeTab === 'json' &&
                  (language === 'fil'
                    ? 'Ang JSON file ay naglalaman ng kompleto at standardised na data model. Maaari itong i-parse sa Python gamit ang `json.load()` o i-import sa web-based embroidery renderers.'
                    : 'The JSON export provides the complete structured object with DMC hex, symbols, coordinates, and physical dimensions. Ready for custom automation or web viewers.')}
                {activeTab === 'csv-grid' &&
                  (language === 'fil'
                    ? 'Buksan ang CSV sa Microsoft Excel o Google Sheets. Gamitin ang Conditional Formatting batay sa DMC Code upang magkaroon ng interactive digital chart na may custom highlights!'
                    : 'Open the 2D CSV in Microsoft Excel or Google Sheets. You can apply Conditional Formatting by DMC code to highlight color blocks digitally!')}
                {activeTab === 'csv-coords' &&
                  (language === 'fil'
                    ? 'Ideyal para sa pag-plot gamit ang robotic needle heads, cross-stitch apps, o pagsasala ng mga partikular na kulay ayon sa quadrant o coordinates.'
                    : 'Best for coordinate-driven embroidery tools, machine conversion pipelines, or filtering stitches by quadrant.')}
                {activeTab === 'csv-floss' &&
                  (language === 'fil'
                    ? 'Mabilisang dalhin sa tindahan ng mga gamit-panahi o i-upload sa thread inventory organizer bago simulan ang 1-year wedding project.'
                    : 'Take this file to your local needlecraft shop or upload to floss inventory managers before starting your heirloom piece.')}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="bg-[#FAF7F2] px-6 py-4 border-t border-[#E8E1D5] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#7A6E65] text-center sm:text-left">
            <span>{exportResult.filename}</span>
            <span className="mx-1.5">•</span>
            <span className="font-medium text-[#2C2523]">{approximateSize}</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 sm:flex-none py-2 px-4 rounded-xl text-xs font-semibold text-[#2C2523] bg-white hover:bg-[#FAF7F2] border border-[#D7CBB9] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">
                    {language === 'fil' ? 'Nai-kopya Na!' : 'Copied!'}
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{language === 'fil' ? 'Kopyahin ang Data' : 'Copy Data'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 sm:flex-none py-2 px-5 rounded-xl font-serif text-xs font-bold text-white bg-[#2C2523] hover:bg-[#433936] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#E6C687]" />
              <span>
                {language === 'fil'
                  ? `I-download ang .${exportResult.extension.toUpperCase()}`
                  : `Download .${exportResult.extension.toUpperCase()}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
