import React, { useState, useMemo } from 'react';
import { DailyActivityLog } from '../../types/vocab';
import { Calendar } from 'lucide-react';

interface ActivityCalendarProps {
  activityHistory?: Record<string, DailyActivityLog>;
  dailyGoalXp: number;
}

export const ActivityCalendar: React.FC<ActivityCalendarProps> = ({
  activityHistory = {},
  dailyGoalXp,
}) => {
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Build last 35 days (5 weeks of 7 days) ending today
  const days = useMemo(() => {
    const result: {
      dateKey: string;
      label: string;
      dayNum: number;
      xp: number;
      reviews: number;
      isToday: boolean;
    }[] = [];

    const today = new Date();
    for (let i = 34; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      const entry = activityHistory[dateKey];
      const label = d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      result.push({
        dateKey,
        label,
        dayNum: d.getDate(),
        xp: entry?.xp || 0,
        reviews: entry?.reviews || 0,
        isToday: i === 0,
      });
    }
    return result;
  }, [activityHistory]);

  const activeDaysCount = useMemo(
    () => days.filter((d) => d.xp > 0).length,
    [days]
  );

  const selectedDay = useMemo(
    () =>
      days.find((d) => d.dateKey === selectedDateKey) ||
      days[days.length - 1],
    [days, selectedDateKey]
  );

  const getCellStyle = (xp: number, isToday: boolean, isSelected: boolean) => {
    let colorClass =
      'bg-slate-100 dark:bg-[#2C2C2E] text-slate-400 dark:text-slate-500';
    if (xp >= dailyGoalXp * 1.5) {
      colorClass =
        'bg-indigo-600 dark:bg-indigo-500 text-white font-bold shadow-sm';
    } else if (xp >= dailyGoalXp) {
      colorClass =
        'bg-indigo-500/85 dark:bg-indigo-500/80 text-white font-semibold';
    } else if (xp > 0) {
      colorClass =
        'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-medium';
    }

    const ringClass = isSelected
      ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 ring-offset-1 dark:ring-offset-[#1C1C1E]'
      : isToday
      ? 'ring-1 ring-amber-500/80'
      : '';

    return `${colorClass} ${ringClass}`;
  };

  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Calendrier d'activité (35 jours)
            </h3>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
          {activeDaysCount} {activeDaysCount > 1 ? 'jours actifs' : 'jour actif'}
        </span>
      </div>

      {/* 5x7 Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const isSelected = selectedDay?.dateKey === d.dateKey;
          return (
            <button
              key={d.dateKey}
              type="button"
              onClick={() => setSelectedDateKey(d.dateKey)}
              className={`h-8 rounded-xl text-xs flex items-center justify-center transition-all active:scale-95 ${getCellStyle(
                d.xp,
                d.isToday,
                isSelected
              )}`}
              title={`${d.label}: ${d.xp} XP`}
            >
              {d.dayNum}
            </button>
          );
        })}
      </div>

      {/* Selected Day Detail Bar */}
      {selectedDay && (
        <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/10">
          <span className="font-medium capitalize">
            {selectedDay.isToday
              ? `Aujourd'hui (${selectedDay.label})`
              : selectedDay.label}
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {selectedDay.xp > 0
              ? `${selectedDay.xp} XP · ${selectedDay.reviews} révision${
                  selectedDay.reviews > 1 ? 's' : ''
                }`
              : 'Aucune activité'}
          </span>
        </div>
      )}
    </div>
  );
};
