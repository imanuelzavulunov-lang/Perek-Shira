import React from 'react';
import { Chapter } from '../types';

interface SearchAndFilterProps {
  selectedChapterId: number | null | 'yehi-ratzon';
  onChapterSelect: (id: number | null | 'yehi-ratzon') => void;
  chapters: Chapter[];
}

export default function SearchAndFilter({
  selectedChapterId,
  onChapterSelect,
  chapters,
}: SearchAndFilterProps) {
  React.useEffect(() => {
    if (selectedChapterId !== null) {
      const activeBtnId = selectedChapterId === 'yehi-ratzon' ? 'chip-chapter-yehi-ratzon' : `chip-chapter-${selectedChapterId}`;
      const activeBtn = document.getElementById(activeBtnId);
      const container = document.getElementById('chapters-chips-scroll');
      if (activeBtn && container) {
        const containerRect = container.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        
        const relativeLeft = btnRect.left - containerRect.left;
        const relativeRight = btnRect.right - containerRect.left;
        
        if (relativeLeft < 0 || relativeRight > containerRect.width) {
          const targetDiff = (relativeLeft < 0) 
            ? relativeLeft - 16 
            : (relativeRight - containerRect.width) + 16;
            
          container.scrollBy({
            left: targetDiff,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [selectedChapterId]);

  return (
    <div id="search-filter-section" className="max-w-4xl mx-auto px-4 md:px-6 mb-6 space-y-4 text-right text-text-primary" dir="rtl">
      {/* Chapters Fast Navigation & Anchor Links */}
      <div id="chapters-nav" className="space-y-2">
        <span className="text-sm md:text-base font-extrabold text-text-secondary/90 block font-hadassah">דילוג מהיר לפרק:</span>
        <div id="chapters-chips-scroll" className="flex flex-nowrap items-center gap-[6px] select-none font-rubik overflow-x-auto no-scrollbar pb-1.5 -mx-4 px-7 md:mx-0 md:px-0">
          {chapters.map((ch) => {
            const numPart = ch.titleHebrew.replace('פרק ', '');
            return (
              <button
                key={ch.id}
                id={`chip-chapter-${ch.id}`}
                onClick={() => onChapterSelect(ch.id)}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-sm md:text-base font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedChapterId === ch.id
                    ? 'bg-primary-accent text-white shadow-3xs'
                    : 'bg-bg-card border border-border-color text-text-secondary hover:bg-bg-muted'
                }`}
              >
                <span className="hidden sm:inline">פרק </span>{numPart}
              </button>
            );
          })}
          <button
            id="chip-chapter-yehi-ratzon"
            onClick={() => onChapterSelect('yehi-ratzon')}
            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-sm md:text-base font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              selectedChapterId === 'yehi-ratzon'
                ? 'bg-primary-accent text-white shadow-3xs'
                : 'bg-bg-card border border-border-color text-text-secondary hover:bg-bg-muted'
            }`}
          >
            יהי רצון
          </button>
        </div>
      </div>
    </div>
  );
}
