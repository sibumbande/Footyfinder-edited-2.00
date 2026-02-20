
import React from 'react';
import { Shirt, Users, ShieldCheck, Wallet, Trophy, MapPin, Calendar, ArrowRight } from 'lucide-react';
import { Team } from '../../../types';

interface TeamProfileUIProps {
  team: Team;
  onDashboard: () => void;
}

export const TeamProfileUI: React.FC<TeamProfileUIProps> = ({ team, onDashboard }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <div className="bg-slate-900 rounded-[64px] p-12 text-white shadow-2xl relative overflow-hidden border border-slate-800 mb-10">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-10">
            <div className="w-32 h-32 rounded-[40px] flex items-center justify-center shadow-3xl border-4 border-white/20 transform hover:rotate-6 transition-transform" style={{ backgroundColor: team.homeColor }}>
               <Shirt size={64} className={team.homeColor === '#ffffff' ? 'text-slate-900' : 'text-white'} />
            </div>
            <div>
              <div className="flex items-center gap-4 mb-4">
                 <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">{team.name}</h1>
                 <ShieldCheck size={32} className="text-blue-400" />
              </div>
              <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <span className="flex items-center gap-2"><MapPin size={16} className="text-blue-500" /> JHB Regional League</span>
                 <span className="flex items-center gap-2"><Calendar size={16} className="text-blue-500" /> Est. 2024</span>
              </div>
            </div>
          </div>
          <button onClick={onDashboard} className="bg-white text-slate-900 px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-xl active:scale-95 flex items-center gap-3">
             To Dashboard <ArrowRight size={18} />
          </button>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-8 flex items-center gap-3"><Wallet size={24} className="text-amber-500" /> Treasury</h3>
              <div className="space-y-6">
                 <div className="p-8 bg-amber-50 rounded-[32px] border border-amber-100 shadow-inner text-center">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-2">Available Funds</p>
                    <p className="text-4xl font-black text-slate-900">R{team.wallet.balance.toFixed(0)}</p>
                 </div>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center px-4 leading-relaxed italic">
                    Funds are secured for team-only matches and tournament entries.
                 </p>
              </div>
           </div>

           <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-8 flex items-center gap-3"><Trophy size={24} className="text-blue-600" /> Team Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-6 rounded-3xl text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Matches</p>
                    <p className="text-xl font-black">0</p>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-3xl text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Win Rate</p>
                    <p className="text-xl font-black">0%</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-8">
           <div className="bg-white rounded-[56px] p-12 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-10">
                 <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4"><Users size={32} className="text-blue-600" /> Active Roster</h2>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl border">{team.members.length} Squad Members</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {team.members.map((member, idx) => (
                   <div key={member.id} className="flex items-center gap-5 p-5 bg-slate-50 rounded-[32px] border border-transparent hover:border-blue-100 transition-all group">
                      <img src={member.avatar} className="w-14 h-14 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform" alt="" />
                      <div>
                         <p className="text-sm font-black uppercase text-slate-900 tracking-tight leading-none mb-1">{member.fullName}</p>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{member.position}</p>
                      </div>
                      {idx === 0 && (
                        <div className="ml-auto bg-slate-900 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">Captain</div>
                      )}
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
