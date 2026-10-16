import React from 'react';
import { CalendarCheck2, Gamepad2, BookMarked, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export type AppTab = 'today' | 'arcade' | 'grimoire' | 'settings';

interface BottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

const NAV_ITEMS: { id: AppTab; label: string; icon: typeof CalendarCheck2 }[] = [
  { id: 'today', label: "Aujourd'hui", icon: CalendarCheck2 },
  { id: 'arcade', label: 'Arcade', icon: Gamepad2 },
  { id: 'grimoire', label: 'Grimoire', icon: BookMarked },
  { id: 'settings', label: 'Réglages', icon: Settings },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-safe z-40 px-4 pointer-events-none flex justify-center"
    >
      <div className="pointer-events-auto w-full max-w-md bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-3xl p-1.5 shadow-ios-lg border border-slate-200/80 dark:border-white/15 grid grid-cols-4 gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative py-2 px-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="absolute inset-0 rounded-2xl bg-indigo-50/90 dark:bg-indigo-500/15"
                />
              )}
              <Icon className="w-5 h-5 relative z-10" />
              <span className="text-[11px] leading-none relative z-10">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
