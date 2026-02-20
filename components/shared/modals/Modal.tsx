import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accentColor?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  accentColor = 'bg-blue-600',
  children,
  className = ''
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className={`bg-white rounded-[64px] p-12 max-w-md w-full shadow-3xl animate-scale-in relative overflow-hidden font-inter ${className}`}>
        <div className={`absolute top-0 left-0 w-full h-3 ${accentColor}`}></div>
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{title}</h2>
            {subtitle && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-900 transition-colors">
            <X size={32} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
