import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CategoryManagementModalProps {
    onClose: () => void;
}

export function CategoryManagementModal({ onClose }: CategoryManagementModalProps) {
    const { organization } = useAuth();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCategory, setNewCategory] = useState({ name: '', icon: '📋' });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (organization?.id) {
            loadCategories();
        }
    }, [organization?.id]);

    const loadCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('helpdesk_categories')
                .select('*')
                .eq('organization_id', organization!.id)
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (err) {
            console.error('Error loading categories:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.name.trim()) return;

        setAdding(true);
        try {
            const { error } = await supabase
                .from('helpdesk_categories')
                .insert({
                    organization_id: organization!.id,
                    name: newCategory.name.trim(),
                    icon: newCategory.icon
                });

            if (error) throw error;

            setNewCategory({ name: '', icon: '📋' });
            loadCategories();
        } catch (err) {
            console.error('Error adding category:', err);
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This might affect existing tickets.')) return;

        try {
            const { error } = await supabase
                .from('helpdesk_categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            loadCategories();
        } catch (err) {
            console.error('Error deleting category:', err);
        }
    };

    const commonIcons = ['📋', '💻', '🏢', '👥', '💰', '🔧', '🔒', '📅', '📢', '❓'];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Manage Categories</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Add New */}
                    <form onSubmit={handleAdd} className="mb-6 bg-slate-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-slate-700 mb-3">Add New Category</h4>
                        <div className="flex gap-2 mb-3">
                            <div className="flex gap-1 overflow-x-auto pb-2">
                                {commonIcons.map(icon => (
                                    <button
                                        key={icon}
                                        type="button"
                                        onClick={() => setNewCategory({ ...newCategory, icon })}
                                        className={`p-2 rounded hover:bg-white ${newCategory.icon === icon ? 'bg-white shadow-sm ring-1 ring-pink-500' : ''}`}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Category Name"
                                value={newCategory.name}
                                onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                            />
                            <button
                                type="submit"
                                disabled={adding || !newCategory.name.trim()}
                                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </form>

                    {/* List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {loading ? (
                            <p className="text-center text-slate-500">Loading...</p>
                        ) : categories.length === 0 ? (
                            <p className="text-center text-slate-500">No categories found.</p>
                        ) : (
                            categories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{cat.icon}</span>
                                        <span className="font-medium text-slate-900">{cat.name}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        className="text-slate-400 hover:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
