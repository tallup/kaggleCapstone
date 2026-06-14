import { useQuery } from '@tanstack/react-query';
import { currentUserQueryOptions } from '../queries/currentUser';

/**
 * Shared hook for accessing the current user.
 * Uses the same query key as Layout, so no duplicate API calls.
 *
 * Usage:  const { user, isLoading } = useCurrentUser();
 */
export default function useCurrentUser() {
    const { data, isLoading, error } = useQuery(currentUserQueryOptions);
    return { user: data ?? null, isLoading, error };
}
