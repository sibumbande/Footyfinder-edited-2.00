
import React from 'react';
import { MapPin } from 'lucide-react';
import { FieldListing } from '../../types';

interface FieldCardProps {
  field: FieldListing;
  onShowTimetable: () => void;
}

export const FieldCard: React.FC<FieldCardProps> = ({ field, onShowTimetable }) => (
  <div className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 cursor-pointer hover:-translate-y-1">
    <div className="relative aspect-[4/3] overflow-hidden" onClick={onShowTimetable}>
      <img src={field.imageUrl} alt={field.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
      <div className="absolute top-4 left-4 bg-slate-900/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white shadow-sm flex items-center gap-1 uppercase tracking-widest">★ {field.rating}</div>
    </div>
    <div className="p-5">
      <h3 className="font-black text-slate-900 line-clamp-1 text-lg uppercase tracking-tight mb-1">{field.name}</h3>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1"><MapPin size={12} className="text-blue-500" /> {field.location}</p>
      <div className="flex items-center justify-between mt-6">
         <div className="flex flex-col">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Starting at</span>
           <span className="text-xl font-black text-slate-900 leading-none mt-1">R{field.pricePerPlayer}</span>
         </div>
         <button onClick={onShowTimetable} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg">View Board</button>
      </div>
    </div>
  </div>
);
