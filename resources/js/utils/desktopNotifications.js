import logger from './logger';


const canUseNotification = () =>
    typeof window !== 'undefined' &&
    typeof Notification !== 'undefined';

export const getNotificationPermission = () => {
    if (!canUseNotification()) return 'denied';
    return Notification.permission;
};

export const requestNotificationPermission = async () => {
    if (!canUseNotification()) return 'denied';
    try {
        const result = await Notification.requestPermission();
        return result;
    } catch (err) {
        logger.error('Notification permission request failed:', err);
        return 'denied';
    }
};

export const showDesktopNotification = ({
    title,
    body,
    icon,
    url,
} = {}) => {
    if (!canUseNotification() || Notification.permission !== 'granted') return null;

    try {
        const notification = new Notification(title || 'New Notification', {
            body: body || '',
            icon: icon || '/favicon.ico',
        });

        if (url) {
            notification.onclick = () => {
                try {
                    window.open(url, '_blank', 'noopener');
                } catch {
                    window.location.href = url;
                }
            };
        }

        return notification;
    } catch (err) {
        logger.error('Failed to show notification:', err);
        return null;
    }
};





