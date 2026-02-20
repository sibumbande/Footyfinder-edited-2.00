
import React, { useState, useEffect, useCallback } from 'react';
import { SocialUI } from '../components/SocialUI';
import { SoccerProfile, PlayerPosition } from '../../../types';
import { discoverPlayers, getFriends, getFriendRequests, sendFriendRequest, respondToFriendRequest, ApiError } from '../../../frontend/api';

interface SocialProps {
  friends: SoccerProfile[];
  onAddFriend: (profile: SoccerProfile) => void;
  onRemoveFriend: (id: string) => void;
  allProfiles: SoccerProfile[];
}

export const Social: React.FC<SocialProps> = ({ friends: propFriends, onAddFriend, onRemoveFriend, allProfiles }) => {
  const [apiFriends, setApiFriends] = useState<SoccerProfile[] | null>(null);
  const [discoverList, setDiscoverList] = useState<SoccerProfile[] | null>(null);
  const [friendRequests, setFriendRequests] = useState<{ requestId: string; from: SoccerProfile }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingRequestIds, setPendingRequestIds] = useState<Set<string>>(new Set());

  const friends = apiFriends ?? propFriends;

  const mapUserToProfile = useCallback((u: { id: string; fullName: string; avatarUrl: string | null; position: string | null }): SoccerProfile => ({
    id: u.id,
    fullName: u.fullName,
    position: (u.position || 'Midfielder') as PlayerPosition,
    avatar: u.avatarUrl || `https://picsum.photos/seed/${u.id}/200`,
  }), []);

  const fetchAll = useCallback(async () => {
    try {
      const [discoverRes, friendsRes, requestsRes] = await Promise.all([
        discoverPlayers().catch(() => null),
        getFriends().catch(() => null),
        getFriendRequests().catch(() => null),
      ]);

      if (discoverRes) {
        setDiscoverList(discoverRes.users.map(mapUserToProfile));
      }
      if (friendsRes) {
        const mapped = friendsRes.friends.map(mapUserToProfile);
        setApiFriends(mapped);
      }
      if (requestsRes) {
        setFriendRequests(
          requestsRes.requests
            .filter(r => r.status === 'PENDING')
            .map(r => ({
              requestId: r.requestId,
              from: mapUserToProfile(r.from),
            }))
        );
      }
      setError('');
    } catch (e) {
      // Fall back to prop data
      setError(e instanceof ApiError ? e.message : 'Could not load social data');
    } finally {
      setLoading(false);
    }
  }, [mapUserToProfile]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleAddFriend = async (profile: SoccerProfile) => {
    // Mark as pending to disable button
    setPendingRequestIds(prev => new Set(prev).add(profile.id));
    try {
      await sendFriendRequest(profile.id);
      // Remove from discover list
      setDiscoverList(prev => prev ? prev.filter(p => p.id !== profile.id) : prev);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to send friend request');
    } finally {
      setPendingRequestIds(prev => {
        const next = new Set(prev);
        next.delete(profile.id);
        return next;
      });
    }
    // Also update parent state as fallback
    onAddFriend(profile);
  };

  const handleRemoveFriend = (id: string) => {
    // Remove locally immediately
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

  // Use API discover list or fall back to prop allProfiles
  const allProfilesForUI = discoverList ?? allProfiles;

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
                    <button
                      onClick={() => handleAcceptRequest(req.requestId, req.from)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req.requestId)}
                      className="px-6 py-3 bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 hover:text-red-600 transition-all"
                    >
                      Decline
                    </button>
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
            allProfiles={allProfilesForUI}
          />
        )}
      </div>
    </div>
  );
};
