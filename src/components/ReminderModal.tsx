import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Bell, Check, Sparkles, Loader2, ChevronDown, Repeat, Calendar, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyReminder } from '../types';
import { initAuth, googleSignIn, getAccessToken, setAccessToken, createGoogleTask, clearExistingPerekShiraTasks, fetchExistingPerekShiraReminder, logout } from '../lib/gauth';
import { syncUserReminderToFirestore } from '../lib/userDataService';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: DailyReminder;
  onSave: (reminder: DailyReminder, options?: { silent?: boolean }) => void;
}

const DAYS_OF_WEEK = [
  { id: 0, label: 'א׳', name: 'ראשון' },
  { id: 1, label: 'ב׳', name: 'שני' },
  { id: 2, label: 'ג׳', name: 'שלישי' },
  { id: 3, label: 'ד׳', name: 'רביעי' },
  { id: 4, label: 'ה׳', name: 'חמישי' },
  { id: 5, label: 'ו׳', name: 'שישי' },
  { id: 6, label: 'ש׳', name: 'שבת' },
];

export default function ReminderModal({ isOpen, onClose, reminder, onSave }: ReminderModalProps) {
  const [time, setTime] = useState(reminder.time || '');
  const [recurrence, setRecurrence] = useState<'once' | 'weekly'>(
    reminder.enabled ? (reminder.recurrence || 'once') : 'once'
  );
  const [days, setDays] = useState<number[]>(reminder.days || []);
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isUserConnected = !!currentUser;
  const canSave = isUserConnected && !!time && days.length > 0;
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (!wasOpenRef.current) {
        if (reminder.enabled) {
          setTime(reminder.time || '');
          setDays(reminder.days || []);
          setRecurrence(reminder.recurrence || 'once');
          setIsEditing(false);
        } else {
          setTime(reminder.time || '');
          setDays(reminder.days || []);
          setRecurrence(reminder.recurrence || 'once');
          setIsEditing(true);
        }
        setSaved(false);
        setError(null);
        setSuccessMsg(null);
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, reminder.enabled]);

  useEffect(() => {
    const unsubscribe = initAuth((user, token) => {
      setCurrentUser(user);
      setAccessTokenState(token);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (accessToken && reminder.enabled && reminder.time) {
      setIsSyncing(true);
      fetchExistingPerekShiraReminder(accessToken)
        .then((remoteReminder) => {
          if (remoteReminder && remoteReminder.enabled && remoteReminder.time) {
            onSave(remoteReminder, { silent: true });
            setTime(remoteReminder.time);
            setDays(remoteReminder.days || []);
            setRecurrence(remoteReminder.recurrence || 'once');
          }
        })
        .catch((err) => {
          console.warn('Sync reminder error:', err);
        })
        .finally(() => {
          setIsSyncing(false);
        });
    } else {
      setIsSyncing(false);
    }
  }, [accessToken, reminder.enabled]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const toggleDay = (dayId: number) => {
    if (days.includes(dayId)) {
      setDays(days.filter(d => d !== dayId));
    } else {
      setDays([...days, dayId].sort((a, b) => a - b));
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setAccessToken(null); // Clear any old token
      const res = await googleSignIn(true);
      if (res) {
        setCurrentUser(res.user);
        setAccessTokenState(res.accessToken);
        setSuccessMsg('התחברת בהצלחה לחשבון Google עם הרשאות תזכורת!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed-by-user')) {
        console.warn('Login canceled by the user (popup closed).');
        setError('ההתחברות בוטלה על ידי המשתמש. יש להשלים את התהליך בחלון הקופץ.');
      } else {
        console.error('Login error:', err);
        setError('שגיאה בתהליך ההתחברות ל-Google. אנא נסו שוב.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReminder = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let token = accessToken || getAccessToken();
      if (token) {
        try {
          await clearExistingPerekShiraTasks(token);
        } catch (taskErr: any) {
          console.warn('Could not clear tasks directly with token, continuing local cancellation:', taskErr);
        }
      }
      if (currentUser?.uid) {
        await syncUserReminderToFirestore(currentUser.uid, {
          enabled: false,
          time: '',
          days: [],
          recurrence: 'once',
        });
      }
      setDays([]);
      setTime('');
      setRecurrence('once');
      setIsEditing(true);
      localStorage.removeItem('perek-shira-reminder');
      onSave({ enabled: false, time: '', days: [], recurrence: 'once' });
      setSuccessMsg('התזכורת בוטלה בהצלחה.');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Cancel reminder error:', err);
      setError('שגיאה בביטול התזכורת.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEditing = () => {
    setTime(reminder.time || time || '');
    setDays(reminder.days || days || []);
    setRecurrence(reminder.recurrence || recurrence || 'once');
    setIsEditing(true);
    setError(null);
    setSuccessMsg(null);
  };

  const handleLogout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await logout();
      setCurrentUser(null);
      setAccessTokenState(null);
      setTime('');
      setDays([]);
      setRecurrence('once');
      setIsEditing(true);
      localStorage.removeItem('perek-shira-reminder');
      onSave({ enabled: false, time: '', days: [], recurrence: 'once' });
      setSuccessMsg('התנתקת מחשבון Google בהצלחה. הגדרות התזכורת אופסו.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Logout error:', err);
      setError('שגיאה בתהליך ההתנתקות.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (isLoading || !canSave) return;
    setError(null);
    setSuccessMsg(null);

    setIsLoading(true);
    try {
      let token = accessToken || getAccessToken();
      if (!token) {
        const res = await googleSignIn(true);
        if (res) {
          token = res.accessToken;
          setCurrentUser(res.user);
          setAccessTokenState(res.accessToken);
        }
      }

      if (!token) {
        throw new Error('לא התקבל מפתח גישה מ-Google');
      }

      const taskNotes = recurrence === 'weekly' ? `תזכורת שבועית (שעה: ${time})` : `תזכורת חד פעמית (שעה: ${time})`;
      
      try {
        await createGoogleTask(token, 'קריאת פרק שירה 📖✨', taskNotes, time, days, recurrence);
      } catch (saveTaskErr: any) {
        const errString = String(saveTaskErr?.message || saveTaskErr || '');
        // If scope was insufficient or token expired, force re-authorization with Tasks scope
        if (
          errString.includes('403') ||
          errString.includes('insufficient') ||
          errString.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
          errString.includes('PERMISSION_DENIED')
        ) {
          console.warn('Scope was insufficient, clearing cached token...');
          setAccessToken(null);
          setAccessTokenState(null);
          throw new Error('נדרש אישור הרשאה עבור Google Tasks. אנא לחצו שוב על כפתור השמירה או התחברו מחדש כדי לאשר הרשאות.');
        } else {
          throw saveTaskErr;
        }
      }

      const updatedReminderData: DailyReminder = {
        enabled: true,
        time,
        days,
        recurrence,
      };

      if (currentUser?.uid) {
        await syncUserReminderToFirestore(currentUser.uid, updatedReminderData);
      }
      
      localStorage.setItem('perek-shira-reminder', JSON.stringify(updatedReminderData));
      onSave(updatedReminderData);

      setSaved(true);
      setSuccessMsg('התזכורת הוגדרה בהצלחה! ✨');
      setTimeout(() => {
        setSaved(false);
        setIsEditing(false);
        setSuccessMsg(null);
        setError(null);
        onClose();
      }, 1400);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed-by-user')) {
        console.warn('Google Task save canceled by user due to incomplete sign in (popup closed).');
        setError('ההתחברות בוטלה. יש להשלים את ההתחברות בחלון שנפתח על מנת לקבל תזכורות.');
      } else if (err?.message && err.message.startsWith('נדרש אישור הרשאה')) {
        setError(err.message);
      } else {
        console.error('Error saving Google Task:', err);
        setError('שגיאה בחיבור או ביצירת המשימה ב-Google Tasks. אנא ודאו שאישרתם הרשאות עבור Google Tasks ונסו שוב.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
      {isOpen && (
        <motion.div
          id="reminder-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          onClick={onClose}
          onTouchMove={(e) => e.target === e.currentTarget && e.preventDefault()}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer overscroll-contain"
        >
          <motion.div
            id="reminder-modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            style={{ willChange: 'transform, opacity' }}
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-card border-[1.5px] border-border-color rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-right cursor-default text-text-primary my-auto"
            dir="rtl"
          >
          {/* Header */}
          <div className="bg-primary-accent text-white p-3.5 sm:p-4 flex items-center justify-between rounded-t-2xl shrink-0">
            <h3 className="font-sans font-bold text-base sm:text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 shrink-0" />
              <span>תזכורת יומית לפרק שירה</span>
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="סגור"
              className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer flex items-center justify-center shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          {isSyncing ? (
            <div className="p-8 flex flex-col items-center justify-center space-y-3 text-center min-h-[200px] flex-1">
              <Loader2 className="w-8 h-8 text-primary-accent animate-spin" />
              <p className="text-sm font-medium text-text-secondary font-sans">
                סנכרון נתוני תזכורת מול Google Tasks...
              </p>
            </div>
          ) : !isEditing && isUserConnected && reminder.enabled ? (
            /* Active Reminder Details View */
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="bg-bg-card border-2 border-primary-accent/30 rounded-2xl p-4 shadow-xs space-y-3.5">
                <div className="border-b border-border-color pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="font-bold text-sm sm:text-base text-text-primary font-sans whitespace-nowrap">פרטי התזכורת המוגדרת</span>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2.5 font-sans">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {currentUser?.photoURL ? (
                      <img src={currentUser.photoURL} alt="" className="w-7 h-7 rounded-full border border-green-400 shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {currentUser?.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="text-right min-w-0 flex-1">
                      <span className="text-[10px] text-green-400 block leading-tight font-bold">סנכרון משימות Google Tasks:</span>
                      <span className="text-xs font-bold text-text-primary block truncate" dir="ltr">{currentUser?.email}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="text-xs font-bold text-red-500 hover:text-red-400 px-2.5 py-1 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer shrink-0 border border-red-500/30"
                    title="התנתקות מחשבון Google"
                  >
                    התנתק
                  </button>
                </div>

                {/* 1. Days configured */}
                <div className="bg-bg-muted py-2 px-3 rounded-xl border border-border-color font-sans space-y-1">
                  <span className="text-[11px] text-text-secondary block">ימי תזכורת:</span>
                  <div className="flex flex-wrap gap-1">
                    {days.length > 0 ? (
                      DAYS_OF_WEEK.filter(d => days.includes(d.id)).map(day => (
                        <span key={day.id} className="bg-primary-accent/15 text-primary-accent border border-primary-accent/30 text-xs font-bold px-2 py-0.5 rounded-md">
                          יום {day.label}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-text-secondary italic">לא נבחרו ימים</span>
                    )}
                  </div>
                </div>

                {/* 2. Time & 3. Recurrence type */}
                <div className="grid grid-cols-2 gap-2 font-sans">
                  <div className="bg-bg-muted py-2 px-3 rounded-xl border border-border-color flex flex-col justify-center">
                    <span className="text-[11px] text-text-secondary block mb-0.5">שעת תזכורת:</span>
                    <div className="flex items-center gap-1.5 font-bold text-text-primary text-sm sm:text-base whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5 text-primary-accent shrink-0" />
                      <span>{time}</span>
                    </div>
                  </div>

                  <div className="bg-bg-muted py-2 px-3 rounded-xl border border-border-color flex flex-col justify-center">
                    <span className="text-[11px] text-text-secondary block mb-0.5">סוג התזכורת (תדירות):</span>
                    <div className="flex items-center gap-1.5 font-bold text-text-primary text-xs sm:text-sm whitespace-nowrap">
                      <Repeat className="w-3.5 h-3.5 text-primary-accent shrink-0" />
                      <span className="truncate">{recurrence === 'weekly' ? 'שבועית' : 'חד פעמית'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1 font-sans">
                <button
                  type="button"
                  onClick={handleCancelReminder}
                  disabled={isLoading}
                  className="py-2 px-3.5 rounded-xl border border-red-500/40 text-red-500 hover:bg-red-500/10 font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>ביטול תזכורת</span>
                </button>
                
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="py-2 px-4 rounded-xl bg-primary-accent text-white hover:bg-primary-accent-hover font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>עדכון פרטים</span>
                </button>
              </div>
            </div>
          ) : (
            /* Editable Form View */
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                {reminder.enabled && isUserConnected && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-xs font-bold text-primary-accent hover:underline flex items-center gap-1.5 cursor-pointer font-sans"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>חזרה לפרטי התזכורת</span>
                  </button>
                )}

                {/* Google Account Connection Section */}
                <div className="bg-bg-muted border border-border-color rounded-2xl p-3.5 space-y-2.5 shadow-xs font-sans">
                  <span className="text-[13px] font-bold text-text-primary block">חיבור חשבון Google לסנכרון תזכורות:</span>
                  
                  {!isUserConnected ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2.5 bg-bg-card hover:bg-bg-muted border border-border-color rounded-xl px-3.5 py-2 shadow-2xs transition-all text-text-primary font-sans font-bold text-xs sm:text-sm cursor-pointer hover:border-primary-accent/40 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                          <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                        <span>התחברות עם Google</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2.5 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {currentUser.photoURL ? (
                          <img
                            src={currentUser.photoURL}
                            alt={currentUser.displayName || ''}
                            className="w-7 h-7 rounded-full border border-green-400 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold text-xs font-sans shrink-0">
                            {currentUser.email?.[0].toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="text-right min-w-0 flex-1">
                          <span className="text-[10px] text-green-400 block leading-tight font-bold">מחובר ומסונכרן:</span>
                          <span className="text-xs font-bold text-text-primary block truncate font-sans" dir="ltr">
                            {currentUser.email}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoading}
                        className="text-xs font-bold text-red-500 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer shrink-0 border border-red-500/30"
                      >
                        התנתק
                      </button>
                    </div>
                  )}
                </div>

                {/* Days of the Week Selector */}
                <div className={`space-y-1.5 transition-opacity ${isUserConnected ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <label className="block text-[15px] font-bold text-text-primary flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary-accent" />
                    בחרו ימי תזכורת:
                  </label>
                  <div className="flex justify-between gap-1">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = days.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          disabled={!isUserConnected || isLoading}
                          onClick={() => toggleDay(day.id)}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-primary-accent text-white border-primary-accent shadow-xs scale-105'
                              : 'bg-bg-card text-text-secondary border-border-color hover:bg-bg-muted hover:text-text-primary'
                          }`}
                          title={day.name}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Picker */}
                <div className={`space-y-1.5 transition-opacity ${isUserConnected ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <style>{`
                    .custom-time-input::-webkit-calendar-picker-indicator {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100%;
                      height: 100%;
                      margin: 0;
                      padding: 0;
                      opacity: 0;
                      cursor: pointer;
                    }
                    .custom-time-input.is-empty::-webkit-datetime-edit,
                    .custom-time-input.is-empty::-webkit-datetime-edit-fields-wrapper,
                    .custom-time-input.is-empty::-webkit-datetime-edit-text,
                    .custom-time-input.is-empty::-webkit-datetime-edit-hour-field,
                    .custom-time-input.is-empty::-webkit-datetime-edit-minute-field,
                    .custom-time-input.is-empty::-webkit-datetime-edit-ampm-field {
                      color: transparent !important;
                      opacity: 0 !important;
                    }
                  `}</style>
                  <label className="block text-[15px] font-bold text-text-primary flex items-center gap-1.5">
                    <Clock className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary-accent" />
                    בחרו שעת תזכורת:
                  </label>
                  <div 
                    className="relative w-full cursor-pointer"
                    onClick={(e) => {
                      if (!isUserConnected || isLoading) return;
                      const input = (e.currentTarget.querySelector('input[type="time"]') as HTMLInputElement);
                      if (input) {
                        try {
                          input.showPicker();
                        } catch {
                          input.focus();
                        }
                      }
                    }}
                  >
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      disabled={!isUserConnected || isLoading}
                      className={`custom-time-input ${!time ? 'is-empty text-transparent' : 'text-text-primary'} w-full bg-bg-card border border-border-color rounded-xl pr-3.5 pl-10 py-2.5 text-right text-base sm:text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent cursor-pointer shadow-xs appearance-none`}
                      dir="rtl"
                    />
                    {!time && (
                      <div className="absolute inset-y-0 right-4 left-10 flex items-center justify-start pointer-events-none text-text-secondary font-bold text-xs sm:text-sm font-sans select-none">
                        לחץ על מנת לבחור שעה
                      </div>
                    )}
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary flex items-center justify-center">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Recurrence Control */}
                <div className={`space-y-1.5 transition-opacity ${isUserConnected ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <label className="block text-[15px] font-bold text-text-primary flex items-center gap-1.5">
                    <Repeat className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary-accent" />
                    סוג התזכורת (תדירות):
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-bg-muted p-1 rounded-xl border border-border-color font-sans">
                    <button
                      type="button"
                      disabled={!isUserConnected || isLoading}
                      onClick={() => setRecurrence('once')}
                      className={`py-2 px-2.5 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        recurrence === 'once'
                          ? 'bg-primary-accent text-white shadow-xs'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>חד פעמית</span>
                    </button>
                    <button
                      type="button"
                      disabled={!isUserConnected || isLoading}
                      onClick={() => setRecurrence('weekly')}
                      className={`py-2 px-2.5 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        recurrence === 'weekly'
                          ? 'bg-primary-accent text-white shadow-xs'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
                      }`}
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      <span>שבועית</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-bg-muted/70 border-t border-border-color px-4 sm:px-5 py-3.5 flex justify-between items-center rounded-b-2xl shrink-0">
                <button
                  disabled={isLoading}
                  onClick={onClose}
                  className="px-5 py-2 border border-border-color rounded-xl text-sm sm:text-base font-bold text-text-secondary hover:text-text-primary hover:bg-bg-card transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ביטול
                </button>
                <button
                  disabled={!canSave || isLoading}
                  onClick={handleSave}
                  className={`px-6 py-2 rounded-xl text-sm sm:text-base font-bold shadow-xs flex items-center gap-2 transition-all ${
                    saved
                      ? 'bg-green-600 text-white'
                      : canSave
                        ? 'bg-primary-accent text-white hover:bg-primary-accent-hover cursor-pointer'
                        : 'bg-bg-card text-text-secondary/50 border border-border-color/60 cursor-not-allowed'
                  } ${isLoading ? 'opacity-80 cursor-wait' : 'disabled:opacity-50'}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      שומר משימה...
                    </>
                  ) : saved ? (
                    <>
                      <Check className="w-4 h-4" />
                      נשמר בהצלחה!
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      אישור
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>

  {/* Floating Notifications Portal */}
  {typeof document !== 'undefined' && createPortal(
    <AnimatePresence>
      {(successMsg || error) && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%', scale: 0.9 }}
          animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
          exit={{ opacity: 0, y: 20, x: '-50%', scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 z-[100000] w-[calc(100%-2rem)] max-w-md bg-text-primary text-bg-card px-5 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center justify-center text-center gap-2 border border-border-color/10 pointer-events-auto"
          dir="rtl"
        >
          <span>{successMsg || error}</span>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )}
    </>
  );
}

