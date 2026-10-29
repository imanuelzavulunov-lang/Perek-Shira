import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Clock,
  Bell,
  Check,
  Calendar,
  Pencil,
  Trash2,
  ArrowRight,
  BellRing,
  Settings2,
  ShieldCheck,
  Send,
  Plus,
  CheckSquare,
  Square,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReminderItem } from '../types';
import {
  getNotificationPermission,
  requestDeviceNotificationPermission,
  sendDeviceNotification,
  clearReminderFiredToday,
  normalizeTimeStr,
  subscribeUserToWebPush,
  sendTestWebPushNotification,
} from '../lib/notifications';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: ReminderItem[];
  onSaveReminders: (reminders: ReminderItem[], toastMessage?: string) => void;
  onTriggerInAppAlert?: (reminder: ReminderItem) => void;
}

const DAYS_OF_WEEK = [
  { id: 0, short: 'א׳', name: 'יום ראשון' },
  { id: 1, short: 'ב׳', name: 'יום שני' },
  { id: 2, short: 'ג׳', name: 'יום שלישי' },
  { id: 3, short: 'ד׳', name: 'יום רביעי' },
  { id: 4, short: 'ה׳', name: 'יום חמישי' },
  { id: 5, short: 'ו׳', name: 'יום שישי' },
  { id: 6, short: 'ש׳', name: 'שבת קודש' },
];

export default function ReminderModal({
  isOpen,
  onClose,
  reminders,
  onSaveReminders,
  onTriggerInAppAlert,
}: ReminderModalProps) {
  // Navigation inside modal: 'list' | 'add' | 'edit'
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for creating/editing a reminder
  const [formLabel, setFormLabel] = useState('קריאת פרק שירה');
  const [formTime, setFormTime] = useState('08:00');
  const [formDays, setFormDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  // Permission & Feedback states
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Swipe-to-delete state (swipe right only)
  const [swipedReminderId, setSwipedReminderId] = useState<string | null>(null);

  // Refresh permission
  const refreshPermission = () => {
    const current = getNotificationPermission();
    setPermission(current);
  };

  useEffect(() => {
    refreshPermission();
    window.addEventListener('focus', refreshPermission);
    document.addEventListener('visibilitychange', refreshPermission);
    return () => {
      window.removeEventListener('focus', refreshPermission);
      document.removeEventListener('visibilitychange', refreshPermission);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshPermission();
      setViewMode('list');
      setEditingId(null);
      setFeedbackMsg(null);
      setSwipedReminderId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => setFeedbackMsg(null), 3800);
      return () => clearTimeout(timer);
    }
  }, [feedbackMsg]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
  };

  const handleRequestPermission = async () => {
    if (permission === 'denied') {
      showToast('ההתראות חסומות בדפדפן. לחצו על סמל המנעול ליד שורת הכתובת > הרשאות > אפשר התראות.', 'error');
      return;
    }

    try {
      const res = await requestDeviceNotificationPermission();
      setPermission(res);
      if (res === 'granted') {
        showToast('גישה להתראות אושרה בהצלחה! התזכורות יקפצו במכשירך כעת.');
        subscribeUserToWebPush(reminders).catch(() => {});
      } else if (res === 'denied') {
        showToast('ההרשאה נדחתה. יש לאפשר התראות בהגדרות הדפדפן.', 'error');
      }
    } catch (err) {
      console.error('Permission error:', err);
      showToast('לא ניתן היה לבקש הרשאת התראות במכשיר זה.', 'error');
    }
  };

  const handleTestNotification = async () => {
    if (permission !== 'granted') {
      // In-app test trigger
      if (onTriggerInAppAlert) {
        onTriggerInAppAlert({
          id: 'test',
          label: 'בדיקת תזכורת פרק שירה 📖',
          time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
          days: [0, 1, 2, 3, 4, 5, 6],
          enabled: true,
          createdAt: Date.now(),
        });
      }
      handleRequestPermission();
      return;
    }

    // 1. Ensure push subscription is active on server
    await subscribeUserToWebPush(reminders).catch(() => {});

    // 2. Dispatch real server push (wakes locked/sleeping phone screen)
    sendTestWebPushNotification(reminders).catch(() => {});

    // 3. Also trigger device system notification
    const success = await sendDeviceNotification(
      'בדיקת התראה - פרק שירה 📖',
      'התראות המכשיר פועלות בהצלחה! התזכורת תקפוץ בלוח ההתראות בזמן שבחרתם.'
    );

    if (onTriggerInAppAlert) {
      onTriggerInAppAlert({
        id: 'test',
        label: 'בדיקת תזכורת פרק שירה 📖',
        time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        days: [0, 1, 2, 3, 4, 5, 6],
        enabled: true,
        createdAt: Date.now(),
      });
    }

    if (success) {
      showToast('התראת בדיקה נשלחה ללוח ההתראות במכשירך!');
    } else {
      showToast('התראה הוצגה באפליקציה. ודאו שההתראות מופעלות בהגדרות המכשיר כדי שיקפצו בלוח ההתראות.', 'error');
    }
  };

  // Toggle Reminder Active/Inactive
  const handleToggleEnable = (id: string) => {
    const target = reminders.find((r) => r.id === id);
    if (!target) return;

    if (!target.enabled) {
      clearReminderFiredToday(id);
      if (permission !== 'granted') {
        handleRequestPermission();
      }
    }

    const updated = reminders.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    onSaveReminders(updated);
    subscribeUserToWebPush(updated).catch(() => {});
    const newState = !target.enabled;
    showToast(newState ? `תזכורת "${target.label}" הופעלה` : `תזכורת "${target.label}" כובתה`);
  };

  // Open Form to Add New Reminder
  const handleOpenAdd = () => {
    setFormLabel('קריאת פרק שירה');
    setFormTime('08:00');
    setFormDays([0, 1, 2, 3, 4, 5, 6]);
    setEditingId(null);
    setViewMode('add');
    setSwipedReminderId(null);
  };

  // Open Form to Edit Existing Reminder
  const handleOpenEdit = (reminder: ReminderItem) => {
    setFormLabel(reminder.label || 'קריאת פרק שירה');
    setFormTime(normalizeTimeStr(reminder.time || '08:00'));
    setFormDays(Array.isArray(reminder.days) ? reminder.days : [0, 1, 2, 3, 4, 5, 6]);
    setEditingId(reminder.id);
    setViewMode('edit');
    setSwipedReminderId(null);
  };

  // Delete Reminder
  const handleDeleteReminder = (id: string) => {
    setSwipedReminderId(null);
    const updated = reminders.filter((r) => r.id !== id);
    onSaveReminders(updated, 'התזכורת נמחקה בהצלחה');
    showToast('התזכורת נמחקה בהצלחה');
  };

  // Toggle Day Selection in Form
  const toggleFormDay = (dayId: number) => {
    setFormDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort((a, b) => a - b)
    );
  };

  // Save Add/Edit with DUPLICATE CHECK
  const handleSaveForm = async () => {
    if (permission !== 'granted') {
      await handleRequestPermission();
    }

    if (!formTime) {
      showToast('אנא בחרו שעת תזכורת', 'error');
      return;
    }

    if (formDays.length === 0) {
      showToast('אנא בחרו לפחות יום אחד ברשימת ימות השבוע', 'error');
      return;
    }

    const finalLabel = 'קריאת פרק שירה';
    const normalizedTime = normalizeTimeStr(formTime);

    // Duplicate Check: Check if an identical reminder already exists with the same time and days
    const formDaysSorted = [...formDays].sort((a, b) => a - b).join(',');
    const isDuplicate = reminders.some((r) => {
      if (viewMode === 'edit' && r.id === editingId) return false;
      const rDaysSorted = [...(r.days || [])].sort((a, b) => a - b).join(',');
      return normalizeTimeStr(r.time) === normalizedTime && rDaysSorted === formDaysSorted;
    });

    if (isDuplicate) {
      showToast('כבר קיימת תזכורת זהה בשעה זו ובימים שנבחרו', 'error');
      return;
    }

    if (viewMode === 'edit' && editingId) {
      clearReminderFiredToday(editingId);
      const updated = reminders.map((r) =>
        r.id === editingId
          ? {
              ...r,
              label: finalLabel,
              time: normalizedTime,
              days: formDays,
              enabled: true,
            }
          : r
      );
      onSaveReminders(updated, 'התזכורת עודכנה בהצלחה! 🔔');
      subscribeUserToWebPush(updated).catch(() => {});
      setViewMode('list');
      setEditingId(null);
      showToast('התזכורת עודכנה בהצלחה! 🔔');
    } else {
      const newId = `reminder-${Date.now()}`;
      clearReminderFiredToday(newId);
      const newReminder: ReminderItem = {
        id: newId,
        label: finalLabel,
        time: normalizedTime,
        days: formDays,
        enabled: true,
        createdAt: Date.now(),
      };
      const updated = [...reminders, newReminder];
      onSaveReminders(updated, 'התזכורת נוספה בהצלחה! 🔔');
      subscribeUserToWebPush(updated).catch(() => {});
      setViewMode('list');
      showToast('התזכורת נוספה בהצלחה! 🔔');
    }
  };

  const isPermissionGranted = permission === 'granted';

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="reminder-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            onClick={onClose}
            onTouchMove={(e) => e.target === e.currentTarget && e.preventDefault()}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3.5 sm:p-4 cursor-pointer overscroll-contain"
          >
            <motion.div
              id="reminder-modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              style={{ willChange: 'transform, opacity' }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-card border-[1.5px] border-border-color rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-right cursor-default text-text-primary my-auto"
              dir="rtl"
            >
              {/* Header: User requested removing reminder count and subtitle under "פאנל תזכורות לפרק שירה" */}
              <div className="bg-primary-accent text-white px-4 py-3 sm:py-3.5 flex items-center justify-between rounded-t-2xl shrink-0 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                    <Bell className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-base sm:text-lg leading-tight">
                      {viewMode === 'list'
                        ? 'פאנל תזכורות לפרק שירה'
                        : viewMode === 'add'
                        ? 'הוספת תזכורת חדשה'
                        : 'עריכת תזכורת'}
                    </h3>
                    {viewMode !== 'list' && (
                      <span className="text-[11px] text-white/80 block leading-none mt-1">
                        התראת מערכת ללא צליל בזמנים שבחרתם
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="סגור"
                  className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* Device Notification Access Status Banner */}
                <div className="bg-bg-muted border border-border-color rounded-xl p-3 shadow-3xs font-sans">
                  {isPermissionGranted ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ShieldCheck className="w-4.5 h-4.5 text-green-600 dark:text-green-400 shrink-0" />
                        <div className="text-right min-w-0">
                          <span className="text-xs font-bold text-text-primary block truncate">
                            התראות מערכת פעילות במכשיר ✓
                          </span>
                          <span className="text-[11px] text-text-secondary block">
                            התזכורות יקפצו ישירות בלוח ההתראות
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleTestNotification}
                        className="text-xs font-bold text-primary-accent hover:text-primary-accent-hover px-2.5 py-1.5 rounded-lg bg-bg-card hover:bg-bg-muted border border-border-color transition-colors cursor-pointer shrink-0 flex items-center gap-1 shadow-3xs"
                        title="שלח התראת בדיקה למכשיר כעת"
                      >
                        <Send className="w-3 h-3" />
                        <span>בדוק התראה</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs sm:text-sm">
                        <BellRing className="w-4 h-4 shrink-0" />
                        <span>נדרשת הרשאת התראות במכשיר</span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        כדי לקבל התראה שקופצת ישירות בלוח ההתראות של הטלפון או המחשב, יש לאשר קבלת התראות:
                      </p>
                      <button
                        type="button"
                        onClick={handleRequestPermission}
                        className="w-full flex items-center justify-center gap-2 bg-primary-accent text-white hover:bg-primary-accent-hover rounded-xl px-4 py-2 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
                      >
                        <BellRing className="w-4 h-4 shrink-0" />
                        <span>מתן גישה להתראות במכשיר</span>
                      </button>
                      {permission === 'denied' && (
                        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                          <Settings2 className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>
                            ההתראות חסומות בדפדפן. לחצו על סמל המנעול ליד כתובת האתר &gt; הרשאות &gt; אפשר התראות. (בנוסף, תזכורות יקפצו בתוך האפליקציה כשהיא פתוחה).
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* VIEW MODE: LIST */}
                {viewMode === 'list' && (
                  <div className="space-y-3.5">
                    {/* Top Action Bar - User requested: no count in title and no redundant top add button */}
                    <div className="flex items-center justify-between gap-2 pb-1">
                      <span className="font-bold text-sm text-text-primary font-sans flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-primary-accent" />
                        <span>רשימת התזכורות</span>
                      </span>
                    </div>

                    {/* Reminders List */}
                    {reminders.length === 0 ? (
                      <div className="text-center py-10 px-4 border-2 border-dashed border-border-color rounded-2xl bg-bg-muted/50 space-y-3 font-sans">
                        <div className="w-12 h-12 rounded-full bg-primary-accent/10 text-primary-accent mx-auto flex items-center justify-center">
                          <Bell className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm sm:text-base text-text-primary">
                            אין עדיין תזכורות מוגדרות
                          </h4>
                          <p className="text-xs text-text-secondary max-w-xs mx-auto">
                            הגדירו תזכורת יומית או שבועית שתקפוץ בלוח ההתראות במכשירכם לקריאת פרק שירה.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenAdd}
                          className="inline-flex items-center gap-1.5 bg-primary-accent text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary-accent-hover transition-colors shadow-xs cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>יצירת תזכורת ראשונה</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {reminders.map((reminder) => {
                          const isSwiped = swipedReminderId === reminder.id;

                          return (
                            <div
                              key={reminder.id}
                              className="relative overflow-hidden rounded-2xl select-none"
                            >
                              {/* Left Reveal Area: Standalone Trash Rectangle (revealed on swiping right) */}
                              <div className="absolute inset-y-0 left-0 w-[68px] p-1 flex items-stretch z-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteReminder(reminder.id);
                                  }}
                                  className="w-full h-full rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white flex items-center justify-center transition-all cursor-pointer shadow-md group active:scale-95"
                                  title="מחיקת תזכורת"
                                  aria-label="מחיקת תזכורת"
                                >
                                  <Trash2 className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
                                </button>
                              </div>

                              {/* Main Foreground Reminder Card (Full width, swipes right to reveal trash button on the left) */}
                              <motion.div
                                drag="x"
                                dragConstraints={{ left: 0, right: 68 }}
                                dragElastic={0.05}
                                onDragEnd={(_, info) => {
                                  const { offset, velocity } = info;
                                  if (offset.x > 25 || velocity.x > 200) {
                                    setSwipedReminderId(reminder.id);
                                  } else {
                                    setSwipedReminderId(null);
                                  }
                                }}
                                animate={{
                                  x: isSwiped ? 68 : 0,
                                }}
                                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                onClick={() => {
                                  if (isSwiped) {
                                    setSwipedReminderId(null);
                                  }
                                }}
                                className={`relative z-10 w-full border rounded-2xl p-3 sm:p-3.5 transition-colors flex flex-col justify-between gap-2.5 font-sans shadow-3xs cursor-grab active:cursor-grabbing touch-pan-y ${
                                  reminder.enabled
                                    ? 'bg-bg-card border-border-color'
                                    : 'bg-bg-card border-border-color/60'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  {/* Right side (RTL): Name on top, time right below it */}
                                  <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                                    <div
                                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 transition-colors ${
                                        reminder.enabled
                                          ? 'bg-primary-accent/15 border-primary-accent/30 text-primary-accent'
                                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-400'
                                      }`}
                                    >
                                      <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      {/* 1. Name */}
                                      <span className={`font-bold text-sm sm:text-base block truncate leading-tight ${
                                        reminder.enabled ? 'text-text-primary' : 'text-slate-600 dark:text-slate-400'
                                      }`}>
                                        {reminder.label || 'קריאת פרק שירה'}
                                      </span>
                                      {/* 2. Time under name */}
                                      <span className={`font-mono font-bold text-sm sm:text-base tracking-tight block mt-0.5 ${
                                        reminder.enabled ? 'text-primary-accent' : 'text-slate-400 dark:text-slate-500'
                                      }`}>
                                        {reminder.time}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Left side (RTL): Toggle switch with muted blue-gray slate tone when turned off */}
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleEnable(reminder.id);
                                    }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all cursor-pointer shrink-0 focus:outline-none border ${
                                      reminder.enabled
                                        ? 'bg-primary-accent border-primary-accent shadow-xs'
                                        : 'bg-slate-300 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                                    }`}
                                    title={reminder.enabled ? 'כבה תזכורת' : 'הפעל תזכורת'}
                                    aria-label={reminder.enabled ? 'כבה תזכורת' : 'הפעל תזכורת'}
                                  >
                                    <span
                                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
                                        reminder.enabled
                                          ? '-translate-x-6'
                                          : '-translate-x-1'
                                      }`}
                                    />
                                  </button>
                                </div>

                                {/* Days Badges & Edit Button - NO trash button here, only edit */}
                                <div className="pt-2 border-t border-border-color/60 flex items-center justify-between gap-2">
                                  {/* Day circles / chips directly below */}
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {DAYS_OF_WEEK.map((d) => {
                                      const isActive = reminder.days?.includes(d.id);
                                      return (
                                        <span
                                          key={d.id}
                                          className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center ${
                                            isActive
                                              ? reminder.enabled
                                                ? 'bg-primary-accent text-white'
                                                : 'bg-text-secondary/20 text-text-secondary'
                                              : 'bg-bg-muted text-text-secondary/40 border border-border-color/40'
                                          }`}
                                          title={d.name}
                                        >
                                          {d.short}
                                        </span>
                                      );
                                    })}
                                  </div>

                                  {/* Edit button */}
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEdit(reminder);
                                    }}
                                    className="p-1.5 rounded-lg text-text-secondary hover:text-primary-accent hover:bg-bg-muted transition-colors cursor-pointer flex items-center gap-1"
                                    title="ערוך תזכורת"
                                    aria-label="ערוך תזכורת"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                </div>
                              </motion.div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* VIEW MODE: ADD or EDIT */}
                {(viewMode === 'add' || viewMode === 'edit') && (
                  <div className="space-y-4 font-sans">
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className="text-xs font-bold text-primary-accent hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>חזרה לרשימת התזכורות</span>
                    </button>

                    {/* Time Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-text-primary flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-primary-accent" />
                        <span>שעת התזכורת:</span>
                      </label>
                      <input
                        type="time"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="w-full bg-bg-card border border-border-color rounded-xl px-3.5 py-2 text-base font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-accent cursor-pointer"
                        dir="ltr"
                      />
                    </div>

                    {/* Days of the Week List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs sm:text-sm font-bold text-text-primary flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-primary-accent" />
                          <span>רשימת ימות השבוע לתזכורת:</span>
                        </label>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setFormDays([0, 1, 2, 3, 4, 5, 6])}
                            className="text-primary-accent hover:underline font-bold px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            כל השבוע
                          </button>
                          <span className="text-border-color">|</span>
                          <button
                            type="button"
                            onClick={() => setFormDays([0, 1, 2, 3, 4])}
                            className="text-primary-accent hover:underline font-bold px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            ימי חול (א׳-ה׳)
                          </button>
                          <span className="text-border-color">|</span>
                          <button
                            type="button"
                            onClick={() => setFormDays([])}
                            className="text-text-secondary hover:text-text-primary px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            איפוס
                          </button>
                        </div>
                      </div>

                      {/* Full List of Days */}
                      <div className="bg-bg-muted/70 border border-border-color rounded-2xl divide-y divide-border-color/60 overflow-hidden shadow-3xs">
                        {DAYS_OF_WEEK.map((day) => {
                          const isSelected = formDays.includes(day.id);
                          return (
                            <div
                              key={day.id}
                              onClick={() => toggleFormDay(day.id)}
                              className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors select-none ${
                                isSelected
                                  ? 'bg-primary-accent/10 hover:bg-primary-accent/15'
                                  : 'hover:bg-bg-card'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5 text-primary-accent shrink-0" />
                                ) : (
                                  <Square className="w-5 h-5 text-text-secondary/50 shrink-0" />
                                )}
                                <span
                                  className={`text-sm ${
                                    isSelected ? 'font-bold text-text-primary' : 'text-text-secondary font-medium'
                                  }`}
                                >
                                  {day.name}
                                </span>
                              </div>

                              <span
                                className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                                  isSelected
                                    ? 'bg-primary-accent text-white'
                                    : 'bg-bg-card text-text-secondary/60 border border-border-color/60'
                                }`}
                              >
                                יום {day.short}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-bg-muted/80 border-t border-border-color px-4 sm:px-5 py-3 flex justify-between items-center rounded-b-2xl shrink-0 font-sans">
                {viewMode === 'list' ? (
                  <>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-border-color rounded-xl text-xs sm:text-sm font-bold text-text-secondary hover:text-text-primary hover:bg-bg-card transition-all cursor-pointer"
                    >
                      סגור
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="px-4 py-2 bg-primary-accent hover:bg-primary-accent-hover text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-98"
                    >
                      <Plus className="w-4 h-4" />
                      <span>תזכורת חדשה</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className="px-4 py-2 border border-border-color rounded-xl text-xs sm:text-sm font-bold text-text-secondary hover:text-text-primary hover:bg-bg-card transition-all cursor-pointer"
                    >
                      ביטול
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveForm}
                      className="px-5 py-2 bg-primary-accent hover:bg-primary-accent-hover text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-98"
                    >
                      <Check className="w-4 h-4" />
                      <span>{viewMode === 'edit' ? 'שמור שינויים' : 'שמור תזכורת'}</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Feedback Portal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {feedbackMsg && (
              <motion.div
                initial={{ opacity: 0, y: 50, x: '-50%', scale: 0.9 }}
                animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
                exit={{ opacity: 0, y: 20, x: '-50%', scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className={`fixed bottom-6 left-1/2 z-[100000] w-[calc(100%-2rem)] max-w-md ${
                  feedbackMsg.type === 'error'
                    ? 'bg-red-700 text-white'
                    : 'bg-text-primary text-bg-card'
                } px-5 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center justify-center text-center gap-2 border border-border-color/10 pointer-events-auto`}
                dir="rtl"
              >
                <span>{feedbackMsg.text}</span>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
