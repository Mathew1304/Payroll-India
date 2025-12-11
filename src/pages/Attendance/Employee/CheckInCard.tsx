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
    const { user, organization, membership } = useAuth();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<'checked-out' | 'checked-in'>('checked-out');
    const [currentRecord, setCurrentRecord] = useState<any>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [nearestOffice, setNearestOffice] = useState<any>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (organization?.id && membership?.employee_id) {
            loadStatus();
            watchLocation();
        }
    }, [organization?.id, membership?.employee_id]);

    const loadStatus = async () => {
        if (!membership?.employee_id) {
            setError('Employee profile not found');
            setLoading(false);
            return;
        }

        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const { data, error } = await supabase
                .from('attendance_records')
                .select('*')
                .eq('employee_id', membership.employee_id)
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
            return;
        }

        navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ lat: latitude, lng: longitude });
                setError(null);
                await checkNearestOffice(latitude, longitude);
            },
            (err) => {
                console.error('Location error:', err);
                setError('Unable to retrieve your location. Please enable GPS.');
            },
            { enableHighAccuracy: true }
        );
    };

    const checkNearestOffice = async (lat: number, lng: number) => {
        try {
            const { data: offices } = await supabase
                .from('office_locations')
                .select('*')
                .eq('organization_id', organization!.id)
                .eq('is_active', true);

            if (!offices?.length) return;

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
        } catch (err) {
            console.error('Error checking offices:', err);
        }
    };

    const handleCheckIn = async () => {
        if (!membership?.employee_id) {
            alert('Employee profile not found. Please contact HR.');
            return;
        }

        if (!location || !nearestOffice) {
            alert('Waiting for location data...');
            return;
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
                organization_id: organization!.id,
                employee_id: membership.employee_id,
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
    };

    const handleCheckOut = async () => {
        if (!currentRecord) return;

        try {
            const checkOutTime = new Date();
            const checkInTime = new Date(currentRecord.check_in_time);
            const durationMs = checkOutTime.getTime() - checkInTime.getTime();
            const totalHours = durationMs / (1000 * 60 * 60);

            const payload = {
                check_out_time: checkOutTime.toISOString(),
                check_out_latitude: location?.lat,
                check_out_longitude: location?.lng,
                total_hours: parseFloat(totalHours.toFixed(2))
            };

            const { error } = await supabase
                .from('attendance_records')
                .update(payload as any)
                .eq('id', currentRecord.id);

            if (error) throw error;

            setStatus('checked-out');
            await loadStatus();
        } catch (err: any) {
            console.error('Error checking out:', err);
            alert(`Failed to check out: ${err.message || 'Unknown error'}`);
        }
    };

    // Check if user is an employee (not admin)
    const isEmployee = membership?.employee_id != null;

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
                    {/* Location Status */}
                    <div className={`p-4 rounded-xl border ${error ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${error ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                {error ? <AlertTriangle className="h-5 w-5" /> : <Navigation className="h-5 w-5" />}
                            </div>
                            <div>
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
                                {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-center">
                        {status === 'checked-out' ? (
                            <button
                                onClick={handleCheckIn}
                                disabled={!!error || !location}
                                className={`
                  w-48 h-48 rounded-full border-8 flex flex-col items-center justify-center transition-all transform hover:scale-105 active:scale-95
                  ${!error && location
                                        ? 'bg-green-500 border-green-200 text-white shadow-green-200 shadow-xl'
                                        : 'bg-slate-300 border-slate-100 text-slate-500 cursor-not-allowed'
                                    }
                `}
                            >
                                <MapPin className="h-12 w-12 mb-2" />
                                <span className="text-xl font-bold">Check In</span>
                                <span className="text-sm opacity-80 mt-1">Start Day</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleCheckOut}
                                className="w-48 h-48 rounded-full border-8 bg-red-500 border-red-200 text-white shadow-red-200 shadow-xl flex flex-col items-center justify-center transition-all transform hover:scale-105 active:scale-95"
                            >
                                <Clock className="h-12 w-12 mb-2" />
                                <span className="text-xl font-bold">Check Out</span>
                                <span className="text-sm opacity-80 mt-1">End Day</span>
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
            </div>
        </div>
    );
}
