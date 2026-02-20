
import React, { useState } from 'react';
import {
  Zap, Globe, X, Activity, ChevronLeft, CheckCircle2, Lock, Trophy, MapPin, Clock, Calendar, Send, ShieldAlert, Wallet
} from 'lucide-react';
import { MatchLobby, LobbyMessage, TeamWallet } from '../../../types';
import { TacticalPitch } from '../../../components/domain/TacticalPitch';
import { LobbyChat } from '../../../components/domain/LobbyChat';
import { PaymentModal } from '../../../components/shared/modals/PaymentModal';

const FULL_SQUAD_LAYOUT = [
  // Team A (Initiator)
  { id: 'a-gk', label: 'GK', x: 50, y: 12, team: 'A' as const },
  { id: 'a-lb', label: 'LB', x: 15, y: 25, team: 'A' as const },
  { id: 'a-cb1', label: 'CB', x: 38, y: 25, team: 'A' as const },
  { id: 'a-cb2', label: 'CB', x: 62, y: 25, team: 'A' as const },
  { id: 'a-rb', label: 'RB', x: 85, y: 25, team: 'A' as const },
  { id: 'a-lm', label: 'LM', x: 15, y: 40, team: 'A' as const },
  { id: 'a-cm1', label: 'CM', x: 38, y: 40, team: 'A' as const },
  { id: 'a-cm2', label: 'CM', x: 62, y: 40, team: 'A' as const },
  { id: 'a-rm', label: 'RM', x: 85, y: 40, team: 'A' as const },
  { id: 'a-st1', label: 'ST', x: 38, y: 55, team: 'A' as const },
  { id: 'a-st2', label: 'ST', x: 62, y: 55, team: 'A' as const },
  // Team B (Opponent)
  { id: 'b-st1', label: 'ST', x: 38, y: 70, team: 'B' as const },
  { id: 'b-st2', label: 'ST', x: 62, y: 70, team: 'B' as const },
  { id: 'b-lm', label: 'LM', x: 15, y: 82, team: 'B' as const },
  { id: 'b-cm1', label: 'CM', x: 38, y: 82, team: 'B' as const },
  { id: 'b-cm2', label: 'CM', x: 62, y: 82, team: 'B' as const },
  { id: 'b-rm', label: 'RM', x: 85, y: 82, team: 'B' as const },
  { id: 'b-lb', label: 'LB', x: 15, y: 92, team: 'B' as const },
  { id: 'b-cb1', label: 'CB', x: 38, y: 92, team: 'B' as const },
  { id: 'b-cb2', label: 'CB', x: 62, y: 92, team: 'B' as const },
  { id: 'b-rb', label: 'RB', x: 85, y: 92, team: 'B' as const },
  { id: 'b-gk', label: 'GK', x: 50, y: 98, team: 'B' as const },
];

interface MatchmakingUIProps {
  matchJoined: boolean;
  setMatchJoined: (val: boolean) => void;
  selectedLobby: MatchLobby | null;
  isCreating: boolean;
  setIsCreating: (val: boolean) => void;
  isSelectingDateTime: boolean;
  setIsSelectingDateTime: (val: boolean) => void;
  matchMode: 'QUICK_PLAY' | 'TEAM_VS_TEAM';
  setMatchMode: (mode: 'QUICK_PLAY' | 'TEAM_VS_TEAM') => void;
  matchPhase: 'RECRUITING' | 'WAITING_OPPONENT' | 'SQUAD_FILLING' | 'CONFIRMED';
  assignedPositions: Record<string, string>;
  lobbyMessages: LobbyMessage[];
  newMessage: string;
  setNewMessage: (val: string) => void;
  onSendLobbyMessage: () => void;
  onPositionClick: (id: string) => void;
  onAutoFill: () => void;
  onGoToReport: () => void;
  onPostMatch: () => void;
  isMatchFinished: boolean;
  setIsMatchFinished: (val: boolean) => void;
  showPaymentModal: boolean;
  setShowPaymentModal: (val: boolean) => void;
  onProcessPayment: () => void;
  paymentStep: 'IDLE' | 'PROCESSING' | 'SUCCESS';
  lobbies: MatchLobby[];
  fields: any[];
  onEnterLobby: (lobby: MatchLobby, isHost: boolean, mode: any) => void;
  onStartHosting: (mode: 'QUICK_PLAY' | 'TEAM_VS_TEAM') => void;
  onSelectVenue: (field: any) => void;
  onSelectDateTime: (date: string, time: string) => void;
  userRole?: 'PLAYER' | 'CAPTAIN';
  teamWallet: TeamWallet;
}

export const MatchmakingUI: React.FC<MatchmakingUIProps> = ({
  matchJoined,
  setMatchJoined,
  selectedLobby,
  isCreating,
  setIsCreating,
  isSelectingDateTime,
  setIsSelectingDateTime,
  matchMode,
  setMatchMode,
  matchPhase,
  assignedPositions,
  lobbyMessages,
  newMessage,
  setNewMessage,
  onSendLobbyMessage,
  onPositionClick,
  onAutoFill,
  onGoToReport,
  onPostMatch,
  isMatchFinished,
  setIsMatchFinished,
  showPaymentModal,
  setShowPaymentModal,
  onProcessPayment,
  paymentStep,
  lobbies,
  fields,
  onEnterLobby,
  onStartHosting,
  onSelectVenue,
  onSelectDateTime,
  userRole,
  teamWallet
}) => {
  const [draftDate, setDraftDate] = useState('Today');
  const [draftTime, setDraftTime] = useState('18:00');

  const occupiedCount = Object.keys(assignedPositions).length;
  const isLobbyInList = lobbies.some(l => l.id === selectedLobby?.id);
  const showPostButton = matchJoined && selectedLobby && !isLobbyInList && !selectedLobby.matchId;

  if (matchJoined && matchPhase === 'CONFIRMED' && selectedLobby) {
    return (
      <div className="min-h-screen bg-white pb-24 animate-fade-in font-inter">
        <div className="max-w-6xl mx-auto px-4 py-12">
           <div className="flex items-center gap-4 mb-10">
              <button onClick={() => setMatchJoined(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-colors border border-slate-100"><ChevronLeft size={24}/></button>
              <div>
                 <h1 className="text-3xl font-black uppercase tracking-tighter">Match Secured</h1>
                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Automatic Booking Complete • Match ID: {selectedLobby.matchId}</p>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 space-y-8">
                 <div className="bg-slate-900 rounded-[56px] p-12 text-white relative overflow-hidden shadow-2xl">
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                       <div className="flex-1 space-y-6 text-center md:text-left">
                          <div className="flex items-center justify-center md:justify-start gap-3 bg-emerald-600/20 text-emerald-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest w-fit">
                             <CheckCircle2 size={14}/> Venue Booked & Paid
                          </div>
                          <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{selectedLobby.fieldName}</h2>
                          <div className="flex items-center justify-center md:justify-start gap-6 text-xs font-black text-slate-400 uppercase tracking-widest">
                             <span className="flex items-center gap-2"><MapPin size={16} /> {selectedLobby.location}</span>
                             <span className="flex items-center gap-2"><Clock size={16} /> {selectedLobby.startTime}</span>
                             <span className="flex items-center gap-2"><Calendar size={16} /> {selectedLobby.date}</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-slate-50 rounded-[56px] p-10 border border-slate-100">
                    <h3 className="text-xl font-black text-slate-900 uppercase mb-10 px-4 text-center">Final Battle Roster</h3>
                    <div className="grid grid-cols-2 gap-10">
                       <div className="space-y-3">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Team Alpha</p>
                          {FULL_SQUAD_LAYOUT.filter(p => p.team === 'A').map(p => (
                            <div key={p.id} className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                               <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black">{p.label}</div>
                               <span className="text-xs font-black text-slate-900 uppercase truncate">{assignedPositions[p.id]}</span>
                            </div>
                          ))}
                       </div>
                       <div className="space-y-3">
                          <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-4 text-right">Team Beta</p>
                          {FULL_SQUAD_LAYOUT.filter(p => p.team === 'B').map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                               <span className="text-xs font-black text-slate-900 uppercase truncate">{assignedPositions[p.id]}</span>
                               <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-[10px] font-black">{p.label}</div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-4 space-y-8">
                 <div className="bg-white rounded-[48px] p-8 border border-slate-100 shadow-xl space-y-6">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Reporting</h4>
                    <button
                      onClick={onGoToReport}
                      disabled={!isMatchFinished}
                      className={`w-full py-6 rounded-[32px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all ${
                        isMatchFinished ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-300'
                      }`}
                    >
                       {isMatchFinished ? <CheckCircle2 size={18}/> : <Lock size={18}/>}
                       Report Results
                    </button>
                    <label className="flex items-center gap-3 cursor-pointer group pt-4 border-t">
                      <input type="checkbox" checked={isMatchFinished} onChange={(e) => setIsMatchFinished(e.target.checked)} className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase text-slate-400">Match Finished</span>
                    </label>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  const teamMatches = lobbies.filter(l => l.isTeamMatch);
  const quickMatches = lobbies.filter(l => !l.isTeamMatch);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!matchJoined && !isCreating && !isSelectingDateTime && (
          <div className="space-y-16 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-[48px] p-12 border-4 border-white shadow-2xl relative group cursor-pointer hover:border-blue-600 transition-all" onClick={() => onStartHosting('QUICK_PLAY')}>
                  <Zap size={32} className="text-blue-600 mb-8" />
                  <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 mb-4">Host Quick Game</h2>
                  <p className="text-slate-500 font-medium mb-10">Start a public match. Open recruitment for individuals.</p>
                </div>
                <div className="bg-slate-900 rounded-[48px] p-12 shadow-2xl group cursor-pointer hover:border-blue-500 border-4 border-slate-900 transition-all" onClick={() => onStartHosting('TEAM_VS_TEAM')}>
                  <Trophy size={32} className="text-white mb-8" />
                  <h2 className="text-4xl font-black uppercase tracking-tighter text-white mb-4">Teams vs Teams</h2>
                  <p className="text-slate-400 font-medium mb-10">Challenge another squad with your full team wallet.</p>
                </div>
             </div>

             {teamMatches.length > 0 && (
                <div>
                   <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4 mb-10"><ShieldAlert className="text-red-600" size={32} /> Team Challenges</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {teamMatches.map(lobby => (
                        <div key={lobby.id} onClick={() => onEnterLobby(lobby, false, 'TEAM_VS_TEAM')} className="bg-slate-900 p-10 rounded-[48px] border-4 border-slate-800 shadow-2xl cursor-pointer group transition-all relative overflow-hidden">
                           <div className="relative z-10">
                              <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2 group-hover:text-blue-400 transition-colors">{lobby.fieldName}</h3>
                              <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mb-4">{lobby.location}</p>
                              <div className="flex items-center gap-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                 <span className="flex items-center gap-1"><Calendar size={12}/> {lobby.date}</span>
                                 <span className="flex items-center gap-1"><Clock size={12}/> {lobby.startTime}</span>
                              </div>
                              <div className="mt-8 flex justify-between items-center border-t border-white/10 pt-4">
                                 <span className="bg-red-600/20 text-red-500 px-3 py-1 rounded-full text-[8px] font-black tracking-[0.2em] animate-pulse uppercase">Team A Secured (R550)</span>
                                 <div className="flex items-center gap-2 text-[10px] font-black text-white/50">
                                    <Lock size={12}/> R550 Challenge Fee
                                 </div>
                              </div>
                           </div>
                           <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        </div>
                      ))}
                   </div>
                </div>
             )}

             <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4 mb-10"><Globe className="text-blue-600" size={32} /> Quick Matches</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                   {quickMatches.map(lobby => (
                     <div key={lobby.id} onClick={() => onEnterLobby(lobby, false, 'QUICK_PLAY')} className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-xl cursor-pointer group transition-all">
                        <div className="flex justify-between items-start mb-4">
                           <h3 className="text-xl font-black uppercase tracking-tight group-hover:text-blue-600 transition-colors">{lobby.fieldName}</h3>
                           <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{lobby.joinedCount}/{lobby.totalSlots}</span>
                        </div>
                        <div className="space-y-2">
                           <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2"><MapPin size={12}/> {lobby.location}</p>
                           <p className="text-slate-500 font-black uppercase text-[11px] tracking-widest flex items-center gap-2"><Calendar size={12}/> {lobby.date || 'Today'} • <Clock size={12}/> {lobby.startTime}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {isCreating && (
          <div className="max-w-2xl mx-auto bg-white p-12 rounded-[48px] shadow-2xl animate-fade-in border border-slate-100">
             <div className="flex justify-between mb-10 items-center">
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Select Venue</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Step 1 of 3</p>
                </div>
                <button onClick={() => setIsCreating(false)}><X size={32} className="text-slate-300 hover:text-slate-900 transition-colors"/></button>
             </div>
             <div className="space-y-4">
                {fields.map(f => (
                  <button key={f.id} onClick={() => onSelectVenue(f)} className="w-full p-8 bg-slate-50 hover:bg-blue-50 rounded-[32px] font-black text-left transition-all uppercase flex justify-between items-center group">
                    <div>
                      <span className="block text-lg leading-none">{f.name}</span>
                      <span className="text-[10px] text-slate-400 font-bold mt-2 block tracking-widest">{f.location}</span>
                    </div>
                    <ChevronLeft className="rotate-180 text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </button>
                ))}
             </div>
          </div>
        )}

        {isSelectingDateTime && (
          <div className="max-w-2xl mx-auto bg-white p-12 rounded-[48px] shadow-2xl animate-fade-in border border-slate-100">
             <div className="flex justify-between mb-10 items-center">
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Schedule Game</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Step 2 of 3</p>
                </div>
                <button onClick={() => setIsSelectingDateTime(false)}><X size={32} className="text-slate-300 hover:text-slate-900 transition-colors"/></button>
             </div>

             <div className="space-y-8">
                <div>
                   <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Select Day</label>
                   <div className="grid grid-cols-2 gap-3">
                      {['Today', 'Tomorrow', 'Wednesday', 'Thursday'].map(day => (
                        <button key={day} onClick={() => setDraftDate(day)} className={`p-6 rounded-3xl font-black uppercase text-xs tracking-widest transition-all border ${draftDate === day ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'}`}>{day}</button>
                      ))}
                   </div>
                </div>

                <div>
                   <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Select Time Slot</label>
                   <div className="grid grid-cols-4 gap-3">
                      {['17:00', '18:00', '19:00', '20:00', '21:00'].map(time => (
                        <button key={time} onClick={() => setDraftTime(time)} className={`p-4 rounded-2xl font-black text-xs transition-all border ${draftTime === time ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'}`}>{time}</button>
                      ))}
                   </div>
                </div>

                <button
                  onClick={() => onSelectDateTime(draftDate, draftTime)}
                  className="w-full py-8 bg-blue-600 text-white rounded-[32px] font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-4 active:scale-95"
                >
                  Confirm Formation <ChevronLeft className="rotate-180" size={20}/>
                </button>
             </div>
          </div>
        )}

        {matchJoined && selectedLobby && (
          <div className="animate-fade-in space-y-8 max-w-6xl mx-auto">
             <div className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">{selectedLobby.fieldName}</h1>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-4 flex items-center gap-4">
                    <span className="flex items-center gap-1"><MapPin size={12}/> {selectedLobby.location}</span>
                    <span className="flex items-center gap-1"><Clock size={12}/> {selectedLobby.startTime}</span>
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                        {selectedLobby.isTeamMatch ? (selectedLobby.teamBFunded ? "Both Teams Secured" : "Awaiting Challenger Team") : `${occupiedCount}/22 Recruited`}
                    </span>
                  </p>
                </div>
                {selectedLobby.isTeamMatch && (
                  <div className="flex items-center gap-6">
                     <div className="flex flex-col items-end">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Team Wallet</p>
                        <p className="text-xl font-black text-slate-900">R{teamWallet.balance.toFixed(2)}</p>
                     </div>
                     <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Wallet size={24}/></div>
                  </div>
                )}
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8">
                   <TacticalPitch
                     points={FULL_SQUAD_LAYOUT}
                     assignedPlayers={assignedPositions}
                     onPointClick={onPositionClick}
                     isLocked={matchPhase === 'CONFIRMED'}
                   />
                </div>
                <div className="lg:col-span-4 flex flex-col gap-8">
                   <LobbyChat
                     messages={lobbyMessages}
                     newMessage={newMessage}
                     setNewMessage={setNewMessage}
                     onSendMessage={onSendLobbyMessage}
                     subtitle="Match Coordination"
                   />

                   {showPostButton && (
                     <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl animate-bounce-in">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 text-center">
                           {selectedLobby.isTeamMatch ? "Challenge Treasury" : "Ready to Recruit?"}
                        </h4>
                        <button
                          onClick={onPostMatch}
                          className="w-full py-6 bg-emerald-600 text-white rounded-[32px] font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95 group"
                        >
                          <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                          {selectedLobby.isTeamMatch ? "Post & Pay R550 from Team Wallet" : "Post Match to Lobby"}
                        </button>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-6 text-center leading-relaxed px-4">
                          {selectedLobby.isTeamMatch
                             ? "Hosting a Team vs Team match requires R550 from your team treasury to secure the pitch initial booking."
                             : "Posting will list this session under Available Lobbies for other players to join."}
                        </p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={onProcessPayment}
        amount={selectedLobby?.isTeamMatch ? 550 : 50}
        status={paymentStep}
        title={selectedLobby?.isTeamMatch ? "Team Challenge" : "Secure Spot"}
        description={selectedLobby?.isTeamMatch ? "Treasury Challenge Funding" : "Arena Match Access Fee"}
      />
    </div>
  );
};
