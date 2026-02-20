import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "h-12 w-12" }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
        {/* Simulating the logo provided in the prompt description */}
       <div className="bg-blue-900 text-white font-bold p-2 rounded-lg flex items-center justify-center border-2 border-blue-500">
         <span className="text-2xl tracking-tighter">FF</span>
       </div>
       <div className="flex flex-col">
          <span className="text-xl font-black text-slate-900 tracking-wide uppercase leading-none">Footy</span>
          <span className="text-sm font-semibold text-slate-500 tracking-[0.3em] uppercase leading-none">Finder</span>
       </div>
    </div>
  );
};
