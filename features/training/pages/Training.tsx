
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LobbyMessage, PracticeSession, UserProfileData } from '../../../types';
import { TrainingUI } from '../components/TrainingUI';
import {
  getTrainingSessions,
  getTrainingSessionById,
  createTrainingSession,
  postTrainingSession,
  joinTrainingSession,
  payTrainingSession,
  leaveTrainingSession,
  confirmTrainingSession,
  completeTrainingSession,
  submitTrainingReview,
  getFields,
  getFieldTimetable,
  getMyWallet,
  getTrainingMessages,
  sendTrainingMessage,
  ApiError,
  TrainingSession,
} from '../../../frontend/api';

interface TrainingProps {
  sessions: PracticeSession[];
  onUpdateSessions: React.Dispatch<React.SetStateAction<PracticeSession[]>>;
  userProfile: UserProfileData;
  onUpdateUserWallet: (wallet: UserProfileData['wallet']) => void;
}

export interface TrainingParticipant {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  position: string | null;
  hasPaid: boolean;
  joinedAt: string;
}

export interface FieldOption {
  id: string;
  name: string;
  location: string;
  city: string;
  pricePerSlot: number;
}

export interface TimetableSlot {
  id: string;
  date: string;
  timeSlot: string;
  status: string;
}

export type TrainingPhase =
  | 'LIST'
  | 'SELECT_FIELD'
  | 'SELECT_DATETIME'
  | 'POST_TO_LOBBY'
  | 'LOBBY'
  | 'REVIEW';

function mapApiSession(s: TrainingSession): PracticeSession {
  return {
    id: s.id,
    hostName: s.creatorName,
    hostAvatar: s.creatorAvatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='100' r='45' fill='%23CBD5E1'/%3E%3Ccircle cx='50' cy='35' r='22' fill='%23CBD5E1'/%3E%3C/svg%3E",
    hostType: 'Shooter',
    location: s.location || s.field?.name || 'Off-platform',
    time: s.timeSlot,
    needed: 'GK',
    description: s.description || s.title,
  };
}

export const Training: React.FC<TrainingProps> = ({ sessions: propSessions, onUpdateSessions, userProfile, onUpdateUserWallet }) => {
  const [phase, setPhase] = useState<TrainingPhase>('LIST');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // API sessions (raw TrainingSession objects, not mapped PracticeSession)
  const [apiSessions, setApiSessions] = useState<TrainingSession[] | null>(null);
  const displaySessions = apiSessions ? apiSessions.map(mapApiSession) : propSessions;

  // Current session detail
  const [currentSession, setCurrentSession] = useState<TrainingSession | null>(null);
  const [participants, setParticipants] = useState<TrainingParticipant[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);

  // Hosting flow
  const [fields, setFields] = useState<FieldOption[]>([]);
  const [selectedField, setSelectedField] = useState<FieldOption | null>(null);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [hostRole, setHostRole] = useState<'Shooter' | 'GK'>('Shooter');

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');

  // Chat
  const [lobbyMessages, setLobbyMessages] = useState<LobbyMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Review
  const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Chat polling ref
  const chatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear chat polling on unmount
  useEffect(() => {
    return () => {
      if (chatPollRef.current) clearInterval(chatPollRef.current);
    };
  }, []);

  // ── Chat fetching ────────────────────────────────────────────────────────

  const fetchChatMessages = useCallback(async (sessionId: string) => {
    try {
      const data = await getTrainingMessages(sessionId);
      setLobbyMessages(data.messages.map(m => ({
        id: m.id,
        sender: m.senderName,
        text: m.content,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: m.senderId === userProfile.id,
      })));
    } catch {
      // Non-critical
    }
  }, [userProfile.id]);

  const startChatPolling = useCallback((sessionId: string) => {
    if (chatPollRef.current) clearInterval(chatPollRef.current);
    chatPollRef.current = setInterval(() => {
      fetchChatMessages(sessionId);
    }, 5000);
  }, [fetchChatMessages]);

  const stopChatPolling = useCallback(() => {
    if (chatPollRef.current) {
      clearInterval(chatPollRef.current);
      chatPollRef.current = null;
    }
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    try {
      const data = await getTrainingSessions();
      setApiSessions(data.sessions);
      setError('');
    } catch {
      // Fall back to prop sessions
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const refreshWallet = useCallback(async () => {
    try {
      const data = await getMyWallet();
      onUpdateUserWallet({
        balance: data.wallet.balance,
        escrow: data.wallet.escrow,
        transactions: data.transactions.map(t => ({
          id: t.id,
          type: t.type as any,
          amount: Math.abs(t.amount),
          description: t.description,
          date: new Date(t.createdAt).toLocaleDateString(),
          isPending: false,
        })),
      });
    } catch {
      // Non-critical
    }
  }, [onUpdateUserWallet]);

  const fetchSessionDetail = useCallback(async (sessionId: string) => {
    try {
      const data = await getTrainingSessionById(sessionId);
      setCurrentSession(data.session);
      setParticipants(data.participants);
      const me = data.participants.find(p => p.userId === userProfile.id);
      setHasPaid(me?.hasPaid ?? false);
      setIsHost(data.session.createdBy === userProfile.id);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load session details';
      setError(msg);
    }
  }, [userProfile.id]);

  // ── Hosting flow ───────────────────────────────────────────────────────────

  const handleStartHosting = async () => {
    setError('');
    setSelectedSlotIds([]);
    try {
      const data = await getFields();
      setFields(data.fields.map(f => ({
        id: f.id,
        name: f.name,
        location: f.location,
        city: f.city || '',
        pricePerSlot: f.pricePerSlot,
      })));
      setPhase('SELECT_FIELD');
    } catch {
      setError('Failed to load fields');
    }
  };

  const handleSelectField = async (field: FieldOption) => {
    setSelectedField(field);
    setSelectedSlotIds([]);
    setError('');
    try {
      const data = await getFieldTimetable(field.id);
      const available = data.timetable.filter(s => s.status === 'AVAILABLE');
      setTimetableSlots(available);
      const dates = [...new Set(available.map(s => s.date))].sort();
      setSelectedDate(dates[0] || '');
      setPhase('SELECT_DATETIME');
    } catch {
      setError('Failed to load timetable');
    }
  };

  const handleToggleSlot = (slot: TimetableSlot) => {
    setSelectedSlotIds(prev => {
      if (prev.includes(slot.id)) {
        return prev.filter(id => id !== slot.id);
      }
      return [...prev, slot.id];
    });
  };

  // Host: Create session (OPEN) + Pay → show POST_TO_LOBBY screen
  const handleConfirmSlots = async () => {
    if (!selectedField || selectedSlotIds.length === 0) return;
    setError('');

    const firstSlot = timetableSlots.find(s => s.id === selectedSlotIds[0]);
    if (!firstSlot) return;

    const slotsCount = selectedSlotIds.length;
    const fee = 20 * slotsCount;

    // Build time label from all selected slots
    const selectedSlots = selectedSlotIds
      .map(id => timetableSlots.find(s => s.id === id))
      .filter(Boolean)
      .sort((a, b) => a!.timeSlot.localeCompare(b!.timeSlot));
    const timeLabel = selectedSlots.map(s => s!.timeSlot).join(', ');

    try {
      // Step 1: Create session (status = OPEN)
      const data = await createTrainingSession({
        title: `${hostRole} Training — ${userProfile.fullName}`,
        fieldId: selectedField.id,
        timetableIds: selectedSlotIds,
        date: firstSlot.date,
        timeSlot: timeLabel,
        location: selectedField.name,
        maxPlayers: 20,
        description: hostRole === 'Shooter'
          ? 'Looking for a sharp GK to test my finishing.'
          : 'Goalkeeper ready for high-intensity shooting drills.',
      });

      // Step 2: Pay (host is auto-joined as participant)
      try {
        await payTrainingSession(data.session.id);
        await refreshWallet();
        setHasPaid(true);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Payment failed after creating session';
        alert(msg);
      }

      // Show POST_TO_LOBBY screen so host can review before posting
      setIsHost(true);
      await fetchSessionDetail(data.session.id);
      setLobbyMessages([
        { id: 'sys-host', sender: 'System', text: `Session created at ${selectedField.name} (${slotsCount} slot${slotsCount > 1 ? 's' : ''} = R${fee}). Listed as ${hostRole}.`, time: 'Now', isMe: false }
      ]);
      setPhase('POST_TO_LOBBY');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to create session';
      alert('Error: ' + msg);
      setError(msg);
    }
  };

  // Host: Post session to lobby — transition to LOBBY view
  // Session is already OPEN on the server, this is a UI transition.
  const handlePostToLobby = async () => {
    if (!currentSession) return;

    // Call post endpoint (no-op if already OPEN, but keeps server in sync)
    try {
      await postTrainingSession(currentSession.id);
    } catch {
      // Ignore — session is already OPEN
    }

    await fetchSessionDetail(currentSession.id);
    await fetchSessions();
    setLobbyMessages(prev => [
      ...prev,
      { id: `sys-posted-${Date.now()}`, sender: 'System', text: 'Session posted to lobby! Other players can now see and join.', time: 'Now', isMe: false }
    ]);
    // Start chat polling
    await fetchChatMessages(currentSession.id);
    startChatPolling(currentSession.id);
    setPhase('LOBBY');
  };

  // ── Joiner flow: Single button that does JOIN + PAY in sequence ───────────

  const handleViewSession = async (session: PracticeSession) => {
    setError('');
    setHasPaid(false);
    setIsHost(false);

    await fetchSessionDetail(session.id);
    setLobbyMessages([
      { id: 'sys-view', sender: 'System', text: `Viewing ${session.hostName}'s session.`, time: 'Now', isMe: false }
    ]);
    // Fetch existing chat messages and start polling
    await fetchChatMessages(session.id);
    startChatPolling(session.id);
    setPhase('LOBBY');
  };

  // Combined join + pay (one button click for joiners)
  const handleJoinAndPay = async () => {
    if (!currentSession) return;
    setPaymentStep('PROCESSING');
    setShowPaymentModal(true);

    try {
      // Step 1: Join
      await joinTrainingSession(currentSession.id);

      // Step 2: Pay
      try {
        await payTrainingSession(currentSession.id);
        await refreshWallet();
        setPaymentStep('SUCCESS');
        setTimeout(async () => {
          setHasPaid(true);
          setShowPaymentModal(false);
          setPaymentStep('IDLE');
          await fetchSessionDetail(currentSession.id);
          await fetchSessions();
          setLobbyMessages(prev => [
            ...prev,
            { id: `sys-paid-${Date.now()}`, sender: 'System', text: 'Payment confirmed! You can now chat.', time: 'Now', isMe: false }
          ]);
        }, 1000);
      } catch (e) {
        // Pay failed — remove from participants
        try { await leaveTrainingSession(currentSession.id); } catch {}
        const msg = e instanceof ApiError ? e.message : 'Payment failed';
        alert(msg);
        setShowPaymentModal(false);
        setPaymentStep('IDLE');
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not join session';
      if (msg.toLowerCase().includes('already joined')) {
        // Already joined, try just paying
        try {
          await payTrainingSession(currentSession.id);
          await refreshWallet();
          setPaymentStep('SUCCESS');
          setTimeout(async () => {
            setHasPaid(true);
            setShowPaymentModal(false);
            setPaymentStep('IDLE');
            await fetchSessionDetail(currentSession.id);
            await fetchSessions();
          }, 1000);
        } catch (payErr) {
          const payMsg = payErr instanceof ApiError ? payErr.message : 'Payment failed';
          alert(payMsg);
          setShowPaymentModal(false);
          setPaymentStep('IDLE');
        }
      } else {
        alert(msg);
        setShowPaymentModal(false);
        setPaymentStep('IDLE');
      }
    }
  };

  // Host payment (for the payment modal flow if host hasn't paid yet)
  const processHostPayment = async () => {
    if (!currentSession) return;
    setPaymentStep('PROCESSING');

    try {
      await payTrainingSession(currentSession.id);
      await refreshWallet();
      setPaymentStep('SUCCESS');
      setTimeout(async () => {
        setHasPaid(true);
        setShowPaymentModal(false);
        setPaymentStep('IDLE');
        await fetchSessionDetail(currentSession.id);
      }, 1000);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Payment failed';
      alert(msg);
      setShowPaymentModal(false);
      setPaymentStep('IDLE');
    }
  };

  // ── Host actions ───────────────────────────────────────────────────────────

  const handleConfirmSession = async () => {
    if (!currentSession) return;
    setError('');
    try {
      const data = await confirmTrainingSession(currentSession.id);
      setCurrentSession(data.session);
      await fetchSessionDetail(currentSession.id);
      await fetchSessions();
      setLobbyMessages(prev => [
        ...prev,
        { id: `sys-conf-${Date.now()}`, sender: 'System', text: `Session confirmed! ${data.removedUnpaid} unpaid participant(s) removed.`, time: 'Now', isMe: false }
      ]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to confirm session';
      alert(msg);
    }
  };

  const handleCompleteSession = async () => {
    if (!currentSession) return;
    try {
      await completeTrainingSession(currentSession.id);
      await refreshWallet();
      await fetchSessionDetail(currentSession.id);
      await fetchSessions();

      // Init review state for all other paid participants
      const ratings: Record<string, number> = {};
      const comments: Record<string, string> = {};
      participants.filter(p => p.userId !== userProfile.id && p.hasPaid).forEach(p => {
        ratings[p.userId] = 5;
        comments[p.userId] = '';
      });
      setReviewRatings(ratings);
      setReviewComments(comments);
      setPhase('REVIEW');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to complete session';
      alert(msg);
    }
  };

  // ── Review ─────────────────────────────────────────────────────────────────

  const handleSubmitReviews = async () => {
    if (!currentSession) return;
    setReviewSubmitting(true);

    const reviews = Object.entries(reviewRatings).map(([userId, rating]) => ({
      userId,
      rating,
      comment: reviewComments[userId] || undefined,
    }));

    try {
      await submitTrainingReview(currentSession.id, reviews);
      setPhase('LIST');
      setCurrentSession(null);
      setParticipants([]);
      await fetchSessions();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to submit reviews';
      setError(msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleSkipReviews = () => {
    setPhase('LIST');
    setCurrentSession(null);
    setParticipants([]);
    fetchSessions();
  };

  // ── Chat ───────────────────────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !hasPaid || !currentSession) return;
    const text = newMessage.trim();
    setNewMessage('');

    // Optimistic local update
    setLobbyMessages(prev => [...prev, {
      id: `local-${Date.now()}`,
      sender: userProfile.fullName,
      text,
      time: 'Now',
      isMe: true
    }]);

    // POST to API
    try {
      await sendTrainingMessage(currentSession.id, text);
    } catch {
      console.error('[Training] Failed to send message to API');
    }
  };

  // ── Back navigation ────────────────────────────────────────────────────────

  const handleBack = () => {
    if (phase === 'SELECT_DATETIME') {
      setPhase('SELECT_FIELD');
      setSelectedSlotIds([]);
    } else if (phase === 'SELECT_FIELD') {
      setPhase('LIST');
    } else if (phase === 'POST_TO_LOBBY' || phase === 'LOBBY') {
      stopChatPolling();
      setPhase('LIST');
      setCurrentSession(null);
      setParticipants([]);
      fetchSessions();
    } else {
      setPhase('LIST');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {error && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
            {error}
            <button onClick={() => setError('')} className="ml-4 text-red-500 hover:text-red-700 font-bold">×</button>
          </div>
        </div>
      )}
      {loading && !apiSessions ? (
        <div className="min-h-screen bg-slate-50 flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <TrainingUI
          phase={phase}
          sessions={displaySessions}
          currentSession={currentSession}
          participants={participants}
          isHost={isHost}
          hasPaid={hasPaid}
          fields={fields}
          selectedField={selectedField}
          timetableSlots={timetableSlots}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedSlotIds={selectedSlotIds}
          onToggleSlot={handleToggleSlot}
          onConfirmSlots={handleConfirmSlots}
          hostRole={hostRole}
          setHostRole={setHostRole}
          showPaymentModal={showPaymentModal}
          setShowPaymentModal={setShowPaymentModal}
          paymentStep={paymentStep}
          onProcessPayment={isHost ? processHostPayment : handleJoinAndPay}
          lobbyMessages={lobbyMessages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSendMessage={handleSendMessage}
          onStartHosting={handleStartHosting}
          onViewSession={handleViewSession}
          onJoinAndPay={handleJoinAndPay}
          onPostToLobby={handlePostToLobby}
          onSelectField={handleSelectField}
          onConfirmSession={handleConfirmSession}
          onCompleteSession={handleCompleteSession}
          onBack={handleBack}
          reviewRatings={reviewRatings}
          reviewComments={reviewComments}
          setReviewRatings={setReviewRatings}
          setReviewComments={setReviewComments}
          onSubmitReviews={handleSubmitReviews}
          onSkipReviews={handleSkipReviews}
          reviewSubmitting={reviewSubmitting}
          userProfile={userProfile}
        />
      )}
    </>
  );
};
