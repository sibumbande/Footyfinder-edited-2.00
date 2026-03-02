import { api } from './client';
import type { AppNotification } from '../../types';

export function getNotifications() {
  return api.get<{ notifications: AppNotification[] }>('/notifications');
}

export function markNotificationRead(id: string) {
  return api.put<{ message: string }>(`/notifications/${id}/read`);
}

export function markAllRead() {
  return api.put<{ message: string }>('/notifications/read-all');
}
