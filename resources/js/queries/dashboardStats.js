import api from '../services/api';
import logger from '../utils/logger';

export const DASHBOARD_STATS_QUERY_KEY = ['dashboard-stats'];

/**
 * Shared with Dashboard and Login prefetch so cache keys and shapes stay aligned.
 */
export async function fetchDashboardStats() {
    try {
        const response = await api.get('/dashboard/stats');
        if (response.data && response.data.data) {
            return response.data.data;
        }
        return response.data;
    } catch (err) {
        logger.error('Dashboard API error:', err);
        return null;
    }
}

export const dashboardStatsQueryOptions = {
    queryKey: DASHBOARD_STATS_QUERY_KEY,
    queryFn: fetchDashboardStats,
    retry: 1,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
};
