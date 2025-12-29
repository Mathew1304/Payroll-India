import { useState, useEffect } from 'react';
import {
    MapPin,
    Plus,
    Search,
    Edit2,
    Trash2,
    Navigation,
    Check,
    X,
    Loader2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface OfficeLocation {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
    is_active: boolean;
    requires_gps: boolean;
    timezone: string;
}

export function OfficeLocations() {
    const { organization } = useAuth();
    const [locations, setLocations] = useState<OfficeLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingLocation, setEditingLocation] = useState<OfficeLocation | null>(null);
    const [isLocating, setIsLocating] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<OfficeLocation>>({
        name: '',
        address: '',
        latitude: 0,
        longitude: 0,
        radius_meters: 50,
        is_active: true,
        requires_gps: true,
        timezone: 'UTC'
    });

    useEffect(() => {
        if (organization?.id) {
            loadLocations();
        }
    }, [organization?.id]);

    const loadLocations = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('office_locations')
                .select('*')
                .eq('organization_id', organization!.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLocations(data || []);
        } catch (err) {
            console.error('Error loading locations:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (!formData.name || !formData.latitude || !formData.longitude) {
                alert('Please fill in all required fields');
                return;
            }

            const payload = {
                ...formData,
                organization_id: organization!.id
            };

            if (editingLocation) {
                const { error } = await supabase
                    .from('office_locations')
                    .update(payload)
                    .eq('id', editingLocation.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('office_locations')
                    .insert([payload]);
                if (error) throw error;
            }

            setShowModal(false);
            setEditingLocation(null);
            setFormData({
                name: '',
                address: '',
                latitude: 0,
                longitude: 0,
                radius_meters: 50,
                is_active: true,
                requires_gps: true,
                timezone: 'UTC'
            });
            loadLocations();
        } catch (err) {
            console.error('Error saving location:', err);
            alert('Failed to save location');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this location?')) return;
        try {
            const { error } = await supabase
                .from('office_locations')
                .delete()
                .eq('id', id);
            if (error) throw error;
            loadLocations();
        } catch (err) {
            console.error('Error deleting location:', err);
            alert('Failed to delete location');
        }
    };

    const openEditModal = (loc: OfficeLocation) => {
        setEditingLocation(loc);
        setFormData(loc);
        setShowModal(true);
    };

    const openAddModal = () => {
        setEditingLocation(null);
        setFormData({
            name: '',
            address: '',
            latitude: 0,
            longitude: 0,
            radius_meters: 50,
            is_active: true,
            requires_gps: true,
            timezone: 'UTC'
        });
        setShowModal(true);
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }));
                    setIsLocating(false);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    let errorMessage = 'Could not get current location.';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location permission denied. Please enable location access.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information is unavailable.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'The request to get user location timed out.';
                            break;
                    }
                    alert(errorMessage);
                    setIsLocating(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900">Office Locations</h2>
                <button
                    onClick={openAddModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Add Location
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations.map((loc) => (
                    <div key={loc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <MapPin className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{loc.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${loc.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {loc.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            {loc.requires_gps && (
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                                    GPS Required
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => openEditModal(loc)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(loc.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm text-slate-600">
                                <div className="flex items-start gap-2">
                                    <Navigation className="h-4 w-4 mt-0.5 text-slate-400" />
                                    <p>{loc.address || 'No address provided'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 flex items-center justify-center">
                                        <span className="text-xs font-bold text-slate-400">Lat</span>
                                    </div>
                                    <p className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{loc.latitude.toFixed(6)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 flex items-center justify-center">
                                        <span className="text-xs font-bold text-slate-400">Lng</span>
                                    </div>
                                    <p className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{loc.longitude.toFixed(6)}</p>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                    <span className="text-slate-500">Geofence Radius:</span>
                                    <span className="font-semibold text-slate-900">{loc.radius_meters}m</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {locations.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-900">No Locations Found</h3>
                        <p className="text-slate-500 mb-4">Add your first office location to start tracking attendance.</p>
                        <button
                            onClick={openAddModal}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Add Location
                        </button>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">
                                {editingLocation ? 'Edit Location' : 'Add Office Location'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Location Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="e.g. Main Headquarters"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Address</label>
                                    <textarea
                                        value={formData.address || ''}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        rows={2}
                                        placeholder="Street address, City, State, Zip"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Latitude *</label>
                                    <input
                                        type="number"
                                        step="0.00000001"
                                        value={formData.latitude}
                                        onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Longitude *</label>
                                    <input
                                        type="number"
                                        step="0.00000001"
                                        value={formData.longitude}
                                        onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <button
                                        onClick={getCurrentLocation}
                                        disabled={isLocating}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLocating ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <MapPin className="h-4 w-4" />
                                        )}
                                        {isLocating ? 'Getting Location...' : 'Use Current Location'}
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Geofence Radius (meters)</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="10"
                                            max="500"
                                            step="10"
                                            value={formData.radius_meters}
                                            onChange={e => setFormData({ ...formData, radius_meters: parseInt(e.target.value) })}
                                            className="flex-1"
                                        />
                                        <span className="font-mono bg-slate-100 px-2 py-1 rounded text-sm w-16 text-center">
                                            {formData.radius_meters}m
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                                    <select
                                        value={formData.timezone}
                                        onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="UTC">UTC</option>
                                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                        <option value="Asia/Qatar">Asia/Qatar (AST)</option>
                                        <option value="America/New_York">America/New_York (EST)</option>
                                        <option value="Europe/London">Europe/London (GMT)</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-4 pt-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                        />
                                        <span className="text-sm font-medium text-slate-700">Active Location</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.requires_gps}
                                            onChange={e => setFormData({ ...formData, requires_gps: e.target.checked })}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                        />
                                        <span className="text-sm font-medium text-slate-700">Require GPS Verification</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                {editingLocation ? 'Update Location' : 'Create Location'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
