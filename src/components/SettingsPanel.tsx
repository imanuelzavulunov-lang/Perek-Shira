import React from 'react';
import { Type, ALargeSmall, Eye, Image, ChevronDown, RotateCcw, Download } from 'lucide-react';
import { AppSettings, DEFAULT_SETTINGS } from '../types';

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onCloseSettings?: () => void;
  canInstall?: boolean;
  onInstall?: () => void;
  onOpenDownloadImages?: () => void;
}

export default function SettingsPanel({
  settings,
  onChange,
  onCloseSettings,
  onOpenDownloadImages,
}: SettingsPanelProps) {
  const headerClass = 'flex items-center gap-1.5 font-bold text-text-primary text-sm sm:text-base';

  const triggerAutoClose = () => {
    if (onCloseSettings) {
      setTimeout(() => {
        onCloseSettings();
      }, 220);
    }
  };

  const fontOptions: { label: string; value: AppSettings['fontFamily'] }[] = [
    { label: 'פרנק (ספרותי)', value: 'frank' },
    { label: 'הדסה (קלאסי)', value: 'hadassah' },
    { label: 'ורלה (רך ומעוגל)', value: 'varela' },
    { label: 'היבו (מודרני)', value: 'heebo' },
    { label: 'רוביק (עגול נקי)', value: 'rubik' },
  ];

  const fontSizes: { label: string; value: AppSettings['fontSize']; labelSizeClass: string }[] = [
    { label: 'א', value: 'sm', labelSizeClass: 'text-base font-medium' },
    { label: 'א', value: 'base', labelSizeClass: 'text-xl font-semibold' },
    { label: 'א', value: 'lg', labelSizeClass: 'text-[25px] font-bold' },
  ];

  return (
    <div id="settings-panel" className="w-full space-y-4" dir="rtl">
      {/* Theme Selector */}
      <div id="theme-selector-container" className="flex flex-col gap-2 pb-3.5 border-b border-border-color/60">
        <span className={headerClass}>
          <Eye className="w-4.5 h-4.5 text-primary-accent" />
          מראה:
        </span>
        <div className="grid grid-cols-4 bg-bg-muted p-1 rounded-xl border border-border-color w-full gap-1">
          {[
            { label: 'בהיר', value: 'light' },
            { label: 'צהוב', value: 'yellow' },
            { label: 'כהה', value: 'dark' },
            { label: 'כחול', value: 'dark-blue' }
          ].map((th) => (
            <button
              key={th.value}
              id={`btn-theme-${th.value}`}
              onClick={() => onChange({ ...settings, theme: th.value as AppSettings['theme'] })}
              className={`py-2 rounded-lg text-xs sm:text-sm transition-all cursor-pointer font-bold text-center ${
                settings.theme === th.value
                  ? 'bg-bg-card text-text-primary shadow-xs border border-primary-accent ring-1 ring-primary-accent/40'
                  : 'text-text-secondary hover:text-text-primary hover:bg-border-color/30'
              }`}
            >
              {th.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Family Selector */}
      <div id="font-family-toggle-container" className="flex flex-col gap-2 pb-3.5 border-b border-border-color/60">
        <span className={headerClass}>
          <Type className="w-4.5 h-4.5 text-primary-accent" />
          גופן:
        </span>
        <div className="relative w-full">
          <select
            id="font-select"
            value={settings.fontFamily}
            onChange={(e) => onChange({ ...settings, fontFamily: e.target.value as AppSettings['fontFamily'] })}
            className="w-full bg-bg-card border-2 border-border-color rounded-xl text-sm text-text-primary focus:outline-none focus:border-primary-accent pr-3.5 pl-10 py-2.5 cursor-pointer font-bold shadow-xs appearance-none transition-colors"
          >
            {fontOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-bg-card text-text-primary">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary flex items-center justify-center">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Font Size Selector */}
      <div id="font-size-selector-container" className="flex flex-col gap-2 pb-3.5 border-b border-border-color/60">
        <span className={headerClass}>
          <ALargeSmall className="w-4.5 h-4.5 text-primary-accent" />
          גודל טקסט:
        </span>
        <div className="grid grid-cols-3 bg-bg-muted p-1 rounded-xl border border-border-color w-full gap-1">
          {fontSizes.map((fs) => (
            <button
              key={fs.value}
              id={`btn-fontsize-${fs.value}`}
              onClick={() => {
                onChange({ ...settings, fontSize: fs.value });
                triggerAutoClose();
              }}
              className={`h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                settings.fontSize === fs.value
                  ? 'bg-bg-card text-text-primary font-bold shadow-xs border border-primary-accent ring-1 ring-primary-accent/40'
                  : 'text-text-secondary hover:text-text-primary hover:bg-border-color/30'
              }`}
              title={`גודל ${fs.value}`}
            >
              <span className={fs.labelSizeClass}>{fs.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Image Toggle */}
      <div id="image-toggle-container" className="flex flex-col gap-2 pb-3.5 border-b border-border-color/60">
        <span className={headerClass}>
          <Image className="w-4.5 h-4.5 text-primary-accent" />
          תמונות:
        </span>
        <div className="grid grid-cols-2 bg-bg-muted p-1 rounded-xl border border-border-color w-full gap-1">
          <button
            id="btn-show-images-yes"
            onClick={() => {
              onChange({ ...settings, showImages: true });
              triggerAutoClose();
            }}
            className={`py-2 rounded-lg text-xs sm:text-sm transition-all cursor-pointer font-bold text-center ${
              settings.showImages
                ? 'bg-bg-card text-text-primary shadow-xs border border-primary-accent ring-1 ring-primary-accent/40'
                : 'text-text-secondary hover:text-text-primary hover:bg-border-color/30'
            }`}
          >
            הצג
          </button>
          <button
            id="btn-show-images-no"
            onClick={() => {
              onChange({ ...settings, showImages: false });
              triggerAutoClose();
            }}
            className={`py-2 rounded-lg text-xs sm:text-sm transition-all cursor-pointer font-bold text-center ${
              !settings.showImages
                ? 'bg-bg-card text-text-primary shadow-xs border border-primary-accent ring-1 ring-primary-accent/40'
                : 'text-text-secondary hover:text-text-primary hover:bg-border-color/30'
            }`}
          >
            הסתר
          </button>
        </div>
      </div>

      {/* Reset to Default Settings Button */}
      <div className="pt-1">
        <button
          id="btn-reset-default-settings"
          onClick={() => {
            onChange(DEFAULT_SETTINGS);
          }}
          className="w-full py-2.5 px-4 rounded-xl border border-border-color bg-bg-muted hover:bg-bg-card text-text-secondary hover:text-text-primary text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs active:scale-98"
        >
          <RotateCcw className="w-4 h-4 text-primary-accent" />
          <span>איפוס להגדרות ברירת מחדל</span>
        </button>
      </div>

      {/* Download All Images Section */}
      {onOpenDownloadImages && (
        <div className="pt-1">
          <button
            id="btn-download-all-images-settings"
            onClick={() => {
              onOpenDownloadImages();
              if (onCloseSettings) onCloseSettings();
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs active:scale-98"
            title="הורדת כל 92 התמונות של פרק שירה באיכות מקסימלית בקובץ ZIP"
          >
            <Download className="w-4 h-4 text-amber-500" />
            <span>הורדת כל התמונות</span>
          </button>
        </div>
      )}

    </div>
  );
}
