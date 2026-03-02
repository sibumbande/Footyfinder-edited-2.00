import { api } from './client';

export function createTeam(data: { name: string; primaryColor?: string; secondaryColor?: string }) {
  return api.post<{
    team: { id: string; name: string; captainId: string; primaryColor: string | null; secondaryColor: string | null; createdAt: string };
    wallet: { balance: number };
  }>('/teams', data);
}

export function getMyTeam(teamId?: string) {
  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  return api.get<{
    team: { id: string; name: string; captainId: string; primaryColor: string | null; secondaryColor: string | null; createdAt: string; teamLayout: string | null; motto: string | null };
    members: { id: string; username: string; fullName: string; avatarUrl: string | null; position: string | null; role: string }[];
    wallet: { balance: number };
  }>(`/teams/my-team${qs}`);
}

export function getMyTeams() {
  return api.get<{
    teams: { id: string; name: string; role: string; primaryColor: string | null; secondaryColor: string | null; createdAt: string }[];
  }>('/teams/my-teams');
}

export function getTeamById(id: string) {
  return api.get<{
    team: { id: string; name: string; captainId: string; primaryColor: string | null; secondaryColor: string | null; createdAt: string };
    members: { id: string; username: string; fullName: string; avatarUrl: string | null; position: string | null; role: string }[];
    wallet?: { balance: number };
  }>(`/teams/${id}`);
}

export function joinTeam(id: string) {
  return api.post<{ message: string; team: { id: string; name: string } }>(`/teams/${id}/join`);
}

export function leaveTeam(id: string) {
  return api.post<{ message: string }>(`/teams/${id}/leave`);
}

export function deleteTeam(id: string) {
  return api.delete<{ message: string }>(`/teams/${id}`);
}

export function updateTeam(id: string, data: { name?: string; primaryColor?: string; secondaryColor?: string; motto?: string }) {
  return api.put<{
    team: { id: string; name: string; captainId: string; primaryColor: string | null; secondaryColor: string | null; createdAt: string };
  }>(`/teams/${id}`, data);
}

export function contributeToTeam(id: string, amount: number) {
  return api.post<{
    userWallet: { balance: number };
    teamWallet: { balance: number };
  }>(`/teams/${id}/contribute`, { amount });
}

export function saveTeamLayout(id: string, layout: Record<string, string>) {
  return api.post<{ message: string }>(`/teams/${id}/save-layout`, { layout });
}

export function getAllTeams() {
  return api.get<{
    teams: {
      id: string; name: string; captainId: string; captainName: string;
      city: string | null; primaryColor: string | null;
      memberCount: number; isRecruiting: boolean; hasRequested: boolean;
      isMember: boolean;
    }[];
  }>('/teams/all');
}

export function toggleTeamRecruiting(id: string) {
  return api.post<{ isRecruiting: boolean }>(`/teams/${id}/toggle-recruiting`);
}

export function inviteToTeam(id: string, friendId: string) {
  return api.post<{ message: string }>(`/teams/${id}/invite`, { friendId });
}

export function requestToJoinTeam(id: string) {
  return api.post<{ message: string; requestId: string }>(`/teams/${id}/request-join`);
}

export function getTeamJoinRequests() {
  return api.get<{
    requests: {
      requestId: string; createdAt: string;
      user: { id: string; fullName: string; avatarUrl: string | null; position: string | null };
    }[];
  }>('/teams/join-requests');
}

export function respondToJoinRequest(requestId: string, accept: boolean) {
  return api.put<{ message: string }>(`/teams/join-requests/${requestId}`, { accept });
}

export function getMyTeamInvites() {
  return api.get<{
    invites: {
      inviteId: string;
      createdAt: string;
      team: { id: string; name: string; primaryColor: string | null; captainName: string; memberCount: number };
    }[];
  }>('/teams/my-invites');
}

export function respondToTeamInvite(inviteId: string, accept: boolean) {
  return api.put<{ message: string }>(`/teams/invites/${inviteId}`, { accept });
}

export function getTeamTransactions(teamId?: string) {
  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  return api.get<{
    transactions: {
      id: string;
      amount: number;
      contributorName: string;
      description: string;
      createdAt: string;
    }[];
  }>(`/teams/my-team/transactions${qs}`);
}
