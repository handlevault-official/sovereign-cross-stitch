import React, { useRef } from 'react';
import { Upload, Image as ImageIcon, Sparkles, Check, Trash2, Plus, Layers, ImagePlus } from 'lucide-react';
import { TEMPLATES } from '../data/dmcPalette';
import { UploadedItem } from '../types';

interface DesignSelectorProps {
  uploadOption: 'upload' | 'template';
  setUploadOption: (opt: 'upload' | 'template') => void;
  selectedTemplateKey: string;
  setSelectedTemplateKey: (key: string) => void;
  customImageFile: File | null;
  customImageUrl: string | null;
  uploadedImages: UploadedItem[];
  onCustomImageSelected: (file: File) => void;
  onMultipleImagesUploaded: (files: FileList | File[]) => void;
  onSelectUploadedImage: (item: UploadedItem) => void;
  onRemoveUploadedImage: (id: string) => void;
  coupleNames: string;
  setCoupleNames: (names: string) => void;
  weddingDate: string;
  setWeddingDate: (date: string) => void;
  language: 'en' | 'fil';
}

export const DesignSelector: React.FC<DesignSelectorProps> = ({
  uploadOption,
  setUploadOption,
  selectedTemplateKey,
  setSelectedTemplateKey,
  customImageFile,
  customImageUrl,
  uploadedImages,
  onCustomImageSelected,
  onMultipleImagesUploaded,
  onSelectUploadedImage,
  onRemoveUploadedImage,
  coupleNames,
  setCoupleNames,
  weddingDate,
  setWeddingDate,
  language,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multipleFileInputRef = useRef<HTMLInputElement>(null);

  const handleSingleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onCustomImageSelected(e.target.files[0]);
    }
  };

  const handleMultipleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onMultipleImagesUploaded(e.target.files);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8E1D5] shadow-xs p-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0ECE1] pb-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#2C2523]">
            1. {language === 'fil' ? 'Pumili o Mag-upload ng Wedding Design' : 'Select or Upload Wedding Design'}
          </h2>
          <p className="text-xs text-[#7A6E65] mt-0.5">
            {language === 'fil'
              ? 'Puwede kang mag-upload ng maramihang litrato (kahit iba-iba!) o pumili mula sa aming heirloom templates.'
              : 'You can upload multiple wedding photos or select from curated heirloom wedding templates.'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setUploadOption('upload')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              uploadOption === 'upload'
                ? 'bg-[#2C2523] text-white shadow-xs font-semibold'
                : 'text-[#5F554F] hover:text-[#2C2523]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              {language === 'fil' ? 'Mag-upload (Single / Marami)' : 'Upload Photos'}
              {uploadedImages.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-[#B88E3C] text-white text-[10px] rounded-full">
                  {uploadedImages.length}
                </span>
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setUploadOption('template')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              uploadOption === 'template'
                ? 'bg-[#2C2523] text-white shadow-xs font-semibold'
                : 'text-[#5F554F] hover:text-[#2C2523]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              {language === 'fil' ? 'Mga Sample Template' : 'Sample Templates'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {uploadOption === 'upload' ? (
        <div className="space-y-5">
          {/* Multi-file Upload Dropzone */}
          <div
            onClick={() => multipleFileInputRef.current?.click()}
            className="border-2 border-dashed border-[#D7CBB9] hover:border-[#B88E3C] bg-[#FAF7F2] hover:bg-[#F5EFE6] rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 group"
          >
            <input
              ref={multipleFileInputRef}
              type="file"
              multiple
              accept="image/png, image/jpeg, image/jpg, image/webp"
              className="hidden"
              onChange={handleMultipleFilesChange}
            />

            <div className="flex flex-col items-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-[#EFE9DF] group-hover:bg-[#E4D7C3] flex items-center justify-center text-[#5F554F] mb-3 transition-colors">
                <ImagePlus className="w-6 h-6 text-[#2C2523]" />
              </div>
              <div className="font-serif text-lg font-bold text-[#2C2523]">
                {language === 'fil'
                  ? 'I-click o i-drag ang iyong mga litrato rito'
                  : 'Click or drag your wedding photos here'}
              </div>
              <p className="text-xs text-[#7A6E65] mt-1">
                {language === 'fil'
                  ? 'Kahit maramihan at iba-ibang imahe (JPG, PNG, WEBP). Puwede mong piliin kung alin ang gagawing cross-stitch pattern anumang oras!'
                  : 'Supports multiple different images at once. Easily switch between them in your gallery below.'}
              </p>
              <div className="mt-3 px-3 py-1 rounded-full bg-white border border-[#E0D7C9] text-[11px] font-medium text-[#8C7A6B]">
                {language === 'fil' ? '✨ Multi-upload enabled (Pumili ng isa o higit pa)' : '✨ Multi-upload enabled (Select one or many)'}
              </div>
            </div>
          </div>

          {/* Uploaded Images Gallery / Switcher */}
          {uploadedImages.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#B88E3C]" />
                  <h3 className="font-serif text-sm font-bold text-[#2C2523]">
                    {language === 'fil' ? 'Koleksyon ng mga Na-upload na Larawan' : 'Uploaded Photos Collection'}
                  </h3>
                  <span className="text-xs text-[#7A6E65]">({uploadedImages.length} available)</span>
                </div>
                <button
                  type="button"
                  onClick={() => multipleFileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs font-semibold text-[#B88E3C] hover:text-[#9A732B]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'fil' ? 'Magdagdag Pa' : 'Add More'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {uploadedImages.map((item) => {
                  const isActive = customImageUrl === item.url;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectUploadedImage(item)}
                      className={`group relative rounded-xl border p-2 cursor-pointer transition-all duration-200 ${
                        isActive
                          ? 'border-[#2C2523] bg-[#F7F3EC] ring-2 ring-[#2C2523] shadow-md'
                          : 'border-[#E8E1D5] bg-white hover:border-[#C5BCB6] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-[#EAE2D5] mb-2">
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isActive && (
                          <div className="absolute top-1.5 right-1.5 bg-[#2C2523] text-white p-1 rounded-full shadow-xs">
                            <Check className="w-3 h-3 text-[#E6C687]" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveUploadedImage(item.id);
                          }}
                          className="absolute bottom-1.5 right-1.5 bg-black/60 hover:bg-rose-700 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-[11px] font-semibold text-[#2C2523] truncate" title={item.name}>
                          {item.name}
                        </div>
                        <div className="text-[10px] text-[#8C8077]">
                          {item.sizeFormatted}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Template selection */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(TEMPLATES).map(([key, t]) => {
              const isSelected = selectedTemplateKey === key;
              return (
                <div
                  key={key}
                  onClick={() => {
                    setSelectedTemplateKey(key);
                    setCoupleNames(t.sampleCouple);
                    setWeddingDate(t.sampleDate);
                  }}
                  className={`group relative rounded-xl border p-3 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#2C2523] bg-[#F7F3EC] ring-2 ring-[#2C2523] shadow-md'
                      : 'border-[#E8E1D5] bg-white hover:border-[#C5BCB6] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <div>
                    <div className="relative aspect-4/3 rounded-lg overflow-hidden mb-3 bg-[#EAE2D5] border border-[#E0D7C9]">
                      <img
                        src={t.imageSrc}
                        alt={t.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-[#2C2523] text-white p-1 rounded-full shadow-xs">
                          <Check className="w-3.5 h-3.5 text-[#E6C687]" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-serif text-sm font-bold text-[#2C2523] leading-snug">
                        {language === 'fil' ? t.tagalogTitle : t.title}
                      </h3>
                      <p className="text-[11px] text-[#7A6E65] line-clamp-2">
                        {t.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-[#8C8077] pt-2 border-t border-[#EDE5D8] mt-2">
                    {t.dimensions}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Heirloom Personalization Details */}
      <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#B88E3C]" />
          <h4 className="text-xs font-bold text-[#2C2523] uppercase tracking-wider">
            {language === 'fil' ? 'Personalization para sa Cover Sheet & Heirloom Title' : 'Personalization for Pattern Booklet Cover Sheet'}
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#5F554F] mb-1">
              {language === 'fil' ? 'Pangalan ng Mag-asawa / Monogram' : 'Couple Names or Monogram'}
            </label>
            <input
              type="text"
              value={coupleNames}
              onChange={(e) => setCoupleNames(e.target.value)}
              placeholder="e.g. J & A or Sarah & David"
              className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7CBB9] rounded-md focus:outline-none focus:ring-1 focus:ring-[#B88E3C]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5F554F] mb-1">
              {language === 'fil' ? 'Petsa ng Kasal / Established Year' : 'Wedding Date or Year'}
            </label>
            <input
              type="text"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
              placeholder="e.g. EST. 2025 or September 14, 2026"
              className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7CBB9] rounded-md focus:outline-none focus:ring-1 focus:ring-[#B88E3C]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
