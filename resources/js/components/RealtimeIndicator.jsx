import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Radio } from 'lucide-react';
import { getEcho } from '../services/echo';

/**
 * Real-time Connection Indicator
 * Shows the status of WebSocket connection
 */
export default function RealtimeIndicator() {
  const [connected, setConnected] = useState(false);
  const [echo, setEcho] = useState(null);

  useEffect(() => {
    const echoInstance = getEcho();
    if (!echoInstance) {
      return;
    }

    setEcho(echoInstance);

    const pusher = echoInstance.connector.pusher;

    // Check initial connection state
    setConnected(pusher.connection.state === 'connected');

    // Listen to connection events
    const handleConnected = () => {
      setConnected(true);
    };

    const handleDisconnected = () => {
      setConnected(false);
    };

    pusher.connection.bind('connected', handleConnected);
    pusher.connection.bind('disconnected', handleDisconnected);
    pusher.connection.bind('error', handleDisconnected);

    return () => {
      pusher.connection.unbind('connected', handleConnected);
      pusher.connection.unbind('disconnected', handleDisconnected);
      pusher.connection.unbind('error', handleDisconnected);
    };
  }, []);

  if (!echo) {
    return null; // Don't show if Echo is not configured
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm ${
          connected
            ? 'bg-green-100 text-green-700 border border-green-200'
            : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
        }`}
        title={connected ? 'Real-time updates active' : 'Real-time updates disconnected'}
      >
        {connected ? (
          <>
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Live</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
          </>
        )}
      </div>
    </div>
  );
}
