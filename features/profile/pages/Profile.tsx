
import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, Users, Trophy, ShieldCheck,
  MapPin, Calendar, Zap, CheckCircle2, History,
  Star, Shield, Award, Wallet, Plus, CreditCard, ArrowUpRight, ArrowDownLeft, Clock,
  ArrowRight, Activity, X, Lock, Loader2, AlertCircle, Pencil, Phone, AtSign, Image, Save, User, CheckCheck
} from 'lucide-react';
import { PlayerPosition, FitnessLevel, WalletTransaction, UserProfileData, MatchRecord } from '../../../types';
import { getMyWallet, loadFunds as apiLoadFunds, getTransactions, getTrainingStats, updateMe, verifyId, ApiError } from '../../../frontend/api';

interface ProfileProps {
  userProfile: UserProfileData;
  matchHistory?: MatchRecord[];
  onLoadFunds: (amount: number, updatedWallet: { balance: number; escrow: number }) => void;
  onProfileUpdated?: (updated: { fullName: string; avatarUrl: string; position: string; fitnessLevel: string; bio: string; city: string; phone: string }) => void;
  onVerifyId?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ userProfile, matchHistory = [], onLoadFunds, onProfileUpdated, onVerifyId }) => {
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

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [editFullName, setEditFullName] = useState(userProfile.fullName || '');
  const [editPosition, setEditPosition] = useState(userProfile.position || '');
  const [editFitnessLevel, setEditFitnessLevel] = useState(userProfile.fitnessLevel || '');
  const [editCity, setEditCity] = useState(userProfile.city || '');
  const [editPhone, setEditPhone] = useState(userProfile.phone || '');
  const [editBio, setEditBio] = useState(userProfile.bio || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(userProfile.avatar || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

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
    if (userProfile.id) {
      getTrainingStats(userProfile.id)
        .then(data => setTrainingSessionCount(data.trainingSessions))
        .catch(() => {});
    }
  }, [fetchWallet, userProfile.id]);

  // Sync edit fields when userProfile changes externally
  useEffect(() => {
    setEditFullName(userProfile.fullName || '');
    setEditPosition(userProfile.position || '');
    setEditFitnessLevel(userProfile.fitnessLevel || '');
    setEditCity(userProfile.city || '');
    setEditPhone(userProfile.phone || '');
    setEditBio(userProfile.bio || '');
    setEditAvatarUrl(userProfile.avatar || '');
  }, [userProfile]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await updateMe({
        fullName: editFullName || undefined,
        position: editPosition || undefined,
        fitnessLevel: editFitnessLevel || undefined,
        bio: editBio || undefined,
        city: editCity || undefined,
        phone: editPhone || undefined,
        avatarUrl: editAvatarUrl || undefined,
      });
      onProfileUpdated?.({
        fullName: editFullName,
        avatarUrl: editAvatarUrl,
        position: editPosition,
        fitnessLevel: editFitnessLevel,
        bio: editBio,
        city: editCity,
        phone: editPhone,
      });
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyId = async (file: File) => {
    setVerifying(true);
    setVerifyError('');
    try {
      const idPhotoBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await verifyId(idPhotoBase64);
      onVerifyId?.();
    } catch (err) {
      setVerifyError(err instanceof ApiError ? err.message : 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

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
          <button
            onClick={() => setEditing(true)}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-sm transition-colors z-20"
            title="Edit Profile"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        <div className="relative -mt-12 md:-mt-16 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-8">
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-gray-200">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={40} className="text-slate-300" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight leading-none">{user.fullName}</h1>
                {user.isVerified ? (
                  <CheckCheck size={22} className="text-blue-600" title="Identity Verified" />
                ) : (
                  <ShieldCheck size={22} className="text-slate-300" title="Not verified" />
                )}
              </div>
              <div className="flex flex-wrap gap-y-2 gap-x-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {user.username && (
                  <span className="flex items-center gap-2"><AtSign size={14} className="text-blue-500" /> {user.username}</span>
                )}
                {user.city && (
                  <span className="flex items-center gap-2"><MapPin size={14} className="text-blue-500" /> {user.city}</span>
                )}
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
                    <p className="text-2xl font-black text-gray-900 leading-none">{positionAbbr[user.position as string] || user.position || '—'}</p>
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

            {/* Profile Identity Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-8 sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Player Bio</h2>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 rounded-xl transition-colors"
                    title="Edit Profile"
                  >
                    <Pencil size={15} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Position */}
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <Shield size={15} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Position</p>
                      <p className="text-sm font-black text-slate-900">{user.position || <span className="text-slate-400 font-medium">Not set</span>}</p>
                    </div>
                  </div>

                  {/* Fitness Level */}
                  <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <Zap size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Fitness Level</p>
                      <p className="text-sm font-black text-slate-900">{user.fitnessLevel || <span className="text-slate-400 font-medium">Not set</span>}</p>
                    </div>
                  </div>

                  {/* City */}
                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">City</p>
                      <p className="text-sm font-black text-slate-900">{user.city || <span className="text-slate-400 font-medium">Not set</span>}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <Phone size={15} className="text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                      <p className="text-sm font-black text-slate-900">{user.phone || <span className="text-slate-400 font-medium">Not set</span>}</p>
                    </div>
                  </div>

                  {/* Bio */}
                  {user.bio && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">About</p>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">{user.bio}</p>
                    </div>
                  )}

                  {!user.bio && !user.city && !user.phone && !user.position && !user.fitnessLevel && (
                    <button
                      onClick={() => setEditing(true)}
                      className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-black text-slate-400 uppercase tracking-widest hover:border-blue-300 hover:text-blue-500 transition-colors"
                    >
                      + Complete Your Profile
                    </button>
                  )}

                  {/* Identity Verification */}
                  <div className={`p-4 rounded-2xl border ${user.isVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {user.isVerified ? (
                        <CheckCheck size={16} className="text-emerald-600" />
                      ) : (
                        <CreditCard size={16} className="text-slate-400" />
                      )}
                      <p className={`text-[9px] font-black uppercase tracking-widest ${user.isVerified ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {user.isVerified ? 'Identity Verified' : 'Identity Verification'}
                      </p>
                    </div>
                    {user.isVerified ? (
                      <p className="text-xs font-bold text-emerald-700">Trusted player ✓✓</p>
                    ) : (
                      <>
                        <p className="text-xs text-slate-500 mb-3">Upload your Gov ID or Passport to get verified</p>
                        {verifyError && <p className="text-[10px] text-red-500 mb-2">{verifyError}</p>}
                        <label className={`block w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-600 text-center cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors ${verifying ? 'opacity-50 pointer-events-none' : ''}`}>
                          {verifying ? 'Verifying...' : 'Upload Gov ID / Passport'}
                          <input type="file" accept="image/*" className="hidden" disabled={verifying} onChange={e => { if (e.target.files?.[0]) handleVerifyId(e.target.files[0]); }} />
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>
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

        {/* Edit Profile Modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => { setEditing(false); setSaveError(''); }}>
            <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-3xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setEditing(false); setSaveError(''); }} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={20} /></button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center"><Pencil size={22} /></div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Edit Profile</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update your player information</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Full Name */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Full Name</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-100"
                    placeholder="e.g. Siya Kolisi"
                  />
                </div>

                {/* Position */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Preferred Position</label>
                  <select
                    value={editPosition}
                    onChange={e => setEditPosition(e.target.value)}
                    className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-100 appearance-none"
                  >
                    <option value="">Select Position</option>
                    {Object.values(PlayerPosition).map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>

                {/* Fitness Level */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Fitness Level</label>
                  <select
                    value={editFitnessLevel}
                    onChange={e => setEditFitnessLevel(e.target.value)}
                    className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-100 appearance-none"
                  >
                    <option value="">Select Fitness Level</option>
                    {Object.values(FitnessLevel).map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">City</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={e => setEditCity(e.target.value)}
                    className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-100"
                    placeholder="e.g. Johannesburg"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-100"
                    placeholder="e.g. +27 82 000 0000"
                  />
                </div>

                {/* Avatar URL */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Profile Photo URL</label>
                  <input
                    type="url"
                    value={editAvatarUrl}
                    onChange={e => setEditAvatarUrl(e.target.value)}
                    className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-100"
                    placeholder="https://example.com/photo.jpg"
                  />
                  {editAvatarUrl && (
                    <div className="mt-3 flex items-center gap-3">
                      <img src={editAvatarUrl} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-slate-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Preview</span>
                    </div>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">About / Bio</label>
                  <textarea
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-100 resize-none"
                    placeholder="Tell other players about yourself..."
                  />
                </div>
              </div>

              {saveError && (
                <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs font-bold text-red-600">{saveError}</p>
                </div>
              )}

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => { setEditing(false); setSaveError(''); }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
