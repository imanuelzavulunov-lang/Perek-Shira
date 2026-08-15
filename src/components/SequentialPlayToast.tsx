import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SequentialPlayToastProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function SequentialPlayToast({
  isOpen,
  onConfirm,
  onClose,
}: SequentialPlayToastProps) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      onCloseRef.current();
    }, 5000);

    return () => clearTimeout(timer);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[100] max-w-md bg-text-primary text-bg-card px-4 py-3 pb-3.5 rounded-xl shadow-xl flex items-center justify-between gap-3 text-sm font-bold border border-border-color/10 pointer-events-auto select-none overflow-hidden"
          dir="rtl"
        >
          <span className="text-xs sm:text-sm font-medium truncate">
            להשמעה ברצף עד סוף פרק ו׳
          </span>

          <button
            onClick={onConfirm}
            className="shrink-0 bg-bg-card text-text-primary hover:opacity-90 transition-opacity text-xs sm:text-sm font-bold px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap z-10"
          >
            הפעל רצף
          </button>

          {/* 5-Second Visual Countdown Timer Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-bg-card/20 overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
              className="h-full bg-bg-card/80"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



