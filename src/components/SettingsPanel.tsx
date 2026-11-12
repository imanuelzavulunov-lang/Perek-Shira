import { useState } from 'react';
import { Type, ALargeSmall, Eye, Image, ChevronDown, RotateCcw, Share2, Copy, Check } from 'lucide-react';
import { AppSettings, DEFAULT_SETTINGS } from '../types';

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onCloseSettings?: () => void;
  onOpenDownloadImages?: () => void;
  onShowNotification?: (msg: string) => void;
}

export default function SettingsPanel({
  settings,
  onChange,
  onCloseSettings,
  onOpenDownloadImages,
  onShowNotification,
}: SettingsPanelProps) {
  const [copied, setCopied] = useState(false);
  const headerClass = 'flex items-center gap-1.5 font-bold text-text-primary text-sm sm:text-base';

  const triggerAutoClose = () => {
    if (onCloseSettings) {
      setTimeout(() => {
        onCloseSettings();
      }, 220);
    }
  };

  const SHARE_URL = 'https://perek-shira.ai.studio/';
  const SHARE_TEXT = 'אפליקציית פרק שירה המלא - שירת הבריאה מנוקד ומבואר, עם הקראה קולית ותזכורות:';

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      let sharedWithFile = false;

      // Attach app logo image file when supported (Web Share API Level 2) so the share sheet shows the logo
      try {
        const res = await fetch('/app-logo.png');
        if (res.ok) {
          const blob = await res.blob();
          const logoFile = new File([blob], 'perek-shira-logo.png', {
            type: blob.type || 'image/png',
          });

          const shareDataWithUrl: ShareData = {
            title: 'פרק שירה - שירת הבריאה',
            text: `${SHARE_TEXT}\n${SHARE_URL}`,
            url: SHARE_URL,
            files: [logoFile],
          };

          const shareDataWithTextOnly: ShareData = {
            title: 'פרק שירה - שירת הבריאה',
            text: `${SHARE_TEXT}\n${SHARE_URL}`,
            files: [logoFile],
          };

          if (typeof navigator.canShare === 'function' && navigator.canShare(shareDataWithUrl)) {
            await navigator.share(shareDataWithUrl);
            sharedWithFile = true;
          } else if (typeof navigator.canShare === 'function' && navigator.canShare(shareDataWithTextOnly)) {
            await navigator.share(shareDataWithTextOnly);
            sharedWithFile = true;
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        // Fall back to link-only Web Share below
      }

      if (sharedWithFile) {
        if (onShowNotification) onShowNotification('האפליקציה שותפה בהצלחה! ✨');
        return;
      }

      try {
        await navigator.share({
          title: 'פרק שירה - שירת הבריאה',
          text: SHARE_TEXT,
          url: SHARE_URL,
        });
        if (onShowNotification) onShowNotification('האפליקציה שותפה בהצלחה! ✨');
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT}\n${SHARE_URL}`);
      setCopied(true);
      if (onShowNotification) onShowNotification('קישור לאפליקציה הועתק ללוח! 📋');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // fallback
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
      <div className="pt-1 pb-4 border-b border-border-color/60">
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

      {/* Share App Card with App Logo */}
      <div id="share-app-card" className="p-3.5 rounded-2xl border border-border-color bg-bg-muted/40 shadow-xs flex flex-col gap-3 text-[#555555]">
        <div className="flex items-center gap-3">
          <img
            src="/app-logo.png"
            alt="לוגו פרק שירה"
            className="w-12 h-12 rounded-xl object-contain shadow-xs border border-border-color/60 shrink-0 select-none bg-bg-card"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-frank font-extrabold text-[15px] sm:text-base text-text-primary leading-tight">
              פרק שירה - שירת הבריאה
            </span>
            <span className="text-xs text-text-secondary leading-snug mt-0.5">
              שתפו את האפליקציה וזכו במצוות הפצת שירת הבריאה
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            id="btn-share-app"
            onClick={handleShare}
            className="py-2 px-3 rounded-xl bg-primary-accent text-white hover:opacity-95 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer active:scale-98"
          >
            <Share2 className="w-4 h-4" />
            <span>שתף לחברים</span>
          </button>

          <button
            id="btn-copy-app-link"
            onClick={handleCopyLink}
            className={`py-2 px-3 rounded-xl border border-border-color font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer active:scale-98 ${
              copied
                ? 'bg-green-600/15 text-green-700 dark:text-green-400 border-green-600/40'
                : 'bg-bg-card hover:bg-border-color/20 text-text-primary'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span>הועתק!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-primary-accent" />
                <span>העתק קישור</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
