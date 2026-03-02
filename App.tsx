
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Shield } from 'lucide-react';
import { Login, CreateProfile } from './features/auth';
import { Home } from './features/home';
import { Profile } from './features/profile';
import { Matchmaking, PostMatchReport } from './features/matchmaking';
import { Training } from './features/training';
import { CaptainsDashboard, PlayerDashboard } from './features/dashboard';
import { CreateTeam, TeamProfile } from './features/team';
import { Social, PlayerProfilePage } from './features/social';
import { NotificationsPage } from './features/notifications';
import { Navigation } from './components/shared/ui/Navigation';
import { MatchLobby, MatchRecord, UserProfileData, UserWallet, PlayerPosition, TeamWallet, Team, SoccerProfile, PracticeSession, FieldListing, AppNotification, DMConversation } from './types';
import { seedDatabase } from './services/seed';
import { walletService } from './services';
import { isLoggedIn as checkIsLoggedIn, logout as apiLogout, getMe, getMyTeam, getMyTeams, contributeToTeam as apiContributeToTeam, getMyWallet, saveTeamLayout, deleteTeam as apiDeleteTeam, leaveTeam as apiLeaveTeam, updateTeam as apiUpdateTeam, getNotifications } from './frontend/api';

// Default avatar SVG — shown when user has no photo
export const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='100' r='45' fill='%23CBD5E1'/%3E%3Ccircle cx='50' cy='35' r='22' fill='%23CBD5E1'/%3E%3C/svg%3E";

// Slot IDs must match HOME_SLOT_TO_INDEX in server/routes/lobbies.ts
// so that "Save Layout" → team_layout → formation endpoint roundtrip works
const DEFAULT_POINTS = [
  { id: 'gk',  label: 'GK', x: 50, y: 90 },
  { id: 'lb',  label: 'LB', x: 15, y: 70 }, { id: 'cb1', label: 'CB', x: 38, y: 75 }, { id: 'cb2', label: 'CB', x: 62, y: 75 }, { id: 'rb',  label: 'RB', x: 85, y: 70 },
  { id: 'lm',  label: 'LM', x: 15, y: 50 }, { id: 'cm1', label: 'CM', x: 38, y: 50 }, { id: 'cm2', label: 'CM', x: 62, y: 50 }, { id: 'rm',  label: 'RM', x: 85, y: 50 },
  { id: 'st1', label: 'ST', x: 38, y: 15 }, { id: 'st2', label: 'ST', x: 62, y: 15 },
];

const App: React.FC = () => {
  // Initialize data store from seed (replaces all MOCK_* constants)
  const [seedData] = useState(() => seedDatabase());

  const [currentPage, setCurrentPage] = useState<'login' | 'home' | 'create-profile' | 'profile' | 'matchmaking' | 'dashboard' | 'training' | 'post-match-report' | 'create-team' | 'team-profile' | 'social' | 'notifications' | 'player-profile'>('login');
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
      matchesPlayed: 0,
      cleanSheets: 0,
    },
    friends: []
  } as any);

  // Fetch team data from API and update React state.
  // preferTeamId: if provided, loads that specific team tab; otherwise uses last active or captain-first.
  const fetchAndSetTeam = async (currentUserId: string, preferTeamId?: string) => {
    try {
      // 1. Get all team memberships (for tabs)
      const teamsData = await getMyTeams();
      setUserTeams(teamsData.teams);

      if (teamsData.teams.length === 0) {
        setUserTeam(null);
        setUserRole('PLAYER');
        setActiveTeamId(null);
        activeTeamIdRef.current = null;
        return;
      }

      // 2. Pick which team to load: explicit param > currently active > captain-first > first
      const targetId =
        preferTeamId ||
        activeTeamIdRef.current ||
        teamsData.teams.find(t => t.role === 'CAPTAIN')?.id ||
        teamsData.teams[0].id;

      setActiveTeamId(targetId);
      activeTeamIdRef.current = targetId;

      // 3. Load full data for the selected team
      const teamData = await getMyTeam(targetId);
      const apiTeam: Team = {
        id: teamData.team.id,
        name: teamData.team.name,
        homeColor: teamData.team.primaryColor || '#2563eb',
        awayColor: teamData.team.secondaryColor || '#ef4444',
        members: teamData.members.map(m => ({
          id: m.id,
          fullName: m.fullName,
          position: (m.position || 'Midfielder') as PlayerPosition,
          avatar: m.avatarUrl || DEFAULT_AVATAR,
        })),
        wallet: { balance: teamData.wallet.balance, contributions: [] },
        motto: teamData.team.motto || undefined,
        createdAt: teamData.team.createdAt || undefined,
      };
      setUserTeam(apiTeam);
      const myRole = teamData.members.find(m => m.id === currentUserId)?.role;
      setUserRole(myRole === 'CAPTAIN' ? 'CAPTAIN' : 'PLAYER');
      setTeamWallet(prev => ({ ...prev, balance: teamData.wallet.balance }));

      // Populate squadPool from real team members
      const realSquad = teamData.members.map(m => ({
        id: m.id,
        name: m.fullName,
        role: m.position || 'Player',
        avatar: m.avatarUrl || undefined,
      }));
      setSquadPool(realSquad);

      // Restore saved formation layout so all members see the captain's assignments
      if (teamData.team.teamLayout) {
        try {
          const savedLayout = JSON.parse(teamData.team.teamLayout) as Record<string, string>;
          setGeneralSquadAssigned(savedLayout);
        } catch { setGeneralSquadAssigned({}); }
      } else {
        setGeneralSquadAssigned({});
      }
    } catch {
      // No team or fetch failed — clear any stale team state
      setUserTeam(null);
      setUserRole('PLAYER');
      setUserTeams([]);
    }
  };

  // Switch the active team tab and reload dashboard data for that team
  const switchToTeam = async (teamId: string) => {
    setActiveTeamId(teamId);
    activeTeamIdRef.current = teamId;
    setUserTeam(null); // show loading while fetching
    await fetchAndSetTeam(userProfile.id, teamId);
  };

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
          bio: user.bio || '',
          city: user.city || '',
          phone: user.phone || '',
          username: user.username || '',
          isVerified: user.isVerified || false,
          dateOfBirth: (user as any).dateOfBirth || '',
          yearsPlaying: (user as any).yearsPlaying ?? 0,
          wallet: { balance: data.wallet.balance, escrow: data.wallet.escrow, transactions: [] },
        }));
        setIsLoggedIn(true);
        setCurrentPage('home');

        // Also restore team data if user is in a team
        if (data.team) {
          await fetchAndSetTeam(user.id);
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
  // Multi-team support: list of all team memberships + currently active tab
  const [userTeams, setUserTeams] = useState<{ id: string; name: string; role: string; primaryColor: string | null; secondaryColor: string | null; createdAt: string }[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const activeTeamIdRef = useRef<string | null>(null);

  const [teamWallet, setTeamWallet] = useState<TeamWallet>({
    balance: 0,
    contributions: [],
  });

  const [fields] = useState<FieldListing[]>(seedData.fields);
  const [activeLobbies, setActiveLobbies] = useState<MatchLobby[]>([]);
  const [trainingSessions, setTrainingSessions] = useState<PracticeSession[]>([]);
  const [generalSquadAssigned, setGeneralSquadAssigned] = useState<Record<string, string>>({});
  const [generalSquadPoints, setGeneralSquadPoints] = useState(DEFAULT_POINTS);
  const [squadPool, setSquadPool] = useState<{ id: string; name: string; role: string; avatar?: string }[]>([]);

  const [teamMessages, setTeamMessages] = useState<any[]>([]);
  const [tabMenuOpenId, setTabMenuOpenId] = useState<string | null>(null);
  const [renameTeam, setRenameTeam] = useState<{ id: string; currentName: string } | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [conversations, setConversations] = useState<DMConversation[]>([]);

  const navigate = (page: any, params?: any) => {
    if (page === 'matchmaking') {
      setNavigationParams({ ...params, resetKey: Date.now() });
    } else {
      setNavigationParams(params || null);
    }
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // Refresh team data whenever the user lands on the dashboard (preserves the active team tab)
  useEffect(() => {
    if (currentPage === 'dashboard' && isLoggedIn && userProfile.id) {
      fetchAndSetTeam(userProfile.id, activeTeamIdRef.current || undefined);
    }
  }, [currentPage, isLoggedIn, userProfile.id]);

  // Fetch notifications periodically when logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchN = () => getNotifications().then(res => setNotifications(res.notifications)).catch(() => {});
    fetchN();
    const interval = setInterval(fetchN, 60000); // poll every 60s
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const applyAuthUser = (user: { id: string; email?: string; username?: string; fullName: string; position: string | null; fitnessLevel: string | null; city?: string | null; dateOfBirth?: string | null; yearsPlaying?: number }) => {
    setUserProfile(prev => ({
      ...prev,
      id: user.id,
      fullName: user.fullName,
      position: (user.position || '') as any,
      fitnessLevel: (user.fitnessLevel || '') as any,
      dateOfBirth: user.dateOfBirth || prev.dateOfBirth || '',
      yearsPlaying: user.yearsPlaying ?? prev.yearsPlaying ?? 0,
    }));
    setIsLoggedIn(true);
  };

  const handleLoginSuccess = async (user: { id: string; email: string; username: string; fullName: string; position: string | null; fitnessLevel: string | null; city: string | null }) => {
    applyAuthUser(user);
    navigate('home');
    // Fetch team data for the logged-in user (prevents stale userTeam from previous session)
    await fetchAndSetTeam(user.id);
  };

  const handleLogout = () => {
    apiLogout();
    setIsLoggedIn(false);
    setUserTeam(null);
    setUserTeams([]);
    setActiveTeamId(null);
    activeTeamIdRef.current = null;
    setUserRole('PLAYER');
    setUserProfile(prev => ({
      ...prev,
      id: '',
      fullName: '',
      wallet: { balance: 0, escrow: 0, transactions: [] },
      stats: { goals: 0, assists: 0, matchesPlayed: 0 },
      friends: [],
    }));
    setTeamWallet({ balance: 0, contributions: [] });
    setMatchHistory([]);
    setSquadPool([]);
    setGeneralSquadAssigned({});
    setTeamMessages([]);
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
    // Keep squadPool in sync so new/removed members appear in formation immediately
    if (team.members && team.members.length > 0) {
      setSquadPool(team.members.map(m => ({
        id: m.id,
        name: m.fullName,
        role: (m.position as string) || 'Player',
        avatar: m.avatar,
      })));
    }
  }, []);

  const handleSaveTeamLayout = useCallback(async () => {
    if (!userTeam) return;
    try {
      await saveTeamLayout(userTeam.id, generalSquadAssigned);
    } catch {
      // Non-critical — layout saved locally regardless
    }
  }, [userTeam, generalSquadAssigned]);

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

  const handleProfileUpdated = (updated: { fullName: string; avatarUrl: string; position: string; fitnessLevel: string; bio: string; city: string; phone: string }) => {
    setUserProfile(prev => ({
      ...prev,
      fullName: updated.fullName || prev.fullName,
      avatar: updated.avatarUrl || prev.avatar,
      position: (updated.position || prev.position) as any,
      fitnessLevel: (updated.fitnessLevel || prev.fitnessLevel) as any,
      bio: updated.bio,
      city: updated.city,
      phone: updated.phone,
    }));
  };

  const handleCreateTeam = (team: Team) => {
    setUserTeam(team);
    setUserRole('CAPTAIN');
    setActiveTeamId(team.id);
    activeTeamIdRef.current = team.id;
    setUserTeams(prev => {
      if (prev.some(t => t.id === team.id)) return prev;
      return [...prev, { id: team.id, name: team.name, role: 'CAPTAIN', primaryColor: team.homeColor, secondaryColor: team.awayColor, createdAt: new Date().toISOString() }];
    });
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

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Delete this team? This will remove all members and cannot be undone.')) return;
    try {
      await apiDeleteTeam(teamId);
      const remaining = userTeams.filter(t => t.id !== teamId);
      setUserTeams(remaining);
      if (activeTeamId === teamId) {
        const next = remaining[0] || null;
        setActiveTeamId(next?.id || null);
        activeTeamIdRef.current = next?.id || null;
        if (next) {
          await fetchAndSetTeam(userProfile.id, next.id);
        } else {
          setUserTeam(null);
          setUserRole('PLAYER');
          setSquadPool([]);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete team');
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    if (!window.confirm('Leave this team?')) return;
    try {
      await apiLeaveTeam(teamId);
      const remaining = userTeams.filter(t => t.id !== teamId);
      setUserTeams(remaining);
      if (activeTeamId === teamId) {
        const next = remaining[0] || null;
        setActiveTeamId(next?.id || null);
        activeTeamIdRef.current = next?.id || null;
        if (next) {
          await fetchAndSetTeam(userProfile.id, next.id);
        } else {
          setUserTeam(null);
          setUserRole('PLAYER');
          setSquadPool([]);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to leave team');
    }
  };

  const handleRenameTeamSubmit = async () => {
    if (!renameTeam || !renameInput.trim()) return;
    setRenameSaving(true);
    try {
      await apiUpdateTeam(renameTeam.id, { name: renameInput.trim() });
      setUserTeams(prev => prev.map(t => t.id === renameTeam.id ? { ...t, name: renameInput.trim() } : t));
      if (userTeam?.id === renameTeam.id) {
        setUserTeam(prev => prev ? { ...prev, name: renameInput.trim() } : prev);
      }
      setRenameTeam(null);
    } catch (err: any) {
      alert(err.message || 'Failed to rename team');
    } finally {
      setRenameSaving(false);
    }
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
        return <Profile userProfile={userProfile} matchHistory={matchHistory} onLoadFunds={handleLoadFunds} onProfileUpdated={handleProfileUpdated} onVerifyId={() => setUserProfile(prev => ({ ...prev, isVerified: true }))} />;
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
            userTeam={userTeam}
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
            allProfiles={[]}
            userRole={userRole}
            userTeam={userTeam ? { id: userTeam.id, name: userTeam.name } : null}
            userId={userProfile.id}
            onTeamRefresh={() => fetchAndSetTeam(userProfile.id)}
            onViewProfile={(uid) => navigate('player-profile', { userId: uid })}
          />
        );
      case 'player-profile':
        return (
          <PlayerProfilePage
            userId={navigationParams?.userId || ''}
            onBack={() => navigate('social')}
          />
        );
      case 'notifications':
        return (
          <NotificationsPage
            onNavigate={(page) => navigate(page as any)}
          />
        );
      case 'dashboard': {
        // No teams at all — show create team prompt
        if (userTeams.length === 0) {
          return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center animate-fade-in font-inter md:pt-20">
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

        // Build the horizontal team tab strip
        const teamTabStrip = (() => {
          const activeMenuTeam = tabMenuOpenId ? userTeams.find(x => x.id === tabMenuOpenId) : null;
          return (
            <div className="sticky top-0 md:top-[64px] z-40 bg-white border-b border-slate-200 shadow-sm relative" onClick={() => setTabMenuOpenId(null)}>
              <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
                {userTeams.map(t => {
                  const isActive = activeTeamId === t.id;
                  const isCaptain = t.role === 'CAPTAIN';
                  const menuOpen = tabMenuOpenId === t.id;
                  return (
                    <div key={t.id} className="relative shrink-0">
                      <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-lg scale-105'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}>
                        <button onClick={() => switchToTeam(t.id)} className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/30"
                            style={{ backgroundColor: t.primaryColor || '#2563eb' }}
                          />
                          {t.name}
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-lg ${
                            isCaptain
                              ? (isActive ? 'bg-amber-400 text-amber-900' : 'bg-amber-100 text-amber-700')
                              : (isActive ? 'bg-blue-400/80 text-white' : 'bg-blue-100 text-blue-600')
                          }`}>
                            {isCaptain ? 'CAPT' : 'PLAYER'}
                          </span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setTabMenuOpenId(menuOpen ? null : t.id); }}
                          className={`ml-0.5 opacity-60 hover:opacity-100 text-lg leading-none ${isActive ? 'text-white' : 'text-slate-400'}`}
                          title="Team options"
                        >⋯</button>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={() => navigate('create-team')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0 bg-slate-50 border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all"
                >
                  <span className="text-base leading-none">+</span> New Team
                </button>
              </div>
              {/* Dropdown rendered OUTSIDE the overflow container so it isn't clipped */}
              {activeMenuTeam && (() => {
                const t = activeMenuTeam;
                const isCaptain = t.role === 'CAPTAIN';
                return (
                  <div
                    className="absolute top-full left-4 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 min-w-[180px]"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.name}</p>
                    </div>
                    {isCaptain ? (
                      <>
                        <button
                          onClick={() => { setTabMenuOpenId(null); setRenameInput(t.name); setRenameTeam({ id: t.id, currentName: t.name }); }}
                          className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-colors"
                        >Rename Team</button>
                        <div className="h-px bg-slate-100" />
                        <button
                          onClick={() => { setTabMenuOpenId(null); if (window.confirm(`Delete "${t.name}"? This cannot be undone.`)) handleDeleteTeam(t.id); }}
                          className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-red-600 hover:bg-red-50 transition-colors"
                        >Delete Team</button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setTabMenuOpenId(null); if (window.confirm(`Leave "${t.name}"?`)) handleLeaveTeam(t.id); }}
                        className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-red-600 hover:bg-red-50 transition-colors"
                      >Leave Team</button>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })();

        // Loading state while switching teams
        if (!userTeam) {
          return (
            <div className="min-h-screen bg-slate-50">
              {teamTabStrip}
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          );
        }

        // Captain dashboard
        if (userRole === 'CAPTAIN') {
          return (
            <div className="min-h-screen bg-slate-50">
              {teamTabStrip}
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
                onSave={handleSaveTeamLayout}
              />
            </div>
          );
        }

        // Player dashboard
        return (
          <div className="min-h-screen bg-slate-50">
            {teamTabStrip}
            <PlayerDashboard
              isFormationLocked={true}
              assignedPlayers={generalSquadAssigned}
              currentPoints={generalSquadPoints}
              squadPool={squadPool}
              messages={teamMessages}
              onSendMessage={handleSendMessage}
              userProfile={userProfile}
              userTeam={userTeam}
              teamWallet={teamWallet}
              onContributeToTeam={handleContributeToTeam}
              onTeamUpdated={handleTeamUpdated}
            />
          </div>
        );
      }
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
          userAvatar={userProfile.avatar || undefined}
          notificationCount={notifications.filter(n => !n.isRead).length}
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

      {/* ── Rename Team Modal ── */}
      {renameTeam && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setRenameTeam(null)}>
          <div className="bg-white rounded-[40px] p-10 shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">Rename Team</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Current: {renameTeam.currentName}</p>
            <input
              type="text"
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRenameTeamSubmit(); if (e.key === 'Escape') setRenameTeam(null); }}
              autoFocus
              maxLength={40}
              className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-100 mb-6"
              placeholder="New team name..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRenameTeam(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
              >Cancel</button>
              <button
                onClick={handleRenameTeamSubmit}
                disabled={!renameInput.trim() || renameSaving}
                className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50"
              >{renameSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
