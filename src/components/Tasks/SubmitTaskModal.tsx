import { useState } from 'react';
import { X, Link as LinkIcon, FileText } from 'lucide-react';

interface SubmitTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { submission_url: string; submission_notes: string }) => Promise<void>;
    taskTitle: string;
}

export function SubmitTaskModal({ isOpen, onClose, onSubmit, taskTitle }: SubmitTaskModalProps) {
    const [url, setUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({
                submission_url: url,
                submission_notes: notes
            });
            onClose();
        } catch (error) {
            console.error('Error submitting task:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Submit Task</h2>
                        <p className="text-slate-500 text-sm mt-1">Submit "{taskTitle}" for review</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Submission Link (Optional)
                        </label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://github.com/..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Notes
                        </label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Describe what you've done..."
                                rows={4}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
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
                            {loading ? 'Submitting...' : 'Submit for Review'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
