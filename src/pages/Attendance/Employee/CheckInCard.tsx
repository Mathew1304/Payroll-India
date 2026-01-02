import { useState, useEffect } from 'react';
import {
    MapPin,
    Clock,
    Navigation,
    AlertTriangle,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

export function CheckInCard() {
    const { user, organization, profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<'not-started' | 'checked-in' | 'checked-out'>('not-started');
    const [currentRecord, setCurrentRecord] = useState<any>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [nearestOffice, setNearestOffice] = useState<any>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [checkInMode, setCheckInMode] = useState<'location' | 'web'>('location');
    const [showEarlyCheckoutModal, setShowEarlyCheckoutModal] = useState(false);
    const [earlyCheckoutReason, setEarlyCheckoutReason] = useState('');
    const [localOrgId, setLocalOrgId] = useState<string | null>(null);
    const [locationTimeout, setLocationTimeout] = useState(false);
    const effectiveOrgId = organization?.id || localOrgId;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const recoverOrgId = async () => {
            if (!organization?.id && profile?.employee_id && !localOrgId) {
                try {
                    const { data } = await supabase
                        .from('employees')
                        .select('organization_id')
                        .eq('id', profile.employee_id)
                        .maybeSingle();

                    if (data?.organization_id) {
                        setLocalOrgId(data.organization_id);
                    }
                } catch (e) {
                    console.error('Error recovering org ID:', e);
                }
            }
        };
        recoverOrgId();
    }, [organization?.id, profile?.employee_id, localOrgId]);

    useEffect(() => {
        let watchId: number | null = null;
        let mounted = true;
        let locationTimeoutId: NodeJS.Timeout | null = null;

        const init = async () => {
            if (profile?.employee_id) {
                await loadStatus();
                // Only watch location if we have an org ID (needed for checking nearest office)
                if (effectiveOrgId && checkInMode === 'location') {
                    watchId = watchLocation();
                    // Set timeout for location detection
                    locationTimeoutId = setTimeout(() => {
                        if (mounted && !nearestOffice) {
                            setLocationTimeout(true);
                        }
                    }, 10000); // 10 seconds timeout
                } else if (!effectiveOrgId && checkInMode === 'location') {
                    // No org ID available, show error
                    setError('Organization information not available. Please try web check-in mode.');
                }
            } else if (!loading && !profile) {
                // If auth is done but no profile, stop loading to show error
                setLoading(false);
            }
        };

        init();

        // Safety timeout
        const timeout = setTimeout(() => {
            if (mounted && loading) setLoading(false);
        }, 5000);

        return () => {
            mounted = false;
            clearTimeout(timeout);
            if (locationTimeoutId) clearTimeout(locationTimeoutId);
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [effectiveOrgId, profile?.employee_id, checkInMode, nearestOffice]);

    const loadStatus = async () => {
        if (!profile?.employee_id) {
            setError('Employee profile not found');
            setLoading(false);
            return;
        }

        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const { data, error } = await supabase
                .from('attendance_records')
                .select('*')
                .eq('employee_id', profile.employee_id)
                .eq('date', today)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                setCurrentRecord(data);
                if (data.check_in_time && !data.check_out_time) {
                    setStatus('checked-in');
                } else {
                    setStatus('checked-out');
                }
            } else {
                setCurrentRecord(null);
                setStatus('not-started');
            }
        } catch (err: any) {
            console.error('Error loading status:', err);
            setError(err.message || 'Failed to load attendance status');
        } finally {
            setLoading(false);
        }
    };

    const watchLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return null;
        }

        return navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ lat: latitude, lng: longitude });
                setError(null);
                await checkNearestOffice(latitude, longitude);
            },
            (err) => {
                console.error('Location error:', err);
                let errorMessage = 'Unable to retrieve your location.';

                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied. Please allow location access.';
                        break;
                    case err.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable.';
                        break;
                    case err.TIMEOUT:
                        errorMessage = 'Location request timed out. Please check your GPS.';
                        break;
                }

                setError(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 20000, // 20 seconds timeout
                maximumAge: 5000 // Accept cached positions up to 5 seconds old
            }
        );
    };

    const checkNearestOffice = async (lat: number, lng: number) => {
        try {
            console.log('Checking offices for Org ID:', effectiveOrgId);
            if (!effectiveOrgId) {
                console.warn('No organization ID available for checking nearest office');
                return;
            }

            const { data: offices, error: officeError } = await supabase
                .from('office_locations')
                .select('*')
                .eq('organization_id', effectiveOrgId)
                .eq('is_active', true);

            if (officeError) {
                console.error('Error fetching office locations:', officeError);
                setError('Unable to fetch office locations. Please try web check-in mode.');
                return;
            }

            if (!offices?.length) {
                console.warn('No active office locations found');
                setError('No office locations configured. Please use web check-in mode.');
                return;
            }

            let minDistance = Infinity;
            let nearest = null;

            offices.forEach(office => {
                const dist = calculateDistance(lat, lng, office.latitude, office.longitude);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearest = office;
                }
            });

            setNearestOffice(nearest);
            setDistance(minDistance);
            setLocationTimeout(false); // Clear timeout flag on success
        } catch (err) {
            console.error('Error checking offices:', err);
            setError('Unable to determine office location. Please try web check-in mode.');
        }
    };

    const handleCheckIn = async () => {
        if (!profile?.employee_id) {
            alert('Employee profile not found. Please contact HR.');
            return;
        }

        if (!effectiveOrgId) {
            alert('Organization information missing. Please try again in a moment.');
            return;
        }

        if (checkInMode === 'location') {
            // Location-based check-in
            if (!location || !nearestOffice) {
                // Try to check one last time if we have location but no nearest office yet
                if (location && !nearestOffice && effectiveOrgId) {
                    await checkNearestOffice(location.lat, location.lng);
                    if (!nearestOffice) {
                        alert('Getting office locations...');
                        return;
                    }
                } else {
                    alert('Waiting for location data...');
                    return;
                }
            }

            // Check if within radius
            if (distance! > nearestOffice.radius_meters) {
                if (!confirm(`You are ${Math.round(distance!)}m away from ${nearestOffice.name}. This will be marked as a Remote check-in. Continue?`)) {
                    return;
                }
            }

            try {
                const today = format(new Date(), 'yyyy-MM-dd');
                const payload = {
                    organization_id: effectiveOrgId,
                    employee_id: profile.employee_id,
                    date: today,
                    check_in_time: new Date().toISOString(),
                    check_in_location_id: distance! <= nearestOffice.radius_meters ? nearestOffice.id : null,
                    check_in_latitude: location.lat,
                    check_in_longitude: location.lng,
                    status: 'Present',
                    work_type: distance! <= nearestOffice.radius_meters ? 'In Office' : 'Remote',
                    gps_verified: distance! <= nearestOffice.radius_meters
                };

                const { error } = await supabase
                    .from('attendance_records')
                    .insert([payload] as any);

                if (error) throw error;

                setStatus('checked-in');
                await loadStatus();
            } catch (err: any) {
                console.error('Error checking in:', err);
                alert(`Failed to check in: ${err.message || 'Unknown error'}`);
            }
        } else {
            // Web check-in (no GPS)
            try {
                const today = format(new Date(), 'yyyy-MM-dd');
                const payload = {
                    organization_id: effectiveOrgId,
                    employee_id: profile.employee_id,
                    date: today,
                    check_in_time: new Date().toISOString(),
                    status: 'Present',
                    work_type: 'Remote',
                    gps_verified: false
                };

                const { error } = await supabase
                    .from('attendance_records')
                    .insert([payload] as any);

                if (error) throw error;

                setStatus('checked-in');
                await loadStatus();
            } catch (err: any) {
                console.error('Error checking in:', err);
                alert(`Failed to check in: ${err.message || 'Unknown error'}`);
            }
        }
    };

    const handleCheckOut = async () => {
        if (!currentRecord) return;

        try {
            const checkOutTime = new Date();
            const checkInTime = new Date(currentRecord.check_in_time);
            const durationMs = checkOutTime.getTime() - checkInTime.getTime();
            const totalHours = durationMs / (1000 * 60 * 60);

            // Check if less than 8 hours
            if (totalHours < 8) {
                setShowEarlyCheckoutModal(true);
                return;
            }

            // Normal checkout (8+ hours)
            await performCheckout(null);
        } catch (err: any) {
            console.error('Error checking out:', err);
            alert(`Failed to check out: ${err.message || 'Unknown error'}`);
        }
    };

    const performCheckout = async (reason: string | null) => {
        if (!currentRecord) return;

        try {
            const checkOutTime = new Date();
            const checkInTime = new Date(currentRecord.check_in_time);
            const durationMs = checkOutTime.getTime() - checkInTime.getTime();
            const totalHours = durationMs / (1000 * 60 * 60);

            const payload: any = {
                check_out_time: checkOutTime.toISOString(),
                check_out_latitude: location?.lat,
                check_out_longitude: location?.lng,
                total_hours: parseFloat(totalHours.toFixed(2))
            };

            // Add early checkout reason if provided
            if (reason) {
                payload.early_checkout_reason = reason;
            }

            const { error } = await supabase
                .from('attendance_records')
                .update(payload)
                .eq('id', currentRecord.id);

            if (error) throw error;

            setStatus('checked-out');
            setShowEarlyCheckoutModal(false);
            setEarlyCheckoutReason('');
            await loadStatus();
        } catch (err: any) {
            console.error('Error checking out:', err);
            alert(`Failed to check out: ${err.message || 'Unknown error'}`);
        }
    };

    const handleReCheckIn = async () => {
        if (!currentRecord) return;

        try {
            // Clear checkout time and re-enable check-in
            const { error } = await supabase
                .from('attendance_records')
                .update({
                    check_out_time: null,
                    check_out_latitude: null,
                    check_out_longitude: null,
                    total_hours: null
                    // Note: early_checkout_reason is preserved for admin reference
                })
                .eq('id', currentRecord.id);

            if (error) throw error;

            setStatus('checked-in');
            await loadStatus();
        } catch (err: any) {
            console.error('Error re-checking in:', err);
            alert(`Failed to re-check in: ${err.message || 'Unknown error'}`);
        }
    };

    // Check if user is an employee (not admin)
    const isEmployee = profile?.employee_id != null;

    if (loading) return <div className="p-8 text-center text-slate-500">Loading attendance status...</div>;

    // Show message if user is not an employee
    if (!isEmployee) {
        return (
            <div className="max-w-md mx-auto">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200 p-8">
                    <div className="text-center">
                        <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="h-8 w-8 text-orange-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">
                            Employee Access Only
                        </h3>
                        <p className="text-slate-600 mb-4">
                            Attendance check-in is only available for employee accounts.
                            Admin and HR users do not have access to this feature.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700">
                            <p className="font-medium text-blue-900 mb-1">Admin Access</p>
                            <p>As an admin, you can view and manage attendance records from the Admin Dashboard.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isWithinRange = distance !== null && nearestOffice && distance <= nearestOffice.radius_meters;

    return (
        <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="bg-slate-900 p-6 text-white text-center">
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">
                        {format(currentTime, 'EEEE, MMMM do')}
                    </p>
                    <h2 className="text-4xl font-bold font-mono">
                        {format(currentTime, 'HH:mm:ss')}
                    </h2>
                </div>

                {/* Status & Location */}
                <div className="p-6 space-y-6">
                    {/* Mode Toggle */}
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                        <button
                            onClick={() => setCheckInMode('location')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${checkInMode === 'location'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Location-based
                            </div>
                        </button>
                        <button
                            onClick={() => setCheckInMode('web')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${checkInMode === 'web'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Clock className="h-4 w-4" />
                                Web Check-in
                            </div>
                        </button>
                    </div>

                    {/* Location Status - Only show for location mode */}
                    {checkInMode === 'location' && (
                        <div className={`p-4 rounded-xl border ${error ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-full ${error ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {error ? <AlertTriangle className="h-5 w-5" /> : <Navigation className="h-5 w-5" />}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-slate-900">
                                        {error ? 'Location Error' : (nearestOffice ? nearestOffice.name : 'Detecting Location...')}
                                    </h3>
                                    {!error && distance !== null && (
                                        <p className="text-sm text-slate-500 mt-1">
                                            {isWithinRange
                                                ? <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3" /> You are in office range</span>
                                                : <span className="text-orange-600 font-medium flex items-center gap-1"><XCircle className="h-3 w-3" /> {Math.round(distance)}m away from office</span>
                                            }
                                        </p>
                                    )}
                                    {error && (
                                        <>
                                            <p className="text-sm text-red-600 mt-1">{error}</p>
                                            <button
                                                onClick={() => setCheckInMode('web')}
                                                className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium underline"
                                            >
                                                Switch to Web Check-in
                                            </button>
                                        </>
                                    )}
                                    {!error && locationTimeout && !nearestOffice && (
                                        <div className="mt-2 text-sm text-orange-600">
                                            <p>Location detection is taking longer than expected.</p>
                                            <button
                                                onClick={() => setCheckInMode('web')}
                                                className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium underline"
                                            >
                                                Try Web Check-in instead
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Web Check-in Info */}
                    {checkInMode === 'web' && (
                        <div className="p-4 rounded-xl border bg-blue-50 border-blue-200">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-blue-900">Web Check-in Mode</h3>
                                    <p className="text-sm text-blue-700 mt-1">
                                        Simple check-in without GPS verification. Suitable for remote work.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Button */}
                    <div className="flex justify-center">
                        {status === 'checked-out' ? (
                            <button
                                onClick={handleReCheckIn}
                                className="w-48 h-48 rounded-full border-8 bg-blue-500 border-blue-200 text-white shadow-blue-200 shadow-xl flex flex-col items-center justify-center transition-all transform hover:scale-105 active:scale-95"
                            >
                                <MapPin className="h-12 w-12 mb-2" />
                                <span className="text-xl font-bold">Check In Again</span>
                                <span className="text-sm opacity-80 mt-1">Resume Day</span>
                            </button>
                        ) : status === 'checked-in' ? (
                            <button
                                onClick={handleCheckOut}
                                className="w-48 h-48 rounded-full border-8 bg-red-500 border-red-200 text-white shadow-red-200 shadow-xl flex flex-col items-center justify-center transition-all transform hover:scale-105 active:scale-95"
                            >
                                <Clock className="h-12 w-12 mb-2" />
                                <span className="text-xl font-bold">Check Out</span>
                                <span className="text-sm opacity-80 mt-1">End Day</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleCheckIn}
                                disabled={checkInMode === 'location' && (!!error || !location)}
                                className={`
                  w-48 h-48 rounded-full border-8 flex flex-col items-center justify-center transition-all transform hover:scale-105 active:scale-95
                  ${(checkInMode === 'web' || (!error && location))
                                        ? 'bg-green-500 border-green-200 text-white shadow-green-200 shadow-xl'
                                        : 'bg-slate-300 border-slate-100 text-slate-500 cursor-not-allowed'
                                    }
                `}
                            >
                                <MapPin className="h-12 w-12 mb-2" />
                                <span className="text-xl font-bold">Check In</span>
                                <span className="text-sm opacity-80 mt-1">Start Day</span>
                            </button>
                        )}
                    </div>

                    {/* Today's Summary */}
                    {currentRecord && (
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                            <div className="text-center">
                                <p className="text-xs text-slate-400 uppercase tracking-wider">Check In</p>
                                <p className="font-mono font-medium text-slate-900">
                                    {currentRecord.check_in_time ? format(new Date(currentRecord.check_in_time), 'HH:mm') : '--:--'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-400 uppercase tracking-wider">Check Out</p>
                                <p className="font-mono font-medium text-slate-900">
                                    {currentRecord.check_out_time ? format(new Date(currentRecord.check_out_time), 'HH:mm') : '--:--'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Early Checkout Warning Modal */}
                {showEarlyCheckoutModal && currentRecord && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                            {/* Header */}
                            <div className="bg-orange-500 p-6 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-white bg-opacity-20 rounded-full">
                                        <AlertTriangle className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Early Checkout Warning</h3>
                                        <p className="text-sm opacity-90">8 hours not completed</p>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <p className="text-sm text-slate-700">
                                        You have worked for{' '}
                                        <span className="font-bold text-orange-600">
                                            {((new Date().getTime() - new Date(currentRecord.check_in_time).getTime()) / (1000 * 60 * 60)).toFixed(1)} hours
                                        </span>
                                        {' '}today. The standard work day is 8 hours.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Reason for early checkout <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={earlyCheckoutReason}
                                        onChange={(e) => setEarlyCheckoutReason(e.target.value)}
                                        placeholder="e.g., Doctor's appointment, Personal emergency, etc."
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                                        rows={3}
                                        autoFocus
                                    />
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-xs text-blue-800">
                                        <strong>Note:</strong> This reason will be visible to your administrator. You can check in again later if needed.
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-6 bg-slate-50 flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowEarlyCheckoutModal(false);
                                        setEarlyCheckoutReason('');
                                    }}
                                    className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (!earlyCheckoutReason.trim()) {
                                            alert('Please provide a reason for early checkout');
                                            return;
                                        }
                                        performCheckout(earlyCheckoutReason);
                                    }}
                                    disabled={!earlyCheckoutReason.trim()}
                                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${earlyCheckoutReason.trim()
                                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                        }`}
                                >
                                    Confirm Checkout
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
