import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { clearStoredAuth } from '../services/api';
import { clearCachedCurrentUser, clearFacilityBrandingStash } from '../queries/currentUser';
import { Clock, MapPin, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { getUserLocation } from '../utils/location';
import SectionCard from '../components/SectionCard';
import logger from '../utils/logger';

export default function StaffClock() {
    const queryClient = useQueryClient();
    const [location, setLocation] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [error, setError] = useState('');

    // Get current clock-in status
    const { data: currentStatus, isLoading: statusLoading } = useQuery({
        queryKey: ['staff-clock-in-current'],
        queryFn: async () => {
            const response = await api.get('/staff/clock-ins/current');
            return response.data;
        },
        refetchInterval: 60000, // Refetch every 60 seconds
        refetchIntervalInBackground: false,
    });

    // Get stats
    const { data: stats } = useQuery({
        queryKey: ['staff-clock-ins-stats'],
        queryFn: async () => {
            const response = await api.get('/staff/clock-ins/stats');
            return response.data;
        },
        refetchInterval: 120000, // Refetch every 2 minutes
        refetchIntervalInBackground: false,
    });

    // Get recent clock-ins
    const { data: clockIns } = useQuery({
        queryKey: ['staff-clock-ins'],
        queryFn: async () => {
            const response = await api.get('/staff/clock-ins', {
                params: { per_page: 10 }
            });
            return response.data;
        },
    });

    // Get location on mount
    useEffect(() => {
        const requestLocation = async () => {
            setLocationLoading(true);
            try {
                const loc = await getUserLocation({
                    timeout: 10000,
                    maximumAge: 0,
                    enableHighAccuracy: true,
                });
                if (loc) {
                    setLocation(loc);
                }
            } catch (err) {
                logger.warn('Failed to get location:', err);
            } finally {
                setLocationLoading(false);
            }
        };
        requestLocation();
    }, []);

    const clockInMutation = useMutation({
        mutationFn: async () => {
            if (!location) {
                const loc = await getUserLocation({
                    timeout: 10000,
                    maximumAge: 0,
                    enableHighAccuracy: true,
                });
                if (!loc) {
                    throw new Error('Location is required to clock in');
                }
                setLocation(loc);
                return api.post('/staff/clock-in', {
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                });
            }
            return api.post('/staff/clock-in', {
                latitude: location.latitude,
                longitude: location.longitude,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['staff-clock-in-current']);
            queryClient.invalidateQueries(['staff-clock-ins-stats']);
            queryClient.invalidateQueries(['staff-clock-ins']);
            setError('');
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Failed to clock in');
        },
    });

    const clockOutMutation = useMutation({
        mutationFn: async () => {
            return api.post('/staff/clock-out', {
                latitude: location?.latitude || null,
                longitude: location?.longitude || null,
            });
        },
        onSuccess: async () => {
            queryClient.invalidateQueries(['staff-clock-in-current']);
            queryClient.invalidateQueries(['staff-clock-ins-stats']);
            queryClient.invalidateQueries(['staff-clock-ins']);
            setError('');
            try {
                await api.post('/logout');
            } catch (err) {
                logger.error('Logout after clock-out failed:', err);
            } finally {
                clearCachedCurrentUser(queryClient);
                clearStoredAuth();
                clearFacilityBrandingStash();
                window.location.href = '/login';
            }
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Failed to clock out');
        },
    });

    const isClockedIn = currentStatus?.clocked_in || false;
    const clockInRecord = currentStatus?.clock_in;

    return (
        <div className="space-y-6">
            <SectionCard>
                <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-600 rounded-full mb-6">
                        <Clock className="w-12 h-12 text-white" />
                    </div>
                    
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Clock-In/Out</h1>
                    
                    {/* Location Status */}
                    {location ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg mb-4">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-900">Location Verified</span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                            {locationLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                                    <span className="text-sm text-yellow-900">Getting location...</span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                                    <span className="text-sm text-yellow-900">Location required</span>
                                </>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-900">{error}</p>
                        </div>
                    )}

                    {/* Current Status */}
                    {statusLoading ? (
                        <p className="text-gray-600 mt-4">Loading...</p>
                    ) : isClockedIn && clockInRecord ? (
                        <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-lg font-semibold text-blue-900 mb-2">Currently Clocked In</p>
                            <p className="text-sm text-blue-700">
                                Clocked in at {new Date(clockInRecord.clock_in_at).toLocaleString()}
                            </p>
                            {clockInRecord.branch && (
                                <p className="text-sm text-blue-700">Branch: {clockInRecord.branch.name}</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-600 mt-4">Not currently clocked in</p>
                    )}

                    {/* Clock In/Out Buttons */}
                    <div className="flex gap-4 justify-center mt-8">
                        <button
                            onClick={() => clockInMutation.mutate()}
                            disabled={clockInMutation.isPending || isClockedIn || !location}
                            className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-3 text-lg"
                        >
                            <Clock className="w-6 h-6" />
                            {clockInMutation.isPending ? 'Clocking In...' : 'Clock In'}
                        </button>
                        <button
                            onClick={() => clockOutMutation.mutate()}
                            disabled={clockOutMutation.isPending || !isClockedIn}
                            className="px-8 py-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-3 text-lg"
                        >
                            <Clock className="w-6 h-6" />
                            {clockOutMutation.isPending ? 'Clocking Out...' : 'Clock Out'}
                        </button>
                    </div>

                    {/* Stats */}
                    {stats && (
                        <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-gray-200">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{stats.today_hours || 0}</p>
                                <p className="text-sm text-gray-600">Today (hours)</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{stats.week_hours || 0}</p>
                                <p className="text-sm text-gray-600">This Week (hours)</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{stats.month_hours || 0}</p>
                                <p className="text-sm text-gray-600">This Month (hours)</p>
                            </div>
                        </div>
                    )}
                </div>
            </SectionCard>

            {/* Recent Clock-Ins */}
            {clockIns?.data && clockIns.data.length > 0 && (
                <SectionCard>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Clock-Ins</h2>
                    <div className="space-y-3">
                        {clockIns.data.map((clockIn) => (
                            <div
                                key={clockIn.id}
                                className="p-4 border border-gray-200 rounded-lg flex items-center justify-between"
                            >
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {new Date(clockIn.clock_in_at).toLocaleString()}
                                    </p>
                                    {clockIn.clock_out_at && (
                                        <p className="text-sm text-gray-600">
                                            Out: {new Date(clockIn.clock_out_at).toLocaleString()}
                                        </p>
                                    )}
                                    {clockIn.total_hours && (
                                        <p className="text-sm text-blue-600 font-medium">
                                            {clockIn.total_hours} hours
                                        </p>
                                    )}
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    clockIn.is_active
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {clockIn.is_active ? 'Active' : 'Completed'}
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}
        </div>
    );
}

