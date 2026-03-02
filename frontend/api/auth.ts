import { api } from './client';

const TOKEN_KEY = 'footyfinder_token';

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  username: string;
  phone?: string;
  city?: string;
  position?: string;
  fitnessLevel?: string;
  avatarBase64?: string;
  dateOfBirth?: string;
  yearsPlaying?: number;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    fullName: string;
    position: string | null;
    fitnessLevel: string | null;
    city: string | null;
    dateOfBirth?: string | null;
    yearsPlaying?: number;
  };
}

export async function register(data: RegisterData) {
  const res = await api.post<AuthResponse>('/auth/register', data);
  localStorage.setItem(TOKEN_KEY, res.token);
  return res.user;
}

export async function login(data: LoginData) {
  const res = await api.post<AuthResponse>('/auth/login', data);
  localStorage.setItem(TOKEN_KEY, res.token);
  return res.user;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return localStorage.getItem(TOKEN_KEY) !== null;
}
