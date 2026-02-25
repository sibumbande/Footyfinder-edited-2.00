
import React, { useState } from 'react';
import {
  Zap, Globe, X, Activity, ChevronLeft, CheckCircle2, Lock, Trophy, MapPin, Clock, Calendar, Send, ShieldAlert, Wallet, Shield, Users
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
  onPostMatch: () => void;
  onAcceptChallenge: () => void;
  onReportResults: (scoreHome: number, scoreAway: number, players: { name: string; team: 'HOME' | 'AWAY'; goals: number; assists: number }[]) => Promise<boolean>;
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
  currentUserId: string;
  userTeamId?: string;
  challengerTeamName?: string;
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
  onPostMatch,
  onAcceptChallenge,
  onReportResults,
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
  teamWallet,
  currentUserId,
  userTeamId,
  challengerTeamName,
}) => {
  const [draftDate, setDraftDate] = useState('Today');
  const [draftTime, setDraftTime] = useState('18:00');
  const [teamDetailView, setTeamDetailView] = useState<'matchday' | 'reporting' | 'completed'>('matchday');
  const [scoreHome, setScoreHome] = useState(0);
  const [scoreAway, setScoreAway] = useState(0);
  const [goalScorersHome, setGoalScorersHome] = useState<string[]>([]);
  const [goalScorersAway, setGoalScorersAway] = useState<string[]>([]);
  const [assistsHome, setAssistsHome] = useState<string[]>([]);
  const [assistsAway, setAssistsAway] = useState<string[]>([]);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const occupiedCount = Object.keys(assignedPositions).length;
  const isLobbyInList = lobbies.some(l => l.id === selectedLobby?.id);
  const showPostButton = matchJoined && selectedLobby && !isLobbyInList && !selectedLobby.matchId;

  if (matchJoined && matchPhase === 'CONFIRMED' && selectedLobby) {
    const isTeamConfirmed = selectedLobby.isTeamMatch;
    const homeTeamName = selectedLobby.teamName || 'Team Alpha';
    const awayTeamName = challengerTeamName || 'Team Beta';

    // Build roster lists from assigned positions
    const homeRoster = FULL_SQUAD_LAYOUT.filter(p => p.team === 'A').map(p => ({
      id: p.id, label: p.label, name: assignedPositions[p.id] || '—',
    }));
    const awayRoster = FULL_SQUAD_LAYOUT.filter(p => p.team === 'B').map(p => ({
      id: p.id, label: p.label, name: assignedPositions[p.id] || '—',
    }));
    const homePlayerNames = homeRoster.map(p => p.name).filter(n => n !== '—');
    const awayPlayerNames = awayRoster.map(p => p.name).filter(n => n !== '—');

    // Build players array for report submission
    const buildPlayersArray = () => {
      const players: { name: string; team: 'HOME' | 'AWAY'; goals: number; assists: number }[] = [];
      // Aggregate goals per player
      const homeGoalCounts: Record<string, number> = {};
      goalScorersHome.forEach(n => { homeGoalCounts[n] = (homeGoalCounts[n] || 0) + 1; });
      const awayGoalCounts: Record<string, number> = {};
      goalScorersAway.forEach(n => { awayGoalCounts[n] = (awayGoalCounts[n] || 0) + 1; });
      const homeAssistCounts: Record<string, number> = {};
      assistsHome.forEach(n => { homeAssistCounts[n] = (homeAssistCounts[n] || 0) + 1; });
      const awayAssistCounts: Record<string, number> = {};
      assistsAway.forEach(n => { awayAssistCounts[n] = (awayAssistCounts[n] || 0) + 1; });

      // All home players
      const allHomeNames = new Set([...homePlayerNames, ...Object.keys(homeGoalCounts), ...Object.keys(homeAssistCounts)]);
      allHomeNames.forEach(name => {
        players.push({ name, team: 'HOME', goals: homeGoalCounts[name] || 0, assists: homeAssistCounts[name] || 0 });
      });
      // All away players
      const allAwayNames = new Set([...awayPlayerNames, ...Object.keys(awayGoalCounts), ...Object.keys(awayAssistCounts)]);
      allAwayNames.forEach(name => {
        players.push({ name, team: 'AWAY', goals: awayGoalCounts[name] || 0, assists: awayAssistCounts[name] || 0 });
      });
      return players;
    };

    // ── STEP 5: COMPLETED SUMMARY ──
    if (teamDetailView === 'completed' && isTeamConfirmed) {
      return (
        <div className="min-h-screen bg-slate-50 pb-24 animate-fade-in font-inter">
          <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
             <div className="bg-slate-900 rounded-[56px] p-12 text-white text-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                <div className="relative z-10 space-y-6">
                   <div className="w-20 h-20 bg-emerald-600/20 rounded-3xl flex items-center justify-center mx-auto">
                      <Trophy size={40} className="text-emerald-400" />
                   </div>
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Final Result</p>
                   <div className="flex items-center justify-center gap-8 py-4">
                      <div className="text-center flex-1">
                         <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">{homeTeamName}</p>
                         <p className="text-6xl font-black text-white">{scoreHome}</p>
                      </div>
                      <p className="text-2xl font-black text-slate-600">—</p>
                      <div className="text-center flex-1">
                         <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">{awayTeamName}</p>
                         <p className="text-6xl font-black text-white">{scoreAway}</p>
                      </div>
                   </div>
                   <h2 className="text-3xl font-black uppercase tracking-tighter">{selectedLobby.fieldName}</h2>
                   <div className="flex items-center justify-center gap-6 text-xs font-black text-slate-500 uppercase tracking-widest">
                      <span className="flex items-center gap-2"><MapPin size={14}/> {selectedLobby.location}</span>
                      <span className="flex items-center gap-2"><Calendar size={14}/> {selectedLobby.date}</span>
                   </div>
                </div>
             </div>

             <div className="bg-white rounded-[48px] p-8 border border-slate-100 shadow-xl space-y-4 text-center">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Results posted • Player stats updated • Revenue split applied • Lobby closed</p>

                {goalScorersHome.length > 0 && (
                  <div className="text-left">
                     <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">{homeTeamName} Goals</p>
                     {goalScorersHome.map((n, i) => <p key={i} className="text-xs font-bold text-slate-700">⚽ {n}</p>)}
                  </div>
                )}
                {goalScorersAway.length > 0 && (
                  <div className="text-left">
                     <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-2">{awayTeamName} Goals</p>
                     {goalScorersAway.map((n, i) => <p key={i} className="text-xs font-bold text-slate-700">⚽ {n}</p>)}
                  </div>
                )}

                <button
                  onClick={() => setMatchJoined(false)}
                  className="w-full py-5 bg-slate-900 text-white rounded-[32px] font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all mt-4"
                >
                  Back to Lobbies
                </button>
             </div>
          </div>
        </div>
      );
    }

    // ── STEP 4: REPORT RESULTS FORM ──
    if (teamDetailView === 'reporting' && isTeamConfirmed) {
      return (
        <div className="min-h-screen bg-slate-50 pb-24 animate-fade-in font-inter">
          <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
             <div className="flex items-center gap-4">
                <button onClick={() => setTeamDetailView('matchday')} className="p-3 bg-white rounded-2xl text-slate-400 hover:text-slate-900 transition-colors border border-slate-100"><ChevronLeft size={24}/></button>
                <div>
                   <h1 className="text-3xl font-black uppercase tracking-tighter">Report Results</h1>
                   <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{homeTeamName} vs {awayTeamName}</p>
                </div>
             </div>

             {/* Score Entry */}
             <div className="bg-white rounded-[48px] p-8 border border-slate-100 shadow-xl space-y-6">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest text-center">Final Score</h4>
                <div className="flex items-center justify-center gap-8">
                   <div className="text-center space-y-3">
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{homeTeamName}</p>
                      <div className="flex items-center gap-3">
                         <button onClick={() => setScoreHome(Math.max(0, scoreHome - 1))} className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-200 font-black text-xl text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all">−</button>
                         <span className="text-5xl font-black text-slate-900 w-14 text-center">{scoreHome}</span>
                         <button onClick={() => setScoreHome(scoreHome + 1)} className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-200 font-black text-xl text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all">+</button>
                      </div>
                   </div>
                   <span className="text-2xl font-black text-slate-300 mt-6">—</span>
                   <div className="text-center space-y-3">
                      <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">{awayTeamName}</p>
                      <div className="flex items-center gap-3">
                         <button onClick={() => setScoreAway(Math.max(0, scoreAway - 1))} className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-200 font-black text-xl text-slate-400 hover:border-red-400 hover:text-red-600 transition-all">−</button>
                         <span className="text-5xl font-black text-slate-900 w-14 text-center">{scoreAway}</span>
                         <button onClick={() => setScoreAway(scoreAway + 1)} className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-200 font-black text-xl text-slate-400 hover:border-red-400 hover:text-red-600 transition-all">+</button>
                      </div>
                   </div>
                </div>
             </div>

             {/* Goal Scorers */}
             <div className="bg-white rounded-[48px] p-8 border border-slate-100 shadow-xl space-y-6">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Goal Scorers</h4>

                {/* Home Goals */}
                <div className="space-y-3">
                   <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{homeTeamName} Goals</p>
                   <div className="flex flex-wrap gap-2">
                      {goalScorersHome.map((name, i) => (
                        <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
                          ⚽ {name}
                          <button onClick={() => setGoalScorersHome(prev => prev.filter((_, idx) => idx !== i))} className="text-blue-400 hover:text-blue-700">×</button>
                        </span>
                      ))}
                   </div>
                   {homePlayerNames.length > 0 && (
                     <select
                       onChange={(e) => { if (e.target.value) { setGoalScorersHome(prev => [...prev, e.target.value]); e.target.value = ''; } }}
                       className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600"
                       defaultValue=""
                     >
                       <option value="" disabled>+ Add goal scorer...</option>
                       {homePlayerNames.map(n => <option key={n} value={n}>{n}</option>)}
                     </select>
                   )}
                </div>

                {/* Away Goals */}
                <div className="space-y-3">
                   <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">{awayTeamName} Goals</p>
                   <div className="flex flex-wrap gap-2">
                      {goalScorersAway.map((name, i) => (
                        <span key={i} className="bg-red-50 text-red-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
                          ⚽ {name}
                          <button onClick={() => setGoalScorersAway(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-700">×</button>
                        </span>
                      ))}
                   </div>
                   {awayPlayerNames.length > 0 && (
                     <select
                       onChange={(e) => { if (e.target.value) { setGoalScorersAway(prev => [...prev, e.target.value]); e.target.value = ''; } }}
                       className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600"
                       defaultValue=""
                     >
                       <option value="" disabled>+ Add goal scorer...</option>
                       {awayPlayerNames.map(n => <option key={n} value={n}>{n}</option>)}
                     </select>
                   )}
                </div>
             </div>

             {/* Assists (Optional) */}
             <div className="bg-white rounded-[48px] p-8 border border-slate-100 shadow-xl space-y-6">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Assists <span className="text-slate-400 normal-case">(optional)</span></h4>

                <div className="space-y-3">
                   <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{homeTeamName}</p>
                   <div className="flex flex-wrap gap-2">
                      {assistsHome.map((name, i) => (
                        <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
                          🅰️ {name}
                          <button onClick={() => setAssistsHome(prev => prev.filter((_, idx) => idx !== i))} className="text-blue-400 hover:text-blue-700">×</button>
                        </span>
                      ))}
                   </div>
                   {homePlayerNames.length > 0 && (
                     <select
                       onChange={(e) => { if (e.target.value) { setAssistsHome(prev => [...prev, e.target.value]); e.target.value = ''; } }}
                       className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600"
                       defaultValue=""
                     >
                       <option value="" disabled>+ Add assist...</option>
                       {homePlayerNames.map(n => <option key={n} value={n}>{n}</option>)}
                     </select>
                   )}
                </div>

                <div className="space-y-3">
                   <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">{awayTeamName}</p>
                   <div className="flex flex-wrap gap-2">
                      {assistsAway.map((name, i) => (
                        <span key={i} className="bg-red-50 text-red-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
                          🅰️ {name}
                          <button onClick={() => setAssistsAway(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-700">×</button>
                        </span>
                      ))}
                   </div>
                   {awayPlayerNames.length > 0 && (
                     <select
                       onChange={(e) => { if (e.target.value) { setAssistsAway(prev => [...prev, e.target.value]); e.target.value = ''; } }}
                       className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600"
                       defaultValue=""
                     >
                       <option value="" disabled>+ Add assist...</option>
                       {awayPlayerNames.map(n => <option key={n} value={n}>{n}</option>)}
                     </select>
                   )}
                </div>
             </div>

             {/* Submit */}
             <button
               onClick={async () => {
                 setIsSubmittingReport(true);
                 const players = buildPlayersArray();
                 const ok = await onReportResults(scoreHome, scoreAway, players);
                 if (ok) {
                   setTeamDetailView('completed');
                 }
                 setIsSubmittingReport(false);
               }}
               disabled={isSubmittingReport}
               className={`w-full py-6 rounded-[32px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-2xl ${
                 isSubmittingReport ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'
               }`}
             >
                {isSubmittingReport ? (
                  <><Activity size={18} className="animate-spin" /> Posting Results...</>
                ) : (
                  <><CheckCircle2 size={18} /> Confirm & Post Results</>
                )}
             </button>
             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center leading-relaxed px-4">
               Records match, updates player stats, triggers 80/20 revenue split, releases escrow, and closes the lobby.
             </p>
          </div>
        </div>
      );
    }

    // ── STEP 3: MATCH DAY VIEW (default for CONFIRMED team matches) ──
    return (
      <div className="min-h-screen bg-white pb-24 animate-fade-in font-inter">
        <div className="max-w-6xl mx-auto px-4 py-12">
           <div className="flex items-center gap-4 mb-10">
              <button onClick={() => setMatchJoined(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-colors border border-slate-100"><ChevronLeft size={24}/></button>
              <div>
                 <h1 className="text-3xl font-black uppercase tracking-tighter">{isTeamConfirmed ? 'Match Day' : 'Match Secured'}</h1>
                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                    {isTeamConfirmed
                      ? `${homeTeamName} vs ${awayTeamName} — CONFIRMED`
                      : `Automatic Booking Complete • Match ID: ${selectedLobby.matchId}`}
                 </p>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 space-y-8">
                 {/* Venue Header */}
                 <div className="bg-slate-900 rounded-[56px] p-12 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-red-600"></div>
                    <div className="relative z-10 space-y-6">
                       <div className="flex items-center justify-center gap-3 bg-emerald-600/20 text-emerald-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest w-fit mx-auto">
                          <CheckCircle2 size={14}/> Venue Booked & Paid
                       </div>
                       <h2 className="text-5xl font-black uppercase tracking-tighter leading-none text-center">{selectedLobby.fieldName}</h2>
                       <div className="flex items-center justify-center gap-6 text-xs font-black text-slate-400 uppercase tracking-widest">
                          <span className="flex items-center gap-2"><MapPin size={16} /> {selectedLobby.location}</span>
                          <span className="flex items-center gap-2"><Clock size={16} /> {selectedLobby.startTime}</span>
                          <span className="flex items-center gap-2"><Calendar size={16} /> {selectedLobby.date}</span>
                       </div>
                       {isTeamConfirmed && (
                         <div className="flex items-center justify-center gap-8 pt-4">
                            <p className="text-xl font-black text-blue-400 uppercase tracking-tight">{homeTeamName}</p>
                            <p className="text-lg font-black text-slate-600">VS</p>
                            <p className="text-xl font-black text-red-400 uppercase tracking-tight">{awayTeamName}</p>
                         </div>
                       )}
                    </div>
                 </div>

                 {/* Battle Roster */}
                 <div className="bg-slate-50 rounded-[56px] p-10 border border-slate-100">
                    <h3 className="text-xl font-black text-slate-900 uppercase mb-10 px-4 text-center">Battle Roster</h3>
                    <div className="grid grid-cols-2 gap-10">
                       <div className="space-y-3">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">{isTeamConfirmed ? homeTeamName : 'Team Alpha'}</p>
                          {homeRoster.map(p => (
                            <div key={p.id} className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                               <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black">{p.label}</div>
                               <span className="text-xs font-black text-slate-900 uppercase truncate">{p.name}</span>
                            </div>
                          ))}
                       </div>
                       <div className="space-y-3">
                          <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-4 text-right">{isTeamConfirmed ? awayTeamName : 'Team Beta'}</p>
                          {awayRoster.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                               <span className="text-xs font-black text-slate-900 uppercase truncate">{p.name}</span>
                               <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-[10px] font-black">{p.label}</div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-4 space-y-8">
                 {/* Lobby Chat */}
                 <LobbyChat
                   messages={lobbyMessages}
                   newMessage={newMessage}
                   setNewMessage={setNewMessage}
                   onSendMessage={onSendLobbyMessage}
                   subtitle="Match Day Chat"
                 />

                 {/* Report Results Button */}
                 {isTeamConfirmed && (
                   <div className="bg-white rounded-[48px] p-8 border border-slate-100 shadow-xl">
                      <button
                        onClick={() => setTeamDetailView('reporting')}
                        className="w-full py-6 bg-blue-600 text-white rounded-[32px] font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95"
                      >
                        <Trophy size={18} />
                        Match Complete — Report Results
                      </button>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-6 text-center leading-relaxed px-4">
                        Click when the match is over to enter the final score and individual stats.
                      </p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    );
  }

  const teamMatches = lobbies.filter(l => l.isTeamMatch);
  const quickMatches = lobbies.filter(l => !l.isTeamMatch);

  const CITY_ORDER = ['Cape Town', 'Johannesburg', 'Port Elizabeth'];

  function groupByCity<T extends { city?: string }>(items: T[]): { city: string; items: T[] }[] {
    const map: Record<string, T[]> = {};
    for (const item of items) {
      const city = item.city || 'Other';
      if (!map[city]) map[city] = [];
      map[city].push(item);
    }
    const ordered = CITY_ORDER.filter(c => map[c]).map(c => ({ city: c, items: map[c] }));
    const other = Object.keys(map).filter(c => !CITY_ORDER.includes(c));
    other.forEach(c => ordered.push({ city: c, items: map[c] }));
    return ordered;
  }

  const teamMatchesByCity = groupByCity(teamMatches);
  const quickMatchesByCity = groupByCity(quickMatches);

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

             {teamMatchesByCity.length > 0 && (
                <div className="space-y-10">
                   <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4"><ShieldAlert className="text-red-600" size={32} /> Team Challenges</h2>
                   {teamMatchesByCity.map(({ city, items }) => (
                     <div key={city}>
                       <div className="flex items-center gap-3 mb-6">
                         <div className="bg-red-600 p-2 rounded-xl"><MapPin size={14} className="text-white" /></div>
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{city}</h3>
                         <div className="flex-1 h-px bg-slate-200"></div>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{items.length} match{items.length !== 1 ? 'es' : ''}</span>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                         {items.map(lobby => {
                           const isConfirmed = lobby.isConfirmed;
                           const hostName = lobby.teamName || 'Team A';
                           return (
                             <div key={lobby.id} onClick={() => onEnterLobby(lobby, false, 'TEAM_VS_TEAM')} className="bg-slate-900 p-10 rounded-[48px] border-4 border-slate-800 shadow-2xl cursor-pointer group transition-all relative overflow-hidden">
                               <div className="relative z-10">
                                 <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2 group-hover:text-blue-400 transition-colors">{lobby.fieldName}</h3>
                                 <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mb-4">{lobby.location}</p>
                                 <div className="flex items-center gap-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                   <span className="flex items-center gap-1"><Calendar size={12}/> {lobby.date}</span>
                                   <span className="flex items-center gap-1"><Clock size={12}/> {lobby.startTime}</span>
                                 </div>
                                 <div className="mt-8 flex justify-between items-center border-t border-white/10 pt-4">
                                   <span className={`px-3 py-1 rounded-full text-[8px] font-black tracking-[0.2em] uppercase ${
                                     isConfirmed ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-500 animate-pulse'
                                   }`}>
                                     {isConfirmed ? `${hostName} vs Challenger — CONFIRMED` : `${hostName} vs ??? — Waiting`}
                                   </span>
                                   <div className="flex items-center gap-2 text-[10px] font-black text-white/50">
                                     <Lock size={12}/> R550
                                   </div>
                                 </div>
                               </div>
                               <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                             </div>
                           );
                         })}
                       </div>
                     </div>
                   ))}
                </div>
             )}

             <div className="space-y-10">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4"><Globe className="text-blue-600" size={32} /> Quick Matches</h2>
                {quickMatchesByCity.length > 0 ? quickMatchesByCity.map(({ city, items }) => (
                  <div key={city}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-blue-600 p-2 rounded-xl"><MapPin size={14} className="text-white" /></div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{city}</h3>
                      <div className="flex-1 h-px bg-slate-200"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{items.length} match{items.length !== 1 ? 'es' : ''}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {items.map(lobby => (
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
                )) : (
                  <div className="py-12 text-center">
                    <Activity className="mx-auto text-slate-200 mb-4" size={48} />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No quick matches available right now.</p>
                  </div>
                )}
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

        {/* ── Team Match: Card-based flow (no pitch until CONFIRMED) ── */}
        {matchJoined && selectedLobby && selectedLobby.isTeamMatch && matchPhase !== 'CONFIRMED' && (
          <div className="animate-fade-in max-w-2xl mx-auto space-y-8">
             <button onClick={() => setMatchJoined(false)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-sm font-bold uppercase tracking-widest">
                <ChevronLeft size={18}/> Back to Lobbies
             </button>

             {/* Match Card */}
             <div className="bg-slate-900 rounded-[48px] p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-red-600"></div>
                <div className="relative z-10 space-y-8">
                   <div className="text-center">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Teams vs Teams</p>
                      <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{selectedLobby.fieldName}</h2>
                   </div>

                   <div className="flex items-center justify-center gap-6 text-xs font-black text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-2"><MapPin size={14}/> {selectedLobby.location}</span>
                      <span className="flex items-center gap-2"><Clock size={14}/> {selectedLobby.startTime}</span>
                      <span className="flex items-center gap-2"><Calendar size={14}/> {selectedLobby.date}</span>
                   </div>

                   {/* VS Display */}
                   <div className="flex items-center justify-center gap-8 py-8">
                      <div className="text-center flex-1">
                         <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <Shield size={36} className="text-blue-400"/>
                         </div>
                         <p className="text-lg font-black uppercase tracking-tight text-white">{selectedLobby.teamName || 'Host Team'}</p>
                         <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">Home</p>
                      </div>
                      <div className="text-3xl font-black text-slate-600">VS</div>
                      <div className="text-center flex-1">
                         <div className="w-20 h-20 bg-red-600/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            {challengerTeamName ? <Shield size={36} className="text-red-400"/> : <Users size={36} className="text-slate-600"/>}
                         </div>
                         <p className="text-lg font-black uppercase tracking-tight text-white">{challengerTeamName || '???'}</p>
                         <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mt-1">{challengerTeamName ? 'Away' : 'Open Challenge'}</p>
                      </div>
                   </div>

                   {/* Fee Info */}
                   <div className="bg-white/5 rounded-3xl p-6 flex items-center justify-between">
                      <div>
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Challenge Fee</p>
                         <p className="text-2xl font-black text-white">R550</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Team Wallet</p>
                         <p className="text-2xl font-black text-amber-400">R{teamWallet.balance.toFixed(0)}</p>
                      </div>
                   </div>
                </div>
             </div>

             {/* Action Card */}
             {(() => {
               const isLocalDraft = selectedLobby.id.startsWith('l-');
               const isHost = isLocalDraft || selectedLobby.createdBy === currentUserId;
               const isSameTeam = userTeamId && selectedLobby.teamId && userTeamId === selectedLobby.teamId;

               // Host with local draft: Post & Pay button
               if (isHost && isLocalDraft) return (
                 <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl">
                    <button
                      onClick={onPostMatch}
                      className="w-full py-6 bg-emerald-600 text-white rounded-[32px] font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95 group"
                    >
                      <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                      Post & Pay R550 from Team Wallet
                    </button>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-6 text-center leading-relaxed px-4">
                      R550 is deducted from your team wallet to secure the pitch. Your match appears in the lobby list for challengers.
                    </p>
                 </div>
               );

               // Host waiting for challenger
               if (isHost && !isLocalDraft) return (
                 <div className="bg-slate-100 p-10 rounded-[48px] border border-slate-200">
                    <div className="w-full py-6 bg-slate-200 text-slate-500 rounded-[32px] font-black uppercase tracking-[0.1em] text-xs flex items-center justify-center gap-3">
                      <Activity size={18} className="animate-pulse" />
                      Waiting for Challenger...
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-6 text-center leading-relaxed px-4">
                      Your team is on the HOME side. Another captain must accept this challenge.
                    </p>
                 </div>
               );

               // Challenger captain: Accept button (must be captain of a DIFFERENT team)
               if (!isHost && !isSameTeam && userRole === 'CAPTAIN') return (
                 <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl">
                    <button
                      onClick={onAcceptChallenge}
                      className="w-full py-6 bg-red-600 text-white rounded-[32px] font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-red-700 transition-all flex items-center justify-center gap-3 active:scale-95 group"
                    >
                      <Activity size={18} />
                      Accept Challenge — R550
                    </button>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-6 text-center leading-relaxed px-4">
                      R550 is deducted from your team wallet. Both formations auto-load and the match is confirmed.
                    </p>
                 </div>
               );

               return null;
             })()}
          </div>
        )}

        {/* ── Quick Play: Pitch + Chat (existing flow) ── */}
        {matchJoined && selectedLobby && !selectedLobby.isTeamMatch && (
          <div className="animate-fade-in space-y-8 max-w-6xl mx-auto">
             <div className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">{selectedLobby.fieldName}</h1>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-4 flex items-center gap-4">
                    <span className="flex items-center gap-1"><MapPin size={12}/> {selectedLobby.location}</span>
                    <span className="flex items-center gap-1"><Clock size={12}/> {selectedLobby.startTime}</span>
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">{occupiedCount}/22 Recruited</span>
                  </p>
                </div>
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
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 text-center">Ready to Recruit?</h4>
                        <button
                          onClick={onPostMatch}
                          className="w-full py-6 bg-emerald-600 text-white rounded-[32px] font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95 group"
                        >
                          <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                          Post Match to Lobby
                        </button>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-6 text-center leading-relaxed px-4">
                          Posting will list this session under Available Lobbies for other players to join.
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
