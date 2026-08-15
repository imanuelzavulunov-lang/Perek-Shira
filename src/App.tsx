import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  Bell,
  ChevronUp,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PEREK_SHIRA_DATA } from './data';
import { Verse, AppSettings, DailyReminder, DEFAULT_SETTINGS } from './types';
import { speakVerse } from './lib/speech';
import SettingsPanel from './components/SettingsPanel';
import SearchAndFilter from './components/SearchAndFilter';
import VerseCard from './components/VerseCard';
import ReminderModal from './components/ReminderModal';
import IntroSection from './components/IntroSection';
import YehiRatzonCard from './components/YehiRatzonCard';
import BottomIntroSection from './components/BottomIntroSection';
import SequentialPlayToast from './components/SequentialPlayToast';

export default function App() {
  // --- Core States ---
  const [selectedChapterId, setSelectedChapterId] = useState<number | 'yehi-ratzon' | null>(null);
  const [activePlayingVerseId, setActivePlayingVerseId] = useState<string | null>(null);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- Sequential Audio Playback States & Refs ---
  const [toastState, setToastState] = useState<{ verseId: string; chapterId: number } | null>(null);
  const isSequentialRef = useRef(false);

  const playVerseAudio = (verse: Verse, chapterId: number) => {
    setActivePlayingVerseId(verse.id);

    speakVerse(
      verse,
      () => {
        if (isSequentialRef.current) {
          const chapter = PEREK_SHIRA_DATA.find((c) => c.id === chapterId);
          if (chapter) {
            const idx = chapter.verses.findIndex((v) => v.id === verse.id);
            let nextVerse: Verse | null = null;
            let nextChapterId = chapterId;

            if (idx !== -1 && idx < chapter.verses.length - 1) {
              nextVerse = chapter.verses[idx + 1];
            } else if (chapterId < 6) {
              const nextChapter = PEREK_SHIRA_DATA.find((c) => c.id === chapterId + 1);
              if (nextChapter && nextChapter.verses.length > 0) {
                nextVerse = nextChapter.verses[0];
                nextChapterId = chapterId + 1;
              }
            }

            if (nextVerse) {
              const targetVerse = nextVerse;
              const targetChapterId = nextChapterId;

              // Ensure next chapter is visible if filtered
              setSelectedChapterId((prev) => {
                if (typeof prev === 'number' && prev !== targetChapterId) {
                  return null;
                }
                return prev;
              });

              setTimeout(() => {
                const el = document.getElementById(`verse-card-${targetVerse.id}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 120);

              playVerseAudio(targetVerse, targetChapterId);
              return;
            }
          }
        }
        isSequentialRef.current = false;
        setActivePlayingVerseId(null);
      },
      () => {
        isSequentialRef.current = false;
        setActivePlayingVerseId(null);
        showNotification('הקראת שמע נכשלה בדפדפן זה.');
      }
    );
  };

  const handlePlayToggle = (verse: Verse, chapterId: number) => {
    if (!('speechSynthesis' in window)) {
      showNotification('הקראה קולית אינה נתמכת בדפדפן שלך.');
      return;
    }

    if (activePlayingVerseId === verse.id) {
      window.speechSynthesis.cancel();
      setActivePlayingVerseId(null);
      isSequentialRef.current = false;
      setToastState(null);
      return;
    }

    window.speechSynthesis.cancel();
    isSequentialRef.current = false;
    playVerseAudio(verse, chapterId);

    const chapter = PEREK_SHIRA_DATA.find((c) => c.id === chapterId);
    if (chapter) {
      const idx = chapter.verses.findIndex((v) => v.id === verse.id);
      const isLastOfAll = chapterId === 6 && idx === chapter.verses.length - 1;
      if (!isLastOfAll) {
        setToastState({ verseId: verse.id, chapterId });
      } else {
        setToastState(null);
      }
    }
  };

  const handleConfirmSequentialPlay = () => {
    if (!toastState) return;
    const { verseId, chapterId } = toastState;
    setToastState(null);
    isSequentialRef.current = true;
    showNotification('הקראת רצף הופעלה עד סוף פרק ו׳!');

    if (activePlayingVerseId !== verseId) {
      const chapter = PEREK_SHIRA_DATA.find((c) => c.id === chapterId);
      const verse = chapter?.verses.find((v) => v.id === verseId);
      if (verse) {
        playVerseAudio(verse, chapterId);
      }
    }
  };

  // --- Scroll Spy Refs ---
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<any | null>(null);

  // --- Theme & Appearance States ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('perek-shira-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validFonts = ['heebo', 'frank', 'hadassah', 'rubik', 'varela'];
        const validThemes = ['light', 'yellow', 'dark', 'dark-blue'];
        const validFontSizes = ['sm', 'base', 'lg', 'xl', '2xl'];
        return {
          theme: validThemes.includes(parsed.theme) ? parsed.theme : DEFAULT_SETTINGS.theme,
          fontFamily: validFonts.includes(parsed.fontFamily) ? parsed.fontFamily : DEFAULT_SETTINGS.fontFamily,
          fontSize: validFontSizes.includes(parsed.fontSize) ? parsed.fontSize : DEFAULT_SETTINGS.fontSize,
          showImages: parsed.showImages !== undefined ? Boolean(parsed.showImages) : DEFAULT_SETTINGS.showImages,
        };
      } catch (e) {
        // Fallback
      }
    }
    return DEFAULT_SETTINGS;
  });

  // --- Scroll Position Preservation on Settings Change ---
  const scrollAnchorRef = useRef<{ id: string; prevTop: number } | null>(null);

  const captureScrollAnchor = () => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.verse-card-item, #yehi-ratzon-card, #intro-section, #main-hero'
      )
    );

    if (elements.length === 0) return;

    const headerOffset = 80;
    let bestEl: HTMLElement | null = null;
    let minDiff = Infinity;

    for (const el of elements) {
      if (!el.id) continue;
      const rect = el.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        const diff = Math.abs(rect.top - headerOffset);
        if (diff < minDiff) {
          minDiff = diff;
          bestEl = el;
        }
      }
    }

    if (!bestEl) {
      for (const el of elements) {
        if (!el.id) continue;
        const rect = el.getBoundingClientRect();
        const diff = Math.abs(rect.top - headerOffset);
        if (diff < minDiff) {
          minDiff = diff;
          bestEl = el;
        }
      }
    }

    if (bestEl) {
      scrollAnchorRef.current = {
        id: bestEl.id,
        prevTop: bestEl.getBoundingClientRect().top,
      };
    }
  };

  const handleSettingsChange = (newSettings: AppSettings) => {
    captureScrollAnchor();
    setSettings(newSettings);
  };

  useLayoutEffect(() => {
    if (!scrollAnchorRef.current) return;

    const { id, prevTop } = scrollAnchorRef.current;
    scrollAnchorRef.current = null;

    const el = document.getElementById(id);
    if (el) {
      const newTop = el.getBoundingClientRect().top;
      const delta = newTop - prevTop;
      if (Math.abs(delta) > 0.5) {
        window.scrollBy({ top: delta, behavior: 'instant' as ScrollBehavior });
      }
    }
  }, [settings]);

  // --- Daily Reminder States ---
  const [reminder, setReminder] = useState<DailyReminder>(() => {
    const saved = localStorage.getItem('perek-shira-reminder');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { enabled: false, time: '18:00' };
  });

  // --- Sync to LocalStorage & HTML Class ---
  useEffect(() => {
    localStorage.setItem('perek-shira-settings', JSON.stringify(settings));
    
    // Apply theme attribute and class to <html> root element
    const root = document.documentElement;
    root.setAttribute('data-theme', settings.theme);
    root.classList.remove('theme-light', 'theme-dark', 'theme-warm', 'theme-parchment', 'theme-sky', 'theme-yellow', 'theme-dark-blue');
    root.classList.add(`theme-${settings.theme}`);
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('perek-shira-reminder', JSON.stringify(reminder));
  }, [reminder]);

  // --- Lock Body & HTML Scroll when Reminder Modal is open ---
  useEffect(() => {
    if (isReminderOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isReminderOpen]);

  // --- Scroll Button Observer ---
  const [showScrollDownBtn, setShowScrollDownBtn] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      // Smoothly fade out when scrolled to the absolute bottom of the page
      const threshold = 15; // safety margin for subpixel rendering
      const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - threshold;
      setShowScrollDownBtn(!isAtBottom);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const animateScrollTo = (targetId: string) => {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    const offset = targetId === 'main-hero' ? 0 : 80;
    const elementPosition = targetElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.scrollY - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // --- Notification Toast Helper ---
  const notificationTimeoutRef = useRef<any | null>(null);

  const showNotification = (message: string) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setNotification(message);
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
      notificationTimeoutRef.current = null;
    }, 3000);
  };

  // --- Fast navigation chip click ---
  const handleChapterSelect = (id: number | 'yehi-ratzon' | null) => {
    setSelectedChapterId(id);
    isScrollingRef.current = true;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    setTimeout(() => {
      let targetId = '';
      if (id === null) {
        targetId = 'main-hero';
      } else if (id === 'yehi-ratzon') {
        targetId = 'yehi-ratzon-card';
      } else {
        targetId = `chapter-section-${id}`;
      }
      
      animateScrollTo(targetId);
      
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 800);
    }, 100);
  };

  // --- Scroll Spy / Intersection Observer ---
  useEffect(() => {
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      if (isScrollingRef.current) return;

      const intersecting = entries.find(entry => entry.isIntersecting);
      if (intersecting) {
        const id = intersecting.target.id;
        if (id === 'main-hero') {
          setSelectedChapterId(null);
        } else if (id === 'yehi-ratzon-card') {
          setSelectedChapterId('yehi-ratzon');
        } else if (id.startsWith('chapter-section-')) {
          const num = parseInt(id.replace('chapter-section-', ''), 10);
          if (!isNaN(num)) {
            setSelectedChapterId(num);
          }
        }
      }
    };

    const observer = new IntersectionObserver(handleIntersection, {
      root: null, // observe viewport
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0,
    });

    const targets = [
      document.getElementById('main-hero'),
      ...Array.from({ length: 6 }, (_, i) => document.getElementById(`chapter-section-${i + 1}`)),
      document.getElementById('yehi-ratzon-card')
    ];

    targets.forEach(target => {
      if (target) observer.observe(target);
    });

    return () => {
      observer.disconnect();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Map font settings to classes
  const fontClass = {
    heebo: 'font-heebo',
    frank: 'font-frank',
    hadassah: 'font-hadassah',
    rubik: 'font-rubik',
    varela: 'font-varela',
  }[settings.fontFamily] || 'font-frank';

  const fontSizeClass = {
    sm: 'text-[17px] md:text-[19px]',
    base: 'text-[19px] md:text-[21px]',
    lg: 'text-[21px] md:text-[24px]',
    xl: 'text-[23px] md:text-[27px]',
    '2xl': 'text-3xl md:text-4xl',
  }[settings.fontSize] || 'text-lg md:text-xl';

  // Filter Chapters to show - Always render all chapters so jumping is a smooth scroll and doesn't omit content
  const filteredChapters = PEREK_SHIRA_DATA;

  return (
    <div id="main-app-container" className={`min-h-screen flex flex-col bg-bg-app select-text transition-colors duration-200 ${fontClass}`}>
      <nav 
        className="h-16 flex items-center px-4 md:px-8 justify-between text-white fixed top-0 left-0 right-0 z-50 select-none shadow-md shrink-0 transition-colors duration-200" 
        style={{ 
          backgroundColor: settings.theme === 'yellow' ? '#856121' : '#152935'
        }}
        dir="rtl"
      >
        <div className="flex items-center gap-3.5">
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="relative w-10 h-10 flex items-center justify-center focus:outline-none z-50 cursor-pointer hover:bg-white/10 rounded-xl transition-colors"
            title="תפריט הגדרות"
          >
            {/* Animated hamburger to X */}
            <div className="w-6 h-[16px] relative z-10 flex flex-col justify-between">
              <motion.span
                animate={isMenuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.25 }}
                className="w-full h-[2px] bg-white rounded-full block origin-center"
              />
              <motion.span
                animate={isMenuOpen ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="w-full h-[2px] bg-white rounded-full block origin-center"
              />
              <motion.span
                animate={isMenuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.25 }}
                className="w-full h-[2px] bg-white rounded-full block origin-center"
              />
            </div>
          </button>

          {/* Secondary small logo (clean serif text matching the uploaded image logo style) */}
          <span className="font-frank font-extrabold text-[21.6px] md:text-[27px] text-white select-none leading-none tracking-wide">
            פרק שירה
          </span>
        </div>

        {/* Stats and Action */}
        <div className="flex items-center gap-3 md:gap-4 text-xs font-semibold">
          {/* Set Reminder Button inside Header Navigation */}
          <button
            onClick={() => setIsReminderOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border font-bold cursor-pointer transition-all shadow-3xs text-xs md:text-sm ${
              reminder.enabled
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200 hover:bg-amber-500/30'
                : 'border-white/20 bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="הגדר תזכורת יומית"
          >
            <Bell className={`w-4 h-4 ${reminder.enabled ? 'text-amber-400 fill-amber-400/30' : 'text-white'}`} />
            <span>{reminder.enabled ? 'התזכורת הוגדרה' : 'הגדר תזכורת'}</span>
          </button>
        </div>
      </nav>

      {/* Side Menu (Slide-out panel for settings) */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ willChange: 'opacity' }}
              onClick={() => setIsMenuOpen(false)}
              onTouchMove={(e) => e.preventDefault()}
              className="fixed inset-0 bg-black/60 z-45 touch-none"
            />

            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              style={{ willChange: 'transform' }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-bg-card border-l border-border-color shadow-2xl z-46 flex flex-col p-5 sm:p-6 overflow-y-auto overscroll-contain"
              dir="rtl"
            >
              <div className="border-b border-border-color pb-3 mb-4 mt-14">
                <h3 className="font-bold text-lg text-text-primary flex items-center gap-1.5">
                  <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-text-primary stroke-[2.2]" />
                  <span>הגדרות תצוגה</span>
                </h3>
              </div>

              <div className="flex-1 space-y-4">
                <SettingsPanel settings={settings} onChange={handleSettingsChange} onCloseSettings={() => setIsMenuOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Scrollable Container */}
      <div id="main-content-scroll" className="flex-1 pt-16">
        
        {/* Main Hero Header */}
        <header id="main-hero" className="relative overflow-hidden py-6 md:py-9 text-center select-none shrink-0 px-4">
          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
            
            {/* Main Logo (clean serif text matching the uploaded image logo style) */}
            <div className="pb-4">
              <h1 id="app-title-h1" className="text-[43px] md:text-[65px] font-frank font-extrabold text-text-primary select-none tracking-normal leading-none">
                פרק שירה
              </h1>
            </div>

            <p id="app-subtitle" dir="rtl" className="text-[15.2px] md:text-[17.1px] text-text-secondary max-w-xl mx-auto leading-relaxed font-medium">
           פרק שירה הוא חיבור קצר (ברייתא) המסוגנן בלשון חז"ל. הפרק מכיל קטעי שירה אותם שרות כל הבריות בשבח הקב"ה. כל הקטעים הם פסוקים הלקוחים מהתנ"ך, רובם מספר תהלים. יש במסורת היהודית שייחסו חיבור זה לדוד המלך, ויש המוסיפים גם את שלמה המלך שחיברו עם אביו במשותף.
            </p>


          </div>
        </header>

        {/* Intro Guide Card (Always displayed at the top of content) */}
        <IntroSection settings={settings} />

        {/* Chapters Fast Navigation Menu */}
        <SearchAndFilter
          chapters={PEREK_SHIRA_DATA}
          selectedChapterId={selectedChapterId}
          onChapterSelect={handleChapterSelect}
        />

        {/* Chapters and Verses Display Loop */}
        <main className="max-w-4xl mx-auto px-4 md:px-6 pb-[30px]" dir="rtl">
          <div className="space-y-12">
            {filteredChapters.map((chapter) => (
              <section
                key={chapter.id}
                id={`chapter-section-${chapter.id}`}
                className="space-y-6 pt-0"
              >
                {/* Chapter Title Badge */}
                <div className="flex items-center gap-3 border-b border-border-color pb-3 select-none">
                  <div>
                    <h2 className="font-hadassah font-extrabold text-3xl md:text-4xl text-text-primary">
                      {chapter.titleHebrew}
                    </h2>
                  </div>
                </div>

                {/* Verses Cards List */}
                <div className="grid grid-cols-1 gap-6">
                  {chapter.verses.map((verse) => (
                    <VerseCard
                      key={verse.id}
                      verse={verse}
                      chapterId={chapter.id}
                      settings={settings}
                      onShowNotification={showNotification}
                      activePlayingVerseId={activePlayingVerseId}
                      onPlayToggle={handlePlayToggle}
                    />
                  ))}
                </div>

                {/* Chapter Back to Top button */}
                {chapter.id === 6 && (
                  <div className="flex justify-center" style={{ marginTop: '35px', marginBottom: '-13px' }}>
                    <button
                      onClick={scrollToTop}
                      className="px-7 py-3 border border-border-color bg-bg-card hover:bg-bg-muted text-text-primary text-sm font-bold rounded-full transition-all cursor-pointer shadow-3xs flex items-center gap-2"
                    >
                      <ChevronUp className="w-5 h-5 text-primary-accent" />
                      <span>חזרה לראש העמוד</span>
                    </button>
                  </div>
                )}
              </section>
            ))}

            {/* Custom Segula Text Card (Rabbi Yeshaya) - Rendered directly above the request card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{ willChange: 'transform, opacity' }}
              className="bg-bg-card border border-border-color rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden text-text-primary text-right !mt-6"
              dir="rtl"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-border-color/60">
                <div className="py-1">
                  <h3 className="font-frank font-bold text-xl md:text-2xl text-text-primary tracking-wide leading-none">
                    לְאַחַר מִכֵּן יֹאמַר פְּסוּקִים אֵלּוּ
                  </h3>
                </div>
              </div>

              <div className="bg-bg-app/45 rounded-xl p-5 md:p-6 border border-border-color/30 leading-relaxed text-text-primary select-text">
                <p className={`${fontClass} ${fontSizeClass} leading-relaxed font-bold select-text tracking-wide text-justify whitespace-pre-line`}>
                  {"רַבִּי יְשַׁעְיָה תַּלְמִידוֹ שֶׁל רַבִּי חֲנִינָא בֶּן דּוֹסָא הִתְעַנָּה חָמֵשׁ וּשְׁמוֹנִים תַּעְנִיּוֹת, אָמַר כְּלָבִים שֶׁכָּתוּב בָּהֶם וְהַכְּלָבִים עַזֵּי נֶפֶשׁ לֹא יָדְעוּ שָׂבְעָה יִזְכּוּ לוֹמַר שִׁירָה. וְעָנַה לוֹ מַלְאָךְ מִן הַשָּׁמַיִם, וְאָמְרוּ לוֹ יְשַׁעְיָה עַד מָתַי אַתָּה מִתְעַנֶּה עַל זֶה הַדָּבָר, שְׁבוּעָה הִיא מִלִּפְנֵי הַמָּקוֹם בָּרוּךְ הוּא מִיּוֹם שֶׁגִּלָּה סוֹדוֹ לַחֲבַקוּק הַנָּבִיא לֹא גִלָּה דָבָר זֶה לְשׁוּם בְּרִיָּה בָּעוֹלָם, אֶלָּא בִּשְׁבִיל שֶׁתַּלְמִידוֹ שֶׁל אָדָם גָּדוֹל אַתָּה, שְׁלָחוּנִי מִן הַשָּׁמַיִם לִזְדַּקֵּק אֵלֶיךָ, וְאָמְרוּ כְּלָבִים כְּתִיב בָּהֶם וּלְכֹל בְּנֵי יִשְׂרָאֵל לֹא יֶחֱרַץ כֶּלֶב לְשׁוֹנוֹ, וְלֹא עוֹד אֶלָּא שֶׁזָכוּ לְעַבֵּד עוֹרוֹת מִצּוֹאָתָם, שֶׁכּוֹתְבִין בָּהֶם תְּפִלִּין וּמְזוּזוֹת וְסֶפֶר תּוֹרָה, עַל כֵּן זָכוּ לוֹמַר שִׁירָה. וּמַה שֶׁשָּׁאַלְתָּ חֲזוֹר לַאֲחוֹרֶיךָ וְאַל תּוֹסִיף בַּדָּבָר הַזֶּה עוֹד, כְּמוֹ שֶׁכָּתוּב שׁוֹמֵר פִּיו וּלְשׁוֹנוֹ שׁוֹמֵר מִצָּרוֹת נַפְשׁוֹ: בָּרוּךְ יְיָ לְעוֹלָם אָמֵן וְאָמֵן. בָּרוּךְ יְיָ מִצִּיּוֹן שׁוֹכֵן יְרוּשָׁלַיִם הַלְלוּיָּה. בָּרוּךְ יְיָ אֶלֹהִים אֶלֹהֵי יִשְׂרָאֵל עוֹשֶׂה נִפְלָאוֹת לְבַדּוֹ. וּבָרוּךְ שֵׁם כְּבוֹדוֹ לְעוֹלָם וִימָלֵּא כְבוֹדוֹ אֶת כָּל הָאָרֶץ אָמֵן וְאָמֵן:"}
                </p>
                <span className="text-xs uppercase tracking-wider text-text-secondary block mt-3 font-medium font-rubik text-right">
                  ילקוט שמעוני, פרשת בא, רמז קפז
                </span>
              </div>
            </motion.div>

            {/* Tefilat Yehi Ratzon card */}
            <YehiRatzonCard settings={settings} />

            {/* Bottom Virtue Section (Perek Shira Virtue at the end of page) */}
            <BottomIntroSection settings={settings} />

          </div>
        </main>
        <br/>
        {/* Footer */}
        <footer id="site-footer" className="w-full bg-[#111827] border-t border-[#1f2937] py-8 px-4 text-center text-xs text-[#d1d5db] select-text mt-auto" dir="rtl">
          <div className="max-w-4xl mx-auto leading-relaxed font-medium">
            © כל הזכויות שמורות לעמנואל זבולונוב, חברת ™sl@sh. טקסט פרק השירה באתר הועתק מ-ויקיטקסט בכפוף לרישיון CC-BY-SA-3.0
          </div>
        </footer>
      </div>

      {/* Floating Auto-Scroll Button */}
      <button
        onClick={() => {
          const cards = document.querySelectorAll('.verse-card-item');
          let scrollAmount = window.innerHeight * 0.85; // fallback
          if (cards && cards.length > 0) {
            if (settings.showImages) {
              // If images are SHOWN: scroll by the exact height of one card + 24px gap
              const height1 = cards[0].getBoundingClientRect().height;
              scrollAmount = height1 + 24;
            } else {
              // If images are HIDDEN: scroll by the height of two cards + 24px gap
              if (cards.length >= 2) {
                const height1 = cards[0].getBoundingClientRect().height;
                const height2 = cards[1].getBoundingClientRect().height;
                scrollAmount = height1 + height2 + 24;
              } else {
                const height1 = cards[0].getBoundingClientRect().height;
                scrollAmount = height1 * 2 + 24;
              }
            }
          }
          window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        }}
        className={`fixed bottom-6 left-6 md:bottom-8 md:left-8 z-40 text-white p-3 rounded-full shadow-md cursor-pointer border border-white/10 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 hover:brightness-110 ${
          showScrollDownBtn ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-75 pointer-events-none'
        }`}
        style={{ backgroundColor: settings.theme === 'yellow' ? '#856121' : '#1e3040' }}
        title="גלול למטה"
        dir="rtl"
      >
        <ChevronDown className="w-5 h-5" />
      </button>

      {/* Daily Reminder Settings Modal */}
      <ReminderModal
        isOpen={isReminderOpen}
        onClose={() => setIsReminderOpen(false)}
        reminder={reminder}
        onSave={(newReminder, options) => {
          setReminder(newReminder);
          if (!options?.silent) {
            showNotification('התזכורת נשמרה בהצלחה!');
          }
        }}
      />

      {/* Sequential Play Floating Panel Toast */}
      <SequentialPlayToast
        isOpen={Boolean(toastState)}
        onConfirm={handleConfirmSequentialPlay}
        onClose={() => setToastState(null)}
      />

      {/* Global Notifications Toast Alert */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-6 right-6 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 bg-text-primary text-bg-card px-5 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center justify-center gap-2 border border-border-color/10"
            dir="rtl"
          >
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
