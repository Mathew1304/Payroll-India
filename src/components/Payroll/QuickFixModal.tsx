import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ValidationError } from '../../utils/payrollValidation';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    error: ValidationError;
    onSuccess: () => void;
}

export function QuickFixModal({ isOpen, onClose, error, onSuccess }: Props) {
    const [value, setValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setValue('');
            setSaveError('');
        }
    }, [isOpen, error]);

    if (!isOpen) return null;

    const getFieldLabel = (field: string) => {
        switch (field) {
            case 'qatar_id': return 'Qatar ID';
            case 'iban_number': return 'IBAN Number';
            case 'basic_salary': return 'Basic Salary';
            case 'passport_expiry_date': return 'Passport Expiry Date';
            case 'visa_expiry_date': return 'Visa Expiry Date';
            case 'qatar_id_expiry': return 'Qatar ID Expiry Date';
            case 'bank_name': return 'Bank Name';
            default: return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    };

    const getInputType = (field: string) => {
        if (field.includes('date') || field.includes('expiry')) return 'date';
        if (field.includes('salary') || field.includes('amount')) return 'number';
        return 'text';
    };

    const handleSave = async () => {
        setLoading(true);
        setSaveError('');

        try {
            if (!value) {
                throw new Error('Please enter a value');
            }

            // Handle specific validations
            if (error.field_name === 'qatar_id' && value.length !== 11) {
                throw new Error('Qatar ID must be exactly 11 digits');
            }

            if (error.field_name === 'iban_number') {
                if (!value.startsWith('QA')) {
                    throw new Error('IBAN must start with QA');
                }
                if (value.length !== 29) {
                    throw new Error('IBAN must be exactly 29 characters');
                }
            }

            if (error.field_name === 'basic_salary') {
                // Update salary component
                const { error: updateError } = await supabase
                    .from('qatar_salary_components')
                    .update({ basic_salary: parseFloat(value) })
                    .eq('employee_id', error.employee_id)
                    .eq('is_active', true);

                if (updateError) throw updateError;

                // Also update employee record to keep sync
                await supabase
                    .from('employees')
                    .update({ basic_salary: parseFloat(value) })
                    .eq('id', error.employee_id);

            } else {
                // Update employee record
                // Map field names if necessary
                let dbField = error.field_name;
                if (error.field_name === 'passport_expiry_date') dbField = 'passport_expiry'; // Assuming mapping based on previous analysis
                if (error.field_name === 'visa_expiry_date') dbField = 'visa_expiry';

                const { error: updateError } = await supabase
                    .from('employees')
                    .update({ [dbField!]: value })
                    .eq('id', error.employee_id);

                if (updateError) throw updateError;
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setSaveError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">Fix Data Issue</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">{error.employee_name}</p>
                                <p className="text-sm text-slate-500">{error.employee_code}</p>
                                <p className="text-sm text-red-600 mt-1">{error.error_message}</p>
                            </div>
                        </div>

                        {saveError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                {saveError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                                {getFieldLabel(error.field_name || '')}
                            </label>
                            <input
                                type={getInputType(error.field_name || '')}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={`Enter ${getFieldLabel(error.field_name || '').toLowerCase()}`}
                            />
                            <p className="text-xs text-slate-500">
                                This will update the employee's record in the database.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || !value}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Save & Fix
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
