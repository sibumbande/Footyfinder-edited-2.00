import { api } from './client';

export function createTeam(data: { name: string; primaryColor?: string; secondaryColor?: string }) {
  return api.post<{
    team: { id: string; name: string; captainId: string; primaryColor: string | null; secondaryColor: string | null; createdAt: string };
    wallet: { balance: number };
  }>('/teams', data);
}

export function getMyTeam() {
  return api.get<{
    team: { id: string; name: string; captainId: string; primaryColor: string | null; secondaryColor: string | null; createdAt: string };
    members: { id: string; username: string; fullName: string; avatarUrl: string | null; position: string | null; role: string }[];
    wallet: { balance: number };
  }>('/teams/my-team');
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

export function updateTeam(id: string, data: { name?: string; primaryColor?: string; secondaryColor?: string }) {
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
