
import React from 'react';
import { Shield, Check, Users, Shirt, X, UserPlus, Zap, Loader2, Trophy } from 'lucide-react';
import { SoccerProfile } from '../../../types';

export const KIT_COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Slate', hex: '#1e293b' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Black', hex: '#000000' },
  { name: 'Yellow', hex: '#facc15' },
  { name: 'Orange', hex: '#f97316' },
];

interface CreateTeamUIProps {
  teamName: string;
  setTeamName: (val: string) => void;
  homeColor: string;
  setHomeColor: (val: string) => void;
  awayColor: string;
  setAwayColor: (val: string) => void;
  friends: SoccerProfile[];
  selectedMembers: string[];
  toggleMember: (id: string) => void;
  onNavigateToSocial: () => void;
  handleCreate: () => void;
  isSaving: boolean;
}

export const CreateTeamUI: React.FC<CreateTeamUIProps> = ({
  teamName,
  setTeamName,
  homeColor,
  setHomeColor,
  awayColor,
  setAwayColor,
  friends,
  selectedMembers,
  toggleMember,
  onNavigateToSocial,
  handleCreate,
  isSaving
}) => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-white rounded-[48px] p-10 md:p-16 shadow-2xl border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-3 bg-slate-900"></div>

        <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">Assemble Squad</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Define your identity • Recruit mates now or later</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Members Drafted</p>
                <p className="text-xl font-black text-slate-900">{selectedMembers.length}</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-7 space-y-12">
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Team Name</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Soweto Giants"
                className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-[32px] focus:bg-white focus:border-slate-900 outline-none font-black text-lg text-slate-900 shadow-inner transition-all uppercase placeholder:text-slate-300"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-4">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Home Kit</label>
                   <div className="grid grid-cols-5 gap-3">
                      {KIT_COLORS.map(c => (
                        <button
                          key={c.name}
                          onClick={() => setHomeColor(c.hex)}
                          className={`w-10 h-10 rounded-xl border-4 shadow-sm transition-all ${homeColor === c.hex ? 'border-slate-900 scale-110 shadow-lg ring-4 ring-slate-100' : 'border-white hover:scale-110'}`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Away Kit</label>
                   <div className="grid grid-cols-5 gap-3">
                      {KIT_COLORS.map(c => (
                        <button
                          key={c.name}
                          onClick={() => setAwayColor(c.hex)}
                          className={`w-10 h-10 rounded-xl border-4 shadow-sm transition-all ${awayColor === c.hex ? 'border-slate-900 scale-110 shadow-lg ring-4 ring-slate-100' : 'border-white hover:scale-110'}`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                   </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-[40px] p-10 flex flex-col items-center justify-center gap-8 shadow-3xl relative overflow-hidden group">
                 <div className="flex gap-8 relative z-10">
                    <div className="text-center">
                       <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-2xl border-4 border-white/20 transform group-hover:rotate-6 transition-transform" style={{ backgroundColor: homeColor }}>
                          <Shirt className={homeColor === '#ffffff' ? 'text-slate-900' : 'text-white'} size={40} />
                       </div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Home</p>
                    </div>
                    <div className="text-center">
                       <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-2xl border-4 border-white/20 transform group-hover:-rotate-6 transition-transform" style={{ backgroundColor: awayColor }}>
                          <Shirt className={awayColor === '#ffffff' ? 'text-slate-900' : 'text-white'} size={40} />
                       </div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Away</p>
                    </div>
                 </div>
                 <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 px-4 py-2 rounded-full border border-blue-400/20">Identity Preview</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-10">
            <div className="bg-slate-50 rounded-[40px] p-10 border border-slate-100 flex flex-col h-full">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-lg font-black uppercase text-slate-900 leading-none">Draft Initial Members</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Optional: Add more later</p>
                 </div>
                 <button onClick={onNavigateToSocial} className="p-3 bg-white text-blue-600 rounded-2xl shadow-sm hover:bg-blue-600 hover:text-white transition-all border border-slate-100">
                    <UserPlus size={18} />
                 </button>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                 {friends.length === 0 ? (
                   <div className="py-16 text-center">
                      <Users className="mx-auto text-slate-200 mb-4" size={48} />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed px-12">Your scout list is empty.</p>
                   </div>
                 ) : (
                   friends.map(friend => (
                     <div
                       key={friend.id}
                       onClick={() => toggleMember(friend.id)}
                       className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group ${selectedMembers.includes(friend.id) ? 'bg-blue-50 border-blue-600 shadow-sm' : 'bg-white border-transparent hover:border-slate-200'}`}
                     >
                       <div className="flex items-center gap-4">
                         <img src={friend.avatar} alt="" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                         <div className="min-w-0">
                            <p className="text-xs font-black uppercase text-slate-900 truncate">{friend.fullName}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{friend.position}</p>
                         </div>
                       </div>
                       <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${selectedMembers.includes(friend.id) ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-200 group-hover:bg-slate-100'}`}>
                         <Check size={14} strokeWidth={4} />
                       </div>
                     </div>
                   ))
                 )}
              </div>

              <div className="mt-10 pt-8 border-t border-slate-200">
                <button
                  onClick={handleCreate}
                  disabled={!teamName.trim() || isSaving}
                  className="w-full py-6 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-xs shadow-3xl hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-4 group disabled:opacity-50"
                >
                   {isSaving ? (
                     <Loader2 className="animate-spin" size={18} />
                   ) : (
                     <>Register Team <Zap size={18} className="text-amber-400" /></>
                   )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
