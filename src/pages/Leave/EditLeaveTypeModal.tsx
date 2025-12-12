// Edit Leave Type Modal Component
function EditLeaveTypeModal({ leaveType, onClose, onSuccess }: { leaveType: LeaveType; onClose: () => void; onSuccess: () => void }) {
    const { organization } = useAuth();
    const [formData, setFormData] = useState({
        name: leaveType.name,
        code: leaveType.code,
        description: leaveType.description || '',
        is_paid: leaveType.is_paid,
        requires_document: leaveType.requires_document,
        max_consecutive_days: leaveType.max_consecutive_days || 30,
        is_carry_forward: leaveType.is_carry_forward,
        is_active: leaveType.is_active
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization?.id) return;

        setLoading(true);
        try {
            // @ts-ignore - leave_types table exists but is not in generated types
            const { error } = await supabase
                .from('leave_types')
                .update(formData)
                .eq('id', leaveType.id);

            if (error) throw error;

            alert('Leave type updated successfully!');
            onSuccess();
        } catch (error: any) {
            console.error('Error updating leave type:', error);
            alert('Failed to update leave type: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-t-2xl">
                    <h3 className="text-2xl font-bold text-white">Edit Leave Type</h3>
                    <p className="text-purple-100 text-sm mt-1">Update leave type configuration</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Leave Type Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Annual Leave"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Code *</label>
                            <input
                                type="text"
                                required
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="e.g., AL"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief description of this leave type"
                            rows={3}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Max Consecutive Days</label>
                        <input
                            type="number"
                            min="1"
                            value={formData.max_consecutive_days || ''}
                            onChange={(e) => setFormData({ ...formData, max_consecutive_days: Number(e.target.value) || undefined })}
                            placeholder="Leave blank for no limit"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={formData.is_paid}
                                onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                                className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                            />
                            <span className="text-sm font-medium text-slate-700">Paid Leave</span>
                        </label>

                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={formData.requires_document}
                                onChange={(e) => setFormData({ ...formData, requires_document: e.target.checked })}
                                className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                            />
                            <span className="text-sm font-medium text-slate-700">Requires Supporting Document</span>
                        </label>

                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={formData.is_carry_forward}
                                onChange={(e) => setFormData({ ...formData, is_carry_forward: e.target.checked })}
                                className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                            />
                            <span className="text-sm font-medium text-slate-700">Allow Carry Forward</span>
                        </label>

                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                            />
                            <span className="text-sm font-medium text-slate-700">Active</span>
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Updating...' : 'Update Leave Type'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
