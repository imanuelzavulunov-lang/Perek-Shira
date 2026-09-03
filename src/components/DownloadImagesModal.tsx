import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, CheckCircle2, AlertCircle, Loader2, Sparkles, FolderArchive } from 'lucide-react';
import { downloadAllPerekShiraImagesZip, DownloadProgress } from '../lib/imageDownloader';

interface DownloadImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export default function DownloadImagesModal({
  isOpen,
  onClose,
  onSuccessToast,
}: DownloadImagesModalProps) {
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startDownload = async () => {
    setErrorMsg(null);
    setIsDownloading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await downloadAllPerekShiraImagesZip(
        (p) => {
          setProgress(p);
        },
        controller.signal
      );
      if (onSuccessToast) {
        onSuccessToast('כל התמונות ירדו בהצלחה בקובץ ZIP! 📥✨');
      }
    } catch (err: any) {
      if (err.message === 'Download aborted by user') {
        setProgress(null);
      } else {
        console.error('Error downloading images zip:', err);
        setErrorMsg('אירעה שגיאה בעת הורדת התמונות. אנא נסה שנית.');
      }
    } finally {
      setIsDownloading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsDownloading(false);
    setProgress(null);
  };

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        if (!isDownloading) {
          setProgress(null);
          setErrorMsg(null);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isDownloading]);

  const isDone = progress?.phase === 'done';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="download-images-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          onClick={!isDownloading ? onClose : undefined}
          onTouchMove={(e) => e.target === e.currentTarget && e.preventDefault()}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer overscroll-contain"
          dir="rtl"
        >
          {/* Modal Window */}
          <motion.div
            id="download-images-modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            style={{ willChange: 'transform, opacity' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-bg-card border-[1.5px] border-border-color rounded-2xl shadow-2xl overflow-hidden p-6 text-text-primary my-auto cursor-default"
          >
            {/* Header with Close */}
          <div className="flex items-center justify-between pb-4 border-b border-border-color/60 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <FolderArchive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-frank font-bold text-lg text-text-primary">
                  הורדת כל התמונות
                </h3>
                <p className="text-xs text-text-secondary">
                  קובץ ZIP מאורגן ומסודר לפי כל פרקי השירה
                </p>
              </div>
            </div>

            {!isDownloading && (
              <button
                onClick={onClose}
                className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-muted transition-colors cursor-pointer"
                title="סגור"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Body Content */}
          <div className="space-y-4 text-right">
            {!isDownloading && !isDone && (
              <>
                <div className="bg-bg-muted/70 rounded-xl p-4 border border-border-color/50 text-sm space-y-2 text-text-secondary leading-relaxed">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      ההורדה תאגד את <strong>כל 92 התמונות</strong> של פרק שירה ברזולוציה המקורית הגבוהה ביותר (HD) ללא כיווץ או חיתוך.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      התמונות מחולקות לתיקיות מסודרות לפי פרקים (פרק א׳ עד פרק ו׳) עם שמות הבריות בעברית.
                    </span>
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="pt-2 flex gap-2.5">
                  <button
                    id="btn-start-download-images"
                    onClick={startDownload}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>הורד את כל התמונות (ZIP)</span>
                  </button>
                  <button
                    id="btn-cancel-download-images"
                    onClick={onClose}
                    className="py-3 px-4 rounded-xl border border-border-color bg-bg-muted hover:bg-border-color/40 text-text-secondary hover:text-text-primary text-sm font-semibold transition-all cursor-pointer active:scale-98"
                  >
                    ביטול
                  </button>
                </div>
              </>
            )}

            {/* Active Download Progress */}
            {isDownloading && progress && (
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    {progress.phase === 'compressing'
                      ? 'דוחס ומכין את קובץ ה-ZIP...'
                      : 'מוריד תמונות באיכות מקסימלית...'}
                  </span>
                  <span className="text-amber-500 font-mono text-sm">
                    {progress.percentage}%
                  </span>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full h-3 bg-bg-muted rounded-full overflow-hidden border border-border-color/60 p-0.5">
                  <motion.div
                    className="h-full bg-linear-to-r from-amber-500 to-amber-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.percentage}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>

                {/* Status and Current item */}
                <div className="text-xs text-text-secondary flex justify-between items-center pt-1 border-t border-border-color/40">
                  <span className="truncate max-w-[220px]" title={progress.currentTitle}>
                    {progress.currentTitle}
                  </span>
                  <span className="font-semibold text-text-primary">
                    {progress.completed + progress.failed} / {progress.total}
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleCancel}
                    className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold transition-all cursor-pointer"
                  >
                    ביטול הורדה
                  </button>
                </div>
              </div>
            )}

            {/* Download Completed Success State */}
            {!isDownloading && isDone && (
              <div className="space-y-4 py-3 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-text-primary">
                    הקובץ הורד בהצלחה!
                  </h4>
                  <p className="text-xs text-text-secondary mt-1">
                    כל 92 התמונות נשמרו בקובץ <strong>ZIP</strong> בתיקיית ההורדות שלך באיכות מלאה.
                  </p>
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button
                    onClick={startDownload}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-border-color bg-bg-muted hover:bg-border-color/40 text-text-primary text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-500" />
                    <span>הורד שוב</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    סגור
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
