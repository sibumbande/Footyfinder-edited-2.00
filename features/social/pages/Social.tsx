
import React, { useState, useEffect, useCallback } from 'react';
import { SocialUI } from '../components/SocialUI';
import { SoccerProfile, PlayerPosition } from '../../../types';
import {
  discoverPlayers, getFriends, getFriendRequests, sendFriendRequest, respondToFriendRequest,
  getAllTeams, toggleTeamRecruiting, inviteToTeam, requestToJoinTeam, getTeamJoinRequests, respondToJoinRequest,
  getMyTeamInvites, respondToTeamInvite,
  ApiError,
} from '../../../frontend/api';

export interface TeamListing {
  id: string;
  name: string;
  captainId: string;
  captainName: string;
  city: string | null;
  primaryColor: string | null;
  memberCount: number;
  isRecruiting: boolean;
  hasRequested: boolean;
  isMember: boolean;
}

export interface JoinRequest {
  requestId: string;
  createdAt: string;
  teamId: string;
  teamName: string;
  user: { id: string; fullName: string; avatarUrl: string | null; position: string | null };
}

export interface TeamInvite {
  inviteId: string;
  createdAt: string;
  team: { id: string; name: string; primaryColor: string | null; captainName: string; memberCount: number };
}

interface SocialProps {
  friends: SoccerProfile[];
  onAddFriend: (profile: SoccerProfile) => void;
  onRemoveFriend: (id: string) => void;
  allProfiles: SoccerProfile[];
  userRole?: 'PLAYER' | 'CAPTAIN';
  userTeam?: { id: string; name: string } | null;
  userId?: string;
  onTeamRefresh?: () => void;
}

export const Social: React.FC<SocialProps> = ({
  friends: propFriends,
  onAddFriend,
  onRemoveFriend,
  allProfiles,
  userRole,
  userTeam,
  userId,
  onTeamRefresh,
}) => {
  const [apiFriends, setApiFriends] = useState<SoccerProfile[] | null>(null);
  const [discoverList, setDiscoverList] = useState<SoccerProfile[] | null>(null);
  const [friendRequests, setFriendRequests] = useState<{ requestId: string; from: SoccerProfile }[]>([]);
  const [allTeams, setAllTeams] = useState<TeamListing[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [teamInvites, setTeamInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingRequestIds, setPendingRequestIds] = useState<Set<string>>(new Set());
  const [pendingInviteIds, setPendingInviteIds] = useState<Set<string>>(new Set());
  const [sentInviteIds, setSentInviteIds] = useState<Set<string>>(new Set());
  const [pendingJoinTeamIds, setPendingJoinTeamIds] = useState<Set<string>>(new Set());

  const friends = apiFriends ?? propFriends;

  const mapUserToProfile = useCallback((u: { id: string; fullName: string; avatarUrl: string | null; position: string | null }): SoccerProfile => ({
    id: u.id,
    fullName: u.fullName,
    position: (u.position || 'Midfielder') as PlayerPosition,
    avatar: u.avatarUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='100' r='45' fill='%23CBD5E1'/%3E%3Ccircle cx='50' cy='35' r='22' fill='%23CBD5E1'/%3E%3C/svg%3E",
  }), []);

  const fetchAll = useCallback(async () => {
    try {
      const [discoverRes, friendsRes, requestsRes, teamsRes] = await Promise.all([
        discoverPlayers().catch(() => null),
        getFriends().catch(() => null),
        getFriendRequests().catch(() => null),
        getAllTeams().catch(() => null),
      ]);

      if (discoverRes) setDiscoverList(discoverRes.users.map(mapUserToProfile));
      if (friendsRes) setApiFriends(friendsRes.friends.map(mapUserToProfile));
      if (requestsRes) {
        setFriendRequests(
          requestsRes.requests
            .filter(r => r.status === 'PENDING')
            .map(r => ({ requestId: r.requestId, from: mapUserToProfile(r.from) }))
        );
      }
      if (teamsRes) setAllTeams(teamsRes.teams);

      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load social data');
    } finally {
      setLoading(false);
    }
  }, [mapUserToProfile]);

  const fetchJoinRequests = useCallback(async () => {
    if (userRole !== 'CAPTAIN') return;
    try {
      const res = await getTeamJoinRequests();
      setJoinRequests(res.requests);
    } catch { /* non-critical */ }
  }, [userRole]);

  const fetchTeamInvites = useCallback(async () => {
    if (userRole === 'CAPTAIN') return; // Captains send invites, not receive them this way
    try {
      const res = await getMyTeamInvites();
      setTeamInvites(res.invites);
    } catch { /* non-critical */ }
  }, [userRole]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetchJoinRequests();
  }, [fetchJoinRequests]);

  useEffect(() => {
    fetchTeamInvites();
  }, [fetchTeamInvites]);

  // ── Friend handlers ──────────────────────────────────────────────────────

  const handleAddFriend = async (profile: SoccerProfile) => {
    setPendingRequestIds(prev => new Set(prev).add(profile.id));
    try {
      await sendFriendRequest(profile.id);
      setDiscoverList(prev => prev ? prev.filter(p => p.id !== profile.id) : prev);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to send friend request');
    } finally {
      setPendingRequestIds(prev => { const n = new Set(prev); n.delete(profile.id); return n; });
    }
    onAddFriend(profile);
  };

  const handleRemoveFriend = (id: string) => {
    setApiFriends(prev => prev ? prev.filter(f => f.id !== id) : prev);
    onRemoveFriend(id);
  };

  const handleAcceptRequest = async (requestId: string, fromProfile: SoccerProfile) => {
    try {
      await respondToFriendRequest(requestId, true);
      setFriendRequests(prev => prev.filter(r => r.requestId !== requestId));
      setApiFriends(prev => prev ? [...prev, fromProfile] : [fromProfile]);
      onAddFriend(fromProfile);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await respondToFriendRequest(requestId, false);
      setFriendRequests(prev => prev.filter(r => r.requestId !== requestId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to decline request');
    }
  };

  // ── Team handlers ────────────────────────────────────────────────────────

  const handleAddToTeam = async (friendId: string) => {
    if (!userTeam) return;
    setPendingInviteIds(prev => new Set(prev).add(friendId));
    try {
      await inviteToTeam(userTeam.id, friendId);
      setSentInviteIds(prev => new Set(prev).add(friendId));
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to send team invite');
    } finally {
      setPendingInviteIds(prev => { const n = new Set(prev); n.delete(friendId); return n; });
    }
  };

  const handleAcceptTeamInvite = async (inviteId: string) => {
    try {
      await respondToTeamInvite(inviteId, true);
      setTeamInvites(prev => prev.filter(i => i.inviteId !== inviteId));
      onTeamRefresh?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to accept team invite');
    }
  };

  const handleDeclineTeamInvite = async (inviteId: string) => {
    try {
      await respondToTeamInvite(inviteId, false);
      setTeamInvites(prev => prev.filter(i => i.inviteId !== inviteId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to decline team invite');
    }
  };

  const handleRequestToJoin = async (teamId: string) => {
    setPendingJoinTeamIds(prev => new Set(prev).add(teamId));
    try {
      await requestToJoinTeam(teamId);
      setAllTeams(prev => prev.map(t => t.id === teamId ? { ...t, hasRequested: true } : t));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to send join request');
    } finally {
      setPendingJoinTeamIds(prev => { const n = new Set(prev); n.delete(teamId); return n; });
    }
  };

  const handleToggleRecruiting = async () => {
    if (!userTeam) return;
    try {
      const res = await toggleTeamRecruiting(userTeam.id);
      setAllTeams(prev => prev.map(t => t.id === userTeam.id ? { ...t, isRecruiting: res.isRecruiting } : t));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to update recruiting status');
    }
  };

  const handleAcceptJoinRequest = async (requestId: string) => {
    try {
      await respondToJoinRequest(requestId, true);
      setJoinRequests(prev => prev.filter(r => r.requestId !== requestId));
      onTeamRefresh?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to accept join request');
    }
  };

  const handleDeclineJoinRequest = async (requestId: string) => {
    try {
      await respondToJoinRequest(requestId, false);
      setJoinRequests(prev => prev.filter(r => r.requestId !== requestId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to decline join request');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pt-20 font-inter">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Friend Requests Section */}
        {friendRequests.length > 0 && (
          <div className="mb-8 bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 animate-fade-in">
            <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900 mb-6">
              Friend Requests ({friendRequests.length})
            </h2>
            <div className="space-y-3">
              {friendRequests.map(req => (
                <div key={req.requestId} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <img src={req.from.avatar} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <p className="font-black text-sm uppercase text-slate-900">{req.from.fullName}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{req.from.position}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAcceptRequest(req.requestId, req.from)} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all">Accept</button>
                    <button onClick={() => handleDeclineRequest(req.requestId)} className="px-6 py-3 bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 hover:text-red-600 transition-all">Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <SocialUI
            friends={friends}
            onAddFriend={handleAddFriend}
            onRemoveFriend={handleRemoveFriend}
            allProfiles={discoverList ?? allProfiles}
            userRole={userRole}
            userTeam={userTeam}
            userId={userId}
            allTeams={allTeams}
            joinRequests={joinRequests}
            teamInvites={teamInvites}
            pendingInviteIds={pendingInviteIds}
            sentInviteIds={sentInviteIds}
            pendingJoinTeamIds={pendingJoinTeamIds}
            onAddToTeam={handleAddToTeam}
            onRequestToJoin={handleRequestToJoin}
            onToggleRecruiting={handleToggleRecruiting}
            onAcceptJoinRequest={handleAcceptJoinRequest}
            onDeclineJoinRequest={handleDeclineJoinRequest}
            onAcceptTeamInvite={handleAcceptTeamInvite}
            onDeclineTeamInvite={handleDeclineTeamInvite}
          />
        )}
      </div>
    </div>
  );
};
