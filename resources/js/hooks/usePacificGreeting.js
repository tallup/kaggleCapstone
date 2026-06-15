import { useEffect, useState } from 'react';
import { getPacificGreeting, getPacificNow } from '../utils/pacificTime';

/** Live greeting that stays in sync with the Pacific uptime clock (server-synced when available). */
export function usePacificGreeting() {
    const [greeting, setGreeting] = useState(() => getPacificGreeting());

    useEffect(() => {
        const update = () => setGreeting(getPacificGreeting(getPacificNow()));
        update();
        const id = window.setInterval(update, 1000);
        return () => window.clearInterval(id);
    }, []);

    return greeting;
}
