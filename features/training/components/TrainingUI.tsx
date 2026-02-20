
import React from 'react';
import {
  Target, X, CheckCircle2, Shield, MapPin, Clock, Calendar,
  ArrowLeft, Star, Users, Award, ChevronRight, Send, Wallet
} from 'lucide-react';
import { LobbyMessage, PracticeSession, UserProfileData } from '../../../types';
import { LobbyChat } from '../../../components/domain/LobbyChat';
import { PaymentModal } from '../../../components/shared/modals/PaymentModal';
import {
  TrainingPhase, TrainingParticipant, FieldOption, TimetableSlot
} from '../pages/Training';
import { TrainingSession } from '../../../frontend/api';

interface TrainingUIProps {
  phase: TrainingPhase;
  sessions: PracticeSession[];
  currentSession: TrainingSession | null;
  participants: TrainingParticipant[];
  isHost: boolean;
  hasPaid: boolean;
  fields: FieldOption[];
  selectedField: FieldOption | null;
  timetableSlots: TimetableSlot[];
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  selectedSlotIds: string[];
  onToggleSlot: (slot: TimetableSlot) => void;
  onConfirmSlots: () => void;
  hostRole: 'Shooter' | 'GK';
  setHostRole: (r: 'Shooter' | 'GK') => void;
  showPaymentModal: boolean;
  setShowPaymentModal: (v: boolean) => void;
  paymentStep: 'IDLE' | 'PROCESSING' | 'SUCCESS';
  onProcessPayment: () => void;
  lobbyMessages: LobbyMessage[];
  newMessage: string;
  setNewMessage: (v: string) => void;
  onSendMessage: () => void;
  onStartHosting: () => void;
  onViewSession: (session: PracticeSession) => void;
  onJoinAndPay: () => void;
  onPostToLobby: () => void;
  onSelectField: (field: FieldOption) => void;
  onConfirmSession: () => void;
  onCompleteSession: () => void;
  onBack: () => void;
  reviewRatings: Record<string, number>;
  reviewComments: Record<string, string>;
  setReviewRatings: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setReviewComments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSubmitReviews: () => void;
  onSkipReviews: () => void;
  reviewSubmitting: boolean;
  userProfile: UserProfileData;
}

export const TrainingUI: React.FC<TrainingUIProps> = (props) => {
  const {
    phase, sessions, currentSession, participants, isHost, hasPaid,
    fields, selectedField, timetableSlots, selectedDate, setSelectedDate,
    selectedSlotIds, onToggleSlot, onConfirmSlots,
    hostRole, setHostRole,
    showPaymentModal, setShowPaymentModal, paymentStep, onProcessPayment,
    lobbyMessages, newMessage, setNewMessage, onSendMessage,
    onStartHosting, onViewSession, onJoinAndPay, onPostToLobby, onSelectField,
    onConfirmSession, onCompleteSession, onBack,
    reviewRatings, reviewComments, setReviewRatings, setReviewComments,
    onSubmitReviews, onSkipReviews, reviewSubmitting, userProfile,
  } = props;

  const uniqueDates = [...new Set(timetableSlots.map(s => s.date))].sort();
  const slotsForDate = timetableSlots.filter(s => s.date === selectedDate);
  const selectedCount = selectedSlotIds.length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ── LIST: Browse sessions ─────────────────────────────────── */}
        {phase === 'LIST' && (
          <div className="animate-fade-in space-y-16">
            {/* Hero — mirrors matchmaking's two cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-[48px] p-12 border-4 border-white shadow-2xl relative group cursor-pointer hover:border-blue-600 transition-all" onClick={onStartHosting}>
                <Target size={32} className="text-blue-600 mb-8" />
                <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 mb-4">Host Training</h2>
                <p className="text-slate-500 font-medium mb-10">Book a field and invite players. R20 per slot.</p>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">I am a:</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setHostRole('Shooter'); }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${hostRole === 'Shooter' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    <Target size={12} className="inline mr-1" /> Shooter
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setHostRole('GK'); }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${hostRole === 'GK' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    <Shield size={12} className="inline mr-1" /> Goalkeeper
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 rounded-[48px] p-12 shadow-2xl border-4 border-slate-900">
                <Wallet size={32} className="text-white mb-8" />
                <h2 className="text-4xl font-black uppercase tracking-tighter text-white mb-4">R20 / Slot</h2>
                <p className="text-slate-400 font-medium mb-10">Select 1–3 consecutive hours. Pick your time slots on the next screen.</p>
                <p className="text-xs text-slate-300 font-bold uppercase tracking-widest leading-relaxed">Fee held in escrow until host confirms. Refund if cancelled.</p>
              </div>
            </div>

            {/* Sessions list — mirrors matchmaking's Quick Matches */}
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4 mb-10">
                <Target className="text-blue-600" size={32} /> Open Training Sessions
              </h2>
              {sessions.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="font-bold">No sessions available yet. Be the first to host!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => onViewSession(session)}
                      className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-xl cursor-pointer group transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-black uppercase tracking-tight group-hover:text-blue-600 transition-colors">{session.hostName}</h3>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          session.hostType === 'Shooter' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {session.hostType}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mb-3 italic line-clamp-1">"{session.description}"</p>
                      <div className="space-y-2">
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2"><MapPin size={12}/> {session.location}</p>
                        <p className="text-slate-500 font-black uppercase text-[11px] tracking-widest flex items-center gap-2"><Clock size={12}/> {session.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SELECT_FIELD ──────────────────────────────────────────── */}
        {phase === 'SELECT_FIELD' && (
          <div className="max-w-2xl mx-auto bg-white p-12 rounded-[48px] shadow-2xl animate-fade-in border border-slate-100">
            <div className="flex justify-between mb-10 items-center">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Select Venue</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Step 1 of 3</p>
              </div>
              <button onClick={onBack}><X size={32} className="text-slate-300 hover:text-slate-900 transition-colors"/></button>
            </div>
            <div className="space-y-4">
              {fields.length === 0 ? (
                <p className="text-slate-400 py-8 text-center">No fields available.</p>
              ) : (
                fields.map(field => (
                  <button
                    key={field.id}
                    onClick={() => onSelectField(field)}
                    className="w-full p-8 bg-slate-50 hover:bg-blue-50 rounded-[32px] font-black text-left transition-all uppercase flex justify-between items-center group"
                  >
                    <div>
                      <span className="block text-lg leading-none">{field.name}</span>
                      <span className="text-[10px] text-slate-400 font-bold mt-2 block tracking-widest">{field.location}</span>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── SELECT_DATETIME: Multi-slot picker ───────────────────── */}
        {phase === 'SELECT_DATETIME' && selectedField && (
          <div className="max-w-2xl mx-auto bg-white p-12 rounded-[48px] shadow-2xl animate-fade-in border border-slate-100">
            <div className="flex justify-between mb-10 items-center">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Schedule Training</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Step 2 of 3 — {selectedField.name}</p>
              </div>
              <button onClick={onBack}><X size={32} className="text-slate-300 hover:text-slate-900 transition-colors"/></button>
            </div>

            {uniqueDates.length > 0 ? (
              <div className="space-y-8">
                {/* Date tabs */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Select Day</label>
                  <div className="grid grid-cols-2 gap-3">
                    {uniqueDates.map(date => (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`p-6 rounded-3xl font-black uppercase text-xs tracking-widest transition-all border ${
                          selectedDate === date
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xl'
                            : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <Calendar size={14} className="inline mr-2" />
                        {new Date(date + 'T00:00').toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time slots */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">
                    Select Time Slot{selectedCount > 0 ? 's' : ''}
                    {selectedCount > 0 && (
                      <span className="ml-2 text-blue-600">{selectedCount} slot{selectedCount > 1 ? 's' : ''} = R{20 * selectedCount}</span>
                    )}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {slotsForDate.map(slot => {
                      const isSelected = selectedSlotIds.includes(slot.id);
                      return (
                        <button
                          key={slot.id}
                          onClick={() => onToggleSlot(slot)}
                          className={`p-4 rounded-2xl font-black text-xs transition-all border ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xl'
                              : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {slot.timeSlot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedCount > 0 && (
                  <button
                    onClick={onConfirmSlots}
                    className="w-full py-8 bg-blue-600 text-white rounded-[32px] font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-4 active:scale-95"
                  >
                    Create & Pay R{20 * selectedCount} <ChevronRight size={20}/>
                  </button>
                )}
              </div>
            ) : (
              <p className="text-slate-400 py-8 text-center">No available time slots for this field.</p>
            )}
          </div>
        )}

        {/* ── POST_TO_LOBBY: Host preview before posting ─────────── */}
        {/* Mirrors matchmaking's lobby view with "Post Match to Lobby" card */}
        {phase === 'POST_TO_LOBBY' && currentSession && (
          <div className="animate-fade-in space-y-8 max-w-6xl mx-auto">
            {/* Header — same as matchmaking lobby header */}
            <div className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">{currentSession.field?.name || currentSession.location}</h1>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-4 flex items-center gap-4">
                  <span className="flex items-center gap-1"><MapPin size={12}/> {currentSession.field?.location || currentSession.location}</span>
                  <span className="flex items-center gap-1"><Clock size={12}/> {currentSession.timeSlot}</span>
                  <span className="flex items-center gap-1"><Calendar size={12}/> {currentSession.date}</span>
                  <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md">
                    {currentSession.slotsCount} slot{currentSession.slotsCount > 1 ? 's' : ''} · R{currentSession.feePerPlayer}
                  </span>
                </p>
              </div>
              <button onClick={onBack} className="text-slate-300 hover:text-slate-900 transition-colors p-2"><X size={32}/></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Left: Chat */}
              <div className="lg:col-span-8">
                <LobbyChat
                  messages={lobbyMessages}
                  newMessage={newMessage}
                  setNewMessage={setNewMessage}
                  onSendMessage={onSendMessage}
                  isLocked={!hasPaid}
                  title="Training Comms"
                />
              </div>

              {/* Right: Post to Lobby card — mirrors matchmaking's "Post Match to Lobby" */}
              <div className="lg:col-span-4 flex flex-col gap-8">
                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl animate-bounce-in">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 text-center">
                    Ready to Recruit?
                  </h4>
                  <button
                    onClick={onPostToLobby}
                    className="w-full py-6 bg-emerald-600 text-white rounded-[32px] font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95 group"
                  >
                    <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                    Post Training to Lobby
                  </button>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-6 text-center leading-relaxed px-4">
                    Posting will list this session under Open Training Sessions for other players to join.
                  </p>
                </div>

                {/* Session info card */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Session Details</p>
                  <p className="text-sm font-black uppercase text-slate-900 mb-2">{currentSession.title}</p>
                  {currentSession.description && (
                    <p className="text-xs text-slate-500 italic mb-3">"{currentSession.description}"</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    <Calendar size={12} className="inline mr-1" />
                    {currentSession.date} · {currentSession.timeSlot}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-bold">
                    {currentSession.slotsCount} slot{currentSession.slotsCount > 1 ? 's' : ''} · R{currentSession.feePerPlayer}/person
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── LOBBY: Detail view with chat + sidebar ─────────────── */}
        {/* Mirrors matchmaking's lobby layout: header, chat left, info right */}
        {phase === 'LOBBY' && currentSession && (
          <div className="animate-fade-in space-y-8 max-w-6xl mx-auto">
            {/* Header — same as matchmaking lobby header */}
            <div className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">{currentSession.field?.name || currentSession.location}</h1>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-4 flex items-center gap-4">
                  <span className="flex items-center gap-1"><MapPin size={12}/> {currentSession.field?.location || currentSession.location}</span>
                  <span className="flex items-center gap-1"><Clock size={12}/> {currentSession.timeSlot}</span>
                  <span className="flex items-center gap-1"><Calendar size={12}/> {currentSession.date}</span>
                  <span className={`px-2 py-0.5 rounded-md ${
                    currentSession.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600' :
                    currentSession.status === 'COMPLETED' ? 'bg-blue-50 text-blue-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {currentSession.participantCount}/{currentSession.maxPlayers} Joined · {currentSession.paidCount} Paid
                  </span>
                </p>
              </div>
              <button onClick={onBack} className="text-slate-300 hover:text-slate-900 transition-colors p-2"><X size={32}/></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Left: Chat — same position as matchmaking */}
              <div className="lg:col-span-8">
                <LobbyChat
                  messages={lobbyMessages}
                  newMessage={newMessage}
                  setNewMessage={setNewMessage}
                  onSendMessage={onSendMessage}
                  isLocked={!hasPaid}
                  title="Training Comms"
                  subtitle={hasPaid ? 'Session Coordination' : 'Pay to unlock chat'}
                />
              </div>

              {/* Right sidebar — field info, participants, actions */}
              <div className="lg:col-span-4 space-y-6">

                {/* ── Joiner: Single "PAY R{fee} TO JOIN" button ── */}
                {!isHost && !hasPaid && currentSession.status !== 'COMPLETED' && currentSession.status !== 'CANCELLED' && (
                  <button
                    onClick={onJoinAndPay}
                    className="w-full py-8 bg-blue-600 text-white rounded-[32px] font-black uppercase shadow-2xl hover:bg-blue-700 transition-all active:scale-95 text-sm tracking-[0.15em]"
                  >
                    <Wallet size={20} className="inline mr-2" />
                    Pay R{currentSession.feePerPlayer} to Join
                  </button>
                )}

                {/* Joiner: Paid badge */}
                {!isHost && hasPaid && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-[32px] p-6 flex items-center justify-center gap-3">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                    <span className="text-sm font-black text-emerald-600 uppercase">Paid &#10003;</span>
                  </div>
                )}

                {/* Host: pay button if somehow not yet paid */}
                {isHost && !hasPaid && currentSession.status !== 'COMPLETED' && currentSession.status !== 'CANCELLED' && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full py-8 bg-emerald-600 text-white rounded-[32px] font-black uppercase shadow-2xl hover:bg-emerald-700 transition-all active:scale-95"
                  >
                    Pay R{currentSession.feePerPlayer} Entry
                  </button>
                )}

                {/* Location info card */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Location</p>
                  <p className="text-sm font-black uppercase text-slate-900">
                    {currentSession.field?.name || currentSession.location || 'Off-platform'}
                  </p>
                  {currentSession.field && (
                    <p className="text-xs text-slate-400 mt-1">{currentSession.field.location}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    <Calendar size={12} className="inline mr-1" />
                    {currentSession.date} · {currentSession.timeSlot}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-bold">
                    {currentSession.slotsCount} slot{currentSession.slotsCount > 1 ? 's' : ''} · R{currentSession.feePerPlayer}/person
                  </p>
                </div>

                {/* Participants card */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    Participants ({participants.length})
                  </p>
                  <div className="space-y-3">
                    {participants.map(p => (
                      <div key={p.userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                            {p.fullName.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-slate-700">
                            {p.fullName}
                            {p.userId === userProfile.id && <span className="text-blue-500 ml-1">(You)</span>}
                          </span>
                        </div>
                        {p.hasPaid ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <span className="text-[8px] font-bold text-amber-500 uppercase">Unpaid</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Host actions — only visible to host */}
                {isHost && currentSession.status !== 'COMPLETED' && currentSession.status !== 'CANCELLED' && (
                  <div className="space-y-3">
                    {(currentSession.status === 'OPEN' || currentSession.status === 'FILLING' || currentSession.status === 'FULL') && (
                      <button
                        onClick={onConfirmSession}
                        className="w-full py-5 bg-blue-600 text-white rounded-[32px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95 text-sm"
                      >
                        <CheckCircle2 size={18} className="inline mr-2" /> Confirm Session
                      </button>
                    )}
                    {currentSession.status === 'CONFIRMED' && (
                      <button
                        onClick={onCompleteSession}
                        className="w-full py-5 bg-emerald-600 text-white rounded-[32px] font-black uppercase shadow-xl hover:bg-emerald-700 transition-all active:scale-95 text-sm"
                      >
                        <Award size={18} className="inline mr-2" /> Complete Session
                      </button>
                    )}
                  </div>
                )}

                {/* Non-host status info */}
                {!isHost && currentSession.status === 'CONFIRMED' && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-[40px] p-8 flex flex-col items-center text-center">
                    <CheckCircle2 size={32} className="text-emerald-500 mb-3" />
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Session Confirmed</p>
                    <p className="text-[8px] text-slate-400 uppercase mt-1">Waiting for host to complete</p>
                  </div>
                )}

                {!isHost && (currentSession.status === 'OPEN' || currentSession.status === 'FILLING') && hasPaid && (
                  <div className="bg-blue-50 border border-blue-100 rounded-[40px] p-8 flex flex-col items-center text-center">
                    <Clock size={32} className="text-blue-500 mb-3" />
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Waiting for host to confirm</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── REVIEW ─────────────────────────────────────────────────── */}
        {phase === 'REVIEW' && (
          <div className="animate-fade-in max-w-2xl mx-auto space-y-8">
            <div className="text-center">
              <Award size={48} className="mx-auto text-blue-600 mb-4" />
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Session Complete!</h2>
              <p className="text-slate-500 mt-2">Rate your training partners.</p>
            </div>

            {Object.keys(reviewRatings).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">No other paid participants to review.</p>
                <button onClick={onSkipReviews} className="mt-4 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase">
                  Back to Sessions
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  {participants
                    .filter(p => p.userId !== userProfile.id && p.hasPaid && reviewRatings[p.userId] !== undefined)
                    .map(p => (
                      <div key={p.userId} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-lg font-bold text-slate-600">
                            {p.fullName.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900">{p.fullName}</h3>
                            <p className="text-xs text-slate-400">{p.position || 'Player'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              onClick={() => setReviewRatings(prev => ({ ...prev, [p.userId]: star }))}
                              className="transition-transform hover:scale-110"
                            >
                              <Star
                                size={28}
                                className={star <= (reviewRatings[p.userId] || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}
                              />
                            </button>
                          ))}
                          <span className="text-sm font-bold text-slate-500 ml-2">{reviewRatings[p.userId]}/5</span>
                        </div>

                        <input
                          type="text"
                          placeholder="Optional comment..."
                          value={reviewComments[p.userId] || ''}
                          onChange={e => setReviewComments(prev => ({ ...prev, [p.userId]: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={onSkipReviews}
                    className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-sm hover:bg-slate-200 transition-all"
                  >
                    Skip
                  </button>
                  <button
                    onClick={onSubmitReviews}
                    disabled={reviewSubmitting}
                    className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {reviewSubmitting ? 'Submitting...' : 'Submit Reviews'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={onProcessPayment}
        amount={currentSession?.feePerPlayer ?? 20}
        status={paymentStep}
        title="Training Hub"
        description={`Session Entry Fee (${currentSession?.slotsCount ?? 1} slot${(currentSession?.slotsCount ?? 1) > 1 ? 's' : ''})`}
      />
    </div>
  );
};
