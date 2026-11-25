import React from 'react';
import { Sparkles, Check, Globe, Code2 } from 'lucide-react';

interface HeaderProps {
  isPro: boolean;
  onOpenCheckout: () => void;
  onOpenCodeBox: () => void;
  language: 'en' | 'fil';
  setLanguage: (lang: 'en' | 'fil') => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPro,
  onOpenCheckout,
  onOpenCodeBox,
  language,
  setLanguage,
  activeSection,
  setActiveSection,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8E1D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-18">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('generator');
            }}
            className="flex items-center gap-2.5 text-slate-900 group whitespace-nowrap shrink-0"
          >
            <div className="w-8 h-8 rounded-md bg-[#2C2523] flex items-center justify-center text-[#FAF7F2] font-serif font-bold text-lg shadow-sm">
              🧵
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#2C2523]">
                Sovereign
              </span>
            </div>
          </a>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5F554F]">
            <button
              onClick={() => setActiveSection('generator')}
              className={`hover:text-[#2C2523] transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeSection === 'generator'
                  ? 'text-[#2C2523] border-b-2 border-[#B88E3C] font-semibold'
                  : ''
              }`}
            >
              {language === 'fil' ? 'Pattern Generator' : 'Pattern Generator'}
            </button>
            <button
              onClick={() => setActiveSection('templates')}
              className={`hover:text-[#2C2523] transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeSection === 'templates'
                  ? 'text-[#2C2523] border-b-2 border-[#B88E3C] font-semibold'
                  : ''
              }`}
            >
              {language === 'fil' ? 'Wedding Templates' : 'Wedding Templates'}
            </button>
            <button
              onClick={() => setActiveSection('calculator')}
              className={`hover:text-[#2C2523] transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeSection === 'calculator'
                  ? 'text-[#2C2523] border-b-2 border-[#B88E3C] font-semibold'
                  : ''
              }`}
            >
              {language === 'fil' ? 'Aida & Floss Specs' : 'Fabric & Floss Specs'}
            </button>
            <button
              onClick={() => setActiveSection('licensing')}
              className={`hover:text-[#2C2523] transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeSection === 'licensing'
                  ? 'text-[#2C2523] border-b-2 border-[#B88E3C] font-semibold'
                  : ''
              }`}
            >
              {language === 'fil' ? 'Commercial Licensing' : 'Commercial Licensing'}
            </button>
          </nav>

          {/* Zone 3: Primary Action & Language Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Clean Code Box Button */}
            <button
              onClick={onOpenCodeBox}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2C2523] bg-[#F0EAE1] hover:bg-[#E5DDCF] border border-[#D9CEBC] rounded-md transition-colors shadow-2xs"
              title={language === 'fil' ? 'Tingnan ang Buong Code sa Malinis na Kahon' : 'View Full Clean Code Box'}
            >
              <Code2 className="w-3.5 h-3.5 text-[#B88E3C]" />
              <span className="font-medium">{language === 'fil' ? 'Kahon ng Code' : 'Code Box'}</span>
            </button>

            {/* Language switch */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'fil' : 'en')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#5F554F] hover:text-[#2C2523] border border-[#E8E1D5] rounded-md bg-white hover:bg-[#FAF7F2] transition-colors"
              title="Toggle Filipino / English"
            >
              <Globe className="w-3.5 h-3.5 text-[#B88E3C]" />
              <span className="font-semibold">{language === 'en' ? 'FIL' : 'ENG'}</span>
            </button>

            {isPro ? (
              <div className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg whitespace-nowrap">
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>{language === 'fil' ? 'PRO Wedding Active' : 'PRO License Active'}</span>
              </div>
            ) : (
              <button
                onClick={onOpenCheckout}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#2C2523] hover:bg-[#433936] rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E6C687]" />
                <span>{language === 'fil' ? 'Mag-upgrade sa PRO (₱499)' : 'Upgrade to PRO (₱499)'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
