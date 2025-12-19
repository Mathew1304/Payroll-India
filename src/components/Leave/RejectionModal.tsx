import { useState } from 'react';

interface RejectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    loading: boolean;
}

export function RejectionModal({ isOpen, onClose, onConfirm, loading }: RejectionModalProps) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!reason.trim()) {
            setError('Please provide a reason for rejection');
            return;
        }

        onConfirm(reason);
        setReason(''); // Reset reason after submit
    };

    const handleClose = () => {
        setReason('');
        setError('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 transition-opacity"
                    aria-hidden="true"
                    onClick={handleClose}
                >
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span
                    className="hidden sm:inline-block sm:h-screen sm:align-middle"
                    aria-hidden="true"
                >
                    &#8203;
                </span>

                <div className="inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
                    <div className="sm:flex sm:items-start">
                        <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">
                                Reject Leave Application
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-500 mb-4">
                                    Are you sure you want to reject this leave application? Please provide a reason for the rejection.
                                </p>
                                <form onSubmit={handleSubmit}>
                                    <textarea
                                        className="w-full rounded-md border border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2"
                                        rows={4}
                                        placeholder="Enter rejection reason..."
                                        value={reason}
                                        onChange={(e) => {
                                            setReason(e.target.value);
                                            setError('');
                                        }}
                                        disabled={loading}
                                    />
                                    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

                                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                                        >
                                            {loading ? 'Rejecting...' : 'Reject Application'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={loading}
                                            className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                                            onClick={handleClose}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
