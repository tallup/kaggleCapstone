import React, { useState, useEffect } from 'react';
import { WifiOff, Radio } from 'lucide-react';
import { getEcho } from '../services/echo';

/**
 * Connection status indicator (top-right)
 * - "Offline" only when the device has no network (navigator.onLine false)
 * - "Live" when online and real-time (Pusher) is connected
 * - "Updates paused" when online but real-time is disconnected (so we don't confuse with no internet)
 */
export default function RealtimeIndicator() {
  const [hasNetwork, setHasNetwork] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [echo, setEcho] = useState(null);

  // Actual network status (internet / WiFi / data)
  useEffect(() => {
    const handleOnline = () => setHasNetwork(true);
    const handleOffline = () => setHasNetwork(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Pusher/Echo real-time connection (only when Echo is configured)
  useEffect(() => {
    const echoInstance = getEcho();
    if (!echoInstance) {
      return;
    }

    setEcho(echoInstance);
    const pusher = echoInstance.connector.pusher;

    setRealtimeConnected(pusher.connection.state === 'connected');

    const handleConnected = () => setRealtimeConnected(true);
    const handleDisconnected = () => setRealtimeConnected(false);

    pusher.connection.bind('connected', handleConnected);
    pusher.connection.bind('disconnected', handleDisconnected);
    pusher.connection.bind('error', handleDisconnected);

    return () => {
      pusher.connection.unbind('connected', handleConnected);
      pusher.connection.unbind('disconnected', handleDisconnected);
      pusher.connection.unbind('error', handleDisconnected);
    };
  }, []);

  // Only show badge when offline (no network) or when live (real-time connected). Hide when "Updates paused".
  const isOffline = !hasNetwork;
  const isLive = hasNetwork && echo && realtimeConnected;

  if (!isOffline && !isLive) {
    return null; // Online but real-time not connected: show nothing
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm ${
          isOffline
            ? 'bg-red-100 text-red-700 border border-red-200'
            : 'bg-green-100 text-green-700 border border-green-200'
        }`}
        title={isOffline ? 'No internet connection' : 'Real-time updates active'}
      >
        {isOffline ? (
          <>
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
          </>
        ) : (
          <>
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Live</span>
          </>
        )}
      </div>
    </div>
  );
}
