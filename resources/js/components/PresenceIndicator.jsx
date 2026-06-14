import React, { useState, useEffect, useRef } from 'react';
import { Users } from 'lucide-react';
import { getEcho } from '../services/echo';
import logger from '../utils/logger';

/**
 * Presence Indicator Component
 * Shows active users in the facility/branch
 */
export default function PresenceIndicator({ facilityId, branchId }) {
  const [activeUsers, setActiveUsers] = useState([]);
  const [count, setCount] = useState(0);
  const echoRef = useRef(null);

  useEffect(() => {
    if (!facilityId && !branchId) {
      return;
    }

    const echo = getEcho();
    if (!echo) {
      return;
    }

    echoRef.current = echo;

    // Subscribe to presence channel
    const channelName = facilityId
      ? `presence-facility.${facilityId}`
      : branchId
      ? `presence-branch.${branchId}`
      : null;

    if (!channelName) {
      return;
    }

    const presenceChannel = echo.join(channelName)
      .here((users) => {
        setActiveUsers(users);
        setCount(users.length);
      })
      .joining((user) => {
        setActiveUsers((prev) => [...prev, user]);
        setCount((prev) => prev + 1);
      })
      .leaving((user) => {
        setActiveUsers((prev) => prev.filter((u) => u.id !== user.id));
        setCount((prev) => Math.max(0, prev - 1));
      })
      .error((error) => {
        logger.error('[Presence] Error:', error);
      });

    return () => {
      presenceChannel.leave();
    };
  }, [facilityId, branchId]);

  if (count === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs">
      <Users className="w-3 h-3" />
      <span>{count} active</span>
    </div>
  );
}
