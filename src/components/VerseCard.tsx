import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Copy, Check } from 'lucide-react';
import { Verse, AppSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { formatHebrewVerse } from '../lib/speech';
import { getVerseImage } from '../lib/verseImages';

interface VerseCardProps {
  key?: string;
  verse: Verse;
  chapterId: number;
  settings: AppSettings;
  onShowNotification: (message: string) => void;
  activePlayingVerseId: string | null;
  onPlayToggle: (verse: Verse, chapterId: number) => void;
}

export default function VerseCard({
  verse,
  chapterId,
  settings,
  onShowNotification,
  activePlayingVerseId,
  onPlayToggle,
}: VerseCardProps) {
  const isPlaying = activePlayingVerseId === verse.id;
  const isOtherPlaying = activePlayingVerseId !== null && !isPlaying;
  const [copied, setCopied] = useState(false);

  // Preload TTS voices for mobile browsers
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }
  }, []);

  // Map font settings to classes
  const fontClass = {
    heebo: 'font-heebo',
    frank: 'font-frank',
    hadassah: 'font-hadassah',
    david: 'font-david',
    rubik: 'font-rubik',
    varela: 'font-varela',
    amatic: 'font-amatic',
  }[settings.fontFamily] || 'font-frank';
  
  const fontSizeClasses = {
    sm: { title: 'text-[21px] md:text-[23px]', hebrew: 'text-[18px] md:text-[19px]' },
    base: { title: 'text-[23px] md:text-[26px]', hebrew: 'text-[20px] md:text-[22px]' },
    lg: { title: 'text-[25px] md:text-[30px]', hebrew: 'text-[22px] md:text-[25px]' },
    xl: { title: 'text-[26px] md:text-[32px]', hebrew: 'text-2xl md:text-[28px]' },
    '2xl': { title: 'text-[33px] md:text-[40px]', hebrew: 'text-3xl' },
  }[settings.fontSize];

  // Copy to Clipboard
  const handleCopy = () => {
    const formattedVerse = formatHebrewVerse(verse.verseHebrew);
    const textToCopy = `${verse.titleHebrew}
    
${formattedVerse} (${verse.sourceHebrew})

שותף מתוך אפליקציית פרק שירה`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    onShowNotification('הפסוק הועתק ללוח בהצלחה!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Text-To-Speech Toggle
  const handlePlayTTS = () => {
    if (isOtherPlaying) return;
    onPlayToggle(verse, chapterId);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      style={{ willChange: 'transform, opacity' }}
      id={`verse-card-${verse.id}`}
      className="verse-card-item bg-bg-card border border-border-color rounded-2xl p-5 md:p-6 shadow-3xs hover:shadow-2xs transition-all relative overflow-hidden text-text-primary"
    >
      {/* Card Header (Titles & Source) */}
      <div className="flex justify-between items-start gap-4 mb-5 border-b border-border-color/30 pb-4">
        <div className="text-right">
          <div className="flex flex-wrap items-baseline gap-2">
            <h4 id={`verse-title-hebrew-${verse.id}`} className={`font-hadassah font-extrabold text-text-primary ${fontSizeClasses.title}`}>
              {verse.titleHebrew}
            </h4>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* TTS Button */}
          <button
            onClick={handlePlayTTS}
            disabled={isOtherPlaying}
            className={`p-2 rounded-lg border transition-all ${
              isOtherPlaying
                ? 'border-border-color/40 text-text-muted opacity-40 cursor-not-allowed'
                : isPlaying
                ? 'bg-primary-accent text-white border-primary-accent cursor-pointer'
                : 'border-border-color text-text-secondary hover:bg-bg-muted cursor-pointer'
            }`}
            title={isOtherPlaying ? 'הקראה פעילה בבריה אחרת' : isPlaying ? 'עצור הקראה' : 'הקראת שמע'}
          >
            {isPlaying ? <VolumeX className="w-4 h-4 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg border border-border-color text-text-secondary hover:bg-bg-muted transition-all cursor-pointer"
            title="העתק פסוק"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Creature Image (Optional) */}
      {settings.showImages && (
        <div key={`verse-image-${verse.id}`} className="overflow-hidden mb-5">
          <div className="overflow-hidden rounded-xl h-44 md:h-80 w-full border border-border-color/10 relative bg-bg-muted/20 flex items-center justify-center">
            {/* Blurred background representation to fill empty space elegantly on desktop */}
            <div 
              className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-110 pointer-events-none hidden md:block"
              style={{ backgroundImage: `url(${getVerseImage(verse.id)})` }}
            />
            <img
              src={getVerseImage(verse.id)}
              alt={verse.titleHebrew}
              className="w-full h-full object-cover md:object-contain hover:scale-101 transition-transform duration-500 ease-out select-none relative z-10"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* Main Verse Content */}
      <div className="mb-[14px]">
        <div className="text-right">
          <p
            id={`verse-text-hebrew-${verse.id}`}
            className={`${fontClass} ${fontSizeClasses.hebrew} font-bold leading-relaxed text-text-primary select-all`}
            style={{ wordSpacing: '2px' }}
          >
            {formatHebrewVerse(verse.verseHebrew)}
          </p>
          <span className="text-xs uppercase tracking-wider text-text-secondary block mt-3 font-medium font-rubik">
            {verse.sourceHebrew}
          </span>
        </div>
      </div>

    </motion.article>
  );
}
