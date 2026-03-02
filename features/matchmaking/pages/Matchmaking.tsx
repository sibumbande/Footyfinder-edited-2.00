
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LobbyMessage, MatchLobby, MatchIntensity, TeamWallet, UserProfileData, FieldListing } from '../../../types';
import { MatchmakingUI } from '../components/MatchmakingUI';
import { getLobbies, getLobbyById, createLobby as apiCreateLobby, joinLobby as apiJoinLobby, payLobby as apiPayLobby, getMyWallet, getFields, getLobbyMessages, sendLobbyMessage, getLobbyFormation, pickLobbyPosition, acceptLobbyChallenge, completeMatch, ApiError } from '../../../frontend/api';

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

// Maps FULL_SQUAD_LAYOUT position IDs to formation API params
const POSITION_INFO: Record<string, { teamSide: 'HOME' | 'AWAY'; positionIndex: number; label: string }> = {
  'a-gk':  { teamSide: 'HOME', positionIndex: 0,  label: 'GK' },
  'a-lb':  { teamSide: 'HOME', positionIndex: 1,  label: 'LB' },
  'a-cb1': { teamSide: 'HOME', positionIndex: 2,  label: 'CB' },
  'a-cb2': { teamSide: 'HOME', positionIndex: 3,  label: 'CB' },
  'a-rb':  { teamSide: 'HOME', positionIndex: 4,  label: 'RB' },
  'a-lm':  { teamSide: 'HOME', positionIndex: 5,  label: 'LM' },
  'a-cm1': { teamSide: 'HOME', positionIndex: 6,  label: 'CM' },
  'a-cm2': { teamSide: 'HOME', positionIndex: 7,  label: 'CM' },
  'a-rm':  { teamSide: 'HOME', positionIndex: 8,  label: 'RM' },
  'a-st1': { teamSide: 'HOME', positionIndex: 9,  label: 'ST' },
  'a-st2': { teamSide: 'HOME', positionIndex: 10, label: 'ST' },
  'b-st1': { teamSide: 'AWAY', positionIndex: 0,  label: 'ST' },
  'b-st2': { teamSide: 'AWAY', positionIndex: 1,  label: 'ST' },
  'b-lm':  { teamSide: 'AWAY', positionIndex: 2,  label: 'LM' },
  'b-cm1': { teamSide: 'AWAY', positionIndex: 3,  label: 'CM' },
  'b-cm2': { teamSide: 'AWAY', positionIndex: 4,  label: 'CM' },
  'b-rm':  { teamSide: 'AWAY', positionIndex: 5,  label: 'RM' },
  'b-lb':  { teamSide: 'AWAY', positionIndex: 6,  label: 'LB' },
  'b-cb1': { teamSide: 'AWAY', positionIndex: 7,  label: 'CB' },
  'b-cb2': { teamSide: 'AWAY', positionIndex: 8,  label: 'CB' },
  'b-rb':  { teamSide: 'AWAY', positionIndex: 9,  label: 'RB' },
  'b-gk':  { teamSide: 'AWAY', positionIndex: 10, label: 'GK' },
};

// Reverse map: formation API index → FULL_SQUAD_LAYOUT position ID
const HOME_IDS = ['a-gk', 'a-lb', 'a-cb1', 'a-cb2', 'a-rb', 'a-lm', 'a-cm1', 'a-cm2', 'a-rm', 'a-st1', 'a-st2'];
const AWAY_IDS = ['b-st1', 'b-st2', 'b-lm', 'b-cm1', 'b-cm2', 'b-rm', 'b-lb', 'b-cb1', 'b-cb2', 'b-rb', 'b-gk'];

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
  userTeam?: { id: string; name: string } | null;
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
  fields,
  userTeam,
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
  const [draftLobby, setDraftLobby] = useState<Partial<MatchLobby>>({});
  const [lobbiesLoading, setLobbiesLoading] = useState(false);
  const [hostingFields, setHostingFields] = useState<any[]>([]);
  const [challengerTeamName, setChallengerTeamName] = useState<string | undefined>();
  const chatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const formationPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lobbyStatusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear polling on unmount
  useEffect(() => {
    return () => {
      if (chatPollRef.current) clearInterval(chatPollRef.current);
      if (formationPollRef.current) clearInterval(formationPollRef.current);
      if (lobbyStatusPollRef.current) clearInterval(lobbyStatusPollRef.current);
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

  // Load formation from API and update assignedPositions
  const loadFormation = useCallback(async (lobbyId: string) => {
    if (lobbyId.startsWith('l-')) {
      setAssignedPositions({}); // local draft lobby — start empty
      return;
    }
    try {
      const data = await getLobbyFormation(lobbyId);
      const positions: Record<string, string> = {};
      data.home.forEach(p => {
        const slotId = HOME_IDS[p.positionIndex];
        if (slotId) positions[slotId] = p.user.fullName;
      });
      data.away.forEach(p => {
        const slotId = AWAY_IDS[p.positionIndex];
        if (slotId) positions[slotId] = p.user.fullName;
      });
      setAssignedPositions(positions);
    } catch {
      // Keep existing positions on error
    }
  }, []);

  // Poll formation every 5 seconds
  const startFormationPolling = useCallback((lobbyId: string) => {
    if (formationPollRef.current) clearInterval(formationPollRef.current);
    formationPollRef.current = setInterval(() => {
      loadFormation(lobbyId);
    }, 5000);
  }, [loadFormation]);

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
        city: l.field.city,
        startTime: l.timeSlot,
        date: l.date,
        intensity: l.intensity as MatchIntensity,
        joinedCount: l.participantCount,
        paidCount: l.paidCount,
        totalSlots: l.maxPlayers,
        price: l.feePerPlayer,
        duration: '1hr',
        isConfirmed: l.status === 'CONFIRMED',
        isTeamMatch: !!l.teamId,
        teamId: l.teamId,
        teamName: l.teamName,
        createdBy: l.createdBy,
        competingLobbiesCount: l.competingLobbiesCount,
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

  // Poll lobby status every 5 seconds to detect if it was externally cancelled
  // (e.g. a competing lobby filled up first and this one was auto-cancelled)
  const startLobbyStatusPolling = useCallback((lobbyId: string) => {
    if (lobbyStatusPollRef.current) clearInterval(lobbyStatusPollRef.current);
    lobbyStatusPollRef.current = setInterval(async () => {
      try {
        const data = await getLobbyById(lobbyId);
        if (data.lobby.status === 'CANCELLED') {
          // Stop all polling
          if (chatPollRef.current) { clearInterval(chatPollRef.current); chatPollRef.current = null; }
          if (formationPollRef.current) { clearInterval(formationPollRef.current); formationPollRef.current = null; }
          if (lobbyStatusPollRef.current) { clearInterval(lobbyStatusPollRef.current); lobbyStatusPollRef.current = null; }

          // Kick user back to lobby list with explanation
          alert('Your match lobby was cancelled — another group filled their spots first. Your entry fee has been refunded to your wallet.');
          setMatchJoined(false);
          setSelectedLobby(null);
          setMatchPhase('RECRUITING');
          setAssignedPositions({});
          await fetchLobbies();
        }
      } catch {
        // Non-critical — keep polling
      }
    }, 5000);
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

    const homeCount = Object.keys(assignedPositions).filter(k => k.startsWith('a-')).length;
    const awayCount = Object.keys(assignedPositions).filter(k => k.startsWith('b-')).length;

    if (selectedLobby.isTeamMatch) {
      // Team match: both sides must have players
      if (homeCount > 0 && awayCount > 0) {
        handleFinalConfirmChallenge();
      }
    } else {
      // Quick play: both sides full (11 each = 22 total)
      if (homeCount === 11 && awayCount === 11) {
        handleFinalConfirmChallenge();
      }
    }
  }, [assignedPositions, matchPhase, selectedLobby]);

  const enterLobby = async (lobby: MatchLobby, isHost: boolean = false, mode: MatchMode = 'QUICK_PLAY') => {
    console.log('[Matchmaking] enterLobby:', lobby.id, 'isHost:', isHost);
    setSelectedLobby(lobby);
    setMatchJoined(true);
    setMatchMode(mode);
    setAssignedPositions({}); // Start empty — real data loads from API below
    setLobbyMessages([{ id: 'sys1', sender: 'Arena Bot', text: `Connected to ${lobby.fieldName}.`, time: 'Now', isMe: false }]);

    // Try to join lobby via API (for existing lobbies, quick play only)
    if (!isHost && !lobby.isTeamMatch && lobby.id && !lobby.id.startsWith('l-')) {
      try {
        await apiJoinLobby(lobby.id);
      } catch {
        // Already joined or lobby full — continue with UI
      }
    }

    if (lobby.id && !lobby.id.startsWith('l-')) {
      // Load real formation from DB
      await loadFormation(lobby.id);
      startFormationPolling(lobby.id);
      // Load chat history and start polling
      await fetchChatMessages(lobby.id);
      startChatPolling(lobby.id);
      // Poll lobby status to detect external cancellation (competing lobby won)
      startLobbyStatusPolling(lobby.id);
    }

    setMatchPhase(lobby.isConfirmed ? 'CONFIRMED' : 'RECRUITING');
  };

  const startHostingFlow = (mode: MatchMode) => {
    if (mode === 'TEAM_VS_TEAM' && userRole !== 'CAPTAIN') {
      alert("Only registered Captains can host a Teams vs Teams match.");
      return;
    }
    setMatchMode(mode);
    setIsCreating(true);

    // Fetch real API fields so lobby creation uses DB field IDs
    console.log('[Matchmaking] Fetching API fields for hosting...');
    getFields().then(data => {
      const mapped = data.fields.map(f => ({
        id: f.id,
        name: f.name,
        location: f.location,
        pricePerPlayer: f.pricePerSlot,
      }));
      console.log('[Matchmaking] API fields loaded:', mapped.length);
      setHostingFields(mapped);
    }).catch(err => {
      console.warn('[Matchmaking] Failed to fetch API fields, using prop fields:', err);
      setHostingFields([]);
    });
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

  const selectDateTime = (date: string, time: string) => {
    // Create a local draft lobby — the API creation happens in handlePostMatch
    const fullLobby: MatchLobby = {
      ...draftLobby,
      id: `l-${Date.now()}`,
      date,
      startTime: time,
      createdBy: userProfile.id,
      teamName: matchMode === 'TEAM_VS_TEAM' ? userTeam?.name : undefined,
    } as MatchLobby;
    setIsSelectingDateTime(false);
    enterLobby(fullLobby, true, matchMode);
  };

  const handlePostMatch = async () => {
    if (!selectedLobby) return;
    console.log('[Matchmaking] handlePostMatch — fieldId:', selectedLobby.fieldId, 'date:', selectedLobby.date, 'time:', selectedLobby.startTime);

    if (selectedLobby.isTeamMatch) {
      if (teamWallet.balance < 550) {
        alert("Team Wallet balance insufficient (R550 required).");
        return;
      }
      if (!selectedLobby.fieldId) {
        alert('No field selected. Please restart the hosting flow and select a venue.');
        return;
      }
      try {
        await apiCreateLobby({
          fieldId: selectedLobby.fieldId,
          date: selectedLobby.date,
          timeSlot: selectedLobby.startTime,
          intensity: selectedLobby.intensity || 'Casual',
          maxPlayers: 22,
          feePerPlayer: 50,
          teamId: userTeam?.id,
        });
        onDeductFromTeamWallet(550);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Failed to post team match';
        alert(`Could not post team match: ${msg}`);
        return;
      }
    } else {
      // POST lobby to API — this persists it in the database
      if (!selectedLobby.fieldId) {
        alert('No field selected. Please restart the hosting flow and select a venue.');
        return;
      }
      console.log('[Matchmaking] Calling POST /api/lobbies...');
      try {
        const res = await apiCreateLobby({
          fieldId: selectedLobby.fieldId,
          date: selectedLobby.date,
          timeSlot: selectedLobby.startTime,
          intensity: selectedLobby.intensity || 'Casual',
          maxPlayers: 22,
          feePerPlayer: 50,
        });
        console.log('[Matchmaking] Lobby created in DB:', res.lobby.id, 'status:', res.lobby.status);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Failed to post match to lobby';
        console.error('[Matchmaking] POST /api/lobbies error:', msg);
        alert(`Could not post match: ${msg}`);
        return; // Stay on the lobby screen — don't close
      }
    }

    // Stop polling
    if (chatPollRef.current) { clearInterval(chatPollRef.current); chatPollRef.current = null; }
    if (formationPollRef.current) { clearInterval(formationPollRef.current); formationPollRef.current = null; }

    // Go back to lobby list
    setMatchJoined(false);
    setSelectedLobby(null);

    // Refresh list — the newly created lobby should now appear
    console.log('[Matchmaking] Refreshing lobby list after posting...');
    await fetchLobbies();
  };

  const handlePositionClick = (id: string) => {
    if (matchPhase === 'CONFIRMED' || assignedPositions[id]) return;

    // Team matches: positions auto-fill via accept-challenge; no individual clicking
    if (selectedLobby?.isTeamMatch) return;

    setPaymentPendingId(id);
    setPaymentStep('IDLE');
    setShowPaymentModal(true);
  };

  const handleAcceptChallenge = () => {
    if (userRole !== 'CAPTAIN') {
      alert('Only a team captain can accept a challenge.');
      return;
    }
    setPaymentPendingId('TEAM_B_CHALLENGE');
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
      // Team challenge: accept challenge via API, auto-fills AWAY from challenger's team
      if (teamWallet.balance < 550) {
        alert('Insufficient team funds (R550 required).');
        setShowPaymentModal(false);
        setPaymentStep('IDLE');
        return;
      }

      try {
        const result = await acceptLobbyChallenge(selectedLobby.id);
        onDeductFromTeamWallet(550);

        // Map returned formation to assignedPositions
        const positions: Record<string, string> = {};
        result.home.forEach(p => {
          const slotId = HOME_IDS[p.positionIndex];
          if (slotId) positions[slotId] = p.user.fullName;
        });
        result.away.forEach(p => {
          const slotId = AWAY_IDS[p.positionIndex];
          if (slotId) positions[slotId] = p.user.fullName;
        });
        setAssignedPositions(positions);

        setChallengerTeamName(result.challengerTeamName);
        setPaymentStep('SUCCESS');
        setTimeout(() => {
          setShowPaymentModal(false);
          setPaymentStep('IDLE');
          if (result.status === 'CONFIRMED') {
            setMatchPhase('CONFIRMED');
            setSelectedLobby(prev => prev ? { ...prev, isConfirmed: true } : prev);
          }
          fetchLobbies();
        }, 1000);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Failed to accept challenge';
        alert(msg);
        setShowPaymentModal(false);
        setPaymentStep('IDLE');
      }
    } else if (paymentPendingId && selectedLobby) {
      // Quick Play: pay entry fee, then claim the clicked position
      const lobbyId = selectedLobby.id;
      const posInfo = POSITION_INFO[paymentPendingId];

      // Check balance
      try {
        const walletData = await getMyWallet();
        if (walletData.wallet.balance < selectedLobby.price) {
          alert(`Insufficient funds. Balance: R${walletData.wallet.balance.toFixed(2)}, Required: R${selectedLobby.price.toFixed(2)}`);
          setShowPaymentModal(false);
          setPaymentStep('IDLE');
          return;
        }
      } catch {
        // Proceed; server rejects if truly insufficient
      }

      try {
        await apiPayLobby(lobbyId);

        // Claim the specific position clicked
        if (posInfo) {
          try {
            const result = await pickLobbyPosition(lobbyId, {
              teamSide: posInfo.teamSide,
              positionOnField: posInfo.label,
              positionIndex: posInfo.positionIndex,
            });
            // Use returned formation data for accurate render
            const positions: Record<string, string> = {};
            result.home.forEach(p => {
              const slotId = HOME_IDS[p.positionIndex];
              if (slotId) positions[slotId] = p.user.fullName;
            });
            result.away.forEach(p => {
              const slotId = AWAY_IDS[p.positionIndex];
              if (slotId) positions[slotId] = p.user.fullName;
            });
            setAssignedPositions(positions);
          } catch {
            // Slot taken or error — reload formation to show current state
            await loadFormation(lobbyId);
          }
        }

        await refreshWallet();
        setPaymentStep('SUCCESS');
        setTimeout(() => {
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

  const handleReportResults = async (scoreHome: number, scoreAway: number, players: { name: string; team: 'HOME' | 'AWAY'; goals: number; assists: number }[]): Promise<boolean> => {
    if (!selectedLobby || selectedLobby.id.startsWith('l-')) return false;

    try {
      await completeMatch({
        lobbyId: selectedLobby.id,
        scoreHome,
        scoreAway,
        players: players.map(p => ({
          userId: p.name, // Server will resolve by name or use as identifier
          teamSide: p.team,
          goals: p.goals,
          assists: p.assists,
        })),
      });

      // Stop polling
      if (chatPollRef.current) { clearInterval(chatPollRef.current); chatPollRef.current = null; }
      if (formationPollRef.current) { clearInterval(formationPollRef.current); formationPollRef.current = null; }
      if (lobbyStatusPollRef.current) { clearInterval(lobbyStatusPollRef.current); lobbyStatusPollRef.current = null; }

      // Refresh wallet and lobbies
      await refreshWallet();
      await fetchLobbies();

      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to post match results';
      alert(msg);
      return false;
    }
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
      onPostMatch={handlePostMatch}
      onAcceptChallenge={handleAcceptChallenge}
      onReportResults={handleReportResults}
      showPaymentModal={showPaymentModal}
      setShowPaymentModal={setShowPaymentModal}
      onProcessPayment={handleProcessPayment}
      paymentStep={paymentStep}
      lobbies={activeLobbies}
      fields={hostingFields.length > 0 ? hostingFields : fields}
      onEnterLobby={enterLobby}
      onStartHosting={startHostingFlow}
      onSelectVenue={selectVenue}
      onSelectDateTime={selectDateTime}
      userRole={userRole}
      teamWallet={teamWallet}
      currentUserId={userProfile.id}
      userTeamId={userTeam?.id}
      challengerTeamName={challengerTeamName}
    />
  );
};
