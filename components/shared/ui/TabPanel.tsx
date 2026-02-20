import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TabConfig {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
}

interface TabPanelProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'pill';
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  className = ''
}) => {
  if (variant === 'pill') {
    return (
      <div className={`flex bg-slate-100 p-1.5 rounded-[20px] gap-1 ${className}`}>
        {tabs.map((tab, idx) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? idx === 0 ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.icon && <tab.icon size={14} />}
            {tab.label}
            {tab.badge !== undefined && ` (${tab.badge})`}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex gap-4 ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${
            activeTab === tab.id
              ? 'bg-slate-900 text-white shadow-xl'
              : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
          }`}
        >
          {tab.icon && <tab.icon size={16} />}
          {tab.label}
        </button>
      ))}
    </div>
  );
};
