export interface Verse {
  id: string;
  titleHebrew: string;       // e.g. "השמים אומרים"
  verseHebrew: string;       // e.g. "הַשָּׁמַיִם מְסַפְּרִים כְּבוֹד אֵל..."
  sourceHebrew: string;      // e.g. "תהלים יט, ב"
}

export interface Chapter {
  id: number;
  titleHebrew: string;       // e.g. "פרק א׳"
  descriptionHebrew: string; // e.g. "השמים והארץ וכל אשר בהם..."
  verses: Verse[];
}

export interface AppSettings {
  theme: 'light' | 'yellow' | 'dark' | 'dark-blue';
  fontFamily: 'heebo' | 'frank' | 'hadassah' | 'rubik' | 'varela';
  fontSize: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  showImages: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  fontFamily: 'frank',
  fontSize: 'sm',
  showImages: true,
};

export interface DailyReminder {
  enabled: boolean;
  time: string; // e.g. "08:00"
  days?: number[]; // e.g. [0, 1, 2, 3, 4, 5, 6] (0 = Sunday, 1 = Monday, etc.)
  recurrence?: 'once' | 'weekly';
}
