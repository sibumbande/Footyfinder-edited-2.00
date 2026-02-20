
import React, { useState } from 'react';
import {
  Trophy, Users, MessageSquare, MapPin, Clock,
  ShieldCheck, Wallet, ChevronRight, CheckCircle2,
  Award, Send, ArrowLeft, Check, Shirt, ArrowUpRight, Plus, X, Zap, Heart
} from 'lucide-react';
import { UserProfileData, Team, TeamWallet } from '../../../types';

const PLAYER_BENCH = [
  { id: 'b1', name: 'Zuki Nonxuba', avatar: 'https://i.pravatar.cc/100?u=zuki', role: 'Defender' },
  { id: 'b2', name: 'Ace Magashule', avatar: 'https://i.pravatar.cc/100?u=ace_m', role: 'Midfielder' },
  { id: 'b3', name: 'Lefa Mokoena', avatar: 'https://i.pravatar.cc/100?u=lefa', role: 'Forward' },
  { id: 'b4', name: 'Mandla Masango', avatar: 'https://i.pravatar.cc/100?u=mandla', role: 'Midfielder' },
  { id: 'b5', name: 'George Lebese', avatar: 'https://i.pravatar.cc/100?u=george', role: 'Forward' },
];

interface PlayerDashboardUIProps {
  activeTab: 'match' | 'comms';
  setActiveTab: (tab: 'match' | 'comms') => void;
  messages: any[];
  newMessage: string;
  setNewMessage: (val: string) => void;
  onSendMessage: () => void;
  isFormationLocked: boolean;
  assignedPlayers: Record<string, string>;
  currentPoints: Array<{ id: string; label: string; x: number; y: number }>;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  userProfile: UserProfileData;
  userTeam: Team;
  teamWallet: TeamWallet;
  onContributeToTeam: (amount: number) => void;
}

export const PlayerDashboardUI: React.FC<PlayerDashboardUIProps> = ({
  activeTab,
  setActiveTab,
  messages,
  newMessage,
  setNewMessage,
  onSendMessage,
  isFormationLocked,
  assignedPlayers,
  currentPoints,
  chatEndRef,
  userProfile,
  userTeam,
  teamWallet,
  onContributeToTeam
}) => {
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState('50');

  const handleFund = () => {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) return;
    onContributeToTeam(amount);
    setShowFundModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pt-20 animate-fade-in font-inter">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Team Identity Banner */}
        <div className="bg-slate-900 rounded-[48px] p-10 md:p-12 text-white shadow-2xl overflow-hidden relative border border-slate-800 mb-10">
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="flex items-center gap-8">
                 <div className="w-24 h-24 rounded-[32px] flex items-center justify-center text-4xl font-black shadow-2xl border-4 border-white/20 transition-all" style={{ backgroundColor: userTeam.homeColor }}>
                   <Shirt size={40} className={userTeam.homeColor === '#ffffff' ? 'text-slate-900' : 'text-white'} />
                 </div>
                 <div>
                    <div className="flex items-center gap-3 mb-2">
                       <h1 className="text-4xl font-black uppercase tracking-tight leading-none">{userTeam.name}</h1>
                       <ShieldCheck size={24} className="text-blue-400" />
                    </div>
                    <div className="flex items-center gap-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                       <span className="flex items-center gap-2"><Users size={14} className="text-blue-500" /> {userTeam.members.length} Active Squad</span>
                    </div>
                 </div>
              </div>
              <div className="flex gap-4">
                 <div className="bg-blue-600 p-6 rounded-[32px] text-center min-w-[140px] shadow-xl shadow-blue-500/20">
                    <p className="text-[9px] font-black uppercase text-blue-200 tracking-[0.2em] mb-2">Member Since</p>
                    <p className="text-xl font-black uppercase">MAR 2024</p>
                 </div>
              </div>
           </div>
           <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8">
           <button
             onClick={() => setActiveTab('match')}
             className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeTab === 'match' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
           >
             <Trophy size={16} /> Match Day
           </button>
           <button
             onClick={() => setActiveTab('comms')}
             className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeTab === 'comms' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
           >
             <MessageSquare size={16} /> Team Comms
           </button>
        </div>

        {activeTab === 'match' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fade-in">
             <div className="lg:col-span-7 space-y-8">
                {/* Lineup Section */}
                <div className="bg-white rounded-[56px] p-10 border border-slate-100 shadow-sm overflow-hidden relative">
                   <div className="flex justify-between items-end mb-10">
                      <div>
                         <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Today's Selection</h2>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Squad selected by your Captain</p>
                      </div>
                      <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${
                        isFormationLocked ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                         {isFormationLocked ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                         {isFormationLocked ? 'Lineup Locked' : 'Recruiting XI'}
                      </div>
                   </div>

                   <div className="relative aspect-[3/4] w-full max-w-sm mx-auto rounded-[48px] border-[16px] border-emerald-700 bg-emerald-600 shadow-3xl overflow-hidden select-none pointer-events-none mb-12">
                      <div className="absolute inset-4 border-2 border-white/20 rounded-lg"></div>
                      <div className="absolute top-1/2 left-0 w-full h-1 border-b-2 border-white/20 -translate-y-1/2"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/20 rounded-full"></div>
                      {currentPoints.map(pos => {
                        const occupant = assignedPlayers[pos.id];
                        const isMe = occupant === userProfile.fullName;

                        return (
                          <div key={pos.id} className="absolute -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
                             <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex flex-col items-center justify-center shadow-lg border-4 transition-all ${
                                occupant ? (isMe ? 'bg-blue-600 border-white text-white scale-125 ring-8 ring-blue-500/20' : 'bg-white border-slate-100 text-slate-900') : 'bg-white/20 border-white/10 text-white/20'
                             }`}>
                                <span className="text-[7px] font-black uppercase opacity-40 mb-0.5">{pos.label}</span>
                                <span className="text-[8px] md:text-[9px] font-black uppercase text-center leading-none px-1">
                                  {occupant ? occupant.split(' ')[0] : ''}
                                </span>
                                {occupant && isFormationLocked && <div className="absolute -top-1 -right-1 bg-white text-emerald-600 rounded-full p-0.5 shadow-sm border border-emerald-100"><Check size={8} strokeWidth={4}/></div>}
                             </div>
                          </div>
                        );
                      })}
                   </div>

                   <div className={`mt-12 bg-slate-50 rounded-[40px] p-8 border border-slate-100 transition-all ${isFormationLocked ? 'opacity-60 grayscale' : ''}`}>
                      <div className="flex items-center justify-between mb-8 px-4">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Squad Substitutes</h3>
                        <Users size={20} className="text-slate-300" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {PLAYER_BENCH.map(player => (
                           <div key={player.id} className="bg-white border border-slate-100 rounded-[32px] p-6 flex flex-col items-center shadow-sm">
                              <img src={player.avatar} className="w-12 h-12 rounded-full border-2 border-slate-50 mb-3" alt="" />
                              <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight mb-1 text-center truncate w-full">{player.name.split(' ')[0]}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{player.role}</p>
                           </div>
                        ))}
                      </div>
                   </div>
                </div>
             </div>

             <div className="lg:col-span-5 space-y-8">
                {/* Team Treasury Section for Players */}
                <div className="bg-white rounded-[56px] p-10 border border-slate-100 shadow-xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-amber-400/10 transition-all"></div>
                   <div className="flex items-center gap-4 mb-8">
                      <div className="p-4 bg-amber-50 rounded-2xl text-amber-600 shadow-inner">
                         <Wallet size={24} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Team Treasury</h3>
                   </div>

                   <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Team Funds</p>
                            <p className="text-2xl font-black text-slate-900 leading-none">R{teamWallet.balance.toFixed(0)}</p>
                         </div>
                         <div className="p-6 bg-blue-50/50 rounded-[32px] border border-blue-100">
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">My Balance</p>
                            <p className="text-2xl font-black text-blue-900 leading-none">R{userProfile.wallet.balance.toFixed(0)}</p>
                         </div>
                      </div>

                      <div className="p-6 bg-amber-50 rounded-[32px] border border-amber-100/50">
                         <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <Heart size={12} className="fill-amber-700" /> Support the squad
                         </p>
                         <p className="text-[11px] text-amber-900/60 font-bold uppercase tracking-wide leading-relaxed mb-6">
                            Contribute to the team wallet to help fund tournament entries and match challenge fees.
                         </p>
                         <button
                           onClick={() => setShowFundModal(true)}
                           className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
                         >
                            <Plus size={18} /> Contribute to Funds
                         </button>
                      </div>
                   </div>
                </div>

                <div className="bg-white rounded-[56px] p-10 border border-slate-100 shadow-sm">
                   <h3 className="text-xl font-black text-slate-900 uppercase mb-8 flex items-center gap-3"><Award size={24} className="text-blue-600" /> My Performance</h3>
                   <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 text-center">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Goals</p>
                         <p className="text-3xl font-black text-slate-900">{userProfile.stats.goals}</p>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 text-center">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Assists</p>
                         <p className="text-3xl font-black text-slate-900">{userProfile.stats.assists}</p>
                      </div>
                   </div>
                </div>

                <button
                  onClick={() => setActiveTab('comms')}
                  className="w-full bg-slate-900 p-8 rounded-[48px] text-white shadow-2xl flex items-center justify-between group hover:bg-blue-600 transition-all"
                >
                   <div className="flex items-center gap-6">
                      <div className="relative">
                         <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center"><MessageSquare size={24} className="text-blue-400" /></div>
                         <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full border-4 border-slate-900 flex items-center justify-center text-[10px] font-black">!</div>
                      </div>
                      <div className="text-left">
                         <p className="text-sm font-black uppercase tracking-tight">Team Comms</p>
                         <p className="text-[10px] text-slate-400 group-hover:text-blue-100 font-bold uppercase tracking-widest">Connect with squad</p>
                      </div>
                   </div>
                   <ChevronRight size={20} className="text-slate-500 group-hover:text-white" />
                </button>
             </div>
          </div>
        ) : (
          <div className="animate-fade-in space-y-8 max-w-4xl mx-auto">
             <div className="bg-white rounded-[56px] border border-slate-100 shadow-2xl flex flex-col h-[700px] overflow-hidden">
                <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                   <div className="flex items-center gap-5">
                      <button onClick={() => setActiveTab('match')} className="p-3 bg-white rounded-xl text-slate-400 hover:text-slate-900 border border-slate-100 transition-colors"><ArrowLeft size={20} /></button>
                      <div>
                         <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Team Discussion</h3>
                         <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">{userTeam.members.length} Members Online</p>
                      </div>
                   </div>
                </div>
                <div className="flex-1 p-10 overflow-y-auto space-y-8 bg-slate-50/20 custom-scrollbar">
                   {messages.map((msg, idx) => {
                      const isSystem = msg.isSystem || msg.senderId === 'system';
                      const isMe = msg.senderId === 'me';

                      if (isSystem) {
                        return (
                          <div key={msg.id || idx} className="flex justify-center my-6">
                             <div className="bg-blue-50/50 border border-blue-100/50 px-6 py-3 rounded-full flex items-center gap-3">
                                <Zap size={14} className="text-blue-600" />
                                <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">{msg.text}</span>
                             </div>
                          </div>
                        );
                      }

                      return (
                        <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                           <div className="flex items-center gap-3 mb-2 px-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{msg.senderName}</span>
                              <span className="text-[10px] font-bold text-slate-300 uppercase">{msg.timestamp}</span>
                           </div>
                           <div className={`px-6 py-4 rounded-[32px] text-sm font-bold max-w-[80%] shadow-md border ${
                              isMe ? 'bg-blue-600 text-white border-blue-500 rounded-tr-none' : 'bg-white text-slate-900 border-slate-100 rounded-tl-none'
                           }`}>{msg.text}</div>
                        </div>
                      );
                   })}
                   <div ref={chatEndRef} />
                </div>
                <div className="p-10 bg-white border-t border-slate-50">
                   <div className="flex gap-4">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
                        placeholder="Discuss match tactics..."
                        className="flex-1 bg-slate-50 border-none rounded-[32px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner transition-all"
                      />
                      <button onClick={onSendMessage} className="p-6 bg-slate-900 text-white rounded-[32px] hover:bg-blue-600 transition-all shadow-2xl active:scale-95 flex items-center justify-center"><Send size={24} /></button>
                   </div>
                </div>
             </div>
             <button onClick={() => setActiveTab('match')} className="w-full py-6 bg-white border-2 border-slate-100 rounded-[32px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 hover:border-slate-200 transition-all flex items-center justify-center gap-4 shadow-sm"><ArrowLeft size={16} /> Return to Match Center</button>
          </div>
        )}
      </div>

      {/* Contribution Modal */}
      {showFundModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
           <div className="bg-white rounded-[64px] p-12 max-w-md w-full shadow-3xl animate-scale-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-3 bg-amber-500"></div>
              <div className="flex justify-between items-center mb-10">
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Fund Treasury</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Support {userTeam.name}</p>
                 </div>
                 <button onClick={() => setShowFundModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors"><X size={32} /></button>
              </div>

              <div className="space-y-8">
                 <div className="bg-slate-50 rounded-[40px] p-8 border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Contribution Amount (ZAR)</label>
                    <div className="flex items-center gap-4">
                       <span className="text-4xl font-black text-slate-900">R</span>
                       <input
                         type="number"
                         value={fundAmount}
                         onChange={(e) => setFundAmount(e.target.value)}
                         className="bg-transparent border-none text-4xl font-black text-slate-900 outline-none w-full"
                         autoFocus
                       />
                    </div>
                 </div>

                 <div className="flex items-center gap-4 p-6 bg-blue-50 rounded-3xl border border-blue-100">
                    <Wallet className="text-blue-600 shrink-0" size={24} />
                    <div>
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">From Personal Wallet</p>
                       <p className="text-sm font-black text-blue-900">Current Balance: R{userProfile.wallet.balance.toFixed(2)}</p>
                    </div>
                 </div>

                 <button
                   onClick={handleFund}
                   className="w-full py-8 bg-slate-900 text-white rounded-[32px] font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-4"
                 >
                    Confirm Transfer <ArrowUpRight size={20} />
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
