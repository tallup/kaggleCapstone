import React, { useState, useEffect } from 'react';
import { Clock, MapPin, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import publicApi from '../../services/publicApi';
import { getUserLocation, isGeolocationSupported } from '../../utils/location';

export default function PublicStaffClockIn() {
    // Load saved employee identifier from localStorage
    const [employeeIdentifier, setEmployeeIdentifier] = useState(() => {
        return localStorage.getItem('staff_clock_in_identifier') || '';
    });
    const [clockPin, setClockPin] = useState('');
    const [needsPin, setNeedsPin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [location, setLocation] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(null);
    const [isClockedIn, setIsClockedIn] = useState(false);

    // Get location on mount
    useEffect(() => {
        const requestLocation = async () => {
            if (!isGeolocationSupported()) {
                setError('Geolocation is not supported by your browser. Please use a modern browser.');
                return;
            }

            setLocationLoading(true);
            try {
                const loc = await getUserLocation({
                    timeout: 10000,
                    maximumAge: 0,
                    enableHighAccuracy: true,
                });
                if (loc) {
                    setLocation(loc);
                } else {
                    setError('Unable to get your location. Please enable location permissions and try again.');
                }
            } catch (err) {
                setError('Failed to get location. Please enable location permissions.');
            } finally {
                setLocationLoading(false);
            }
        };

        requestLocation();
    }, []);

    const handleVerifyEmployee = async () => {
        if (!employeeIdentifier) {
            setError('Please enter your email or employee ID');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await publicApi.post('/staff/verify-employee', {
                employee_identifier: employeeIdentifier,
                clock_pin: clockPin || null,
            });

            if (response.data.requires_pin) {
                setNeedsPin(true);
                setError('PIN required for this employee');
            } else {
                setNeedsPin(!!response.data.has_pin);
                setSuccess(`Verified: ${response.data.name}`);
                
                // Check current clock-in status
                checkCurrentStatus();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to verify employee');
            setNeedsPin(false);
        } finally {
            setLoading(false);
        }
    };

    const checkCurrentStatus = async () => {
        // This would need a public endpoint to check status
        // For now, we'll just try to clock in/out
    };

    const handleClockIn = async () => {
        if (!employeeIdentifier) {
            setError('Please enter your email or employee ID');
            return;
        }

        if (!location) {
            setError('Location is required. Please enable location permissions.');
            return;
        }

        if (needsPin && !clockPin) {
            setError('PIN is required');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await publicApi.post('/staff/clock-in', {
                employee_identifier: employeeIdentifier,
                clock_pin: clockPin || null,
                latitude: location.latitude,
                longitude: location.longitude,
            });

            setSuccess('Successfully clocked in!');
            setIsClockedIn(true);
            setCurrentStatus(response.data.clock_in);
            
            // Save employee identifier to localStorage for next time
            if (employeeIdentifier) {
                localStorage.setItem('staff_clock_in_identifier', employeeIdentifier);
            }
            
            // Clear the input field after successful clock-in
            setEmployeeIdentifier('');
            setClockPin('');
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to clock in';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleClockOut = async () => {
        if (!employeeIdentifier) {
            setError('Please enter your email or employee ID');
            return;
        }

        if (needsPin && !clockPin) {
            setError('PIN is required');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const location = await getUserLocation({
                timeout: 10000,
                maximumAge: 0,
                enableHighAccuracy: true,
            });

            const response = await publicApi.post('/staff/clock-out', {
                employee_identifier: employeeIdentifier,
                clock_pin: clockPin || null,
                latitude: location?.latitude || null,
                longitude: location?.longitude || null,
            });

            setSuccess('Successfully clocked out!');
            setIsClockedIn(false);
            setCurrentStatus(null);
            
            // Save employee identifier to localStorage for next time
            if (employeeIdentifier) {
                localStorage.setItem('staff_clock_in_identifier', employeeIdentifier);
            }
            
            // Clear the input field after successful clock-out
            setEmployeeIdentifier('');
            setClockPin('');
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to clock out';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-primary to-brand-primary flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-primary-dark rounded-full mb-4">
                        <Clock className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Clock-In</h1>
                    <p className="text-gray-600">Clock in or out quickly without logging in</p>
                </div>

                {/* Location Status */}
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                    location ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                    {location ? (
                        <>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                                <p className="text-sm font-medium text-green-900">Location Verified</p>
                                <p className="text-xs text-green-700">Ready to clock in/out</p>
                            </div>
                        </>
                    ) : (
                        <>
                            {locationLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                                    <p className="text-sm text-yellow-900">Getting location...</p>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                                    <div>
                                        <p className="text-sm font-medium text-yellow-900">Location Required</p>
                                        <p className="text-xs text-yellow-700">Please enable location permissions</p>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-900">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-900">{success}</p>
                    </div>
                )}

                {/* Current Status */}
                {currentStatus && (
                    <div className="mb-4 p-4 bg-brand-primary/30 border border-brand-sky/30 rounded-lg">
                        <p className="text-sm font-medium text-brand-primary-dark">Current Status:</p>
                        <p className="text-xs text-gray-700">
                            Clocked in at {new Date(currentStatus.clock_in_at).toLocaleString()}
                        </p>
                    </div>
                )}

                {/* Form */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email or Employee ID *
                        </label>
                        <input
                            type="text"
                            value={employeeIdentifier}
                            onChange={(e) => setEmployeeIdentifier(e.target.value)}
                            placeholder="Enter your email or employee ID"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-transparent"
                            disabled={loading}
                        />
                    </div>

                    {(needsPin || clockPin) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                PIN *
                            </label>
                            <input
                                type="password"
                                value={clockPin}
                                onChange={(e) => setClockPin(e.target.value)}
                                placeholder="Enter your PIN"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-transparent"
                                disabled={loading}
                            />
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={handleClockIn}
                            disabled={loading || !location || isClockedIn}
                            className="flex-1 px-6 py-3 bg-brand-primary-dark text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            <Clock className="w-5 h-5" />
                            Clock In
                        </button>
                        <button
                            onClick={handleClockOut}
                            disabled={loading || !isClockedIn}
                            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            <XCircle className="w-5 h-5" />
                            Clock Out
                        </button>
                    </div>

                    <button
                        onClick={handleVerifyEmployee}
                        disabled={loading || !employeeIdentifier}
                        className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    >
                        Verify Employee
                    </button>
                </div>
            </div>
        </div>
    );
}

