import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CreateGoalModalProps {
    onClose: () => void;
}

export function CreateGoalModal({ onClose }: CreateGoalModalProps) {
    const { organization, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [goalTypes, setGoalTypes] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        employee_id: '',
        goal_type_id: '',
        department_id: '',
        priority: 'Medium',
        start_date: new Date().toISOString().split('T')[0],
        due_date: '',
        weight: 0,
    });

    const [milestones, setMilestones] = useState<{ title: string; due_date: string }[]>([
        { title: '', due_date: '' }
    ]);

    useEffect(() => {
        if (organization?.id) {
            loadData();
        }
    }, [organization?.id]);

    const loadData = async () => {
        try {
            const [empRes, typeRes, deptRes] = await Promise.all([
                supabase.from('employees').select('id, first_name, last_name, department_id').eq('is_active', true),
                supabase.from('goal_types').select('id, name').eq('organization_id', organization!.id).eq('is_active', true),
                supabase.from('departments').select('id, name').eq('organization_id', organization!.id).eq('is_active', true)
            ]);

            if (empRes.data) setEmployees(empRes.data);
            if (typeRes.data) setGoalTypes(typeRes.data);
            if (deptRes.data) setDepartments(deptRes.data);
        } catch (err) {
            console.error('Error loading data:', err);
        }
    };

    const handleEmployeeChange = (empId: string) => {
        const emp = employees.find(e => e.id === empId);
        setFormData(prev => ({
            ...prev,
            employee_id: empId,
            department_id: emp?.department_id || prev.department_id
        }));
    };

    const handleAddMilestone = () => {
        setMilestones([...milestones, { title: '', due_date: '' }]);
    };

    const handleRemoveMilestone = (index: number) => {
        setMilestones(milestones.filter((_, i) => i !== index));
    };

    const handleMilestoneChange = (index: number, field: 'title' | 'due_date', value: string) => {
        const newMilestones = [...milestones];
        newMilestones[index] = { ...newMilestones[index], [field]: value };
        setMilestones(newMilestones);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Get current employee ID for created_by
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('employee_id')
                .eq('user_id', user!.id)
                .single();

            if (!profile?.employee_id) throw new Error('Employee profile not found');

            // Create Goal
            const { data: goal, error: goalError } = await supabase
                .from('goals')
                .insert({
                    organization_id: organization!.id,
                    created_by: profile.employee_id,
                    ...formData,
                    weight: formData.weight || null
                })
                .select()
                .single();

            if (goalError) throw goalError;

            // Create Milestones
            const validMilestones = milestones.filter(m => m.title.trim());
            if (validMilestones.length > 0) {
                const { error: milestoneError } = await supabase
                    .from('goal_milestones')
                    .insert(
                        validMilestones.map((m, index) => ({
                            goal_id: goal.id,
                            title: m.title,
                            due_date: m.due_date || null,
                            display_order: index
                        }))
                    );

                if (milestoneError) throw milestoneError;
            }

            onClose();
            // Ideally trigger a refresh in parent
        } catch (err) {
            console.error('Error creating goal:', err);
            alert('Failed to create goal. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-900">Create New Goal</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Goal Title *</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g., Increase Q3 Sales by 15%"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Assign To *</label>
                            <select
                                required
                                value={formData.employee_id}
                                onChange={e => handleEmployeeChange(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Employee</option>
                                {employees.map(e => (
                                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Goal Type</label>
                            <select
                                value={formData.goal_type_id}
                                onChange={e => setFormData({ ...formData, goal_type_id: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Type</option>
                                {goalTypes.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                            <input
                                type="date"
                                required
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date *</label>
                            <input
                                type="date"
                                required
                                min={formData.start_date}
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Weight (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={formData.weight}
                                onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Describe the goal objectives..."
                        />
                    </div>

                    {/* Milestones */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-700">Key Milestones</label>
                            <button
                                type="button"
                                onClick={handleAddMilestone}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                                <Plus className="h-3 w-3" /> Add Milestone
                            </button>
                        </div>
                        <div className="space-y-3">
                            {milestones.map((milestone, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={milestone.title}
                                        onChange={e => handleMilestoneChange(index, 'title', e.target.value)}
                                        placeholder="Milestone title"
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                    <input
                                        type="date"
                                        value={milestone.due_date}
                                        onChange={e => handleMilestoneChange(index, 'due_date', e.target.value)}
                                        className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                    {milestones.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMilestone(index)}
                                            className="text-slate-400 hover:text-red-500 p-2"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Goal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
