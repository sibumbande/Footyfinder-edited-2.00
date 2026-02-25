
import React, { useState } from 'react';
import { Search, UserPlus, Users, ShieldCheck, Heart, UserMinus, MapPin, Shield, CheckCircle2, Clock, UserCheck, Mail } from 'lucide-react';
import { SoccerProfile } from '../../../types';
import { TeamListing, JoinRequest, TeamInvite } from '../pages/Social';

const CITY_ORDER = ['Cape Town', 'Johannesburg', 'Port Elizabeth'];

interface SocialUIProps {
  friends: SoccerProfile[];
  onAddFriend: (profile: SoccerProfile) => void;
  onRemoveFriend: (id: string) => void;
  allProfiles: SoccerProfile[];
  userRole?: 'PLAYER' | 'CAPTAIN';
  userTeam?: { id: string; name: string } | null;
  userId?: string;
  allTeams: TeamListing[];
  joinRequests: JoinRequest[];
  teamInvites: TeamInvite[];
  pendingInviteIds: Set<string>;
  sentInviteIds: Set<string>;
  pendingJoinTeamIds: Set<string>;
  onAddToTeam: (friendId: string) => void;
  onRequestToJoin: (teamId: string) => void;
  onToggleRecruiting: () => void;
  onAcceptJoinRequest: (requestId: string) => void;
  onDeclineJoinRequest: (requestId: string) => void;
  onAcceptTeamInvite: (inviteId: string) => void;
  onDeclineTeamInvite: (inviteId: string) => void;
}

function groupByCity(teams: TeamListing[]): { city: string; teams: TeamListing[] }[] {
  const map: Record<string, TeamListing[]> = {};
  for (const t of teams) {
    const city = t.city || 'Other';
    if (!map[city]) map[city] = [];
    map[city].push(t);
  }
  const ordered = CITY_ORDER.filter(c => map[c]).map(c => ({ city: c, teams: map[c] }));
  Object.keys(map).filter(c => !CITY_ORDER.includes(c)).forEach(c => ordered.push({ city: c, teams: map[c] }));
  return ordered;
}

export const SocialUI: React.FC<SocialUIProps> = ({
  friends, onAddFriend, onRemoveFriend, allProfiles,
  userRole, userTeam, userId,
  allTeams, joinRequests, teamInvites, pendingInviteIds, sentInviteIds, pendingJoinTeamIds,
  onAddToTeam, onRequestToJoin, onToggleRecruiting,
  onAcceptJoinRequest, onDeclineJoinRequest,
  onAcceptTeamInvite, onDeclineTeamInvite,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'friends' | 'teams'>('discover');

  const friendIds = friends.map(f => f.id);
  const isCaptain = userRole === 'CAPTAIN';
  const hasTeam = !!userTeam;

  const discoverProfiles = allProfiles.filter(p =>
    !friendIds.includes(p.id) &&
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const myFriends = friends.filter(p =>
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTeams = allTeams.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.captainName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const teamsByCity = groupByCity(filteredTeams);

  return (
    <div className="animate-fade-in">

      {/* Team Invites Panel — shown to non-captain players with pending invites */}
      {!isCaptain && teamInvites.length > 0 && (
        <div className="mb-8 bg-white rounded-[48px] p-10 shadow-sm border border-blue-100 animate-fade-in">
          <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
              <Mail size={16} className="text-blue-600" />
            </div>
            Team Invites ({teamInvites.length})
          </h2>
          <div className="space-y-3">
            {teamInvites.map(invite => (
              <div key={invite.inviteId} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{ background: invite.team.primaryColor || '#2563eb' }}
                  >
                    <Shield size={20} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm uppercase text-slate-900 truncate">{invite.team.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Captain: {invite.team.captainName} · {invite.team.memberCount} members</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => onAcceptTeamInvite(invite.inviteId)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={13} /> Join
                  </button>
                  <button
                    onClick={() => onDeclineTeamInvite(invite.inviteId)}
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

      {/* Header + Tabs */}
      <div className="bg-white rounded-[48px] p-10 md:p-12 shadow-sm border border-slate-100 mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-10">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">Social Network</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Players, friends, and squads in your city</p>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-[20px] gap-1">
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'discover' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Discover
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'friends' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Friends ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'teams' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Teams
            </button>
          </div>
        </div>

        <div className="relative group max-w-2xl mx-auto">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'teams' ? 'Search teams or captains...' : 'Search profiles by name...'}
            className="w-full pl-16 pr-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-[32px] focus:bg-white focus:border-blue-600 outline-none font-bold text-slate-900 shadow-inner transition-all"
          />
        </div>
      </div>

      {/* ── DISCOVER TAB ── */}
      {activeTab === 'discover' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {discoverProfiles.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-[48px] border border-slate-100">
              <Users className="mx-auto text-slate-200 mb-4" size={64} />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">No new profiles found.</p>
            </div>
          ) : (
            discoverProfiles.map(profile => (
              <div key={profile.id} className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <img src={profile.avatar} alt="" className="w-24 h-24 rounded-[32px] object-cover shadow-2xl group-hover:scale-105 transition-transform" />
                    <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg border-4 border-white">
                      <ShieldCheck size={16} />
                    </div>
                  </div>
                  <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight leading-none mb-2">{profile.fullName}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">{profile.position}</p>
                  <button
                    onClick={() => onAddFriend(profile)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg"
                  >
                    <UserPlus size={16} /> Add Friend
                  </button>
                </div>
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-blue-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── FRIENDS TAB ── */}
      {activeTab === 'friends' && (
        <div className="animate-fade-in space-y-6">
          {myFriends.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[48px] border border-slate-100">
              <Heart className="mx-auto text-slate-200 mb-4" size={64} />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed px-12">
                No friends yet.<br />Head to Discover to build your network.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myFriends.map(friend => (
                <div key={friend.id} className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                  <div className="flex items-center gap-6 mb-5">
                    <img src={friend.avatar} alt="" className="w-20 h-20 rounded-[24px] object-cover shadow-lg border-2 border-slate-50" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-black uppercase text-slate-900 tracking-tight leading-none mb-1 truncate">{friend.fullName}</h3>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{friend.position}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isCaptain && hasTeam && friend.id !== userId && (
                      sentInviteIds.has(friend.id) ? (
                        <div className="flex-1 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 border border-emerald-200">
                          <CheckCircle2 size={13} /> Invite Sent
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddToTeam(friend.id)}
                          disabled={pendingInviteIds.has(friend.id)}
                          className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
                        >
                          <UserCheck size={13} />
                          {pendingInviteIds.has(friend.id) ? 'Sending...' : 'Invite to Team'}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => onRemoveFriend(friend.id)}
                      className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-blue-600/5 rounded-full blur-2xl"></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TEAMS TAB ── */}
      {activeTab === 'teams' && (
        <div className="animate-fade-in space-y-10">

          {/* Captain: Join Requests Panel */}
          {isCaptain && joinRequests.length > 0 && (
            <div className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100">
              <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Users size={16} className="text-emerald-600" />
                </div>
                Squad Join Requests ({joinRequests.length})
              </h2>
              <div className="space-y-3">
                {joinRequests.map(req => (
                  <div key={req.requestId} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <img
                        src={req.user.avatarUrl || `https://picsum.photos/seed/${req.user.id}/200`}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                      <div>
                        <p className="font-black text-sm uppercase text-slate-900">{req.user.fullName}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{req.user.position || 'Player'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onAcceptJoinRequest(req.requestId)}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={13} /> Accept
                      </button>
                      <button
                        onClick={() => onDeclineJoinRequest(req.requestId)}
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

          {/* Captain: Toggle Recruiting for Own Team */}
          {isCaptain && userTeam && (
            <div className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100">
              <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900 mb-2">Your Team — {userTeam.name}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Control whether your team is visible to players looking for a squad</p>
              {(() => {
                const myTeamData = allTeams.find(t => t.id === userTeam.id);
                const isRecruiting = myTeamData?.isRecruiting ?? false;
                return (
                  <button
                    onClick={onToggleRecruiting}
                    className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm active:scale-95 ${
                      isRecruiting
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Shield size={16} />
                    {isRecruiting ? 'Recruiting — Click to Close' : 'Open Recruitment'}
                  </button>
                );
              })()}
            </div>
          )}

          {/* Teams by City */}
          {teamsByCity.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[48px] border border-slate-100">
              <Shield className="mx-auto text-slate-200 mb-4" size={64} />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">No teams found.</p>
            </div>
          ) : (
            teamsByCity.map(({ city, teams }) => (
              <div key={city}>
                <div className="flex items-center gap-3 mb-6">
                  <MapPin size={16} className="text-emerald-600" />
                  <h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em]">{city}</h3>
                  <div className="flex-1 h-px bg-emerald-100"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teams.map(team => {
                    const isOwnTeam = userTeam?.id === team.id;
                    const alreadyMember = isOwnTeam;
                    return (
                      <div key={team.id} className={`bg-white rounded-[40px] p-8 border shadow-sm hover:shadow-xl transition-all relative overflow-hidden ${isOwnTeam ? 'border-emerald-200' : 'border-slate-100'}`}>
                        {/* Color stripe */}
                        <div
                          className="absolute top-0 left-0 w-full h-2 rounded-t-[40px]"
                          style={{ background: team.primaryColor || '#2563eb' }}
                        />
                        <div className="pt-2 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight leading-none truncate">{team.name}</h3>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Captain: {team.captainName}</p>
                            </div>
                            {team.isRecruiting && (
                              <span className="shrink-0 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-emerald-200">
                                Recruiting
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Users size={11} /> {team.memberCount} Members</span>
                          </div>

                          {/* Action */}
                          {isOwnTeam ? (
                            <div className="py-3 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center border border-slate-100">
                              Your Team
                            </div>
                          ) : alreadyMember ? null : team.hasRequested ? (
                            <div className="py-3 bg-amber-50 text-amber-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-1.5 border border-amber-100">
                              <Clock size={13} /> Request Pending
                            </div>
                          ) : (
                            <button
                              onClick={() => onRequestToJoin(team.id)}
                              disabled={pendingJoinTeamIds.has(team.id) || !!userTeam}
                              title={userTeam && !isOwnTeam ? 'Leave your current team first' : undefined}
                              className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-sm"
                            >
                              <UserPlus size={13} />
                              {pendingJoinTeamIds.has(team.id) ? 'Requesting...' : 'Request to Join'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
