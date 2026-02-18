import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getEcho } from '../services/echo';
import { toast } from 'sonner';

/**
 * Hook for real-time updates
 * Listens to Echo channels and updates React Query cache
 */
export function useRealtimeUpdates(channels = [], options = {}) {
  const queryClient = useQueryClient();
  const echoRef = useRef(null);
  const listenersRef = useRef([]);

  useEffect(() => {
    const echo = getEcho();
    if (!echo) {
      return;
    }

    echoRef.current = echo;

    // Listen to each channel
    channels.forEach((channelConfig) => {
      const { channel, events, onEvent } = channelConfig;

      if (!channel || !events) {
        return;
      }

      // Subscribe to channel
      const echoChannel = echo.channel(channel);

      // Listen to each event
      events.forEach((eventName) => {
        const listener = (data) => {
          console.log(`[Realtime] Event received: ${eventName}`, data);

          // Call custom handler if provided
          if (onEvent) {
            onEvent(eventName, data, queryClient);
          }

          // Default behavior: invalidate relevant queries
          if (options.invalidateQueries !== false) {
            const queryKeys = options.queryKeys || [];
            queryKeys.forEach((queryKey) => {
              queryClient.invalidateQueries({ queryKey });
            });
          }

          // Show toast notification if enabled
          if (options.showToast && data) {
            const message = options.getToastMessage
              ? options.getToastMessage(eventName, data)
              : `New update: ${eventName}`;

            toast.success(message, {
              duration: 3000,
            });
          }
        };

        echoChannel.listen(`.${eventName}`, listener);
        listenersRef.current.push({ channel: echoChannel, event: eventName, listener });
      });
    });

    // Cleanup
    return () => {
      listenersRef.current.forEach(({ channel: echoChannel, event, listener }) => {
        echoChannel.stopListening(`.${event}`, listener);
      });
      listenersRef.current = [];
    };
  }, [channels, queryClient, options]);
}

/**
 * Hook for listening to facility-wide updates
 */
export function useFacilityUpdates(facilityId, eventTypes = [], options = {}) {
  if (!facilityId) {
    return;
  }

  const channels = [
    {
      channel: `facility.${facilityId}`,
      events: eventTypes,
      onEvent: options.onEvent,
    },
  ];

  useRealtimeUpdates(channels, {
    ...options,
    queryKeys: options.queryKeys || [],
  });
}

/**
 * Hook for listening to branch-specific updates
 */
export function useBranchUpdates(branchId, eventTypes = [], options = {}) {
  if (!branchId) {
    return;
  }

  const channels = [
    {
      channel: `branch.${branchId}`,
      events: eventTypes,
      onEvent: options.onEvent,
    },
  ];

  useRealtimeUpdates(channels, {
    ...options,
    queryKeys: options.queryKeys || [],
  });
}

/**
 * Hook for listening to resident-specific updates
 */
export function useResidentUpdates(residentId, eventTypes = [], options = {}) {
  if (!residentId) {
    return;
  }

  const channels = [
    {
      channel: `resident.${residentId}`,
      events: eventTypes,
      onEvent: options.onEvent,
    },
  ];

  useRealtimeUpdates(channels, {
    ...options,
    queryKeys: options.queryKeys || [],
  });
}

/**
 * Hook for listening to user notifications
 */
export function useUserNotifications(userId, options = {}) {
  if (!userId) {
    return;
  }

  const queryClient = useQueryClient();
  const echoRef = useRef(null);

  useEffect(() => {
    const echo = getEcho();
    if (!echo) {
      return;
    }

    echoRef.current = echo;

    // Subscribe to private channel
    const privateChannel = echo.private(`App.Models.User.${userId}`);

    const listener = (data) => {
      console.log('[Realtime] Notification received:', data);

      // Invalidate notifications query
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });

      // Show toast if enabled
      if (options.showToast !== false) {
        toast.info(data.title || 'New Notification', {
          description: data.message,
          duration: 5000,
          action: data.action_url
            ? {
                label: 'View',
                onClick: () => {
                  window.location.href = data.action_url;
                },
              }
            : undefined,
        });
      }

      // Call custom handler if provided
      if (options.onNotification) {
        options.onNotification(data);
      }
    };

    privateChannel.listen('.notification.created', listener);

    return () => {
      privateChannel.stopListening('.notification.created', listener);
    };
  }, [userId, queryClient, options]);
}
