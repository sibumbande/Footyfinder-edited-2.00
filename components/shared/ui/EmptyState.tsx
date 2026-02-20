import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  message,
  action,
  className = ''
}) => {
  return (
    <div className={`py-12 text-center ${className}`}>
      <Icon className="mx-auto text-slate-200 mb-4" size={48} />
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed px-6">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
