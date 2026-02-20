import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface NumberCounterProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'dark';
}

export const NumberCounter: React.FC<NumberCounterProps> = ({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  size = 'md',
  variant = 'default'
}) => {
  const sizeStyles = {
    sm: { button: 'w-8 h-8', text: 'text-2xl', icon: 14 },
    md: { button: 'w-10 h-10', text: 'text-4xl', icon: 16 },
    lg: { button: 'w-10 h-10', text: 'text-6xl', icon: 16 },
  };

  const s = sizeStyles[size];

  const buttonClass = variant === 'dark'
    ? `${s.button} flex items-center justify-center bg-white/10 rounded-xl hover:bg-white/20 transition-colors`
    : `${s.button} flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors`;

  const textClass = variant === 'dark'
    ? `${s.text} font-black leading-none text-white`
    : `${s.text} font-black leading-none text-slate-900`;

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      )}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className={buttonClass}
        >
          <Minus size={s.icon} />
        </button>
        <span className={textClass}>{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className={buttonClass}
        >
          <Plus size={s.icon} />
        </button>
      </div>
    </div>
  );
};
