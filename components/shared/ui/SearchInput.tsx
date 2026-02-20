import React from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  autoFocus = false
}) => {
  return (
    <div className={`relative group ${className}`}>
      <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-16 pr-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-[32px] focus:bg-white focus:border-blue-600 outline-none font-bold text-slate-900 shadow-inner transition-all"
      />
    </div>
  );
};
