
import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, CheckCircle2, X, Plus, Minus, Users, Award, Shield, ChevronRight, Save, User, Search, Trash2 } from 'lucide-react';
import { MatchLobby, MatchRecord } from '../../../types';
import { getMatchById } from '../../../frontend/api';

interface PostMatchReportProps {
  lobby: MatchLobby;
  squad: { id: string, name: string, team: 'A' | 'B' }[];
  onSave: (record: MatchRecord) => void;
  onCancel: () => void;
}

export const PostMatchReport: React.FC<PostMatchReportProps> = ({ lobby, squad: propSquad, onSave, onCancel }) => {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [squad, setSquad] = useState(propSquad);

  // Fetch match data from API if match ID is available
  useEffect(() => {
    if (!lobby.matchId || lobby.matchId.startsWith('match-')) return;
    getMatchById(lobby.matchId).then(data => {
      if (data.players && data.players.length > 0) {
        const apiSquad = data.players.map(p => ({
          id: p.userId,
          name: p.fullName,
          team: (p.teamSide === 'HOME' ? 'A' : 'B') as 'A' | 'B',
        }));
        setSquad(apiSquad);
      }
      if (data.match.scoreHome > 0 || data.match.scoreAway > 0) {
        setScoreA(data.match.scoreHome);
        setScoreB(data.match.scoreAway);
      }
    }).catch(() => {
      // Keep prop data on error
    });
  }, [lobby.matchId]);

  // Track stats only for players who are "active" contributors in this report
  const [contributorIds, setContributorIds] = useState<string[]>([]);
  const [playerStats, setPlayerStats] = useState<Record<string, { goals: number, assists: number }>>({});

  // Filter squad for search results
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return squad.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !contributorIds.includes(p.id)
    );
  }, [searchTerm, squad, contributorIds]);

  const addContributor = (player: { id: string, name: string, team: 'A' | 'B' }) => {
    if (contributorIds.includes(player.id)) return;
    setContributorIds(prev => [...prev, player.id]);
    setPlayerStats(prev => ({
      ...prev,
      [player.id]: { goals: 1, assists: 0 } // Default to 1 goal when adding
    }));
    setSearchTerm('');
  };

  const removeContributor = (playerId: string) => {
    setContributorIds(prev => prev.filter(id => id !== playerId));
    const newStats = { ...playerStats };
    delete newStats[playerId];
    setPlayerStats(newStats);
  };

  const updateStat = (playerId: string, stat: 'goals' | 'assists', delta: number) => {
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [stat]: Math.max(0, prev[playerId][stat] + delta)
      }
    }));
  };

  const handleFinish = () => {
    const record: MatchRecord = {
      id: lobby.matchId || `match-${Date.now()}`,
      lobbyId: lobby.id,
      date: new Date().toLocaleDateString(),
      fieldName: lobby.fieldName,
      scoreA,
      scoreB,
      teamA: squad.filter(p => p.team === 'A').map(p => p.name),
      teamB: squad.filter(p => p.team === 'B').map(p => p.name),
      scorers: contributorIds
        .filter(id => playerStats[id].goals > 0)
        .map(id => ({ playerId: id, goals: playerStats[id].goals })),
      assisters: contributorIds
        .filter(id => playerStats[id].assists > 0)
        .map(id => ({ playerId: id, assists: playerStats[id].assists }))
    };
    onSave(record);
  };

  const activeContributors = contributorIds.map(id => squad.find(p => p.id === id)!);
  const totalReportedA = activeContributors.filter(p => p.team === 'A').reduce((sum, p) => sum + (playerStats[p.id]?.goals || 0), 0);
  const totalReportedB = activeContributors.filter(p => p.team === 'B').reduce((sum, p) => sum + (playerStats[p.id]?.goals || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pt-20 font-inter animate-fade-in">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-[48px] p-10 md:p-16 shadow-2xl border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-blue-600"></div>

          <div className="flex justify-between items-start mb-12">
            <div>
               <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">Report Result</h1>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 flex items-center gap-2">
                 <Trophy size={14} className="text-blue-600" /> Match ID: {lobby.matchId} • {lobby.fieldName}
               </p>
            </div>
            <button onClick={onCancel} className="text-slate-300 hover:text-slate-900 p-2 transition-colors"><X size={32}/></button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
            {/* SCORE COUNTER */}
            <div className="lg:col-span-4 space-y-8">
               <h3 className="text-xl font-black uppercase text-slate-900 flex items-center gap-3">
                 <Shield size={24} className="text-blue-600" /> Final Score
               </h3>
               <div className="bg-slate-900 p-10 rounded-[48px] shadow-2xl space-y-12 text-white">
                  <div className="text-center space-y-4">
                     <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Team Alpha</p>
                     <div className="flex items-center justify-center gap-6">
                        <button onClick={() => setScoreA(Math.max(0, scoreA - 1))} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><Minus size={16}/></button>
                        <span className="text-6xl font-black leading-none">{scoreA}</span>
                        <button onClick={() => setScoreA(scoreA + 1)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><Plus size={16}/></button>
                     </div>
                  </div>

                  <div className="relative flex justify-center">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 -translate-y-1/2"></div>
                    <div className="relative bg-slate-900 px-4 text-[10px] font-black text-white/30 uppercase italic">VS</div>
                  </div>

                  <div className="text-center space-y-4">
                     <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Team Beta</p>
                     <div className="flex items-center justify-center gap-6">
                        <button onClick={() => setScoreB(Math.max(0, scoreB - 1))} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><Minus size={16}/></button>
                        <span className="text-6xl font-black leading-none">{scoreB}</span>
                        <button onClick={() => setScoreB(scoreB + 1)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><Plus size={16}/></button>
                     </div>
                  </div>
               </div>
            </div>

            {/* QUICK STATS REPORTING */}
            <div className="lg:col-span-8 space-y-8">
               <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black uppercase text-slate-900 flex items-center gap-3">
                    <Award size={24} className="text-blue-600" /> Log Contributions
                  </h3>
               </div>

               {/* SEARCH BAR */}
               <div className="relative z-20">
                  <div className="relative group">
                     <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                     <input
                       type="text"
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       placeholder="Type player name to log goals/assists..."
                       className="w-full pl-16 pr-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-[32px] focus:bg-white focus:border-blue-600 outline-none font-bold text-slate-900 shadow-inner transition-all"
                     />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-3xl shadow-3xl border border-slate-100 overflow-hidden animate-fade-in">
                       {searchResults.map(p => (
                         <button
                           key={p.id}
                           onClick={() => addContributor(p)}
                           className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none group"
                         >
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-all">{p.name.charAt(0)}</div>
                               <div className="text-left">
                                  <p className="font-black text-sm text-slate-900 uppercase tracking-tight">{p.name}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.team === 'A' ? 'Team Alpha' : 'Team Beta'}</p>
                               </div>
                            </div>
                            <Plus size={20} className="text-slate-300 group-hover:text-blue-600" />
                         </button>
                       ))}
                    </div>
                  )}
               </div>

               {/* CONTRIBUTORS LIST */}
               <div className="space-y-4">
                  {activeContributors.length === 0 ? (
                    <div className="py-20 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                       <Users className="mx-auto text-slate-300 mb-4" size={48} />
                       <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">Search for players above to log match performance.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                       {activeContributors.map(p => (
                         <div key={p.id} className="bg-white border-2 border-slate-100 p-6 rounded-[32px] flex items-center justify-between group hover:border-blue-100 transition-all shadow-sm">
                            <div className="flex items-center gap-5">
                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-inner transition-all ${p.team === 'A' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                                  {p.name.charAt(0)}
                               </div>
                               <div>
                                  <p className="font-black text-sm uppercase text-slate-900 tracking-tight leading-none mb-1">{p.name}</p>
                                  <p className={`text-[8px] font-black uppercase tracking-widest ${p.team === 'A' ? 'text-blue-500' : 'text-red-500'}`}>{p.team === 'A' ? 'Alpha Squad' : 'Beta Squad'}</p>
                               </div>
                            </div>

                            <div className="flex items-center gap-8">
                               <div className="flex flex-col items-center gap-1">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Goals</span>
                                  <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-inner">
                                     <button onClick={() => updateStat(p.id, 'goals', -1)} className="text-slate-300 hover:text-red-500 transition-colors"><Minus size={14}/></button>
                                     <span className="font-black text-xs w-4 text-center text-slate-900">{playerStats[p.id]?.goals || 0}</span>
                                     <button onClick={() => updateStat(p.id, 'goals', 1)} className="text-slate-300 hover:text-emerald-500 transition-colors"><Plus size={14}/></button>
                                  </div>
                               </div>
                               <div className="flex flex-col items-center gap-1">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Assists</span>
                                  <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-inner">
                                     <button onClick={() => updateStat(p.id, 'assists', -1)} className="text-slate-300 hover:text-red-500 transition-colors"><Minus size={14}/></button>
                                     <span className="font-black text-xs w-4 text-center text-slate-900">{playerStats[p.id]?.assists || 0}</span>
                                     <button onClick={() => updateStat(p.id, 'assists', 1)} className="text-slate-300 hover:text-blue-500 transition-colors"><Plus size={14}/></button>
                                  </div>
                               </div>
                               <button
                                 onClick={() => removeContributor(p.id)}
                                 className="p-3 text-slate-200 hover:text-red-500 transition-colors"
                               >
                                  <Trash2 size={18} />
                               </button>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>

               {/* VALIDATION HINTS */}
               <div className="flex flex-wrap gap-4">
                  <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${totalReportedA === scoreA ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                    Alpha: {totalReportedA} / {scoreA} Goals Logged
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${totalReportedB === scoreB ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                    Beta: {totalReportedB} / {scoreB} Goals Logged
                  </div>
               </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 pt-10 border-t border-slate-100">
             <div className="flex-1 flex items-center gap-6 p-8 bg-blue-50 rounded-[32px] border border-blue-100">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
                  <Award size={24} />
                </div>
                <p className="text-[11px] font-black text-blue-900 uppercase leading-relaxed tracking-wider">
                   Submitting this report will permanently update career stats for all participants. Please double-check the scorers.
                </p>
             </div>
             <button
               onClick={handleFinish}
               className="bg-slate-900 text-white px-16 py-8 rounded-[32px] font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-4 group"
             >
                <Save size={20} className="group-hover:scale-110 transition-transform" /> Confirm & Post Result
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
