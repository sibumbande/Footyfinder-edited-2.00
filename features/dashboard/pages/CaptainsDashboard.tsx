
import React, { useEffect, useCallback, useState } from 'react';
import { CaptainsDashboardUI } from '../components/CaptainsDashboardUI';
import { TeamWallet, Team, UserProfileData, SoccerProfile, PlayerPosition } from '../../../types';
import { getMyTeam } from '../../../frontend/api';
import { Loader2 } from 'lucide-react';

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

interface CaptainsDashboardProps {
  assignedPlayers: Record<string, string>;
  setAssignedPlayers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  currentPoints: FormationPoint[];
  setCurrentPoints: React.Dispatch<React.SetStateAction<FormationPoint[]>>;
  squadPool: Player[];
  setSquadPool: React.Dispatch<React.SetStateAction<Player[]>>;
  teamWallet: TeamWallet;
  onFundTeamWallet: (amount: number) => void;
  onReportResult?: (lobby: any) => void;
  userTeam?: Team;
  userProfile: UserProfileData;
  friends: SoccerProfile[];
  messages: any[];
  onSendMessage: (text: string) => void;
  onTeamUpdated?: (team: Team) => void;
}

export const CaptainsDashboard: React.FC<CaptainsDashboardProps> = (props) => {
  const { squadPool, setSquadPool, assignedPlayers, setAssignedPlayers, onTeamUpdated } = props;
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

  const handleAddMember = (name: string) => {
    const newPlayer: Player = {
      id: Date.now().toString(),
      name: name,
      role: 'Player'
    };
    setSquadPool(prev => [...prev, newPlayer]);
  };

  const handleAddFriendToSquad = (friend: SoccerProfile) => {
    const alreadyInPool = squadPool.some(p => p.id === friend.id || p.name === friend.fullName);
    if (alreadyInPool) return;

    const newPlayer: Player = {
      id: friend.id,
      name: friend.fullName,
      role: friend.position,
      avatar: friend.avatar
    };
    setSquadPool(prev => [...prev, newPlayer]);
  };

  const handleRemoveMember = (id: string) => {
    const playerToRemove = squadPool.find(p => p.id === id);
    if (!playerToRemove) return;

    const newAssignments = { ...assignedPlayers };
    Object.keys(newAssignments).forEach(key => {
      if (newAssignments[key] === playerToRemove.name) {
        delete newAssignments[key];
      }
    });

    setAssignedPlayers(newAssignments);
    setSquadPool(prev => prev.filter(p => p.id !== id));
  };

  if (loading && !props.userTeam) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center md:pt-20">
        <Loader2 size={40} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <CaptainsDashboardUI
      {...props}
      onAddMember={handleAddMember}
      onAddFriendToSquad={handleAddFriendToSquad}
      onRemoveMember={handleRemoveMember}
    />
  );
};
