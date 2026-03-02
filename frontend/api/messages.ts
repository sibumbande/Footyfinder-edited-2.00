import { api } from './client';
import type { DMMessage, DMConversation } from '../../types';

export function getConversations() {
  return api.get<{ conversations: (DMConversation & { isVerified?: boolean })[] }>('/messages/conversations');
}

export function getDMs(userId: string) {
  return api.get<{ messages: DMMessage[] }>(`/messages/dm/${userId}`);
}

export function sendDM(userId: string, content: string) {
  return api.post<{ message: DMMessage; isRequest: boolean }>(`/messages/dm/${userId}`, { content });
}

export function acceptMessageRequest(userId: string) {
  return api.put<{ message: string }>(`/messages/dm/${userId}/accept`);
}

export function declineMessageRequest(userId: string) {
  return api.put<{ message: string }>(`/messages/dm/${userId}/decline`);
}
