import React, { useState, useEffect, useRef } from 'react';
import api, { storeAuthToken } from '../services/api';

const VALIDATED_KEY = 'token_validated_at';
const VALIDATION_TTL_MS = 5 * 60 * 1000;

function needsValidation() {
    const last = sessionStorage.getItem(VALIDATED_KEY);
    if (!last) return true;
    return Date.now() - Number(last) > VALIDATION_TTL_MS;
}

export default function ProtectedRoute({ children }) {
    const token = localStorage.getItem('auth_token');
    const skipValidation = token && !needsValidation();
    // Optimistic: render protected UI immediately when a token exists; validate in the
    // background. If no token exists (or it's invalid), silently auto-login instead of
    // showing a login page.
    const [status, setStatus] = useState(!token ? 'pending' : 'authenticated');
    const didValidate = useRef(false);
    const didAutoLogin = useRef(false);

    useEffect(() => {
        let cancelled = false;

        const autoLogin = async () => {
            if (didAutoLogin.current) return;
            didAutoLogin.current = true;

            try {
                const response = await api.post('/auto-login');
                if (cancelled) return;
                storeAuthToken(response.data.token);
                sessionStorage.setItem(VALIDATED_KEY, String(Date.now()));
                setStatus('authenticated');
            } catch (err) {
                if (cancelled) return;
                setStatus('unavailable');
            }
        };

        if (!token) {
            autoLogin();
            return () => { cancelled = true; };
        }

        if (skipValidation || didValidate.current) return;
        didValidate.current = true;

        api.post('/token/validate')
            .then(() => {
                if (cancelled) return;
                sessionStorage.setItem(VALIDATED_KEY, String(Date.now()));
                setStatus('authenticated');
            })
            .catch(() => {
                if (cancelled) return;
                sessionStorage.removeItem(VALIDATED_KEY);
                autoLogin();
            });

        return () => { cancelled = true; };
    }, [token, skipValidation]);

    if (status === 'unavailable') {
        return (
            <div className="flex h-screen items-center justify-center text-center px-6">
                <div>
                    <p className="text-lg font-medium text-gray-800">Unable to open the dashboard automatically.</p>
                    <p className="text-sm text-gray-500 mt-1">No account is available for automatic sign-in. Contact an administrator.</p>
                </div>
            </div>
        );
    }

    if (status === 'pending') {
        return null;
    }

    return children;
}
