
import React, { useState, useEffect, useCallback } from 'react';
import { Team, PlayerPosition } from '../../../types';
import { TeamProfileUI } from '../components/TeamProfileUI';
import { getMyTeam } from '../../../frontend/api';
import { Loader2 } from 'lucide-react';

interface TeamProfileProps {
  team: Team | null;
  onNavigateToDashboard: () => void;
  onTeamUpdated?: (team: Team) => void;
}

export const TeamProfile: React.FC<TeamProfileProps> = ({ team: propTeam, onNavigateToDashboard, onTeamUpdated }) => {
  const [team, setTeam] = useState<Team | null>(propTeam);
  const [loading, setLoading] = useState(false);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyTeam();
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
      setTeam(apiTeam);
      onTeamUpdated?.(apiTeam);
    } catch {
      // Fall back to prop team on error
    } finally {
      setLoading(false);
    }
  }, [onTeamUpdated]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  if (loading && !team) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pt-20 font-inter">
      <TeamProfileUI team={team} onDashboard={onNavigateToDashboard} />
    </div>
  );
};
