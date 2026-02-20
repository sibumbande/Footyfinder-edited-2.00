import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: 'default' | 'blue' | 'emerald' | 'amber';
  className?: string;
}

const variantStyles = {
  default: 'bg-slate-50 border-slate-100',
  blue: 'bg-blue-50 border-blue-100',
  emerald: 'bg-emerald-50 border-emerald-100',
  amber: 'bg-amber-50 border-amber-100',
};

const variantTextStyles = {
  default: 'text-slate-400',
  blue: 'text-blue-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  variant = 'default',
  className = ''
}) => {
  return (
    <div className={`p-6 rounded-[32px] border shadow-inner text-center ${variantStyles[variant]} ${className}`}>
      {Icon && <Icon className={`mx-auto mb-3 ${variantTextStyles[variant]}`} size={20} />}
      <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${variantTextStyles[variant]}`}>{label}</p>
      <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
    </div>
  );
};
