import { useState, useEffect } from 'react';
import { Search, Filter, Target, Calendar, User, MoreVertical, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { GoalDetailModal } from '../../components/Performance/GoalDetailModal';

interface GoalsTabProps {
    departmentId?: string;
    employeeId?: string;
}

export function GoalsTab({ departmentId, employeeId }: GoalsTabProps) {
    const { organization } = useAuth();
    const [goals, setGoals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

    useEffect(() => {
        if (organization?.id) {
            loadGoals();
        }
    }, [organization?.id, departmentId, employeeId]);

    const loadGoals = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('goals')
                .select(`
          *,
          employee:employees!employee_id(first_name, last_name),
          goal_type:goal_types(name),
          department:departments(name)
        `)
                .eq('organization_id', organization!.id)
                .order('due_date', { ascending: true });

            if (departmentId) query = query.eq('department_id', departmentId);
            if (employeeId) query = query.eq('employee_id', employeeId);

            const { data, error } = await query;

            if (error) throw error;
            setGoals(data || []);
        } catch (err) {
            console.error('Error loading goals:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredGoals = goals.filter(goal => {
        const matchesSearch =
            goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            goal.employee?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            goal.employee?.last_name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All' || goal.status === statusFilter;
        const matchesType = typeFilter === 'All' || goal.goal_type?.name === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Not Started': return 'bg-slate-100 text-slate-700';
            case 'In Progress': return 'bg-blue-100 text-blue-700';
            case 'Completed': return 'bg-green-100 text-green-700';
            case 'Overdue': return 'bg-red-100 text-red-700';
            case 'Cancelled': return 'bg-gray-100 text-gray-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Critical': return 'text-red-600 bg-red-50 border-red-200';
            case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'Medium': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'Low': return 'text-slate-600 bg-slate-50 border-slate-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search goals or employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="All">All Status</option>
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Overdue">Overdue</option>
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="All">All Types</option>
                        <option value="Annual Goal">Annual Goal</option>
                        <option value="Quarterly Goal">Quarterly Goal</option>
                        <option value="Project Goal">Project Goal</option>
                    </select>
                </div>
            </div>

            {/* Goals List */}
            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading goals...</div>
            ) : filteredGoals.length === 0 ? (
                <div className="text-center py-12">
                    <div className="bg-slate-50 p-4 rounded-full inline-block mb-3">
                        <Target className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No goals found</h3>
                    <p className="text-slate-500">Try adjusting your filters or create a new goal.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Goal</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Progress</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredGoals.map((goal) => (
                                <tr
                                    key={goal.id}
                                    onClick={() => setSelectedGoalId(goal.id)}
                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                {goal.employee?.first_name?.[0]}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">
                                                    {goal.employee?.first_name} {goal.employee?.last_name}
                                                </div>
                                                <div className="text-xs text-slate-500">{goal.department?.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{goal.title}</div>
                                        <div className="text-xs text-slate-500">{goal.goal_type?.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                                            {goal.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 w-24 bg-slate-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${goal.progress_percentage < 33 ? 'bg-red-500' :
                                                            goal.progress_percentage < 66 ? 'bg-yellow-500' : 'bg-green-500'
                                                        }`}
                                                    style={{ width: `${goal.progress_percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-slate-600">{goal.progress_percentage}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {format(new Date(goal.due_date), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-slate-400 hover:text-blue-600">
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedGoalId && (
                <GoalDetailModal
                    goalId={selectedGoalId}
                    onClose={() => setSelectedGoalId(null)}
                    onUpdate={loadGoals}
                />
            )}
        </div>
    );
}
