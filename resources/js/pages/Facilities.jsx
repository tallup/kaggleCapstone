import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToastContext } from '../contexts/ToastContext';
import {
  FacilityList
} from '../components/facility';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function Facilities() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToastContext();

  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Check if user is super admin - MUST be called before any conditional returns
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        const response = await api.get('/user');
        return response.data;
      } catch {
        return null;
      }
    },
  });

  // Facilities query - MUST be called before any conditional returns (hooks rule)
  const { data, isLoading } = useQuery({
    queryKey: ['facilities', search],
    queryFn: async () => {
      const res = await api.get('/facilities', { params: { search, per_page: 100 } });
      return res.data;
    },
    enabled: !userLoading, // Only fetch when user data is loaded
  });

  // Delete mutation - MUST be called before any conditional returns (hooks rule)
  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/facilities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['facilities']);
      showToast('Facility deleted successfully!', 'success');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Failed to delete facility';
      showToast(errorMessage, 'error');
    },
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Redirect non-super admins to dashboard
  React.useEffect(() => {
    if (!userLoading && currentUser && !isSuperAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, isSuperAdmin, userLoading, navigate]);

  // Don't render anything if not super admin (AFTER all hooks are called)
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null; // Will redirect via useEffect
  }

  // Event handlers
  const handleCreate = () => {
    navigate('/super-admin/facilities/create');
  };

  const handleEdit = (facility) => {
    navigate(`/super-admin/facilities/${facility.id}/edit`);
  };

  const handleView = (facility) => {
    navigate(`/super-admin/facilities/${facility.id}`);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  return (
    <div className="p-6">
      <ConfirmDialog
        isOpen={deleteTarget != null}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={deleteTarget ? `Delete ${deleteTarget.name}?` : ''}
        description="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deleteMutation.isPending}
      />
      <FacilityList
        facilities={data?.data || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={setDeleteTarget}
        onView={handleView}
        onCreate={handleCreate}
        searchTerm={search}
        onSearchChange={setSearch}
      />
    </div>
  );
}
