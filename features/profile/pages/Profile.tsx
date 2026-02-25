
import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, Users, Trophy, ShieldCheck,
  MapPin, Calendar, Zap, CheckCircle2, History,
  Star, Shield, Award, Wallet, Plus, CreditCard, ArrowUpRight, ArrowDownLeft, Clock,
  ArrowRight, Activity, X, Lock, Loader2, AlertCircle
} from 'lucide-react';
import { PlayerPosition, FitnessLevel, WalletTransaction, UserProfileData, MatchRecord } from '../../../types';
import { getMyWallet, loadFunds as apiLoadFunds, getTransactions, getTrainingStats, ApiError } from '../../../frontend/api';

interface ProfileProps {
  userProfile: UserProfileData;
  matchHistory?: MatchRecord[];
  onLoadFunds: (amount: number, updatedWallet: { balance: number; escrow: number }) => void;
}

export const Profile: React.FC<ProfileProps> = ({ userProfile, matchHistory = [], onLoadFunds }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'wallet'>('info');
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('100');
  const [loadingFunds, setLoadingFunds] = useState(false);
  const [fundError, setFundError] = useState('');

  // Wallet data fetched from API
  const [walletBalance, setWalletBalance] = useState(userProfile.wallet.balance);
  const [walletEscrow, setWalletEscrow] = useState(userProfile.wallet.escrow);
  const [transactions, setTransactions] = useState<{
    id: string; type: string; amount: number; description: string; reference: string | null; createdAt: string;
  }[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [trainingSessionCount, setTrainingSessionCount] = useState(0);

  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const data = await getMyWallet();
      setWalletBalance(data.wallet.balance);
      setWalletEscrow(data.wallet.escrow);
      setTransactions(data.transactions);
    } catch {
      // Fallback to prop data on error
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
    // Fetch training stats
    if (userProfile.id) {
      getTrainingStats(userProfile.id)
        .then(data => setTrainingSessionCount(data.trainingSessions))
        .catch(() => {});
    }
  }, [fetchWallet, userProfile.id]);

  const user = userProfile;

  const positionAbbr: Record<string, string> = {
    'Goalkeeper': 'GK',
    'Defender': 'DEF',
    'Midfielder': 'MID',
    'Forward': 'FWD',
  };

  const isPositive = (type: string) =>
    type === 'CREDIT' || type === 'DEPOSIT' || type === 'ESCROW_REFUND';

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pt-20">
      <div className="bg-blue-900 h-32 md:h-48 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 relative h-full">
           <button className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-sm transition-colors z-20"><Settings size={20} /></button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        <div className="relative -mt-12 md:-mt-16 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-8">
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-gray-200">
                <img src={user.avatar || "https://picsum.photos/seed/siya/400"} alt={user.fullName} className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight leading-none">{user.fullName || user.name}</h1>
                <ShieldCheck size={22} className="text-blue-600" />
              </div>
              <div className="flex flex-wrap gap-y-2 gap-x-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span className="flex items-center gap-2"><MapPin size={14} className="text-blue-500" /> Johannesburg, SA</span>
                <span className="flex items-center gap-2"><Calendar size={14} className="text-blue-500" /> Member since 2024</span>
              </div>
            </div>
            <div className="bg-slate-900 text-white p-5 rounded-3xl flex items-center gap-5 shadow-2xl">
                <div className="bg-blue-600 p-3 rounded-2xl"><Wallet size={24} /></div>
                <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Balance</p>
                   <p className="text-xl font-black leading-none">R{walletBalance.toFixed(2)}</p>
                </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-10 overflow-x-auto no-scrollbar">
           {(['info', 'wallet'] as const).map(tab => (
             <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border'}`}>
               {tab}
             </button>
           ))}
        </div>

        {activeTab === 'info' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-fade-in">
              <div className="lg:col-span-2 space-y-10">
                 <section className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-10">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8">On-Pitch Metrics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       <div className="p-8 bg-blue-50 rounded-[32px] border border-blue-100 shadow-inner">
                          <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-3">Tactical Position</p>
                          <p className="text-2xl font-black text-gray-900 leading-none">{positionAbbr[user.position as string] || user.position}</p>
                       </div>
                       <div className="p-8 bg-emerald-50 rounded-[32px] border border-emerald-100 shadow-inner">
                          <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-3">Matches Played</p>
                          <p className="text-2xl font-black text-gray-900 leading-none">{user.stats.matchesPlayed}</p>
                       </div>
                       <div className="p-8 bg-amber-50 rounded-[32px] border border-amber-100 shadow-inner">
                          <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mb-3">Goals / Assists</p>
                          <p className="text-2xl font-black text-gray-900 leading-none">{user.stats.goals} / {user.stats.assists}</p>
                       </div>
                       <div className="p-8 bg-purple-50 rounded-[32px] border border-purple-100 shadow-inner">
                          <p className="text-[10px] text-purple-600 font-black uppercase tracking-widest mb-3">Training Sessions</p>
                          <p className="text-2xl font-black text-gray-900 leading-none">{trainingSessionCount}</p>
                       </div>
                    </div>
                 </section>

                 <section className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-10">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8 flex items-center gap-4">
                      <History size={24} className="text-blue-600" /> Recent Matches
                    </h2>
                    <div className="space-y-4">
                       {matchHistory.length > 0 ? matchHistory.map((match) => (
                         <div key={match.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <div>
                               <p className="text-sm font-black uppercase text-slate-900 leading-none mb-1">{match.fieldName}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase">{match.date}</p>
                            </div>
                            <div className="flex items-center gap-8">
                               <div className="text-center">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
                                  <p className="text-lg font-black text-slate-900 leading-none">{match.scoreA} - {match.scoreB}</p>
                               </div>
                               <div className="flex gap-2">
                                  {match.scorers.some(s => s.playerId === user.id) && <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Trophy size={14}/></div>}
                                  {match.assisters.some(a => a.playerId === user.id) && <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Zap size={14}/></div>}
                               </div>
                            </div>
                         </div>
                       )) : (
                         <div className="py-12 text-center">
                            <Activity className="mx-auto text-slate-200 mb-4" size={48} />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">No match records reported yet.<br/>Finish a match and have your captain report results.</p>
                         </div>
                       )}
                    </div>
                 </section>
              </div>
           </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-10 animate-fade-in">
             <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-[48px] p-12 text-white relative overflow-hidden shadow-3xl border border-white/10">
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                   <div>
                     <p className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Available Balance</p>
                     <h2 className="text-6xl font-black tracking-tighter leading-none">R{walletBalance.toFixed(2)}</h2>
                   </div>
                   <div>
                     <p className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2"><Lock size={12} /> In Escrow</p>
                     <h2 className="text-4xl font-black tracking-tighter leading-none text-amber-300">R{walletEscrow.toFixed(2)}</h2>
                     <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase tracking-widest">Held for pending matches</p>
                   </div>
                </div>
                <button onClick={() => setShowTopUp(true)} className="bg-white text-slate-900 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-100 transition-all active:scale-95">Load Funds</button>
             </div>

             {/* Transaction History */}
             <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-10">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8 flex items-center gap-4">
                  <History size={24} className="text-blue-600" /> Transaction History
                </h2>
                <div className="space-y-3">
                  {walletLoading ? (
                    <div className="py-12 flex justify-center"><Loader2 size={32} className="animate-spin text-slate-300" /></div>
                  ) : transactions.length > 0 ? transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${
                          tx.type === 'CREDIT' || tx.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-600' :
                          tx.type === 'ESCROW_HOLD' ? 'bg-amber-100 text-amber-600' :
                          tx.type === 'ESCROW_RELEASE' ? 'bg-blue-100 text-blue-600' :
                          tx.type === 'ESCROW_REFUND' ? 'bg-emerald-100 text-emerald-600' :
                          tx.type === 'TEAM_CONTRIBUTION' ? 'bg-purple-100 text-purple-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {tx.type === 'CREDIT' || tx.type === 'DEPOSIT' ? <ArrowDownLeft size={16} /> :
                           tx.type === 'ESCROW_HOLD' ? <Lock size={16} /> :
                           tx.type === 'ESCROW_RELEASE' ? <CheckCircle2 size={16} /> :
                           tx.type === 'ESCROW_REFUND' ? <ArrowDownLeft size={16} /> :
                           tx.type === 'TEAM_CONTRIBUTION' ? <Users size={16} /> :
                           <ArrowUpRight size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 leading-none mb-1">{tx.description}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(tx.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-black ${isPositive(tx.type) ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isPositive(tx.type) ? '+' : '-'}R{tx.amount.toFixed(2)}
                      </p>
                    </div>
                  )) : (
                    <div className="py-12 text-center">
                      <Wallet className="mx-auto text-slate-200 mb-4" size={48} />
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No transactions yet.<br/>Load funds to get started.</p>
                    </div>
                  )}
                </div>
             </div>
          </div>
        )}

        {/* Load Funds Modal */}
        {showTopUp && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setShowTopUp(false)}>
            <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-3xl relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowTopUp(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={20} /></button>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4"><Wallet size={32} /></div>
                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Load Funds</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Add money to your FootyFinder wallet</p>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {['50', '100', '200', '500', '1000', '2000'].map(amt => (
                  <button key={amt} onClick={() => setTopUpAmount(amt)} className={`py-4 rounded-2xl text-sm font-black uppercase transition-all ${topUpAmount === amt ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    R{amt}
                  </button>
                ))}
              </div>
              <div className="mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Custom Amount</label>
                <input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} className="w-full bg-slate-50 rounded-2xl px-6 py-4 text-lg font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-100" placeholder="Enter amount" />
              </div>
              {fundError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs font-bold text-red-600">{fundError}</p>
                </div>
              )}
              <button
                onClick={async () => {
                  const amount = parseFloat(topUpAmount);
                  if (!amount || amount <= 0) return;
                  setLoadingFunds(true);
                  setFundError('');
                  try {
                    const res = await apiLoadFunds(amount);
                    setWalletBalance(res.wallet.balance);
                    setWalletEscrow(res.wallet.escrow);
                    onLoadFunds(amount, res.wallet);
                    await fetchWallet();
                    setShowTopUp(false);
                    setTopUpAmount('100');
                  } catch (err) {
                    setFundError(err instanceof ApiError ? err.message : 'Failed to load funds. Please try again.');
                  } finally {
                    setLoadingFunds(false);
                  }
                }}
                disabled={loadingFunds || !parseFloat(topUpAmount)}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {loadingFunds ? 'Processing...' : `Load R${parseFloat(topUpAmount || '0').toFixed(2)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
