import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';

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
    // background and redirect to login only if the token is invalid (no full-screen gate).
    const [status, setStatus] = useState(!token ? 'unauthenticated' : 'authenticated');
    const didValidate = useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus('unauthenticated');
            return;
        }

        if (skipValidation || didValidate.current) return;
        didValidate.current = true;

        let cancelled = false;

        api.post('/token/validate')
            .then(() => {
                if (cancelled) return;
                sessionStorage.setItem(VALIDATED_KEY, String(Date.now()));
                setStatus('authenticated');
            })
            .catch(() => {
                if (cancelled) return;
                sessionStorage.removeItem(VALIDATED_KEY);
                setStatus('unauthenticated');
            });

        return () => { cancelled = true; };
    }, [token, skipValidation]);

    if (status === 'unauthenticated') {
        return <Navigate to="/login" replace />;
    }

    return children;
}
