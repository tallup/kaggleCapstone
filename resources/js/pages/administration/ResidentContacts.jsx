import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { getEcho } from '../../services/echo';
import { format } from 'date-fns';
import { Users, Plus, Mail, Edit, Trash2, Copy, Check, Building2, MessageSquare, Send } from 'lucide-react';
import SectionCard from '../../components/SectionCard';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import Tooltip from '../../components/ui/Tooltip';
import logger from '../../utils/logger';
import { formatPhoneNumber, unformatPhoneNumber } from '../../utils/phoneFormatter';

function extractResidentsList(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

export default function ResidentContacts() {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState('');
  const [residentId, setResidentId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', relation: '' });
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [deleteContactId, setDeleteContactId] = useState(null);

  const { data: branchesData } = useQuery({
    queryKey: ['branches-list-contacts'],
    queryFn: async () => {
      const res = await api.get('/branches', { params: { per_page: 200 } });
      return res.data;
    },
  });
  const branchesList = Array.isArray(branchesData?.data) ? branchesData.data : (branchesData?.data ?? []);

  // Fetch all residents (no branch filter) so we always get the full list; filter by branch in the UI
  const { data: residentsResponse, isLoading: residentsLoading, error: residentsError } = useQuery({
    queryKey: ['residents-list-contacts'],
    queryFn: async () => {
      const res = await api.get('/residents', { params: { per_page: 100, show_all: true } });
      return res.data;
    },
  });
  // Always show all residents (no branch filter) so staff can manage contacts for any resident
  const residents = extractResidentsList(residentsResponse);

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['resident-contacts', residentId],
    queryFn: async () => {
      const res = await api.get('/resident-contacts', { params: { resident_id: residentId } });
      return res.data;
    },
    enabled: !!residentId,
  });
  const contacts = contactsData?.data ?? [];

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['family-messages', residentId],
    queryFn: async () => {
      const res = await api.get('/family/messages', { params: { resident_id: residentId } });
      return res.data;
    },
    enabled: !!residentId,
  });
  const messages = messagesData?.data ?? [];

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      await api.post('/family/messages', { resident_id: Number(residentId), body: messageBody.trim() });
    },
    onSuccess: () => {
      setMessageBody('');
      queryClient.invalidateQueries(['family-messages', residentId]);
    },
    onError: (e) => {
      logger.error('Send message failed', e);
      alert(e?.response?.data?.message || 'Failed to send message');
    },
  });

  // Real-time: when a new message is sent (by family or self), refresh the message list
  useEffect(() => {
    if (!residentId) return;
    const echo = getEcho();
    if (!echo) return;
    const channelName = `family-messages.${residentId}`;
    const privateChannel = echo.private(channelName);
    const handler = () => {
      queryClient.invalidateQueries(['family-messages', residentId]);
    };
    privateChannel.listen('.message.sent', handler);
    return () => {
      privateChannel.stopListening('.message.sent', handler);
      echo.leave(channelName);
    };
  }, [residentId, queryClient]);

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/resident-contacts', { ...body, resident_id: Number(residentId) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['resident-contacts', residentId]);
      setShowForm(false);
      setForm({ name: '', email: '', phone: '', relation: '' });
    },
    onError: (e) => {
      logger.error('Create contact failed', e);
      alert(e?.response?.data?.message || 'Failed to add contact');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/resident-contacts/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries(['resident-contacts', residentId]);
      setEditing(null);
      setForm({ name: '', email: '', phone: '', relation: '' });
    },
    onError: (e) => {
      logger.error('Update contact failed', e);
      alert(e?.response?.data?.message || 'Failed to update');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/resident-contacts/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['resident-contacts', residentId]),
    onError: (e) => alert(e?.response?.data?.message || 'Failed to delete'),
  });

  const handleSendInvite = async (contact) => {
    try {
      const res = await api.post(`/resident-contacts/${contact.id}/send-invite`);
      const message = res.data?.message;
      const link = res.data?.invite_link;
      if (message) {
        setInviteLink({ link: link || '', name: contact.name, sentTo: contact.email });
      } else if (link) {
        setInviteLink({ link, name: contact.name, sentTo: null });
      } else {
        alert('Invite created but no link returned.');
      }
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to send invite');
    }
  };

  const copyLink = () => {
    if (inviteLink?.link) {
      navigator.clipboard.writeText(inviteLink.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const phoneRaw = String(form.phone ?? '').trim();
    const phoneDigits = phoneRaw === '' ? '' : unformatPhoneNumber(phoneRaw);
    const phoneForApi = phoneDigits === '' ? null : phoneDigits;
    const payload = { ...form, phone: phoneForApi };

    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || '',
      email: c.email || '',
      phone: c.phone ? formatPhoneNumber(String(c.phone)) : '',
      relation: c.relation || '',
    });
    setShowForm(true);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', relation: '' });
    setShowForm(true);
  };

  return (
    <>
      <ConfirmDialog
        isOpen={deleteContactId != null}
        onClose={() => !deleteMutation.isPending && setDeleteContactId(null)}
        onConfirm={() => {
          if (deleteContactId == null) return;
          deleteMutation.mutate(deleteContactId, { onSuccess: () => setDeleteContactId(null) });
        }}
        title="Remove this contact?"
        description="This contact will be removed from the resident."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deleteMutation.isPending}
      />
    <div className="max-w-6xl mx-auto px-1">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Family Portal (Resident Contacts)</h1>
        <p className="text-gray-600 mt-2 text-[15px] leading-relaxed">
          Add family members as contacts for a resident, then send them an invite so they can log in to the Family Portal to view care updates and messages.
        </p>
      </div>

      <SectionCard title="" className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {branchesList.length > 0 && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                Branch (optional)
              </label>
              <select
                value={branchId}
                onChange={(e) => { setBranchId(e.target.value); setResidentId(''); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] transition-shadow"
              >
                <option value="">All branches</option>
                {branchesList.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className={branchesList.length > 0 ? '' : 'sm:col-span-2'}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Resident</label>
            <select
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
              disabled={residentsLoading}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">
                {residentsLoading ? 'Loading residents...' : residentsError ? 'Failed to load residents' : residents.length === 0 ? 'No residents found' : 'Choose a resident...'}
              </option>
              {residents.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {residentsError && (
              <p className="mt-1.5 text-sm text-red-600">{residentsError?.response?.data?.message || residentsError?.message || 'Could not load residents.'}</p>
            )}
            {!residentsLoading && !residentsError && residents.length === 0 && (
              <p className="mt-1.5 text-sm text-gray-600">Add residents from the Residents page first, then they will appear here.</p>
            )}
          </div>
        </div>
      </SectionCard>

      {!residentId && (
        <SectionCard className="border border-gray-200/80 shadow-sm">
          <EmptyState
            icon={Users}
            title="Select a resident"
            description="Choose a resident above to view and manage their family contacts."
          />
        </SectionCard>
      )}

      {residentId && (
        <>
          {inviteLink && (
            <SectionCard className="mb-6 border-green-200 bg-green-50/50">
              <p className="text-sm font-medium text-green-800 mb-3">
                {inviteLink.sentTo ? (
                  <>Invite sent to {inviteLink.sentTo}</>
                ) : (
                  <>Invite link for {inviteLink.name}</>
                )}
              </p>
              {inviteLink.link && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink.link}
                      className="flex-1 min-w-0 text-sm border border-green-300 rounded-lg px-3 py-2 bg-white text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={copyLink}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteLink(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                  <p className="text-xs text-green-700 mt-2">
                    {inviteLink.sentTo ? 'They can use the link above to sign up. You can still copy it if needed.' : 'Send this link to the family member so they can sign up and access the portal.'}
                  </p>
                </>
              )}
              {!inviteLink.link && (
                <button type="button" onClick={() => setInviteLink(null)} className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  Close
                </button>
              )}
            </SectionCard>
          )}

          <Modal
            isOpen={showForm}
            onClose={() => { setShowForm(false); setEditing(null); }}
            title={editing ? 'Edit contact' : 'Add contact'}
            size="md"
          >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relation (e.g. spouse, child)</label>
                    <input
                      type="text"
                      value={form.relation}
                      onChange={(e) => setForm((f) => ({ ...f, relation: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (needed for invite)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    autoComplete="tel"
                    inputMode="numeric"
                    placeholder="(425) 555-0123"
                    maxLength={14}
                    value={form.phone}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      setForm((f) => ({ ...f, phone: formatted }));
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:opacity-90 transition-opacity">
                    {editing ? 'Update' : 'Add contact'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
          </Modal>

          <SectionCard title="Contacts">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <button type="button" onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:opacity-90 transition-opacity">
                  <Plus className="w-4 h-4" />
                  Add contact
                </button>
            </div>
            {isLoading ? (
              <p className="text-gray-500 py-4">Loading contacts...</p>
            ) : contacts.length === 0 ? (
              <EmptyState icon={Users} title="No contacts" description="Add a family member as a contact, then send them an invite to access the Family Portal." />
            ) : (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden -mx-1 sm:mx-0">
                {contacts.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4 px-3 sm:px-4 hover:bg-gray-50/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {c.email || 'No email'}
                        {c.relation ? ` · ${c.relation}` : ''}
                        {c.phone ? ` · ${formatPhoneNumber(String(c.phone)) || c.phone}` : ''}
                      </p>
                      {c.user_id && <span className="inline-block mt-1 text-xs text-green-600 font-medium">Portal access linked</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.email && (
                        <Tooltip content="Send portal invite" position="top">
                          <button
                            type="button"
                            onClick={() => handleSendInvite(c)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Send portal invite"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip content="Edit" position="top">
                        <button type="button" onClick={() => openEdit(c)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Edit contact">
                          <Edit className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Delete" position="top">
                        <button
                          type="button"
                          onClick={() => setDeleteContactId(c.id)}
                          className="p-2 text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 rounded-lg transition-colors"
                          aria-label="Delete contact"
                        >
                          <Trash2 className="w-5 h-5" strokeWidth={2} />
                        </button>
                      </Tooltip>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Messages with family">
            <p className="text-sm text-gray-600 mb-4">View and reply to messages from this resident&apos;s family in the Family Portal.</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col" style={{ minHeight: 280 }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50" style={{ maxHeight: 320 }}>
                {messagesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--theme-primary)]" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No messages yet. Family can message you from the portal; replies appear here.</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.sender_type === 'staff' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-4 py-2 ${
                          m.sender_type === 'staff'
                            ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-xs opacity-90">{m.sender_name}</p>
                        <p className="text-sm mt-0.5">{m.body}</p>
                        <p className="text-xs opacity-70 mt-1">{m.created_at ? format(new Date(m.created_at), 'MMM d, h:mm a') : ''}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-gray-200 p-3 flex gap-2 bg-white">
                <input
                  type="text"
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Type a message to family..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (messageBody.trim() && residentId) sendMessageMutation.mutate();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => residentId && messageBody.trim() && sendMessageMutation.mutate()}
                  disabled={!messageBody.trim() || !residentId || sendMessageMutation.isPending}
                  className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
    </>
  );
}
