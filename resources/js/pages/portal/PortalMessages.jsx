import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { getEcho } from '../../services/echo';
import { format } from 'date-fns';
import { Send, MessageSquare } from 'lucide-react';

export default function PortalMessages() {
  const queryClient = useQueryClient();
  const [selectedResidentId, setSelectedResidentId] = useState(null);
  const [body, setBody] = useState('');

  const { data: threadsData } = useQuery({
    queryKey: ['family-messages-threads'],
    queryFn: async () => {
      const res = await api.get('/family/messages/threads');
      return res.data;
    },
  });
  const threads = threadsData?.data ?? [];

  const { data: residentsData } = useQuery({
    queryKey: ['family-residents'],
    queryFn: async () => {
      const res = await api.get('/family/residents');
      return res.data;
    },
  });
  const residents = residentsData?.data ?? [];

  const residentIdToUse = selectedResidentId ?? residents[0]?.id ?? threads[0]?.resident_id;

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['family-messages', residentIdToUse],
    queryFn: async () => {
      const res = await api.get('/family/messages', { params: { resident_id: residentIdToUse } });
      return res.data;
    },
    enabled: !!residentIdToUse,
  });
  const messages = messagesData?.data ?? [];

  const sendMutation = useMutation({
    mutationFn: async () => {
      await api.post('/family/messages', { resident_id: residentIdToUse, body });
    },
    onSuccess: () => {
      setBody('');
      queryClient.invalidateQueries(['family-messages', residentIdToUse]);
      queryClient.invalidateQueries(['family-messages-threads']);
    },
  });

  // Real-time: when a new message is sent (by staff or self), refresh the message list
  useEffect(() => {
    if (!residentIdToUse) return;
    const echo = getEcho();
    if (!echo) return;
    const channelName = `family-messages.${residentIdToUse}`;
    const privateChannel = echo.private(channelName);
    const handler = () => {
      queryClient.invalidateQueries(['family-messages', residentIdToUse]);
      queryClient.invalidateQueries(['family-messages-threads']);
    };
    privateChannel.listen('.message.sent', handler);
    return () => {
      privateChannel.stopListening('.message.sent', handler);
      echo.leave(channelName);
    };
  }, [residentIdToUse, queryClient]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>
      <p className="text-gray-600 mb-6">Send a message to the care team or view your conversation.</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col" style={{ minHeight: 400 }}>
        {residents.length === 0 && threads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No message threads yet. When you send a message, it will appear here.</p>
          </div>
        ) : (
          <>
            <div className="border-b border-gray-200 p-3 flex items-center gap-2">
              <select
                value={residentIdToUse ?? ''}
                onChange={(e) => setSelectedResidentId(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
                {threads.filter((t) => !residents.some((r) => r.id === t.resident_id)).map((t) => (
                  <option key={t.resident_id} value={t.resident_id}>{t.resident_name}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">Conversation with care team</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 360 }}>
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--theme-primary)]" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No messages yet. Say hello to the care team below.</p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender_type === 'family' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        m.sender_type === 'family'
                          ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-xs opacity-80">{m.sender_name}</p>
                      <p className="text-sm mt-0.5">{m.body}</p>
                      <p className="text-xs opacity-70 mt-1">{m.created_at ? format(new Date(m.created_at), 'MMM d, h:mm a') : ''}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-gray-200 p-3 flex gap-2">
              <input
                type="text"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (body.trim() && residentIdToUse) sendMutation.mutate();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => residentIdToUse != null && body.trim() && sendMutation.mutate()}
                disabled={!body.trim() || residentIdToUse == null || sendMutation.isPending}
                className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
