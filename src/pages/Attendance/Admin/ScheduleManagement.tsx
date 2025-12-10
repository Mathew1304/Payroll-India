import { useState, useEffect } from 'react';
import {
    Calendar,
    Plus,
    Clock,
    Users,
    Edit2,
    Trash2,
    Check,
    X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface WorkSchedule {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    grace_period_minutes: number;
    working_days: number[];
    is_default: boolean;
    is_active: boolean;
}

export function ScheduleManagement() {
    const { organization } = useAuth();
    const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);

    const [formData, setFormData] = useState<Partial<WorkSchedule>>({
        name: '',
        start_time: '09:00',
        end_time: '18:00',
        grace_period_minutes: 15,
        working_days: [1, 2, 3, 4, 5], // Mon-Fri
        is_default: false,
        is_active: true
    });

    const DAYS = [
        { id: 0, label: 'Sun' },
        { id: 1, label: 'Mon' },
        { id: 2, label: 'Tue' },
        { id: 3, label: 'Wed' },
        { id: 4, label: 'Thu' },
        { id: 5, label: 'Fri' },
        { id: 6, label: 'Sat' }
    ];

    useEffect(() => {
        if (organization?.id) {
            loadSchedules();
        }
    }, [organization?.id]);

    const loadSchedules = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('work_schedules')
                .select('*')
                .eq('organization_id', organization!.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSchedules(data || []);
        } catch (err) {
            console.error('Error loading schedules:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (!formData.name || !formData.start_time || !formData.end_time) {
                alert('Please fill in all required fields');
                return;
            }

            const payload = {
                ...formData,
                organization_id: organization!.id
            };

            if (editingSchedule) {
                const { error } = await supabase
                    .from('work_schedules')
                    .update(payload)
                    .eq('id', editingSchedule.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('work_schedules')
                    .insert([payload]);
                if (error) throw error;
            }

            setShowModal(false);
            setEditingSchedule(null);
            setFormData({
                name: '',
                start_time: '09:00',
                end_time: '18:00',
                grace_period_minutes: 15,
                working_days: [1, 2, 3, 4, 5],
                is_default: false,
                is_active: true
            });
            loadSchedules();
        } catch (err) {
            console.error('Error saving schedule:', err);
            alert('Failed to save schedule');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this schedule?')) return;
        try {
            const { error } = await supabase
                .from('work_schedules')
                .delete()
                .eq('id', id);
            if (error) throw error;
            loadSchedules();
        } catch (err) {
            console.error('Error deleting schedule:', err);
            alert('Failed to delete schedule');
        }
    };

    const toggleDay = (dayId: number) => {
        const currentDays = formData.working_days || [];
        if (currentDays.includes(dayId)) {
            setFormData({
                ...formData,
                working_days: currentDays.filter(d => d !== dayId).sort()
            });
        } else {
            setFormData({
                ...formData,
                working_days: [...currentDays, dayId].sort()
            });
        }
    };

    const openEditModal = (schedule: WorkSchedule) => {
        setEditingSchedule(schedule);
        setFormData(schedule);
        setShowModal(true);
    };

    const openAddModal = () => {
        setEditingSchedule(null);
        setFormData({
            name: '',
            start_time: '09:00',
            end_time: '18:00',
            grace_period_minutes: 15,
            working_days: [1, 2, 3, 4, 5],
            is_default: false,
            is_active: true
        });
        setShowModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900">Work Schedules</h2>
                <button
                    onClick={openAddModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Create Schedule
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schedules.map((schedule) => (
                    <div key={schedule.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-purple-50 rounded-lg flex items-center justify-center">
                                        <Clock className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{schedule.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {schedule.is_default && (
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                                    Default
                                                </span>
                                            )}
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${schedule.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {schedule.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => openEditModal(schedule)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(schedule.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Working Hours</span>
                                    <span className="font-medium text-slate-900">
                                        {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Grace Period</span>
                                    <span className="font-medium text-slate-900">{schedule.grace_period_minutes} mins</span>
                                </div>

                                <div>
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Working Days</span>
                                    <div className="flex gap-1 flex-wrap">
                                        {DAYS.map(day => (
                                            <span
                                                key={day.id}
                                                className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                          ${schedule.working_days.includes(day.id)
                                                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                                        : 'bg-slate-50 text-slate-400 border border-slate-100'
                                                    }
                        `}
                                            >
                                                {day.label.charAt(0)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">
                                {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Schedule Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g. Standard Shift"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Time *</label>
                                    <input
                                        type="time"
                                        value={formData.start_time}
                                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">End Time *</label>
                                    <input
                                        type="time"
                                        value={formData.end_time}
                                        onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Grace Period (minutes)</label>
                                <input
                                    type="number"
                                    value={formData.grace_period_minutes}
                                    onChange={e => setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Working Days</label>
                                <div className="flex gap-2 flex-wrap">
                                    {DAYS.map(day => (
                                        <button
                                            key={day.id}
                                            onClick={() => toggleDay(day.id)}
                                            className={`
                        px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border
                        ${formData.working_days?.includes(day.id)
                                                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                }
                      `}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_default}
                                        onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Set as Default Schedule</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Active</span>
                                </label>
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
                                {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
