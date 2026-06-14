import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Users, FileText } from 'lucide-react';
import api from '../../services/api';
import { useToastContext } from '../../contexts/ToastContext';
import Tabs, { TabsList, TabsTrigger, TabsContent } from '../../components/ui/radix/Tabs';
import EmailRecipientConfig from '../../components/EmailRecipientConfig';
import EmailTemplateEditor from '../../components/EmailTemplateEditor';
import NotificationTypeSelector from '../../components/NotificationTypeSelector';

export default function EmailSettings() {
  const toast = useToastContext();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('recipients');
  const [selectedNotificationType, setSelectedNotificationType] = useState('');

  // TODO: Replace with selected facility selector for super admins
  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const response = await api.get('/user');
      return response.data;
    },
  });

  const facilityId = useMemo(() => {
    const role = String(currentUser?.role || '').toLowerCase().trim();
    const isSuperAdmin = role === 'super_admin' || role === 'superadmin' || role === 'super admin';

    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('super_admin_selected_facility_id');
      if (stored && isSuperAdmin) return stored;
    }

    return (
      currentUser?.facility_id ||
      currentUser?.assigned_branch?.facility_id ||
      currentUser?.assigned_branch?.facility?.id ||
      null
    );
  }, [currentUser]);

  const { data: settings, isLoading } = useQuery({
    enabled: !!facilityId,
    queryKey: ['facility-settings', facilityId, 'email'],
    queryFn: async () => {
      const response = await api.get(`/facilities/${facilityId}/settings/email`);
      return response.data?.data || {};
    },
  });

  const defaultValues = useMemo(
    () => ({
      mail_from_address: settings?.mail_from_address?.value || '',
      mail_from_name: settings?.mail_from_name?.value || '',
      test_recipient: settings?.test_recipient?.value || '',
    }),
    [settings]
  );

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        settings: {
          mail_driver: { value: 'ses', type: 'string' }, // Always use SES
          mail_from_address: { value: values.mail_from_address, type: 'string' },
          mail_from_name: { value: values.mail_from_name, type: 'string' },
          test_recipient: { value: values.test_recipient, type: 'string' },
        },
      };

      const response = await api.put(`/facilities/${facilityId}/settings/email`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.showToast('Email settings updated successfully.', 'success', { isFormSubmission: true });
      queryClient.invalidateQueries(['facility-settings', facilityId, 'email']);
    },
    onError: (error) => {
      toast.showToast(
        error.response?.data?.message || 'Failed to update email settings',
        'error'
      );
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: async (recipient) => {
      const response = await api.post(`/facilities/${facilityId}/settings/email/test`, {
        recipient,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.showToast(`Test email sent successfully to ${data.recipient}`, 'success');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Failed to send test email';
      toast.showToast(errorMessage, 'error');
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries());
    values.mail_port = values.mail_port ? parseInt(values.mail_port, 10) : null;
    saveMutation.mutate(values);
  };

  const handleTestEmail = (event) => {
    event.preventDefault();
    // Find the form element
    const form = event.target.closest('form');
    if (!form) {
      toast.showToast('Form not found', 'error');
      return;
    }
    const formData = new FormData(form);
    const recipient = formData.get('test_recipient');
    if (!recipient) {
      toast.showToast('Please enter a test recipient email address', 'error');
      return;
    }
    testEmailMutation.mutate(recipient);
  };

  // Fetch notification configs
  const { data: notificationConfigs } = useQuery({
    enabled: !!facilityId && activeTab === 'recipients',
    queryKey: ['email-notification-configs', facilityId],
    queryFn: async () => {
      const response = await api.get(`/facilities/${facilityId}/email-notification-configs`);
      return response.data?.data || [];
    },
  });

  // Fetch templates
  const { data: templates } = useQuery({
    enabled: !!facilityId && activeTab === 'templates',
    queryKey: ['email-templates', facilityId],
    queryFn: async () => {
      const response = await api.get(`/facilities/${facilityId}/email-templates`);
      return response.data?.data || [];
    },
  });

  // Fetch specific template
  const { data: currentTemplate } = useQuery({
    enabled: !!facilityId && !!selectedNotificationType && activeTab === 'templates',
    queryKey: ['email-template', facilityId, selectedNotificationType],
    queryFn: async () => {
      try {
        const response = await api.get(
          `/facilities/${facilityId}/email-templates/${selectedNotificationType}`
        );
        return response.data?.data;
      } catch (error) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });

  // Fetch specific config
  const { data: currentConfig } = useQuery({
    enabled: !!facilityId && !!selectedNotificationType && activeTab === 'recipients',
    queryKey: ['email-notification-config', facilityId, selectedNotificationType],
    queryFn: async () => {
      try {
        const response = await api.get(
          `/facilities/${facilityId}/email-notification-configs/${selectedNotificationType}`
        );
        return response.data?.data;
      } catch (error) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });

  // Save notification config
  const saveConfigMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(
        `/facilities/${facilityId}/email-notification-configs/${selectedNotificationType}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      toast.showToast('Recipient configuration saved successfully', 'success', { isFormSubmission: true });
      queryClient.invalidateQueries(['email-notification-configs', facilityId]);
      queryClient.invalidateQueries(['email-notification-config', facilityId, selectedNotificationType]);
    },
    onError: (error) => {
      toast.showToast(
        error.response?.data?.message || 'Failed to save recipient configuration',
        'error'
      );
    },
  });

  // Save template
  const saveTemplateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(
        `/facilities/${facilityId}/email-templates/${selectedNotificationType}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      toast.showToast('Email template saved successfully', 'success', { isFormSubmission: true });
      queryClient.invalidateQueries(['email-templates', facilityId]);
      queryClient.invalidateQueries(['email-template', facilityId, selectedNotificationType]);
    },
    onError: (error) => {
      toast.showToast(
        error.response?.data?.message || 'Failed to save email template',
        'error'
      );
    },
  });

  const handleConfigChange = (configData) => {
    if (selectedNotificationType) {
      saveConfigMutation.mutate(configData);
    }
  };

  const handleTemplateSave = (templateData) => {
    if (selectedNotificationType) {
      saveTemplateMutation.mutate(templateData);
    }
  };

  if (!facilityId) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm">
        <p className="text-sm text-gray-600">
          Email settings are available once a facility is associated with your account.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-3">
        <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">
          <Mail className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Email Settings</h1>
          <p className="text-sm text-gray-500">
            Configure email delivery, recipients, and templates for this facility.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="recipients">
            <Users className="w-4 h-4 mr-2" strokeWidth={2.5} />
            Notification Recipients
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="w-4 h-4 mr-2" strokeWidth={2.5} />
            Email Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recipients">
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Configure Email Recipients
              </h2>
              <p className="text-sm text-gray-500 max-w-2xl">
                Choose a notification type below, then select which roles and users should receive those emails. Changes are saved automatically.
              </p>
            </div>

            <div className="rounded-xl border-2 border-gray-200 bg-gray-50/50 p-5">
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Step 1 — Choose notification type
              </label>
              <NotificationTypeSelector
                value={selectedNotificationType}
                onChange={setSelectedNotificationType}
                className="max-w-md bg-white"
              />
            </div>

            {selectedNotificationType && (
              <div className="rounded-xl border-2 border-gray-200 bg-white p-5 md:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Step 2 — Recipients for this notification
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Pick roles and/or specific users. They’ll get this notification by email.</p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={currentConfig?.enabled ?? true}
                      onChange={(e) => {
                        handleConfigChange({
                          enabled: e.target.checked,
                          recipient_roles: currentConfig?.recipient_roles || [],
                          recipient_user_ids: currentConfig?.recipient_user_ids || [],
                        });
                      }}
                      className="w-5 h-5 text-[var(--theme-primary)] border-gray-300 rounded focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                    <span className="text-sm font-medium text-gray-700">Enable this notification</span>
                  </label>
                </div>
                <EmailRecipientConfig
                  facilityId={facilityId}
                  config={currentConfig}
                  onChange={handleConfigChange}
                />
              </div>
            )}

            {!selectedNotificationType && (
              <p className="text-sm text-gray-500">Select a notification type above to configure recipients.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Email Template Management
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Create and customize HTML email templates for each notification type. Use variables like {'{{variableName}}'} to insert dynamic content.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Type
              </label>
              <NotificationTypeSelector
                value={selectedNotificationType}
                onChange={setSelectedNotificationType}
              />
            </div>

            {selectedNotificationType && (
              <div className="border-t border-gray-200 pt-6">
                <EmailTemplateEditor
                  facilityId={facilityId}
                  notificationType={selectedNotificationType}
                  template={currentTemplate}
                  onSave={handleTemplateSave}
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


