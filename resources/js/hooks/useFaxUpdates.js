import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useFacilityUpdates } from './useRealtimeUpdates';
import { FAX_NAMESPACE, FAXES_NAMESPACE, FAX_COST_SUMMARY_NAMESPACE } from '../queries/fax';

/**
 * Subscribe to facility-wide fax events and invalidate the relevant React Query caches.
 *
 * Events listened to (broadcast on `facility.{facilityId}`):
 *   - fax.status.updated → invalidates lists, the specific fax detail (if present), and cost summary
 *   - fax.received       → invalidates inbound list + cost summary, optional toast
 *
 * Usage:
 *   useFaxUpdates(currentUser?.facility_id);
 *   useFaxUpdates(facilityId, { showToast: false });
 */
export default function useFaxUpdates(facilityId, options = {}) {
    const { showToast = true, onEvent } = options;
    const queryClient = useQueryClient();

    useFacilityUpdates(
        facilityId,
        ['fax.status.updated', 'fax.received'],
        {
            invalidateQueries: false,
            onEvent: (eventName, data) => {
                queryClient.invalidateQueries({ queryKey: FAXES_NAMESPACE });
                queryClient.invalidateQueries({ queryKey: FAX_COST_SUMMARY_NAMESPACE });

                if (data?.id != null) {
                    queryClient.invalidateQueries({ queryKey: [...FAX_NAMESPACE, data.id] });
                }

                if (eventName === 'fax.received' && showToast) {
                    const from = data?.from_number ? ` from ${data.from_number}` : '';
                    toast.info(`New fax received${from}`, { duration: 5000 });
                }

                if (onEvent) onEvent(eventName, data);
            },
        }
    );
}

export { useFaxUpdates };
