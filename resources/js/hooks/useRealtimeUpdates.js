import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getEcho } from '../services/echo';
import { toast } from 'sonner';

/**
 * Core hook: subscribe to one or more Echo channels and react to events.
 *
 * @param {Array}  channels  - Array of { channel, events, onEvent }
 * @param {Object} options   - { invalidateQueries, queryKeys, showToast, getToastMessage }
 */
export function useRealtimeUpdates(channels, options = {}) {
    const queryClient = useQueryClient();
    // Stable refs so we don't restart subscriptions on every render
    const channelsRef = useRef(channels);
    const optionsRef  = useRef(options);
    channelsRef.current = channels;
    optionsRef.current  = options;

    useEffect(() => {
        const echo = getEcho();
        if (!echo) return;

        const cleanups = [];

        channelsRef.current.forEach(({ channel, events, onEvent }) => {
            if (!channel || !events?.length) return;

            const echoChannel = echo.channel(channel);

            events.forEach((eventName) => {
                const listener = (data) => {
                    const opts = optionsRef.current;

                    if (onEvent) onEvent(eventName, data, queryClient);

                    if (opts.invalidateQueries !== false) {
                        (opts.queryKeys || []).forEach((key) =>
                            queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] })
                        );
                    }

                    if (opts.showToast && data) {
                        const message = opts.getToastMessage
                            ? opts.getToastMessage(eventName, data)
                            : `Update: ${eventName}`;
                        toast.info(message, { duration: 4000 });
                    }
                };

                echoChannel.listen(`.${eventName}`, listener);
                cleanups.push(() => echoChannel.stopListening(`.${eventName}`, listener));
            });
        });

        return () => cleanups.forEach((fn) => fn());
        // We only re-subscribe when the channel identity changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        // Stringify the stable parts (channel names + event names) to detect real changes
        JSON.stringify(channels.map(({ channel, events }) => ({ channel, events }))),
    ]);
}

// ---------------------------------------------------------------------------
// Scoped convenience hooks
// ---------------------------------------------------------------------------

/** Listen to all events on a facility-wide public channel */
export function useFacilityUpdates(facilityId, eventTypes = [], options = {}) {
    const channels = facilityId
        ? [{ channel: `facility.${facilityId}`, events: eventTypes, onEvent: options.onEvent }]
        : [];

    useRealtimeUpdates(channels, {
        queryKeys: options.queryKeys || [],
        invalidateQueries: options.invalidateQueries,
        showToast: options.showToast,
        getToastMessage: options.getToastMessage,
    });
}

/** Listen to branch-specific events */
export function useBranchUpdates(branchId, eventTypes = [], options = {}) {
    const channels = branchId
        ? [{ channel: `branch.${branchId}`, events: eventTypes, onEvent: options.onEvent }]
        : [];

    useRealtimeUpdates(channels, {
        queryKeys: options.queryKeys || [],
        invalidateQueries: options.invalidateQueries,
        showToast: options.showToast,
        getToastMessage: options.getToastMessage,
    });
}

/** Listen to resident-specific events */
export function useResidentUpdates(residentId, eventTypes = [], options = {}) {
    const channels = residentId
        ? [{ channel: `resident.${residentId}`, events: eventTypes, onEvent: options.onEvent }]
        : [];

    useRealtimeUpdates(channels, {
        queryKeys: options.queryKeys || [],
        invalidateQueries: options.invalidateQueries,
        showToast: options.showToast,
        getToastMessage: options.getToastMessage,
    });
}

/**
 * Listen to staff clock-in / clock-out events on the facility channel.
 * Automatically invalidates the staff-clock-ins queries.
 */
export function useStaffClockUpdates(facilityId, options = {}) {
    const queryClient = useQueryClient();

    const channels = facilityId
        ? [{
            channel: `facility.${facilityId}`,
            events: ['staff.clock.clock_in', 'staff.clock.clock_out'],
            onEvent: (eventName, data) => {
                // Invalidate all clock-in related queries
                queryClient.invalidateQueries({ queryKey: ['staff-clock-ins'] });
                queryClient.invalidateQueries({ queryKey: ['staff-clock-ins-all'] });
                queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

                if (options.onEvent) options.onEvent(eventName, data);

                if (options.showToast !== false) {
                    const action = eventName.endsWith('clock_in') ? 'clocked in' : 'clocked out';
                    const staffName = data?.staff?.name ?? 'A staff member';
                    toast.info(`${staffName} ${action}`, { duration: 3500 });
                }
            },
          }]
        : [];

    useRealtimeUpdates(channels, { invalidateQueries: false });
}

/**
 * Listen to the user's private notification channel.
 * Fires a toast and invalidates the notifications query.
 */
export function useUserNotifications(userId, options = {}) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!userId) return;

        const echo = getEcho();
        if (!echo) return;

        const privateChannel = echo.private(`App.Models.User.${userId}`);

        const listener = (data) => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });

            if (options.showToast !== false) {
                toast.info(data.title || 'New Notification', {
                    description: data.message,
                    duration: 5000,
                    action: data.action_url
                        ? { label: 'View', onClick: () => { window.location.href = data.action_url; } }
                        : undefined,
                });
            }

            if (options.onNotification) options.onNotification(data);
        };

        privateChannel.listen('.notification.created', listener);

        return () => privateChannel.stopListening('.notification.created', listener);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);
}
