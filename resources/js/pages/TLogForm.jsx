import React, { useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, Trash2, FileText, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import logger from '../utils/logger';
import FormInput from '../components/forms/FormInput';
import FormTextarea from '../components/forms/FormTextarea';
import FormSelect from '../components/forms/FormSelect';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { toast } from 'sonner';

const TLOG_TYPES = [
    { value: 'health', label: 'Health' },
    { value: 'notes', label: 'Notes' },
    { value: 'follow-up', label: 'Follow-up' },
    { value: 'behavior', label: 'Behavior' },
    { value: 'contacts', label: 'Contacts' },
    { value: 'general', label: 'General' },
];

const NOTIFICATION_LEVELS = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

export default function TLogForm({ tLog, onClose, onSuccess }) {
    const queryClient = useQueryClient();
    const [attachments, setAttachments] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState([]);
    const [attachmentDeleteId, setAttachmentDeleteId] = useState(null);

    const methods = useForm({
        defaultValues: {
            resident_id: tLog?.resident_id || '',
            types: tLog?.types || [],
            notification_level: tLog?.notification_level || 'low',
            summary: tLog?.summary || '',
            description: tLog?.description || '',
            reporter_id: tLog?.reporter_id || '',
            reported_on: tLog?.reported_on 
                ? new Date(tLog.reported_on).toISOString().slice(0, 16)
                : new Date().toISOString().slice(0, 16),
        },
    });

    // Fetch current user to check if caregiver
    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const res = await api.get('/user');
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Determine if user is a caregiver
    const isCaregiver = useMemo(() => {
        if (!currentUser) {
            return false;
        }

        const truthyValues = [
            currentUser.is_caregiver,
            currentUser.isCaregiver,
            currentUser.caregiver,
            currentUser.is_care_giver,
        ];

        const normalizeToBoolean = (value) => {
            if (typeof value === 'boolean') return value;
            if (typeof value === 'number') return value === 1;
            if (typeof value === 'string') {
                const normalized = value.trim().toLowerCase();
                return ['1', 'true', 'yes', 'y', 'caregiver', 'care_giver'].includes(normalized);
            }
            return false;
        };

        if (truthyValues.some(normalizeToBoolean)) {
            return true;
        }

        const candidateValues = [];
        const collectCandidate = (value) => {
            if (value !== null && value !== undefined && value !== '') {
                candidateValues.push(String(value));
            }
        };

        collectCandidate(currentUser.role);
        collectCandidate(currentUser.position);
        collectCandidate(currentUser.primary_role);
        collectCandidate(currentUser.job_title);

        const roles = currentUser.roles;
        if (Array.isArray(roles)) {
            roles.forEach((roleItem) => {
                if (!roleItem) return;
                if (typeof roleItem === 'string') {
                    collectCandidate(roleItem);
                } else {
                    collectCandidate(roleItem.name);
                    collectCandidate(roleItem.title);
                }
            });
        } else if (roles?.data && Array.isArray(roles.data)) {
            roles.data.forEach((roleItem) => {
                if (!roleItem) return;
                if (typeof roleItem === 'string') {
                    collectCandidate(roleItem);
                } else {
                    collectCandidate(roleItem.name);
                    collectCandidate(roleItem.title);
                }
            });
        }

        return candidateValues.some((value) => {
            const lower = value.toLowerCase().trim();
            if (!lower) {
                return false;
            }
            const normalized = lower.replace(/[\s_-]/g, '');
            if (normalized === 'caregiver') {
                return true;
            }
            return lower.includes('care') && lower.includes('giver');
        });
    }, [currentUser]);

    const caregiverBranchId = useMemo(() => {
        if (!isCaregiver) {
            return null;
        }
        return currentUser?.assigned_branch_id ? String(currentUser.assigned_branch_id) : null;
    }, [isCaregiver, currentUser?.assigned_branch_id]);

    // Fetch residents (filtered by branch if caregiver, all residents for admins)
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list', isCaregiver ? caregiverBranchId || 'none' : 'all'],
        queryFn: async () => {
            const params = { per_page: 100 };
            // For caregivers, only show residents from their assigned branch
            // For admins and other non-caregivers, show all residents (no branch_id filter)
            if (isCaregiver && caregiverBranchId) {
                params.branch_id = caregiverBranchId;
            }
            return (await api.get('/residents', { params })).data;
        },
        enabled: currentUser !== undefined, // Wait for user data to load
    });

    // Fetch users for reporter
    const { data: usersData } = useQuery({
        queryKey: ['users-list'],
        queryFn: async () => {
            return (await api.get('/users', { params: { per_page: 100 } })).data;
        },
    });

    // Load existing attachments if editing
    useEffect(() => {
        if (tLog?.attachments) {
            setExistingAttachments(tLog.attachments);
        }
    }, [tLog]);

    useEffect(() => {
        if (currentUser === undefined) {
            return;
        }
        if (isCaregiver && tLog) {
            toast.error('You can add new progress notes or view existing ones, but not edit them.');
            onClose();
        }
    }, [currentUser, isCaregiver, tLog, onClose]);

    const createMutation = useMutation({
        mutationFn: async (formDataToSend) => {
            return await api.post('/t-logs', formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['t-logs']);
            toast.success('Progress note created successfully', '', { isFormSubmission: true });
            onSuccess?.();
        },
        onError: (error) => {
            logger.error('Error creating progress note:', error);
            toast.error(error.response?.data?.message || 'Failed to create progress note');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            return await api.put(`/t-logs/${id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['t-logs']);
            toast.success('Progress note updated successfully', '', { isFormSubmission: true });
            onSuccess?.();
        },
        onError: (error) => {
            logger.error('Error updating progress note:', error);
            toast.error(error.response?.data?.message || 'Failed to update progress note');
        },
    });

    const deleteAttachmentMutation = useMutation({
        mutationFn: async ({ tLogId, attachmentId }) => {
            return await api.delete(`/t-logs/${tLogId}/attachments/${attachmentId}`);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries(['t-logs']);
            toast.success('Attachment deleted successfully');
            const removedId = variables.attachmentId;
            setExistingAttachments((prev) => prev.filter((a) => a.id !== removedId));
        },
        onError: (error) => {
            logger.error('Error deleting attachment:', error);
            toast.error(error.response?.data?.message || 'Failed to delete attachment');
        },
    });

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setAttachments(prev => [...prev, ...files]);
        e.target.value = ''; // Reset input
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleConfirmAttachmentDelete = () => {
        if (attachmentDeleteId == null || !tLog?.id) return;
        deleteAttachmentMutation.mutate(
            { tLogId: tLog.id, attachmentId: attachmentDeleteId },
            { onSuccess: () => setAttachmentDeleteId(null) }
        );
    };

    const handleSubmit = (data) => {
        // Validate types
        if (!data.types || !Array.isArray(data.types) || data.types.length === 0) {
            toast.error('Please select at least one type');
            return;
        }

        const formDataToSend = new FormData();
        
        // Add all form fields
        formDataToSend.append('resident_id', data.resident_id);
        // Send types as array - Laravel will handle JSON encoding
        data.types.forEach((type, index) => {
            formDataToSend.append(`types[${index}]`, type);
        });
        formDataToSend.append('notification_level', data.notification_level);
        formDataToSend.append('summary', data.summary);
        if (data.description) {
            formDataToSend.append('description', data.description);
        }
        if (data.reporter_id) {
            formDataToSend.append('reporter_id', data.reporter_id);
        }
        if (data.reported_on) {
            formDataToSend.append('reported_on', data.reported_on);
        }

        // Add new attachments
        attachments.forEach((file, index) => {
            if (file instanceof File) {
                formDataToSend.append(`attachments[${index}]`, file);
            }
        });

        if (tLog) {
            updateMutation.mutate({ id: tLog.id, data: formDataToSend });
        } else {
            createMutation.mutate(formDataToSend);
        }
    };

    const residents = residentsData?.data || [];
    const users = usersData?.data || [];

    return (
        <>
            <ConfirmDialog
                isOpen={attachmentDeleteId != null}
                onClose={() => !deleteAttachmentMutation.isPending && setAttachmentDeleteId(null)}
                onConfirm={handleConfirmAttachmentDelete}
                title="Delete this attachment?"
                description="The file will be permanently removed from this progress note."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
                isPending={deleteAttachmentMutation.isPending}
            />
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                        title="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-semibold text-gray-900">
                        {tLog ? 'Edit progress note' : 'New progress note'}
                    </h2>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                    title="Close"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-6">
                    {/* Resident Selection - This will auto-fill branch_id */}
                    <div>
                        <FormSelect
                            name="resident_id"
                            label="Resident"
                            required
                            placeholder="Select Resident"
                            options={residents.map(resident => ({ 
                                value: resident.id, 
                                label: resident.name || `${resident.first_name} ${resident.last_name}` 
                            }))}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            The program (branch) will be automatically filled based on the selected resident.
                        </p>
                    </div>

                    {/* Types - Multi-select */}
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                            Types <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {TLOG_TYPES.map((type) => {
                                const isSelected = methods.watch('types')?.includes(type.value);
                                return (
                                    <label
                                        key={type.value}
                                        className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-bg)]'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                                const currentTypes = methods.getValues('types') || [];
                                                if (e.target.checked) {
                                                    methods.setValue('types', [...currentTypes, type.value]);
                                                } else {
                                                    methods.setValue('types', currentTypes.filter(t => t !== type.value));
                                                }
                                            }}
                                            className="w-4 h-4 text-[var(--theme-primary)] border-gray-300 rounded focus:ring-[var(--theme-primary)]"
                                        />
                                        <span className="text-sm font-medium text-gray-900">{type.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                        {methods.formState.errors.types && (
                            <p className="mt-1 text-xs text-red-600">{methods.formState.errors.types.message}</p>
                        )}
                    </div>

                    {/* Notification Level */}
                    <div>
                        <FormSelect
                            name="notification_level"
                            label="Notification Level"
                            options={NOTIFICATION_LEVELS}
                        />
                    </div>

                    {/* Summary */}
                    <div>
                        <FormInput
                            name="summary"
                            label="Summary"
                            required
                            placeholder="Enter summary"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <FormTextarea
                            name="description"
                            label="Description"
                            placeholder="Enter description (optional)"
                            rows={5}
                        />
                    </div>

                    {/* Reporter */}
                    <div>
                        <FormSelect
                            name="reporter_id"
                            label="Reporter"
                            placeholder="Select Reporter (optional)"
                            options={[
                                { value: '', label: 'None' },
                                ...users.map(user => ({ 
                                    value: user.id, 
                                    label: user.name || user.email 
                                }))
                            ]}
                        />
                    </div>

                    {/* Reported On */}
                    <div>
                        <FormInput
                            name="reported_on"
                            label="Reported On"
                            type="datetime-local"
                        />
                    </div>

                    {/* Existing Attachments */}
                    {existingAttachments.length > 0 && (
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                                Existing Attachments
                            </label>
                            <div className="space-y-2">
                                {existingAttachments.map((attachment) => (
                                    <div
                                        key={attachment.id}
                                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-gray-400" />
                                            <div>
                                                <a
                                                    href={attachment.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-[var(--theme-primary)] hover:underline"
                                                >
                                                    {attachment.file_name}
                                                </a>
                                                <p className="text-xs text-gray-500">{attachment.file_size_human}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAttachmentDeleteId(attachment.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* New Attachments */}
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                            Attachments
                        </label>
                        <div className="space-y-3">
                            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[var(--theme-primary)] transition-colors">
                                <Upload className="w-5 h-5 text-gray-400" />
                                <span className="text-sm text-gray-600">Click to upload files</span>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>

                            {attachments.length > 0 && (
                                <div className="space-y-2">
                                    {attachments.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-gray-400" />
                                                <div>
                                                    <p className="text-sm text-gray-900">{file.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {(file.size / 1024).toFixed(2)} KB
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(index)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {createMutation.isPending || updateMutation.isPending
                                ? 'Saving...'
                                : tLog
                                ? 'Update progress note'
                                : 'Create progress note'}
                        </button>
                    </div>
                </form>
            </FormProvider>
        </div>
        </>
    );
}
