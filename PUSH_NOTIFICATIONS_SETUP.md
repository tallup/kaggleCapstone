# Push Notifications Setup (PWA)

Push notifications allow users to receive alerts (e.g. new incidents, reminders, in-app notifications) on their device even when the app is closed or in the background.

## 1. Generate VAPID keys

Run once (e.g. on your dev machine or first deploy):

```bash
php artisan webpush:vapid
```

Add the printed values to your `.env`:

- `VAPID_PUBLIC_KEY` – backend and frontend (see below)
- `VAPID_PRIVATE_KEY` – **backend only** (keep secret)
- `VAPID_SUBJECT` – e.g. `mailto:admin@yourdomain.com`

For the frontend (Vite), add to the same `.env`:

- `VITE_VAPID_PUBLIC_KEY` – same value as `VAPID_PUBLIC_KEY`

After changing `.env`, restart your dev server and run `npm run build` for production so the public key is baked into the client bundle.

## 2. User flow

1. User opens **Profile** → **Notification Preferences**.
2. They turn **App push notifications (PWA)** **On**.
3. Browser asks for permission; after allowing, the subscription is saved and they will receive push notifications.
4. When an in-app notification is created (e.g. new incident, reminder), the same message is sent as a push to all of that user’s registered devices.

## 3. Backend

- **Routes:** `POST /api/v1/push-subscriptions` (store), `DELETE /api/v1/push-subscriptions` (remove by endpoint).
- **Table:** `user_push_subscriptions` (user_id, endpoint, public_key, auth_token, content_encoding).
- **Sending:** `App\Services\PushNotificationService` sends via `minishlink/web-push` when `App\Models\Notification` is created (see `NotificationObserver`).

## 4. Frontend

- **Profile:** Toggle “App push notifications (PWA)” to subscribe/unsubscribe (uses `resources/js/services/pushNotifications.js`).
- **Service worker:** `public/sw.js` handles the `push` and `notificationclick` events and shows the notification with your app icon.

## 5. Production

- Ensure `user_push_subscriptions` migration has been run.
- Set `VAPID_*` and `VITE_VAPID_PUBLIC_KEY` in production `.env`.
- Rebuild frontend after setting `VITE_VAPID_PUBLIC_KEY` so the key is included in the built assets.
