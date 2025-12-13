import React from 'react';
import { CheckCircle, AlertCircle, Mail, X, Info } from 'lucide-react';

export interface AlertModalProps {
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    invitationLink?: string;
    credentials?: {
        email: string;
        password: string;
    };
    onClose: () => void;
    onSuccess?: () => void;
}

export function AlertModal({ type, title, message, invitationLink, credentials, onClose, onSuccess }: AlertModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-scaleIn">
                <div className={`p-6 rounded-t-2xl ${type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                        type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                            'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {type === 'success' && <CheckCircle className="h-8 w-8 text-white" />}
                            {type === 'error' && <AlertCircle className="h-8 w-8 text-white" />}
                            {type === 'info' && <Info className="h-8 w-8 text-white" />}
                            <h3 className="text-xl font-bold text-white">{title}</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5 text-white" />
                        </button>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-slate-700 text-base mb-4 whitespace-pre-line">{message}</p>

                    {invitationLink && (
                        <div className="bg-slate-100 rounded-lg p-4 mb-4">
                            <p className="text-xs text-slate-600 mb-2 font-semibold">Invitation Link:</p>
                            <p className="text-sm text-slate-900 break-all font-mono">{invitationLink}</p>
                        </div>
                    )}

                    {credentials && (
                        <div className="bg-slate-100 rounded-lg p-4 mb-4 space-y-3">
                            <div>
                                <p className="text-xs text-slate-600 mb-1 font-semibold">Email:</p>
                                <p className="text-sm text-slate-900 font-mono">{credentials.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-600 mb-1 font-semibold">Password:</p>
                                <p className="text-sm text-slate-900 font-mono font-bold">{credentials.password}</p>
                            </div>
                            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                                ⚠️ Copy these credentials now. The password will not be shown again.
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                onClose();
                                if (type === 'success' && onSuccess) {
                                    onSuccess();
                                }
                            }}
                            className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' :
                                    type === 'error' ? 'bg-red-500 hover:bg-red-600' :
                                        'bg-blue-500 hover:bg-blue-600'
                                }`}
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
