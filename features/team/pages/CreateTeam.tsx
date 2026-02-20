
import React, { useState } from 'react';
import { SoccerProfile, Team } from '../../../types';
import { CreateTeamUI, KIT_COLORS } from '../components/CreateTeamUI';
import { Loader2, CheckCircle2, Shield, AlertCircle } from 'lucide-react';
import { createTeam as apiCreateTeam, ApiError } from '../../../frontend/api';

interface CreateTeamProps {
  friends: SoccerProfile[];
  onCreateTeam: (team: Team) => void;
  onNavigateToSocial: () => void;
}

export const CreateTeam: React.FC<CreateTeamProps> = ({ friends, onCreateTeam, onNavigateToSocial }) => {
  const [teamName, setTeamName] = useState('');
  const [homeColor, setHomeColor] = useState(KIT_COLORS[0].hex);
  const [awayColor, setAwayColor] = useState(KIT_COLORS[1].hex);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const toggleMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!teamName.trim()) {
      setError("Please enter a team name.");
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const res = await apiCreateTeam({
        name: teamName,
        primaryColor: homeColor,
        secondaryColor: awayColor,
      });

      setIsSaving(false);
      setIsSuccess(true);

      // Build local Team object from API response + selected friends
      const team: Team = {
        id: res.team.id,
        name: res.team.name,
        homeColor: res.team.primaryColor || homeColor,
        awayColor: res.team.secondaryColor || awayColor,
        members: friends.filter(f => selectedMembers.includes(f.id)),
        wallet: { balance: res.wallet.balance, contributions: [] }
      };

      // Navigate to team profile after delay
      setTimeout(() => {
        onCreateTeam(team);
      }, 2000);
    } catch (err) {
      setIsSaving(false);
      setError(err instanceof ApiError ? err.message : 'Failed to create team. Please try again.');
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center animate-fade-in font-inter">
        <div className="bg-white rounded-[64px] p-20 shadow-3xl max-w-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-4 bg-emerald-500"></div>
          <div className="w-32 h-32 bg-emerald-100 text-emerald-600 rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-xl animate-bounce">
            <CheckCircle2 size={64} strokeWidth={2.5} />
          </div>
          <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 mb-6 leading-none">Team Registered!</h2>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest leading-relaxed mb-12 px-6">
            The {teamName} identity has been locked in. Redirecting to your team profile...
          </p>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-50"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pt-20 font-inter animate-fade-in relative">
      {isSaving && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xl flex flex-col items-center justify-center text-white">
           <div className="relative">
              <Loader2 size={80} className="animate-spin text-blue-500 mb-8" />
              <div className="absolute inset-0 flex items-center justify-center">
                 <Shield size={24} className="text-white" />
              </div>
           </div>
           <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Saving Team Identity</h3>
           <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Registering {teamName} to FootyFinder Servers</p>
        </div>
      )}

      {error && (
        <div className="max-w-5xl mx-auto px-4 pt-4 md:pt-24">
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 mb-4">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-xs font-bold text-red-600">{error}</p>
          </div>
        </div>
      )}

      <CreateTeamUI
        teamName={teamName}
        setTeamName={setTeamName}
        homeColor={homeColor}
        setHomeColor={setHomeColor}
        awayColor={awayColor}
        setAwayColor={setAwayColor}
        friends={friends}
        selectedMembers={selectedMembers}
        toggleMember={toggleMember}
        onNavigateToSocial={onNavigateToSocial}
        handleCreate={handleCreate}
        isSaving={isSaving}
      />
    </div>
  );
};
