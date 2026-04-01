import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import type { ChatConversation, ChatMessage } from './types';

export function useChatConversations() {
  return useQuery<ChatConversation[]>({
    queryKey: ['chat', 'conversations'],
    queryFn: () => api.get('/chat/conversations/'),
    staleTime: 10_000,
    retry: false,
    throwOnError: false,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useChatMessages(conversationId: string | null) {
  return useQuery<ChatMessage[]>({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: () => api.get(`/chat/conversations/${conversationId}/messages/`),
    enabled: !!conversationId,
    staleTime: 5_000,
    retry: false,
    throwOnError: false,
    select: (data) => (Array.isArray(data) ? data : []),
    refetchInterval: conversationId ? 5_000 : false,
  });
}

export function useSendMessage(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api.post(`/chat/conversations/${conversationId}/messages/`, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
}

export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, string>({
    mutationFn: (participantId: string) =>
      api.post('/chat/conversations/', { participant_id: participantId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
}
