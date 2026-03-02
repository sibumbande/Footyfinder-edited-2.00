
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayerDashboardUI } from '../components/PlayerDashboardUI';
import { UserProfileData, Team, TeamWallet, PlayerPosition } from '../../../types';
import { getMyTeam, getTeamTransactions } from '../../../frontend/api';
import { Loader2 } from 'lucide-react';

interface PlayerDashboardProps {
  isFormationLocked: boolean;
  assignedPlayers: Record<string, string>;
  currentPoints: Array<{ id: string; label: string; x: number; y: number }>;
  squadPool?: { id: string; name: string; role: string; avatar?: string }[];
  messages: any[];
  onSendMessage: (text: string) => void;
  userProfile: UserProfileData;
  userTeam: Team;
  teamWallet: TeamWallet;
  onContributeToTeam: (amount: number) => void;
  onTeamUpdated?: (team: Team) => void;
}

export const PlayerDashboard: React.FC<PlayerDashboardProps> = ({
  messages,
  onSendMessage,
  onTeamUpdated,
  ...props
}) => {
  const teamId = props.userTeam?.id;
  const [activeTab, setActiveTab] = useState<'match' | 'comms'>('match');
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [teamTransactions, setTeamTransactions] = useState<{
    id: string; amount: number; contributorName: string; createdAt: string;
  }[]>([]);

  // Fetch fresh team data from API on mount (or when active team changes)
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyTeam(teamId);
      if (onTeamUpdated) {
        const apiTeam: Team = {
          id: data.team.id,
          name: data.team.name,
          homeColor: data.team.primaryColor || '#2563eb',
          awayColor: data.team.secondaryColor || '#ef4444',
          members: data.members.map(m => ({
            id: m.id,
            fullName: m.fullName,
            position: (m.position || 'Midfielder') as PlayerPosition,
            avatar: m.avatarUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='100' r='45' fill='%23CBD5E1'/%3E%3Ccircle cx='50' cy='35' r='22' fill='%23CBD5E1'/%3E%3C/svg%3E",
          })),
          wallet: { balance: data.wallet.balance, contributions: [] },
          motto: data.team.motto || undefined,
          createdAt: data.team.createdAt || undefined,
        };
        onTeamUpdated(apiTeam);
      }
    } catch {
      // Fall back to prop data
    } finally {
      setLoading(false);
    }
  }, [onTeamUpdated, teamId]);

  useEffect(() => {
    fetchData();
    getTeamTransactions(teamId)
      .then(data => setTeamTransactions(data.transactions))
      .catch(() => {});
  }, [fetchData, teamId]);

  useEffect(() => {
    if (activeTab === 'comms') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage('');
  };

  if (loading && !props.userTeam) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center md:pt-20">
        <Loader2 size={40} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <PlayerDashboardUI
      {...props}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      messages={messages}
      newMessage={newMessage}
      setNewMessage={setNewMessage}
      onSendMessage={handleSendMessage}
      chatEndRef={chatEndRef}
      teamTransactions={teamTransactions}
    />
  );
};
