
import React, { useState, useEffect, useCallback } from 'react';
import { Users, Shield } from 'lucide-react';
import { Login, CreateProfile } from './features/auth';
import { Home } from './features/home';
import { Profile } from './features/profile';
import { Matchmaking, PostMatchReport } from './features/matchmaking';
import { Training } from './features/training';
import { CaptainsDashboard, PlayerDashboard } from './features/dashboard';
import { CreateTeam, TeamProfile } from './features/team';
import { Social } from './features/social';
import { Navigation } from './components/shared/ui/Navigation';
import { MatchLobby, MatchRecord, UserProfileData, UserWallet, FitnessLevel, PlayerPosition, TeamWallet, Team, SoccerProfile, PracticeSession, FieldListing } from './types';
import { seedDatabase } from './services/seed';
import { walletService } from './services';
import { isLoggedIn as checkIsLoggedIn, logout as apiLogout, getMe, getMyTeam, contributeToTeam as apiContributeToTeam, getMyWallet } from './frontend/api';

const DEFAULT_POINTS = [
  { id: 'gk', label: 'GK', x: 50, y: 90 },
  { id: 'lb', label: 'LB', x: 15, y: 70 }, { id: 'cb1', label: 'CB', x: 38, y: 75 }, { id: 'cb2', label: 'CB', x: 62, y: 75 }, { id: 'rb', label: 'RB', x: 85, y: 70 },
  { id: 'cm1', label: 'CM', x: 30, y: 50 }, { id: 'cdm', label: 'CDM', x: 50, y: 55 }, { id: 'cm2', label: 'CM', x: 70, y: 50 },
  { id: 'lw', label: 'LW', x: 20, y: 25 }, { id: 'st', label: 'ST', x: 50, y: 15 }, { id: 'rw', label: 'RW', x: 80, y: 25 }
];

const App: React.FC = () => {
  // Initialize data store from seed (replaces all MOCK_* constants)
  const [seedData] = useState(() => seedDatabase());

  const [currentPage, setCurrentPage] = useState<'login' | 'home' | 'create-profile' | 'profile' | 'matchmaking' | 'dashboard' | 'training' | 'post-match-report' | 'create-team' | 'team-profile' | 'social'>('login');
  const [navigationParams, setNavigationParams] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [userProfile, setUserProfile] = useState<UserProfileData>({
    id: '',
    fullName: '',
    dateOfBirth: '',
    position: '' as any,
    fitnessLevel: '' as any,
    yearsPlaying: 0,
    facePhoto: null,
    idPhoto: null,
    avatar: '',
    wallet: { balance: 0, escrow: 0, transactions: [] },
    stats: {
      goals: 0,
      assists: 0,
      matchesPlayed: 0
    },
    friends: []
  } as any);

  // Restore session on app load
  useEffect(() => {
    const restoreSession = async () => {
      if (!checkIsLoggedIn()) {
        setSessionLoading(false);
        return;
      }

      try {
        const data = await getMe();
        const user = data.user;
        setUserProfile(prev => ({
          ...prev,
          id: user.id,
          fullName: user.fullName,
          position: (user.position || '') as any,
          fitnessLevel: (user.fitnessLevel || '') as any,
          avatar: user.avatarUrl || '',
          wallet: { balance: data.wallet.balance, escrow: data.wallet.escrow, transactions: [] },
        }));
        setIsLoggedIn(true);
        setCurrentPage('home');

        // Also restore team data if user is in a team
        if (data.team) {
          try {
            const teamData = await getMyTeam();
            const apiTeam: Team = {
              id: teamData.team.id,
              name: teamData.team.name,
              homeColor: teamData.team.primaryColor || '#2563eb',
              awayColor: teamData.team.secondaryColor || '#ef4444',
              members: teamData.members.map(m => ({
                id: m.id,
                fullName: m.fullName,
                position: (m.position || 'Midfielder') as PlayerPosition,
                avatar: m.avatarUrl || 'https://picsum.photos/seed/' + m.id + '/200',
              })),
              wallet: { balance: teamData.wallet.balance, contributions: [] },
            };
            setUserTeam(apiTeam);
            // Set role based on team membership
            const myRole = teamData.members.find(m => m.id === user.id)?.role;
            setUserRole(myRole === 'CAPTAIN' ? 'CAPTAIN' : 'PLAYER');
            setTeamWallet(prev => ({ ...prev, balance: teamData.wallet.balance }));
          } catch {
            // No team or fetch failed — that's fine
          }
        }
      } catch {
        // Token invalid/expired — stay on login
        apiLogout();
      } finally {
        setSessionLoading(false);
      }
    };

    restoreSession();
  }, []);

  const [userRole, setUserRole] = useState<'PLAYER' | 'CAPTAIN'>('PLAYER');
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [userTeam, setUserTeam] = useState<Team | null>(null);

  const [teamWallet, setTeamWallet] = useState<TeamWallet>({
    balance: 1200,
    contributions: [
      { memberId: 'm1', name: 'Siya Kolisi', amount: 500 },
      { memberId: 'm2', name: 'Thabo Mokoena', amount: 300 },
      { memberId: 'm3', name: 'Bongi Mbonambi', amount: 400 },
    ]
  });

  const [fields] = useState<FieldListing[]>(seedData.fields);
  const [activeLobbies, setActiveLobbies] = useState<MatchLobby[]>(seedData.lobbies);
  const [trainingSessions, setTrainingSessions] = useState<PracticeSession[]>(seedData.practiceSessions);
  const [generalSquadAssigned, setGeneralSquadAssigned] = useState<Record<string, string>>({
    'st': 'Siya Kolisi',
    'cm1': 'Thabo Mokoena',
    'cb1': 'Bongi Mbonambi'
  });
  const [generalSquadPoints, setGeneralSquadPoints] = useState(DEFAULT_POINTS);
  const [squadPool, setSquadPool] = useState(seedData.squadPool);

  const [teamMessages, setTeamMessages] = useState<any[]>(seedData.captainMessages.map(m => ({
    id: m.id,
    senderId: m.senderId,
    senderName: m.senderName,
    text: m.text,
    timestamp: m.timestamp
  })));

  const navigate = (page: any, params?: any) => {
    if (page === 'matchmaking') {
      setNavigationParams({ ...params, resetKey: Date.now() });
    } else {
      setNavigationParams(params || null);
    }
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const applyAuthUser = (user: { id: string; email?: string; username?: string; fullName: string; position: string | null; fitnessLevel: string | null; city?: string | null }) => {
    setUserProfile(prev => ({
      ...prev,
      id: user.id,
      fullName: user.fullName,
      position: (user.position || '') as any,
      fitnessLevel: (user.fitnessLevel || '') as any,
    }));
    setIsLoggedIn(true);
  };

  const handleLoginSuccess = (user: { id: string; email: string; username: string; fullName: string; position: string | null; fitnessLevel: string | null; city: string | null }) => {
    applyAuthUser(user);
    navigate('home');
  };

  const handleLogout = () => {
    apiLogout();
    setIsLoggedIn(false);
    navigate('login');
  };

  const handleProfileCreated = (user: { id: string; email: string; username: string; fullName: string; position: string | null; fitnessLevel: string | null; city: string | null }) => {
    applyAuthUser(user);
    navigate('home');
  };

  const handleSaveMatchRecord = (record: MatchRecord) => {
    setMatchHistory(prev => [record, ...prev]);
    const myStats = record.scorers.find(s => s.playerId === userProfile.id);
    const myAssists = record.assisters.find(s => s.playerId === userProfile.id);
    setUserProfile(prev => ({
      ...prev,
      stats: {
        goals: prev.stats.goals + (myStats?.goals || 0),
        assists: prev.stats.assists + (myAssists?.assists || 0),
        matchesPlayed: prev.stats.matchesPlayed + 1
      }
    }));
    navigate('dashboard');
  };

  const handleUpdateUserWallet = (wallet: UserWallet) => {
    setUserProfile(prev => ({ ...prev, wallet }));
  };

  const handleLoadFunds = (amount: number, updatedWallet?: { balance: number; escrow: number }) => {
    if (updatedWallet) {
      // API-sourced wallet data — sync React state
      setUserProfile(prev => ({
        ...prev,
        wallet: { ...prev.wallet, balance: updatedWallet.balance, escrow: updatedWallet.escrow },
      }));
    } else {
      // Fallback to local walletService
      walletService.loadFunds(userProfile.id, amount);
      const localWallet = walletService.getWallet(userProfile.id);
      handleUpdateUserWallet(localWallet);
    }
  };

  const handleFundTeamWallet = (amount: number) => {
    setTeamWallet(prev => ({
      ...prev,
      balance: prev.balance + amount,
      contributions: [...prev.contributions, { memberId: userProfile.id, name: userProfile.fullName, amount }]
    }));
  };

  const handleContributeToTeam = async (amount: number) => {
    if (userTeam) {
      try {
        const res = await apiContributeToTeam(userTeam.id, amount);
        // Sync personal wallet from API response
        setUserProfile(prev => ({
          ...prev,
          wallet: { ...prev.wallet, balance: res.userWallet.balance },
        }));
        // Sync team wallet from API response
        setTeamWallet(prev => ({
          ...prev,
          balance: res.teamWallet.balance,
          contributions: [...prev.contributions, { memberId: userProfile.id, name: userProfile.fullName, amount }],
        }));
        setUserTeam(prev => prev ? { ...prev, wallet: { ...prev.wallet, balance: res.teamWallet.balance } } : prev);
      } catch (err: any) {
        alert(err.message || "Insufficient personal wallet balance.");
        return;
      }
    } else {
      // Fallback to local walletService when no team in API
      try {
        walletService.directDebit(userProfile.id, amount, 'Team treasury contribution');
        const updatedWallet = walletService.getWallet(userProfile.id);
        handleUpdateUserWallet(updatedWallet);
      } catch (err: any) {
        alert(err.message || "Insufficient personal wallet balance.");
        return;
      }
      handleFundTeamWallet(amount);
    }

    const systemMsg = {
      id: `sys-${Date.now()}`,
      senderId: 'system',
      senderName: 'Squad Notification',
      text: `${userProfile.fullName} contributed R${amount} to the team treasury!`,
      timestamp: 'Just now',
      isSystem: true
    };
    setTeamMessages(prev => [...prev, systemMsg]);
  };

  const handleTeamUpdated = useCallback((team: Team) => {
    setUserTeam(team);
    setTeamWallet(prev => ({ ...prev, balance: team.wallet.balance }));
  }, []);

  const handleSendMessage = (text: string) => {
    const msg = {
      id: Date.now().toString(),
      senderId: 'me',
      senderName: userProfile.fullName,
      text: text,
      timestamp: 'Just now'
    };
    setTeamMessages(prev => [...prev, msg]);
  };

  const handleAddFriend = (profile: SoccerProfile) => {
    setUserProfile(prev => ({
      ...prev,
      friends: [...prev.friends, profile]
    }));
  };

  const handleRemoveFriend = (id: string) => {
    setUserProfile(prev => ({
      ...prev,
      friends: prev.friends.filter(f => f.id !== id)
    }));
  };

  const handleCreateTeam = (team: Team) => {
    setUserTeam(team);
    setUserRole('CAPTAIN');
    const newSquad = team.members.map(m => ({ id: m.id, name: m.fullName, role: m.position as string }));
    setSquadPool(prev => [...prev, ...newSquad.filter(n => !prev.some(p => p.id === n.id))]);
    
    const welcomeMsg = {
      id: `sys-welcome-${Date.now()}`,
      senderId: 'system',
      senderName: 'Manager',
      text: `Team ${team.name} has been established! Welcome to the squad. 🏟️`,
      timestamp: 'Now',
      isSystem: true
    };
    setTeamMessages([welcomeMsg]);
    
    // After creation, navigate to the team profile
    navigate('team-profile');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <Login onLoginSuccess={handleLoginSuccess} onNavigateToSignup={() => navigate('create-profile')} />;
      case 'create-profile':
        return <CreateProfile onProfileCreated={handleProfileCreated} onCancel={() => navigate(isLoggedIn ? 'home' : 'login')} />;
      case 'home':
        return <Home onNavigate={navigate} activeLobbies={activeLobbies} fields={fields} />;
      case 'profile':
        return <Profile userProfile={userProfile} matchHistory={matchHistory} onLoadFunds={handleLoadFunds} />;
      case 'matchmaking':
        return (
          <Matchmaking
            resetKey={navigationParams?.resetKey}
            autoJoinLobby={navigationParams?.autoJoinLobby}
            onConfirmed={(lobby, squad) => navigate('post-match-report', { lobby, squad })}
            savedSquadAssignments={generalSquadAssigned}
            squadPool={squadPool}
            activeLobbies={activeLobbies}
            onUpdateLobbies={setActiveLobbies}
            userRole={userRole}
            teamWallet={teamWallet}
            onDeductFromTeamWallet={(amount) => setTeamWallet(prev => ({ ...prev, balance: prev.balance - amount }))}
            userProfile={userProfile}
            onUpdateUserWallet={handleUpdateUserWallet}
            fields={fields}
          />
        );
      case 'training':
        return (
          <Training
            sessions={trainingSessions}
            onUpdateSessions={setTrainingSessions}
            userProfile={userProfile}
            onUpdateUserWallet={handleUpdateUserWallet}
          />
        );
      case 'post-match-report':
        return (
          <PostMatchReport 
            lobby={navigationParams?.lobby} 
            squad={navigationParams?.squad || []}
            onSave={handleSaveMatchRecord}
            onCancel={() => navigate('dashboard')}
          />
        );
      case 'create-team':
        return (
          <CreateTeam 
            friends={userProfile.friends} 
            onCreateTeam={handleCreateTeam} 
            onNavigateToSocial={() => navigate('social')} 
          />
        );
      case 'team-profile':
        return <TeamProfile team={userTeam} onNavigateToDashboard={() => navigate('dashboard')} onTeamUpdated={handleTeamUpdated} />;
      case 'social':
        return (
          <Social
            friends={userProfile.friends}
            onAddFriend={handleAddFriend}
            onRemoveFriend={handleRemoveFriend}
            allProfiles={seedData.profiles}
          />
        );
      case 'dashboard':
        if (!userTeam) {
          return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center animate-fade-in font-inter">
               <div className="bg-white rounded-[64px] p-16 border border-slate-100 shadow-3xl max-w-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-3 bg-blue-600"></div>
                  <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-lg relative z-10">
                     <Users size={48} />
                  </div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 mb-6 leading-none relative z-10">Assemble Your Squad</h2>
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest leading-relaxed mb-12 relative z-10 px-4">
                    Tired of joining random lobbies? Build your own team identity, recruit friends, and compete in Team vs Team challenges.
                  </p>
                  <button 
                    onClick={() => navigate('create-team')}
                    className="w-full py-6 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-blue-600 transition-all active:scale-95 relative z-10"
                  >
                     Build My Team Identity
                  </button>
                  <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
               </div>
            </div>
          );
        }

        if (userRole === 'CAPTAIN') {
           return (
            <CaptainsDashboard
              assignedPlayers={generalSquadAssigned}
              setAssignedPlayers={setGeneralSquadAssigned}
              currentPoints={generalSquadPoints}
              setCurrentPoints={setGeneralSquadPoints}
              squadPool={squadPool}
              setSquadPool={setSquadPool}
              teamWallet={teamWallet}
              onFundTeamWallet={handleContributeToTeam}
              onReportResult={(lobby) => navigate('post-match-report', { lobby })}
              userTeam={userTeam}
              userProfile={userProfile}
              friends={userProfile.friends}
              messages={teamMessages}
              onSendMessage={handleSendMessage}
              onTeamUpdated={handleTeamUpdated}
            />
          );
        }
        return (
          <PlayerDashboard
            isFormationLocked={true}
            assignedPlayers={generalSquadAssigned}
            currentPoints={generalSquadPoints}
            messages={teamMessages}
            onSendMessage={handleSendMessage}
            userProfile={userProfile}
            userTeam={userTeam}
            teamWallet={teamWallet}
            onContributeToTeam={handleContributeToTeam}
            onTeamUpdated={handleTeamUpdated}
          />
        );
      default:
        return <Login onLoginSuccess={handleLoginSuccess} onNavigateToSignup={() => navigate('create-profile')} />;
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="antialiased text-gray-900 bg-gray-50 min-h-screen">
      {isLoggedIn && currentPage !== 'create-profile' && currentPage !== 'post-match-report' && (
        <Navigation 
          activeTab={currentPage} 
          onNavigate={(page) => navigate(page as any)}
          onLogout={handleLogout}
        />
      )}
      
      {isLoggedIn && (currentPage === 'dashboard' || currentPage === 'matchmaking' || currentPage === 'team-profile') && userTeam && (
        <div className="fixed bottom-24 right-6 z-[100] flex flex-col gap-2">
           <p className="text-[10px] font-black uppercase text-slate-400 text-right mr-2">Role Switcher</p>
           <div className="bg-white p-1 rounded-2xl shadow-2xl border border-slate-100 flex gap-1">
              <button onClick={() => setUserRole('PLAYER')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${userRole === 'PLAYER' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Player</button>
              <button onClick={() => setUserRole('CAPTAIN')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${userRole === 'CAPTAIN' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Captain</button>
           </div>
        </div>
      )}

      <main>{renderPage()}</main>
    </div>
  );
};

export default App;
