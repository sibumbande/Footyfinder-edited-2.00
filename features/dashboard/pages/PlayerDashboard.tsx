
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayerDashboardUI } from '../components/PlayerDashboardUI';
import { UserProfileData, Team, TeamWallet, PlayerPosition } from '../../../types';
import { getMyTeam } from '../../../frontend/api';
import { Loader2 } from 'lucide-react';

interface PlayerDashboardProps {
  isFormationLocked: boolean;
  assignedPlayers: Record<string, string>;
  currentPoints: Array<{ id: string; label: string; x: number; y: number }>;
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
  const [activeTab, setActiveTab] = useState<'match' | 'comms'>('match');
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  // Fetch fresh team data from API on mount
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyTeam();
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
            avatar: m.avatarUrl || 'https://picsum.photos/seed/' + m.id + '/200',
          })),
          wallet: { balance: data.wallet.balance, contributions: [] },
        };
        onTeamUpdated(apiTeam);
      }
    } catch {
      // Fall back to prop data
    } finally {
      setLoading(false);
    }
  }, [onTeamUpdated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    />
  );
};
