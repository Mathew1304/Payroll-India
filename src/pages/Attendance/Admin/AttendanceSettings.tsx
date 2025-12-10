import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface AttendanceSettingsData {
    id: string;
    auto_absent_enabled: boolean;
    auto_absent_time: string;
    allow_remote_checkin: boolean;
    require_checkout: boolean;
    max_work_hours_per_day: number;
    overtime_threshold_minutes: number;
    gps_accuracy_threshold_meters: number;
    allow_manual_attendance: boolean;
}

export function AttendanceSettings() {
    const { organization } = useAuth();
    const [settings, setSettings] = useState<AttendanceSettingsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (organization?.id) {
            loadSettings();
        }
    }, [organization?.id]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('attendance_settings')
                .select('*')
                .eq('organization_id', organization!.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // Ignore not found error

            if (data) {
                setSettings(data);
            } else {
                // Initialize default settings if none exist
                const defaultSettings = {
                    auto_absent_enabled: true,
                    auto_absent_time: '10:00:00',
                    allow_remote_checkin: true,
                    require_checkout: true,
                    max_work_hours_per_day: 12,
                    overtime_threshold_minutes: 480,
                    gps_accuracy_threshold_meters: 100,
                    allow_manual_attendance: true
                };
                setSettings(defaultSettings as any);
            }
        } catch (err) {
            console.error('Error loading settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const payload = {
                ...settings,
                organization_id: organization!.id
            };

            // Check if settings exist to decide insert or update
            const { data: existing } = await supabase
                .from('attendance_settings')
                .select('id')
                .eq('organization_id', organization!.id)
                .single();

            let error;
            if (existing) {
                const { error: updateError } = await supabase
                    .from('attendance_settings')
                    .update(payload as any)
                    .eq('id', (existing as any).id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('attendance_settings')
                    .insert([payload] as any);
                error = insertError;
            }

            if (error) throw error;
            alert('Settings saved successfully');
        } catch (err) {
            console.error('Error saving settings:', err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
    if (!settings) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900">General Configuration</h2>
                    <p className="text-sm text-slate-500">Configure global attendance rules for your organization</p>
                </div>

                <div className="p-6 space-y-8">
                    {/* Auto Absent */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-slate-900 border-b border-slate-100 pb-2">Automated Actions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="auto_absent"
                                    checked={settings.auto_absent_enabled}
                                    onChange={e => setSettings({ ...settings, auto_absent_enabled: e.target.checked })}
                                    className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <label htmlFor="auto_absent" className="block text-sm font-medium text-slate-700">Auto-mark Absent</label>
                                    <p className="text-xs text-slate-500">Automatically mark employees as absent if they haven't checked in by a specific time.</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Auto-absent Time</label>
                                <input
                                    type="time"
                                    value={settings.auto_absent_time}
                                    onChange={e => setSettings({ ...settings, auto_absent_time: e.target.value })}
                                    disabled={!settings.auto_absent_enabled}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Check-in Rules */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-slate-900 border-b border-slate-100 pb-2">Check-in Rules</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="remote_checkin"
                                    checked={settings.allow_remote_checkin}
                                    onChange={e => setSettings({ ...settings, allow_remote_checkin: e.target.checked })}
                                    className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <label htmlFor="remote_checkin" className="block text-sm font-medium text-slate-700">Allow Remote Check-in</label>
                                    <p className="text-xs text-slate-500">Allow employees to mark attendance from outside office geofences (marked as Remote).</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="require_checkout"
                                    checked={settings.require_checkout}
                                    onChange={e => setSettings({ ...settings, require_checkout: e.target.checked })}
                                    className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <label htmlFor="require_checkout" className="block text-sm font-medium text-slate-700">Require Check-out</label>
                                    <p className="text-xs text-slate-500">Flag anomalies if employees forget to check out at the end of the day.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="manual_attendance"
                                    checked={settings.allow_manual_attendance}
                                    onChange={e => setSettings({ ...settings, allow_manual_attendance: e.target.checked })}
                                    className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <label htmlFor="manual_attendance" className="block text-sm font-medium text-slate-700">Allow Manual Entry</label>
                                    <p className="text-xs text-slate-500">Allow admins to manually mark attendance for employees.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Limits & Thresholds */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-slate-900 border-b border-slate-100 pb-2">Limits & Thresholds</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Max Work Hours/Day</label>
                                <input
                                    type="number"
                                    value={settings.max_work_hours_per_day}
                                    onChange={e => setSettings({ ...settings, max_work_hours_per_day: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Overtime Threshold (mins)</label>
                                <input
                                    type="number"
                                    value={settings.overtime_threshold_minutes}
                                    onChange={e => setSettings({ ...settings, overtime_threshold_minutes: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">{Math.floor(settings.overtime_threshold_minutes / 60)} hours</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">GPS Accuracy (meters)</label>
                                <input
                                    type="number"
                                    value={settings.gps_accuracy_threshold_meters}
                                    onChange={e => setSettings({ ...settings, gps_accuracy_threshold_meters: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">Max allowed error radius</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
