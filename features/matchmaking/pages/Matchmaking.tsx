
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LobbyMessage, MatchLobby, MatchIntensity, TeamWallet, UserProfileData, FieldListing } from '../../../types';
import { MatchmakingUI } from '../components/MatchmakingUI';
import { getLobbies, createLobby as apiCreateLobby, joinLobby as apiJoinLobby, payLobby as apiPayLobby, getMyWallet, getLobbyMessages, sendLobbyMessage, ApiError } from '../../../frontend/api';

type MatchMode = 'QUICK_PLAY' | 'TEAM_VS_TEAM';

const FULL_SQUAD_LAYOUT = [
  // Team A
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
  // Team B
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

const MOCK_NAMES = ['Junior M.', 'Ace K.', 'Mandla Z.', 'Thabo L.', 'George S.', 'Percy T.', 'Teko M.', 'Lucas R.', 'Mark F.'];

interface MatchmakingProps {
  resetKey?: number;
  autoJoinLobby?: MatchLobby;
  onConfirmed?: (lobby: MatchLobby, squad: any[]) => void;
  savedSquadAssignments?: Record<string, string>;
  squadPool?: any[];
  activeLobbies: MatchLobby[];
  onUpdateLobbies: (lobbies: MatchLobby[]) => void;
  userRole?: 'PLAYER' | 'CAPTAIN';
  teamWallet: TeamWallet;
  onDeductFromTeamWallet: (amount: number) => void;
  userProfile: UserProfileData;
  onUpdateUserWallet: (wallet: UserProfileData['wallet']) => void;
  fields: FieldListing[];
}

export const Matchmaking: React.FC<MatchmakingProps> = ({
  resetKey,
  autoJoinLobby,
  onConfirmed,
  savedSquadAssignments = {},
  squadPool = [],
  activeLobbies,
  onUpdateLobbies,
  userRole = 'PLAYER',
  teamWallet,
  onDeductFromTeamWallet,
  userProfile,
  onUpdateUserWallet,
  fields
}) => {
  const [matchJoined, setMatchJoined] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState<MatchLobby | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSelectingDateTime, setIsSelectingDateTime] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('QUICK_PLAY');
  const [matchPhase, setMatchPhase] = useState<'RECRUITING' | 'WAITING_OPPONENT' | 'SQUAD_FILLING' | 'CONFIRMED'>('RECRUITING');
  const [assignedPositions, setAssignedPositions] = useState<Record<string, string>>({});
  const [lobbyMessages, setLobbyMessages] = useState<LobbyMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPendingId, setPaymentPendingId] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');
  const [isMatchFinished, setIsMatchFinished] = useState(false);
  const [draftLobby, setDraftLobby] = useState<Partial<MatchLobby>>({});
  const [lobbiesLoading, setLobbiesLoading] = useState(false);
  const chatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear chat polling on unmount
  useEffect(() => {
    return () => {
      if (chatPollRef.current) clearInterval(chatPollRef.current);
    };
  }, []);

  // Fetch chat messages for a lobby from API
  const fetchChatMessages = useCallback(async (lobbyId: string) => {
    if (lobbyId.startsWith('l-')) return; // local lobby, no API messages
    try {
      const data = await getLobbyMessages(lobbyId);
      setLobbyMessages(data.messages.map(m => ({
        id: m.id,
        sender: m.senderName,
        text: m.content,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: m.senderId === userProfile.id,
      })));
    } catch {
      // Non-critical — keep existing messages
    }
  }, [userProfile.id]);

  // Start polling chat messages every 5 seconds
  const startChatPolling = useCallback((lobbyId: string) => {
    if (chatPollRef.current) clearInterval(chatPollRef.current);
    chatPollRef.current = setInterval(() => {
      fetchChatMessages(lobbyId);
    }, 5000);
  }, [fetchChatMessages]);

  // Fetch lobbies from API on mount
  const fetchLobbies = useCallback(async () => {
    setLobbiesLoading(true);
    try {
      const data = await getLobbies();
      // Map API lobbies to MatchLobby shape for the UI
      const mapped: MatchLobby[] = data.lobbies.map(l => ({
        id: l.id,
        fieldName: l.field.name,
        fieldId: l.field.id,
        location: l.field.location,
        startTime: l.timeSlot,
        date: l.date,
        intensity: l.intensity as MatchIntensity,
        joinedCount: l.participantCount,
        paidCount: l.paidCount,
        totalSlots: l.maxPlayers,
        price: l.feePerPlayer,
        duration: '1hr',
        isConfirmed: l.status === 'CONFIRMED',
        isTeamMatch: false,
      }));
      onUpdateLobbies(mapped);
    } catch {
      // Keep existing prop data on error
    } finally {
      setLobbiesLoading(false);
    }
  }, [onUpdateLobbies]);

  useEffect(() => {
    fetchLobbies();
  }, [fetchLobbies]);

  // Sync wallet from API after payment
  const refreshWallet = useCallback(async () => {
    try {
      const data = await getMyWallet();
      onUpdateUserWallet({
        balance: data.wallet.balance,
        escrow: data.wallet.escrow,
        transactions: [],
      });
    } catch {
      // Silent fail
    }
  }, [onUpdateUserWallet]);

  useEffect(() => {
    if (resetKey) {
      setMatchJoined(false);
      setSelectedLobby(null);
      setIsCreating(false);
      setIsSelectingDateTime(false);
      setAssignedPositions({});
      setMatchPhase('RECRUITING');

      if (autoJoinLobby) {
        enterLobby(autoJoinLobby, false, autoJoinLobby.isTeamMatch ? 'TEAM_VS_TEAM' : 'QUICK_PLAY');
      }
    }
  }, [resetKey, autoJoinLobby]);

  // AUTO-CONFIRMATION LOGIC
  useEffect(() => {
    if (!selectedLobby || matchPhase === 'CONFIRMED') return;

    if (selectedLobby.isTeamMatch) {
       if (selectedLobby.teamAFunded && selectedLobby.teamBFunded) {
          handleFinalConfirmChallenge();
       }
    } else {
       if (Object.keys(assignedPositions).length === 22) {
         handleFinalConfirmChallenge();
       }
    }
  }, [assignedPositions, matchPhase, selectedLobby, activeLobbies]);

  const enterLobby = async (lobby: MatchLobby, isHost: boolean = false, mode: MatchMode = 'QUICK_PLAY') => {
    console.log('[Matchmaking] enterLobby:', lobby.id, 'isHost:', isHost);
    setSelectedLobby(lobby);
    setMatchJoined(true);
    setMatchMode(mode);
    setLobbyMessages([{ id: 'sys1', sender: 'Arena Bot', text: `Connected to ${lobby.fieldName}.`, time: 'Now', isMe: false }]);

    // Try to join lobby via API (for existing lobbies)
    if (!isHost && lobby.id && !lobby.id.startsWith('l-')) {
      try {
        await apiJoinLobby(lobby.id);
      } catch {
        // Already joined or lobby full — continue with UI
      }
    }

    // Fetch existing chat messages and start polling
    if (lobby.id && !lobby.id.startsWith('l-')) {
      await fetchChatMessages(lobby.id);
      startChatPolling(lobby.id);
    }

    if (lobby.isConfirmed) {
      setMatchPhase('CONFIRMED');
    } else {
      setMatchPhase('RECRUITING');
    }

    const initialPositions: Record<string, string> = {};
    if (lobby.isTeamMatch) {
      if (lobby.teamAFunded || isHost) {
        FULL_SQUAD_LAYOUT.filter(p => p.team === 'A').forEach(p => {
           initialPositions[p.id] = isHost ? (savedSquadAssignments[p.id.replace('a-', '').replace('1', '').replace('2', '')] || 'HOST SQUAD') : 'HOST SQUAD';
        });
      }
      if (lobby.teamBFunded) {
        FULL_SQUAD_LAYOUT.filter(p => p.team === 'B').forEach(p => {
           initialPositions[p.id] = 'CHALLENGER SQUAD';
        });
      }
    } else {
      if (isHost) {
        initialPositions['a-gk'] = 'YOU';
      } else {
        const numFilled = Math.floor(Math.random() * 8) + 5;
        FULL_SQUAD_LAYOUT.sort(() => 0.5 - Math.random()).slice(0, numFilled).forEach((pos, idx) => {
          initialPositions[pos.id] = MOCK_NAMES[idx % MOCK_NAMES.length];
        });
      }
    }
    setAssignedPositions(initialPositions);
  };

  const startHostingFlow = (mode: MatchMode) => {
    if (mode === 'TEAM_VS_TEAM' && userRole !== 'CAPTAIN') {
      alert("Only registered Captains can host a Teams vs Teams match.");
      return;
    }
    setMatchMode(mode);
    setIsCreating(true);
  };

  const selectVenue = (field: any) => {
    setDraftLobby({
      fieldName: field.name,
      fieldId: field.id,
      location: field.location,
      price: field.pricePerPlayer,
      joinedCount: 0,
      paidCount: 0,
      totalSlots: 22,
      duration: '1hr',
      intensity: MatchIntensity.BALANCED,
      isConfirmed: false,
      isTeamMatch: matchMode === 'TEAM_VS_TEAM',
      teamAFunded: matchMode === 'TEAM_VS_TEAM' ? false : undefined,
      teamBFunded: matchMode === 'TEAM_VS_TEAM' ? false : undefined,
    });
    setIsCreating(false);
    setIsSelectingDateTime(true);
  };

  const selectDateTime = async (date: string, time: string) => {
    // Try to create lobby via API
    if (draftLobby.fieldId) {
      try {
        const res = await apiCreateLobby({
          fieldId: draftLobby.fieldId,
          date,
          timeSlot: time,
          intensity: 'Balanced',
          maxPlayers: 22,
          feePerPlayer: draftLobby.price || 50,
        });

        const fullLobby: MatchLobby = {
          ...draftLobby,
          id: res.lobby.id,
          date,
          startTime: time,
        } as MatchLobby;

        setIsSelectingDateTime(false);
        enterLobby(fullLobby, true, matchMode);
        fetchLobbies(); // Refresh lobby list
        return;
      } catch {
        // Fall back to local lobby creation
      }
    }

    const fullLobby: MatchLobby = {
      ...draftLobby,
      id: `l-${Date.now()}`,
      date,
      startTime: time,
    } as MatchLobby;
    setIsSelectingDateTime(false);
    enterLobby(fullLobby, true, matchMode);
  };

  const handlePostMatch = async () => {
    if (!selectedLobby) return;
    console.log('[Matchmaking] handlePostMatch — lobby:', selectedLobby.id);

    if (selectedLobby.isTeamMatch) {
       if (teamWallet.balance < 550) {
          alert("Team Wallet balance insufficient (R550 required).");
          return;
       }
       onDeductFromTeamWallet(550);
       const finalLobby = {
          ...selectedLobby,
          joinedCount: 11,
          paidCount: 11,
          teamAFunded: true
       };
       setSelectedLobby(finalLobby);
       onUpdateLobbies([finalLobby, ...activeLobbies]);
    } else {
       const finalLobby = {
         ...selectedLobby,
         joinedCount: Object.keys(assignedPositions).length,
         paidCount: Object.values(assignedPositions).filter(v => v === 'YOU').length,
       };
       setSelectedLobby(finalLobby);
    }

    // Stop chat polling
    if (chatPollRef.current) {
      clearInterval(chatPollRef.current);
      chatPollRef.current = null;
    }

    setMatchJoined(false);
    setSelectedLobby(null);

    // Re-fetch lobbies from API to ensure persistence
    console.log('[Matchmaking] Re-fetching lobbies from API...');
    await fetchLobbies();
  };

  const handlePositionClick = (id: string) => {
    if (matchPhase === 'CONFIRMED' || assignedPositions[id]) return;

    if (selectedLobby?.isTeamMatch) {
       if (id.startsWith('b-')) {
          if (userRole !== 'CAPTAIN') {
            alert("Only a Captain can challenge another team.");
            return;
          }
          setPaymentPendingId('TEAM_B_CHALLENGE');
       } else {
          alert("Team A slots are reserved for the host squad.");
          return;
       }
    } else {
       setPaymentPendingId(id);
    }

    setPaymentStep('IDLE');
    setShowPaymentModal(true);
  };

  const handleSendLobbyMessage = async () => {
    if (!newMessage.trim() || !selectedLobby) return;
    const text = newMessage.trim();
    setNewMessage('');

    // Optimistic local update
    const localMsg: LobbyMessage = {
      id: `local-${Date.now()}`,
      sender: userProfile.fullName,
      text,
      time: 'Now',
      isMe: true,
    };
    setLobbyMessages(prev => [...prev, localMsg]);

    // POST to API if not a local lobby
    if (selectedLobby.id && !selectedLobby.id.startsWith('l-')) {
      try {
        await sendLobbyMessage(selectedLobby.id, text);
      } catch {
        console.error('[Matchmaking] Failed to send message to API');
      }
    }
  };

  const handleProcessPayment = async () => {
    setPaymentStep('PROCESSING');

    if (paymentPendingId === 'TEAM_B_CHALLENGE' && selectedLobby?.isTeamMatch) {
      // Team challenge payment
      setTimeout(() => {
        if (teamWallet.balance < 550) {
          alert("Insufficient team funds.");
          setShowPaymentModal(false);
          setPaymentStep('IDLE');
          return;
        }
        onDeductFromTeamWallet(550);
        setPaymentStep('SUCCESS');
        setTimeout(() => {
          const updatedLobby = { ...selectedLobby, teamBFunded: true, joinedCount: 22, paidCount: 22 };
          setSelectedLobby(updatedLobby);
          onUpdateLobbies(activeLobbies.map(l => l.id === updatedLobby.id ? updatedLobby : l));

          const challengerSquad: Record<string, string> = {};
          FULL_SQUAD_LAYOUT.filter(p => p.team === 'B').forEach(p => { challengerSquad[p.id] = "CHALLENGER SQUAD"; });
          setAssignedPositions(prev => ({ ...prev, ...challengerSquad }));
          setShowPaymentModal(false);
          setPaymentStep('IDLE');
        }, 1000);
      }, 1500);
    } else if (paymentPendingId && selectedLobby) {
      // Quick Play: fetch fresh wallet balance, then pay via API
      const lobbyId = selectedLobby.id;

      // Refresh wallet from API to get real balance
      try {
        const walletData = await getMyWallet();
        const freshBalance = walletData.wallet.balance;
        if (freshBalance < selectedLobby.price) {
          alert(`Insufficient funds. Balance: R${freshBalance.toFixed(2)}, Required: R${selectedLobby.price.toFixed(2)}`);
          setShowPaymentModal(false);
          setPaymentStep('IDLE');
          return;
        }
      } catch {
        // If we can't verify balance, proceed anyway — server will reject if insufficient
      }

      try {
        await apiPayLobby(lobbyId);
        await refreshWallet();
        setPaymentStep('SUCCESS');
        setTimeout(() => {
          setAssignedPositions(prev => ({ ...prev, [paymentPendingId]: 'YOU' }));
          setShowPaymentModal(false);
          setPaymentStep('IDLE');
          fetchLobbies();
        }, 1000);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Payment failed';
        alert(msg);
        setShowPaymentModal(false);
        setPaymentStep('IDLE');
      }
    }
  };

  const handleFinalConfirmChallenge = async () => {
    if (!selectedLobby || selectedLobby.isConfirmed) return;

    const newMatchId = `FF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const confirmedLobby = { ...selectedLobby, matchId: newMatchId, isConfirmed: true };

    // Refresh wallet from API (escrow is managed server-side)
    await refreshWallet();

    setMatchPhase('CONFIRMED');
    setSelectedLobby(confirmedLobby);

    onUpdateLobbies(activeLobbies.map(l => l.id === selectedLobby.id ? confirmedLobby : l));
  };

  const handleGoToReport = () => {
    if (!selectedLobby) return;
    const squadList = FULL_SQUAD_LAYOUT.map(p => ({
      id: p.id,
      name: assignedPositions[p.id] || 'Guest',
      team: p.team
    }));
    onConfirmed?.(selectedLobby, squadList);
  };

  return (
    <MatchmakingUI
      matchJoined={matchJoined}
      setMatchJoined={setMatchJoined}
      selectedLobby={selectedLobby}
      isCreating={isCreating}
      setIsCreating={setIsCreating}
      isSelectingDateTime={isSelectingDateTime}
      setIsSelectingDateTime={setIsSelectingDateTime}
      matchMode={matchMode}
      setMatchMode={setMatchMode}
      matchPhase={matchPhase}
      assignedPositions={assignedPositions}
      lobbyMessages={lobbyMessages}
      newMessage={newMessage}
      setNewMessage={setNewMessage}
      onSendLobbyMessage={handleSendLobbyMessage}
      onPositionClick={handlePositionClick}
      onAutoFill={() => {}}
      onGoToReport={handleGoToReport}
      onPostMatch={handlePostMatch}
      isMatchFinished={isMatchFinished}
      setIsMatchFinished={setIsMatchFinished}
      showPaymentModal={showPaymentModal}
      setShowPaymentModal={setShowPaymentModal}
      onProcessPayment={handleProcessPayment}
      paymentStep={paymentStep}
      lobbies={activeLobbies}
      fields={fields}
      onEnterLobby={enterLobby}
      onStartHosting={startHostingFlow}
      onSelectVenue={selectVenue}
      onSelectDateTime={selectDateTime}
      userRole={userRole}
      teamWallet={teamWallet}
    />
  );
};
