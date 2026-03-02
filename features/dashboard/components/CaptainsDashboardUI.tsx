
import React, { useState, useRef, useEffect } from 'react';
import {
  Trophy, Plus, Move, Check, UserPlus, X, Users, Trash2, Wallet, ArrowUpRight, Shirt, Heart, Search, MessageSquare, ArrowLeft, Send, Zap, Eye, History, Save, Pencil
} from 'lucide-react';
import { TacticalPitch } from '../../../components/domain/TacticalPitch';
import { TeamWallet, Team, UserProfileData, SoccerProfile } from '../../../types';
import { UserProfileModal } from '../../../components/domain/UserProfileModal';

interface FormationPoint {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface Player {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

interface CaptainsDashboardUIProps {
  assignedPlayers: Record<string, string>;
  setAssignedPlayers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  currentPoints: FormationPoint[];
  setCurrentPoints: React.Dispatch<React.SetStateAction<FormationPoint[]>>;
  squadPool: Player[];
  onAddMember: (name: string) => void;
  onAddFriendToSquad: (friend: SoccerProfile) => void;
  onRemoveMember: (id: string) => void;
  teamWallet: TeamWallet;
  onFundTeamWallet: (amount: number) => void;
  onSave?: () => void;
  onSaveBio?: (motto: string) => void;
  userTeam?: Team;
  userProfile: UserProfileData;
  friends: SoccerProfile[];
  messages: any[];
  onSendMessage: (text: string) => void;
  teamTransactions?: { id: string; amount: number; contributorName: string; createdAt: string }[];
}

const formatTeamDate = (dateStr?: string) => {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return d.toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase();
};

export const CaptainsDashboardUI: React.FC<CaptainsDashboardUIProps> = ({
  assignedPlayers,
  setAssignedPlayers,
  currentPoints,
  setCurrentPoints,
  squadPool,
  onAddMember,
  onAddFriendToSquad,
  onRemoveMember,
  teamWallet,
  onFundTeamWallet,
  onSave,
  onSaveBio,
  userTeam,
  userProfile,
  friends,
  messages,
  onSendMessage,
  teamTransactions = [],
}) => {
  const [activeTab, setActiveTab] = useState<'tactics' | 'comms'>('tactics');
  const [newMemberName, setNewMemberName] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const pitchRef = useRef<HTMLDivElement>(null);
  const [selectingSlotId, setSelectingSlotId] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Chat state
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Funding modal state
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState('100');

  // Friends Recruitment modal state
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friendSearchTerm, setFriendSearchTerm] = useState('');

  // Team bio / motto editing
  const [editingMotto, setEditingMotto] = useState(false);
  const [mottoInput, setMottoInput] = useState(userTeam?.motto || '');

  // Profile view modal
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  useEffect(() => {
    setMottoInput(userTeam?.motto || '');
  }, [userTeam?.motto]);

  useEffect(() => {
    if (showSaveSuccess) {
      const timer = setTimeout(() => setShowSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSaveSuccess]);

  useEffect(() => {
    if (activeTab === 'comms') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, messages]);

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!draggingId || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setCurrentPoints(prev => prev.map(p => p.id === draggingId ? { ...p, x: Math.min(Math.max(x, 5), 95), y: Math.min(Math.max(y, 5), 95) } : p));
  };

  const handleMouseUp = () => setDraggingId(null);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [draggingId]);

  const handleStartDrag = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setDraggingId(id);
  };

  const handleSlotClick = (id: string) => {
    if (draggingId) return;
    if (assignedPlayers[id]) {
      const newAssignments = { ...assignedPlayers };
      delete newAssignments[id];
      setAssignedPlayers(newAssignments);
    } else {
      setSelectingSlotId(id);
    }
  };

  const assignPlayerToSlot = (player: Player) => {
    if (!selectingSlotId) return;
    setAssignedPlayers(prev => ({ ...prev, [selectingSlotId]: player.name }));
    setSelectingSlotId(null);
  };

  const handleAddNewMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    onAddMember(newMemberName.trim());
    setNewMemberName('');
  };

  const handleSaveLayout = () => {
    setShowSaveSuccess(true);
    onSave?.();
  };

  const handleFund = () => {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) return;
    onFundTeamWallet(amount);
    setShowFundModal(false);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage('');
  };

  const handleSaveMotto = () => {
    onSaveBio?.(mottoInput);
    setEditingMotto(false);
  };

  const availablePlayers = squadPool.filter(p => !Object.values(assignedPlayers).includes(p.name));

  const recruitableFriends = friends.filter(friend =>
    !squadPool.some(p => p.id === friend.id || p.name === friend.fullName) &&
    friend.fullName.toLowerCase().includes(friendSearchTerm.toLowerCase())
  );

  return (
    <div className={`min-h-screen bg-slate-50 pb-24 md:pt-20 transition-all ${draggingId ? 'cursor-grabbing select-none' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Team Header */}
        <div className="bg-white rounded-[48px] p-10 md:p-12 border border-slate-100 mb-8 flex flex-col md:flex-row items-center justify-between shadow-sm gap-6 relative overflow-hidden">
           <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                 <div className="flex gap-2 items-end">
                   <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white" style={{ backgroundColor: userTeam?.homeColor }}>
                     <Shirt size={24} className={userTeam?.homeColor === '#ffffff' ? 'text-slate-900' : 'text-white'} />
                   </div>
                   {userTeam?.awayColor && userTeam.awayColor !== userTeam.homeColor && (
                     <div className="w-6 h-6 rounded-lg border-2 border-slate-200 shadow-sm" style={{ backgroundColor: userTeam.awayColor }} title="Away kit" />
                   )}
                 </div>
                 <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">{userTeam?.name || "Captain's Dashboard"}</h1>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Manage your squad & team treasury</p>
           </div>
           <div className="flex items-center gap-8 relative z-10">
              <div className="flex flex-col items-end">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Wallet size={12}/> Team Wallet
                </p>
                <p className="text-3xl font-black text-slate-900 leading-none">R{teamWallet.balance.toFixed(2)}</p>
              </div>
              <button
                onClick={handleSaveLayout}
                className="bg-slate-900 text-white px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95"
              >
                {showSaveSuccess ? '✓ Saved' : 'Save Layout'}
              </button>
           </div>
           <div className="absolute top-0 right-0 w-64 h-64 bg-slate-900/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        </div>

        {/* Team Bio Card */}
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 mb-8 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex gap-2">
                  <div className="w-10 h-10 rounded-xl border-2 border-slate-100 shadow-sm" style={{ backgroundColor: userTeam?.homeColor || '#2563eb' }} title="Home kit" />
                  {userTeam?.awayColor && userTeam.awayColor !== userTeam?.homeColor && (
                    <div className="w-10 h-10 rounded-xl border-2 border-slate-100 shadow-sm" style={{ backgroundColor: userTeam.awayColor }} title="Away kit" />
                  )}
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Founded</p>
                  <p className="text-sm font-black text-slate-900">{formatTeamDate(userTeam?.createdAt)}</p>
                </div>
              </div>

              {editingMotto ? (
                <div className="space-y-3">
                  <textarea
                    value={mottoInput}
                    onChange={e => setMottoInput(e.target.value)}
                    placeholder="Enter your team motto..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                    maxLength={120}
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveMotto}
                      className="px-6 py-2 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2"
                    >
                      <Save size={14} /> Save Motto
                    </button>
                    <button
                      onClick={() => { setEditingMotto(false); setMottoInput(userTeam?.motto || ''); }}
                      className="px-6 py-2 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <p className="text-sm text-slate-600 italic flex-1">
                    {userTeam?.motto ? `"${userTeam.motto}"` : <span className="text-slate-300">No motto set yet — click edit to add one</span>}
                  </p>
                  <button
                    onClick={() => setEditingMotto(true)}
                    className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all shrink-0"
                    title="Edit motto"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8">
           <button
             onClick={() => setActiveTab('tactics')}
             className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeTab === 'tactics' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
           >
             <Trophy size={16} /> Tactics
           </button>
           <button
             onClick={() => setActiveTab('comms')}
             className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeTab === 'comms' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
           >
             <MessageSquare size={16} /> Team Comms
           </button>
        </div>

        {activeTab === 'tactics' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fade-in">
             <div className="lg:col-span-8 space-y-8">
                <div className="bg-white rounded-[56px] p-10 border border-slate-100 shadow-sm" ref={pitchRef}>
                  <div className="flex justify-between items-center mb-10 px-4">
                    <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Formation Setup</h2>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <Move size={14} /> Drag to adjust positions
                    </div>
                  </div>

                  <div className="max-w-xl mx-auto">
                    <TacticalPitch
                      points={currentPoints}
                      assignedPlayers={assignedPlayers}
                      onPointClick={handleSlotClick}
                      onPointDragStart={handleStartDrag}
                      activeId={draggingId}
                    />
                  </div>
                </div>

                {/* Team Treasury / Funding Section */}
                <div className="bg-white rounded-[56px] p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
                   <div className="relative z-10">
                      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-8">Team Treasury</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                         <div className="space-y-6">
                            <div className="p-8 bg-amber-50 rounded-[40px] border border-amber-100 shadow-inner">
                               <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-4">Total Team Funds</p>
                               <div className="flex items-baseline gap-2">
                                  <span className="text-4xl font-black text-slate-900">R{teamWallet.balance.toFixed(0)}</span>
                                  <span className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1"><ArrowUpRight size={14}/> Ready</span>
                               </div>
                            </div>

                            <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl space-y-6">
                               <div className="flex justify-between items-center">
                                  <div>
                                     <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Your Wallet</p>
                                     <p className="text-2xl font-black">R{userProfile.wallet.balance.toFixed(2)}</p>
                                  </div>
                                  <div className="p-3 bg-white/10 rounded-xl"><Wallet size={20}/></div>
                               </div>
                               <button
                                 onClick={() => setShowFundModal(true)}
                                 className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
                               >
                                  <Plus size={18} /> Contribute to Squad
                               </button>
                            </div>
                         </div>
                         <div className="space-y-4">
                            <div className="flex items-center gap-2 px-2 mb-2">
                              <History size={14} className="text-slate-400" />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contribution History</p>
                            </div>
                            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                               {teamTransactions.length === 0 ? (
                                 <div className="py-12 text-center text-slate-300">
                                    <p className="text-[9px] font-black uppercase">No contributions yet</p>
                                 </div>
                               ) : (
                                 teamTransactions.map((tx) => (
                                   <div key={tx.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-100 transition-colors">
                                      <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100">{tx.contributorName.charAt(0)}</div>
                                         <div>
                                           <span className="text-xs font-black text-slate-900 uppercase block">{tx.contributorName}</span>
                                           <span className="text-[8px] font-bold text-slate-400 uppercase">{new Date(tx.createdAt).toLocaleDateString()}</span>
                                         </div>
                                      </div>
                                      <span className="text-xs font-black text-emerald-600">+R{tx.amount.toFixed(0)}</span>
                                   </div>
                                 ))
                               )}
                            </div>
                         </div>
                      </div>
                   </div>
                   <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-amber-400/10 transition-all"></div>
                </div>
             </div>

             <div className="lg:col-span-4 space-y-8">
                <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-sm">
                   <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black uppercase flex items-center gap-3">
                         <Users size={24} className="text-blue-600" /> Squad Pool
                      </h3>
                      <button
                        onClick={() => setShowFriendsModal(true)}
                        className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"
                        title="Recruit from friends"
                      >
                        <UserPlus size={18} />
                      </button>
                   </div>

                   <form onSubmit={handleAddNewMemberSubmit} className="mb-10">
                      <div className="flex gap-2">
                         <input
                            type="text"
                            placeholder="Player Name"
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                         />
                         <button type="submit" className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                            <Plus size={18} />
                         </button>
                      </div>
                   </form>

                   <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {squadPool.length === 0 ? (
                        <div className="py-12 text-center text-slate-300">
                           <Users size={40} className="mx-auto mb-4 opacity-20" />
                           <p className="text-[10px] font-black uppercase tracking-widest">No members added yet</p>
                        </div>
                      ) : (
                        squadPool.map(player => {
                          const isAssigned = Object.values(assignedPlayers).includes(player.name);
                          return (
                            <div key={player.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-[28px] group border border-transparent hover:border-slate-200 transition-all">
                               <div className="flex items-center gap-4">
                                  {player.avatar ? (
                                    <img src={player.avatar} className="w-10 h-10 rounded-xl object-cover shadow-sm" alt="" />
                                  ) : (
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-colors ${
                                      isAssigned ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'
                                    }`}>
                                       {player.name.charAt(0)}
                                    </div>
                                  )}
                                  <div>
                                     <span className="block text-xs font-black uppercase tracking-tight text-slate-900">{player.name}</span>
                                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">{player.role}</span>
                                  </div>
                               </div>
                               <div className="flex items-center gap-2">
                                  {isAssigned && <div className="p-1 bg-emerald-100 text-emerald-600 rounded-lg"><Check size={12} strokeWidth={4} /></div>}
                                  <button
                                    onClick={() => setViewingUserId(player.id)}
                                    className="p-2 text-slate-200 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title="View profile"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button onClick={() => onRemoveMember(player.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                     <Trash2 size={16} />
                                  </button>
                               </div>
                            </div>
                          );
                        })
                      )}
                   </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="animate-fade-in space-y-8 max-w-4xl mx-auto">
             <div className="bg-white rounded-[56px] border border-slate-100 shadow-2xl flex flex-col h-[700px] overflow-hidden">
                <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                   <div className="flex items-center gap-5">
                      <button onClick={() => setActiveTab('tactics')} className="p-3 bg-white rounded-xl text-slate-400 hover:text-slate-900 border border-slate-100 transition-colors"><ArrowLeft size={20} /></button>
                      <div>
                         <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Team Discussion</h3>
                         <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">{userTeam?.members.length || 0} Members Drafted</p>
                      </div>
                   </div>
                </div>
                <div className="flex-1 p-10 overflow-y-auto space-y-8 bg-slate-50/20 custom-scrollbar">
                   {messages.map((msg, idx) => {
                      const isSystem = msg.isSystem || msg.senderId === 'system';
                      const isMe = msg.senderId === 'me' || msg.senderId === userProfile.id;

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
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{isMe ? 'Me' : msg.senderName}</span>
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
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Direct your squad..."
                        className="flex-1 bg-slate-50 border-none rounded-[32px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner transition-all"
                      />
                      <button onClick={handleSendMessage} className="p-6 bg-slate-900 text-white rounded-[32px] hover:bg-blue-600 transition-all shadow-2xl active:scale-95 flex items-center justify-center"><Send size={24} /></button>
                   </div>
                </div>
             </div>
             <button onClick={() => setActiveTab('tactics')} className="w-full py-6 bg-white border-2 border-slate-100 rounded-[32px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 hover:border-slate-200 transition-all flex items-center justify-center gap-4 shadow-sm"><ArrowLeft size={16} /> Return to Tactics Center</button>
          </div>
        )}
      </div>

      {selectingSlotId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
           <div className="bg-white rounded-[64px] p-12 max-w-md w-full shadow-3xl animate-scale-in">
              <div className="flex justify-between items-center mb-10">
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Choose Player</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Available for this position</p>
                 </div>
                 <button onClick={() => setSelectingSlotId(null)} className="text-slate-300 hover:text-slate-900 transition-colors"><X size={32} /></button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {availablePlayers.length === 0 ? (
                  <div className="py-12 text-center text-slate-300">
                     <UserPlus size={40} className="mx-auto mb-4 opacity-20" />
                     <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">No unassigned players in your pool.<br/>Add more in the sidebar.</p>
                  </div>
                ) : (
                  availablePlayers.map(player => (
                    <button
                      key={player.id}
                      onClick={() => assignPlayerToSlot(player)}
                      className="w-full flex items-center gap-5 p-5 rounded-[28px] hover:bg-slate-50 border border-slate-50 hover:border-blue-100 text-left group transition-all"
                    >
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        {player.avatar ? <img src={player.avatar} className="w-full h-full object-cover rounded-2xl" alt="" /> : <Users size={24}/>}
                      </div>
                      <div className="flex-1">
                        <span className="block text-sm font-black text-slate-900 uppercase tracking-tight">{player.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{player.role}</span>
                      </div>
                      <Plus size={16} className="text-slate-300 group-hover:text-blue-600" />
                    </button>
                  ))
                )}
              </div>
           </div>
        </div>
      )}

      {/* Friends Recruitment Modal */}
      {showFriendsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
           <div className="bg-white rounded-[64px] p-12 max-lg w-full shadow-3xl animate-scale-in relative overflow-hidden font-inter">
              <div className="absolute top-0 left-0 w-full h-3 bg-blue-600"></div>
              <div className="flex justify-between items-center mb-10">
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Recruit Friends</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Draft from your friend list</p>
                 </div>
                 <button onClick={() => setShowFriendsModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors"><X size={32} /></button>
              </div>

              <div className="relative group mb-8">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                 <input
                    type="text"
                    placeholder="Search friends..."
                    value={friendSearchTerm}
                    onChange={(e) => setFriendSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                 />
              </div>

              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                 {recruitableFriends.length === 0 ? (
                   <div className="py-16 text-center text-slate-300">
                      <Heart size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                        {friends.length === 0
                          ? "You have no friends to recruit. Visit the Social tab to find mates."
                          : "All friends are already in your squad pool or don't match your search."}
                      </p>
                   </div>
                 ) : (
                   recruitableFriends.map(friend => (
                     <button
                       key={friend.id}
                       onClick={() => {
                          onAddFriendToSquad(friend);
                          setShowFriendsModal(false);
                       }}
                       className="w-full flex items-center gap-5 p-5 rounded-[28px] hover:bg-slate-50 border border-slate-50 hover:border-blue-100 text-left group transition-all"
                     >
                        <img src={friend.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
                        <div className="flex-1">
                           <span className="block text-sm font-black text-slate-900 uppercase tracking-tight">{friend.fullName}</span>
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{friend.position}</span>
                        </div>
                        <Plus size={18} className="text-slate-300 group-hover:text-blue-600" />
                     </button>
                   ))
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Contribution Modal */}
      {showFundModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
           <div className="bg-white rounded-[64px] p-12 max-w-md w-full shadow-3xl animate-scale-in relative overflow-hidden font-inter">
              <div className="absolute top-0 left-0 w-full h-3 bg-amber-500"></div>
              <div className="flex justify-between items-center mb-10">
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Fund Treasury</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Support {userTeam?.name}</p>
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

                 <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest text-center px-6">
                    This contribution will be deducted from your personal balance and shared with the squad in chat.
                 </p>

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

      {/* User Profile Modal */}
      <UserProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
    </div>
  );
};
