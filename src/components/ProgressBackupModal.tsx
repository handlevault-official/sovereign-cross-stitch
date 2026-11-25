import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Database,
  ArrowRight,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { PatternData } from '../types';

interface ProgressBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: PatternData;
  stitchedCells: Set<string>;
  onImportStitchedCells: (cells: Set<string>, mode: 'replace' | 'merge') => void;
  language: 'en' | 'fil';
}

export const ProgressBackupModal: React.FC<ProgressBackupModalProps> = ({
  isOpen,
  onClose,
  pattern,
  stitchedCells,
  onImportStitchedCells,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [copiedJson, setCopiedJson] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  // Import State
  const [parsedImportCells, setParsedImportCells] = useState<string[] | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importFileSize, setImportFileSize] = useState<number>(0);
  const [importFileType, setImportFileType] = useState<'json' | 'csv' | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMeta, setImportMeta] = useState<{
    patternId?: string;
    patternTitle?: string;
    exportedAt?: string;
    totalStitches?: number;
    outOfBoundsCount?: number;
  } | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const totalStitches = pattern.totalStitches || (pattern.width * pattern.height);
  const completedCount = stitchedCells.size;
  const completionPercentage = totalStitches > 0 ? ((completedCount / totalStitches) * 100).toFixed(1) : '0';

  // Helper to generate sanitized file prefix
  const getFilePrefix = () => {
    const safeTitle = (pattern.title || 'cross_stitch_progress')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    return `${safeTitle}_progress_${dateStr}`;
  };

  // 1. Generate JSON Export Data
  const generateExportJson = (): string => {
    const cellArray = Array.from(stitchedCells);
    const backupData = {
      version: '1.0',
      type: 'sovereign_cross_stitch_progress_backup',
      app: 'Sovereign Wedding Cross Stitch Designer',
      exportedAt: new Date().toISOString(),
      pattern: {
        id: pattern.id,
        title: pattern.title,
        width: pattern.width,
        height: pattern.height,
        fabricCount: pattern.fabricCount,
        totalStitches,
      },
      progress: {
        completedStitches: cellArray.length,
        completionPercentage: `${completionPercentage}%`,
        cells: cellArray,
      },
    };
    return JSON.stringify(backupData, null, 2);
  };

  // 2. Generate CSV Export Data
  const generateExportCsv = (): string => {
    const lines: string[] = [];
    lines.push('x,y,dmc_code,floss_name,status');

    for (const key of stitchedCells) {
      const [xStr, yStr] = key.split(',');
      const x = parseInt(xStr, 10);
      const y = parseInt(yStr, 10);

      let dmcCode = 'UNKNOWN';
      let flossName = 'Unknown';

      if (pattern.grid && pattern.grid[y] && pattern.grid[y][x]) {
        const cell = pattern.grid[y][x];
        dmcCode = cell.dmcCode || '';
        const foundColor =
          pattern.palette[cell.colorIndex] ||
          pattern.palette.find((c) => c.code === cell.dmcCode);
        if (foundColor) {
          flossName = foundColor.name;
        }
      }

      // Escape quotes for CSV
      const escapedFloss = flossName.replace(/"/g, '""');
      lines.push(`${x},${y},"${dmcCode}","${escapedFloss}",completed`);
    }

    return lines.join('\n');
  };

  // Download Trigger
  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const jsonStr = generateExportJson();
    triggerDownload(jsonStr, `${getFilePrefix()}.json`, 'application/json');
  };

  const handleDownloadCsv = () => {
    const csvStr = generateExportCsv();
    triggerDownload(csvStr, `${getFilePrefix()}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleCopyJson = async () => {
    try {
      const jsonStr = generateExportJson();
      await navigator.clipboard.writeText(jsonStr);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    } catch {
      // fallback
    }
  };

  // Handle Upload File Parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccessMessage(null);
    setImportFileName(file.name);
    setImportFileSize(file.size);

    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const isJson = file.name.toLowerCase().endsWith('.json') || file.type.includes('json');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || text.trim().length === 0) {
          throw new Error(
            language === 'fil'
              ? 'Walang laman ang napiling file.'
              : 'The selected file is empty.'
          );
        }

        if (isCsv || text.trim().startsWith('x,y')) {
          // Parse CSV
          setImportFileType('csv');
          parseCsvContent(text);
        } else {
          // Parse JSON
          setImportFileType('json');
          parseJsonContent(text);
        }
      } catch (err: any) {
        setImportError(err.message || 'Failed to read file');
        setParsedImportCells(null);
      }
    };

    reader.onerror = () => {
      setImportError(
        language === 'fil'
          ? 'Nagka-problema sa pagbasa ng file.'
          : 'An error occurred while reading the file.'
      );
    };

    reader.readAsText(file);
  };

  const parseJsonContent = (text: string) => {
    try {
      const data = JSON.parse(text);
      let cells: string[] = [];
      let meta: any = {};

      if (Array.isArray(data)) {
        // Simple array of coordinate strings ["0,0", "0,1"]
        cells = data.filter((item) => typeof item === 'string' && /^\d+,\d+$/.test(item));
      } else if (data && typeof data === 'object') {
        meta.patternId = data.pattern?.id || data.patternId;
        meta.patternTitle = data.pattern?.title || data.patternTitle;
        meta.exportedAt = data.exportedAt;
        meta.totalStitches = data.pattern?.totalStitches || data.totalStitches;

        if (Array.isArray(data.progress?.cells)) {
          cells = data.progress.cells;
        } else if (Array.isArray(data.cells)) {
          cells = data.cells;
        } else if (Array.isArray(data.stitchedCells)) {
          cells = data.stitchedCells;
        }
      }

      if (!cells || cells.length === 0) {
        throw new Error(
          language === 'fil'
            ? 'Walang natagpuang koordinasyon ng mga tahi (x,y) sa JSON file.'
            : 'No valid stitch coordinates found in JSON file.'
        );
      }

      // Filter and count out of bounds coordinates
      let outOfBounds = 0;
      const validCells: string[] = [];
      for (const cell of cells) {
        if (typeof cell !== 'string') continue;
        const [xStr, yStr] = cell.split(',');
        const x = parseInt(xStr, 10);
        const y = parseInt(yStr, 10);
        if (isNaN(x) || isNaN(y)) continue;

        if (x >= 0 && x < pattern.width && y >= 0 && y < pattern.height) {
          validCells.push(`${x},${y}`);
        } else {
          outOfBounds++;
        }
      }

      meta.outOfBoundsCount = outOfBounds;
      setImportMeta(meta);
      setParsedImportCells(validCells);

      if (validCells.length === 0) {
        throw new Error(
          language === 'fil'
            ? `Lahat ng ${cells.length} na tahi ay lampas sa sukat ng kasalukuyang pattern (${pattern.width}x${pattern.height}).`
            : `All ${cells.length} stitches are outside the bounds of the current grid (${pattern.width}x${pattern.height}).`
        );
      }
    } catch (err: any) {
      setParsedImportCells(null);
      setImportError(
        err.message ||
          (language === 'fil' ? 'Hindi wastong JSON format.' : 'Invalid JSON format.')
      );
    }
  };

  const parseCsvContent = (text: string) => {
    try {
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length < 2) {
        throw new Error(
          language === 'fil'
            ? 'Kulang ang data sa CSV file (kailangan ng header at kahit 1 row).'
            : 'CSV file contains insufficient data (requires header + at least 1 row).'
        );
      }

      const header = lines[0].toLowerCase();
      const headers = header.split(',').map((h) => h.replace(/['"]/g, '').trim());
      const xIdx = headers.indexOf('x');
      const yIdx = headers.indexOf('y');

      if (xIdx === -1 || yIdx === -1) {
        throw new Error(
          language === 'fil'
            ? 'Hindi mahanap ang "x" at "y" column headers sa CSV.'
            : 'CSV header must include "x" and "y" column coordinates.'
        );
      }

      const validCells: string[] = [];
      let outOfBounds = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        // Basic CSV column splitter handling quotes
        const cols = line.split(',');
        if (cols.length <= Math.max(xIdx, yIdx)) continue;

        const x = parseInt(cols[xIdx].replace(/['"]/g, '').trim(), 10);
        const y = parseInt(cols[yIdx].replace(/['"]/g, '').trim(), 10);

        if (isNaN(x) || isNaN(y)) continue;

        if (x >= 0 && x < pattern.width && y >= 0 && y < pattern.height) {
          validCells.push(`${x},${y}`);
        } else {
          outOfBounds++;
        }
      }

      setImportMeta({ outOfBoundsCount: outOfBounds });
      setParsedImportCells(validCells);

      if (validCells.length === 0) {
        throw new Error(
          language === 'fil'
            ? 'Walang wastong koordinasyon na tumugma sa grid.'
            : 'No valid stitch coordinates matched within current grid dimensions.'
        );
      }
    } catch (err: any) {
      setParsedImportCells(null);
      setImportError(
        err.message ||
          (language === 'fil' ? 'Hindi wastong CSV file.' : 'Invalid CSV file format.')
      );
    }
  };

  const handleApplyImport = () => {
    if (!parsedImportCells || parsedImportCells.length === 0) return;

    const cellSet = new Set(parsedImportCells);
    onImportStitchedCells(cellSet, importMode);

    const countApplied =
      importMode === 'merge'
        ? new Set([...Array.from(stitchedCells), ...parsedImportCells]).size
        : cellSet.size;

    setImportSuccessMessage(
      language === 'fil'
        ? `Matagumpay na na-restore ang ${countApplied.toLocaleString()} mga tahi (${importMode === 'merge' ? 'pinagsama' : 'pinalitan'})!`
        : `Successfully restored ${countApplied.toLocaleString()} stitches (${importMode === 'merge' ? 'merged' : 'replaced'})!`
    );

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setTimeout(() => {
      onClose();
    }, 1400);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-backup-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div className="bg-white rounded-2xl border border-[#E8E1D5] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-[#FAF7F2] border-b border-[#E8DFC9] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2C2523] text-[#E6C687] flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 id="progress-backup-title" className="font-serif text-lg font-bold text-[#2C2523]">
                {language === 'fil'
                  ? 'Backup at I-restore ang Stitch Progress'
                  : 'Stitch Progress Backup & Sync'}
              </h3>
              <p className="text-xs text-[#7A6E65]">
                {language === 'fil'
                  ? 'I-export ang iyong mga natapos na tahi bilang JSON o CSV, o i-import sa ibang device'
                  : 'Export your stitched cells as JSON or CSV, or restore your work onto any device'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8C8077] hover:text-[#2C2523] rounded-lg hover:bg-[#EAE2D5] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#E8E1D5] bg-[#F7F3EC] px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-[#2C2523] text-[#2C2523]'
                : 'border-transparent text-[#7A6E65] hover:text-[#2C2523]'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>{language === 'fil' ? 'I-export / I-backup' : 'Export & Backup'}</span>
            <span className="font-mono text-[10px] bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded-full font-bold">
              {completedCount.toLocaleString()}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'border-[#2C2523] text-[#2C2523]'
                : 'border-transparent text-[#7A6E65] hover:text-[#2C2523]'
            }`}
          >
            <Upload className="w-4 h-4 text-[#B88E3C]" />
            <span>{language === 'fil' ? 'I-import / I-restore' : 'Import & Restore'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-[#2C2523]">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Progress Summary Card */}
              <div className="bg-[#FAF7F2] border border-[#E8DFC9] rounded-xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span className="font-serif font-bold text-[#2C2523] text-sm">
                      {pattern.title}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {completionPercentage}% {language === 'fil' ? 'Tapos na' : 'Completed'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center pt-1 border-t border-[#EAE2D5]">
                  <div className="p-2 bg-white rounded-lg border border-[#E8E1D5]">
                    <div className="text-[10px] text-[#7A6E65] uppercase">
                      {language === 'fil' ? 'Natahi Na' : 'Stitched'}
                    </div>
                    <div className="font-mono font-bold text-emerald-700 text-base">
                      {completedCount.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-[#E8E1D5]">
                    <div className="text-[10px] text-[#7A6E65] uppercase">
                      {language === 'fil' ? 'Kabuuang Tahi' : 'Total Grid'}
                    </div>
                    <div className="font-mono font-bold text-[#2C2523] text-base">
                      {totalStitches.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-[#E8E1D5]">
                    <div className="text-[10px] text-[#7A6E65] uppercase">
                      {language === 'fil' ? 'Sukat ng Grid' : 'Dimensions'}
                    </div>
                    <div className="font-mono font-bold text-[#5F554F] text-base">
                      {pattern.width} × {pattern.height}
                    </div>
                  </div>
                </div>

                {completedCount === 0 && (
                  <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <Info className="w-4 h-4 shrink-0 text-amber-700" />
                    <span>
                      {language === 'fil'
                        ? 'Wala ka pang namarkahang mga tahi sa viewer. Maaari mo pa ring i-download ang blangkong progress template.'
                        : 'You have not marked any stitches yet. You can still export to keep a baseline backup.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Export Options: JSON & CSV */}
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-sm text-[#2C2523]">
                  {language === 'fil' ? 'Pumili ng Format ng Backup' : 'Choose Export Format'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* JSON Option Card */}
                  <div className="border border-[#E8E1D5] hover:border-[#2C2523] rounded-xl p-4.5 bg-white space-y-3 transition-all flex flex-col justify-between shadow-2xs">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
                          <FileCode className="w-4 h-4" />
                        </div>
                        <span className="font-mono text-[11px] font-bold text-[#7A6E65] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E8E1D5]">
                          .JSON
                        </span>
                      </div>
                      <div>
                        <h5 className="font-serif font-bold text-sm text-[#2C2523]">
                          JSON Backup File
                        </h5>
                        <p className="text-xs text-[#7A6E65] mt-0.5 leading-relaxed">
                          {language === 'fil'
                            ? 'Kumpletong backup kasama ang pattern metadata, sukat ng grid, at listahan ng lahat ng coordinates. Tamang-tama para sa pag-sync sa ibang computer o browser.'
                            : 'Complete structured backup containing pattern metadata, dimensions, timestamp, and stitch coordinates. Ideal for device-to-device transfers.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadJson}
                        className="w-full py-2.5 px-4 bg-[#2C2523] hover:bg-[#433936] text-[#FAF7F2] rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-[#E6C687]" />
                        <span>{language === 'fil' ? 'I-download ang JSON' : 'Download JSON Backup'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyJson}
                        className="w-full py-1.5 px-3 bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#5F554F] border border-[#E8DFC9] rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedJson ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span className="text-emerald-800 font-semibold">
                              {language === 'fil' ? 'Na-kopya na!' : 'Copied to Clipboard!'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#7A6E65]" />
                            <span>{language === 'fil' ? 'Kopyahin ang Raw JSON' : 'Copy JSON to Clipboard'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* CSV Option Card */}
                  <div className="border border-[#E8E1D5] hover:border-[#2C2523] rounded-xl p-4.5 bg-white space-y-3 transition-all flex flex-col justify-between shadow-2xs">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center border border-blue-200">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <span className="font-mono text-[11px] font-bold text-[#7A6E65] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E8E1D5]">
                          .CSV
                        </span>
                      </div>
                      <div>
                        <h5 className="font-serif font-bold text-sm text-[#2C2523]">
                          CSV Spreadsheet File
                        </h5>
                        <p className="text-xs text-[#7A6E65] mt-0.5 leading-relaxed">
                          {language === 'fil'
                            ? 'Spreadsheet file na madaling buksan sa Microsoft Excel o Google Sheets. May kasamang coordinate (x,y), DMC code, at kulay ng sinulid.'
                            : 'Table sheet format opening smoothly in Excel or Google Sheets. Lists coordinate rows with paired DMC floss codes and thread names.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleDownloadCsv}
                        className="w-full py-2.5 px-4 bg-[#2C2523] hover:bg-[#433936] text-[#FAF7F2] rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-[#E6C687]" />
                        <span>{language === 'fil' ? 'I-download ang CSV' : 'Download CSV Backup'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT / RESTORE */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* File Upload Box */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#2C2523]">
                  {language === 'fil' ? 'Mag-upload ng JSON o CSV Backup File' : 'Upload JSON or CSV Backup File'}
                </label>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#D7CBB9] hover:border-[#2C2523] bg-[#FAF7F2] hover:bg-[#F4EFE6] rounded-xl p-8 text-center cursor-pointer transition-colors space-y-2 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv,text/csv,application/json"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="w-12 h-12 rounded-full bg-white border border-[#E8E1D5] mx-auto flex items-center justify-center text-[#B88E3C] group-hover:scale-105 transition-transform shadow-2xs">
                    <Upload className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <p className="font-serif font-bold text-sm text-[#2C2523]">
                      {language === 'fil' ? 'Pindutin para pumili ng file' : 'Click to browse or drop backup file here'}
                    </p>
                    <p className="text-xs text-[#7A6E65]">
                      {language === 'fil'
                        ? 'Tumatanggap ng .json o .csv na may na-save na mga tahi'
                        : 'Supports .json or .csv backup files generated from this tool'}
                    </p>
                  </div>

                  {importFileName && (
                    <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#E8DFC9] text-xs font-mono font-medium text-[#2C2523] mt-2 shadow-2xs">
                      <span>📄 {importFileName}</span>
                      <span className="text-[#8C8077]">
                        ({(importFileSize / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Banner */}
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">
                      {language === 'fil' ? 'Hindi Ma-import ang File' : 'Unable to Import File'}
                    </div>
                    <div>{importError}</div>
                  </div>
                </div>
              )}

              {/* Success Banner */}
              {importSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2.5 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-bold">{importSuccessMessage}</span>
                </div>
              )}

              {/* Parsed Inspection Preview */}
              {parsedImportCells && (
                <div className="space-y-4 bg-[#FAF7F2] border border-[#E8DFC9] rounded-xl p-4.5 animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-[#EAE2D5]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span className="font-serif font-bold text-sm text-[#2C2523]">
                        {language === 'fil' ? 'Nasuring Backup File' : 'Validated Backup Summary'}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      {parsedImportCells.length.toLocaleString()}{' '}
                      {language === 'fil' ? 'wastong tahi' : 'valid stitches'}
                    </span>
                  </div>

                  {importMeta?.patternTitle && (
                    <div className="text-xs text-[#5F554F] flex items-center justify-between">
                      <span className="text-[#7A6E65]">
                        {language === 'fil' ? 'Orihinal na Pattern:' : 'Origin Pattern:'}
                      </span>
                      <span className="font-medium text-[#2C2523]">
                        {importMeta.patternTitle}
                      </span>
                    </div>
                  )}

                  {importMeta?.outOfBoundsCount && importMeta.outOfBoundsCount > 0 ? (
                    <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        {language === 'fil'
                          ? `May ${importMeta.outOfBoundsCount} tahi na lampas sa kasalukuyang sukat (${pattern.width}x${pattern.height}) at awtomatikong binura.`
                          : `${importMeta.outOfBoundsCount} stitches fall outside the current grid dimensions (${pattern.width}x${pattern.height}) and were automatically ignored.`}
                      </span>
                    </div>
                  ) : null}

                  {/* Mode Selector */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-bold text-[#2C2523]">
                      {language === 'fil' ? 'Paraan ng Pag-restore:' : 'Restore Action:'}
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          importMode === 'merge'
                            ? 'bg-white border-[#2C2523] ring-1 ring-[#2C2523] shadow-xs'
                            : 'bg-white/60 border-[#E8E1D5] hover:bg-white text-[#5F554F]'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs text-[#2C2523]">
                          <span className="text-emerald-700">➕</span>
                          <span>{language === 'fil' ? 'Pagsamahin (Merge)' : 'Merge with Existing'}</span>
                        </div>
                        <p className="text-[11px] text-[#7A6E65] mt-1">
                          {language === 'fil'
                            ? 'Idagdag ang mga bagong tahi nang hindi binubura ang kasalukuyang natahi.'
                            : 'Add newly uploaded stitches without clearing what you already marked.'}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          importMode === 'replace'
                            ? 'bg-white border-rose-700 ring-1 ring-rose-700 shadow-xs'
                            : 'bg-white/60 border-[#E8E1D5] hover:bg-white text-[#5F554F]'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs text-rose-900">
                          <span className="text-rose-600">🔄</span>
                          <span>{language === 'fil' ? 'Palitan Lahat (Replace)' : 'Replace All Progress'}</span>
                        </div>
                        <p className="text-[11px] text-[#7A6E65] mt-1">
                          {language === 'fil'
                            ? 'I-overwrite ang kasalukuyang estado nang buo gamit ang backup file.'
                            : 'Completely overwrite current progress with this backup file.'}
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Apply Restore Button */}
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={handleApplyImport}
                      className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-serif font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>
                        {language === 'fil'
                          ? `Ilapat at I-restore ang ${parsedImportCells.length.toLocaleString()} Tahi`
                          : `Restore & Apply ${parsedImportCells.length.toLocaleString()} Stitches`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#FAF7F2] border-t border-[#E8DFC9] flex items-center justify-between text-xs text-[#7A6E65]">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-600" />
            <span>
              {language === 'fil'
                ? 'Naka-save sa lokal na browser storage (offline ready)'
                : 'Synced with local browser storage (offline ready)'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#E8DFC9] rounded-lg bg-white hover:bg-[#F2ECE1] text-[#2C2523] font-medium transition-colors cursor-pointer"
          >
            {language === 'fil' ? 'Isara' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
