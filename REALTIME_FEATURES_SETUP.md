# Real-time Features Setup Guide

This document explains how to set up and use the real-time features in the application.

## Overview

The application now supports real-time updates using Laravel Echo and Pusher. This enables:
- Live medication administration updates
- Real-time vital signs entries
- Instant incident notifications
- Live user presence tracking
- Real-time notifications

## Prerequisites

1. **Pusher Account**: Sign up at [pusher.com](https://pusher.com) (free tier available)
2. **Environment Variables**: Configure Pusher credentials in your `.env` file

## Configuration

### 1. Environment Variables

Add the following to your `.env` file:

```env
BROADCAST_CONNECTION=pusher

PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret
PUSHER_APP_CLUSTER=your_cluster
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https
```

### 2. Frontend Environment Variables

Add to your `.env` or Vite configuration:

```env
VITE_PUSHER_APP_KEY=your_app_key
VITE_PUSHER_APP_CLUSTER=your_cluster
VITE_PUSHER_HOST=
VITE_PUSHER_PORT=443
VITE_PUSHER_SCHEME=https
```

### 3. Queue Configuration

Real-time events are queued for better performance. Ensure your queue worker is running:

```bash
php artisan queue:work
```

Or use Laravel Horizon if configured.

## Features

### 1. Real-time Medication Administrations

When a medication is administered, all relevant users receive instant updates:
- Caregivers assigned to the resident
- Facility/branch administrators
- Users viewing the resident's medication page

**Channels:**
- `facility.{facilityId}` - All users in the facility
- `branch.{branchId}` - All users in the branch
- `resident.{residentId}` - Caregivers assigned to the resident

**Event:** `medication.administration.created`

### 2. Real-time Vital Signs

When vital signs are recorded, updates are broadcast immediately:
- Critical vitals trigger alerts
- All caregivers and admins are notified
- Real-time updates on vitals pages

**Channels:** Same as medication administrations

**Event:** `vital.sign.created`

### 3. Real-time Incidents

Incident reports are broadcast in real-time:
- All administrators receive instant notifications
- Assigned staff are notified
- Updates appear immediately on incident pages

**Channels:** Same as above

**Event:** `incident.created`

### 4. Real-time Notifications

User-specific notifications are delivered instantly:
- Private channel per user
- No polling required
- Instant delivery

**Channel:** `App.Models.User.{userId}` (private)

**Event:** `notification.created`

### 5. Presence Tracking

See who's currently active in your facility/branch:
- Real-time user presence
- Active user count
- Join/leave notifications

**Channels:**
- `presence-facility.{facilityId}` - Facility-wide presence
- `presence-branch.{branchId}` - Branch-specific presence

## Usage in Components

### Using Real-time Hooks

```javascript
import { useResidentUpdates, useBranchUpdates, useFacilityUpdates, useUserNotifications } from '../hooks/useRealtimeUpdates';

function MyComponent() {
  // Listen to resident-specific updates
  useResidentUpdates(residentId, ['medication.administration.created'], {
    queryKeys: [['medications', residentId]],
    showToast: true,
    getToastMessage: (eventName, data) => {
      return `${data.medication?.name} was administered`;
    },
  });

  // Listen to branch updates
  useBranchUpdates(branchId, ['vital.sign.created'], {
    queryKeys: [['vitals', branchId]],
  });

  // Listen to user notifications
  useUserNotifications(userId, {
    showToast: true,
  });
}
```

### Real-time Indicator

The `RealtimeIndicator` component shows connection status:

```javascript
import RealtimeIndicator from '../components/RealtimeIndicator';

// Automatically included in Layout.jsx
```

### Presence Indicator

Show active users:

```javascript
import PresenceIndicator from '../components/PresenceIndicator';

<PresenceIndicator facilityId={facilityId} branchId={branchId} />
```

## Testing

### 1. Test Real-time Updates

1. Open the application in two browser windows
2. In one window, create a medication administration
3. Watch the other window update automatically

### 2. Test Notifications

1. Trigger a notification (e.g., record vital signs)
2. Check that the notification appears instantly
3. Verify toast notifications appear

### 3. Test Presence

1. Open the application in multiple tabs
2. Check the presence indicator
3. Close a tab and verify the count decreases

## Troubleshooting

### Connection Issues

1. **Check Pusher credentials**: Verify all environment variables are set correctly
2. **Check network**: Ensure WebSocket connections are allowed
3. **Check console**: Look for Echo connection errors in browser console

### Events Not Broadcasting

1. **Check queue**: Ensure queue worker is running
2. **Check logs**: Review Laravel logs for broadcasting errors
3. **Check channels**: Verify channel authorization in `routes/channels.php`

### Authentication Issues

1. **Check auth endpoint**: Verify `/api/v1/broadcasting/auth` is accessible
2. **Check token**: Ensure user is authenticated with valid Sanctum token
3. **Check CORS**: Verify CORS settings allow Pusher requests

## Performance Considerations

- Events are queued to prevent blocking
- Presence channels are efficient and don't impact performance
- Real-time updates complement polling, not replace it
- Use `showToast: false` for high-frequency events

## Security

- All channels require authentication
- Private channels are user-specific
- Presence channels verify facility/branch membership
- Channel authorization is enforced server-side

## Next Steps

1. Configure Pusher credentials
2. Test real-time features
3. Monitor performance
4. Customize event handlers as needed

For more information, see:
- [Laravel Broadcasting Documentation](https://laravel.com/docs/broadcasting)
- [Pusher Documentation](https://pusher.com/docs)
- [Laravel Echo Documentation](https://laravel.com/docs/echo)
