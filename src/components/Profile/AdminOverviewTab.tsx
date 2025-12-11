import { Mail, Phone, MapPin, User, Briefcase, Calendar, Building, Shield } from 'lucide-react';

interface AdminOverviewTabProps {
    admin: any;
    isEditMode: boolean;
    editFormData: any;
    handleEditChange: (field: string, value: any) => void;
    country: string;
}

export function AdminOverviewTab({ admin, isEditMode, editFormData, handleEditChange, country }: AdminOverviewTabProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                <Section title="Contact Information" icon={Mail}>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem icon={Mail} label="Email" value={admin.email || 'N/A'} />
                        {isEditMode ? (
                            <EditableField
                                icon={Phone}
                                label="Mobile"
                                value={editFormData.mobile_number || ''}
                                onChange={(v: any) => handleEditChange('mobile_number', v)}
                                type="tel"
                            />
                        ) : (
                            <InfoItem icon={Phone} label="Mobile" value={admin.mobile_number || 'N/A'} />
                        )}
                        {isEditMode ? (
                            <EditableField
                                icon={Phone}
                                label="Alternate"
                                value={editFormData.alternate_number || ''}
                                onChange={(v: any) => handleEditChange('alternate_number', v)}
                                type="tel"
                            />
                        ) : (
                            <InfoItem icon={Phone} label="Alternate" value={admin.alternate_number || 'N/A'} />
                        )}
                    </div>
                </Section>

                <Section title="Address" icon={MapPin}>
                    <div className="space-y-4">
                        {isEditMode ? (
                            <>
                                <EditableField
                                    icon={MapPin}
                                    label="Current Address"
                                    value={editFormData.current_address || ''}
                                    onChange={(v: any) => handleEditChange('current_address', v)}
                                    type="textarea"
                                />
                                <div className="grid grid-cols-3 gap-4">
                                    <EditableField
                                        icon={MapPin}
                                        label="City"
                                        value={editFormData.city || ''}
                                        onChange={(v: any) => handleEditChange('city', v)}
                                    />
                                    <EditableField
                                        icon={MapPin}
                                        label="State"
                                        value={editFormData.state || ''}
                                        onChange={(v: any) => handleEditChange('state', v)}
                                    />
                                    <EditableField
                                        icon={MapPin}
                                        label="Pincode"
                                        value={editFormData.pincode || ''}
                                        onChange={(v: any) => handleEditChange('pincode', v)}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <InfoItem icon={MapPin} label="Current Address" value={admin.current_address || 'N/A'} />
                                <div className="grid grid-cols-3 gap-4">
                                    <InfoItem icon={MapPin} label="City" value={admin.city || 'N/A'} />
                                    <InfoItem icon={MapPin} label="State" value={admin.state || 'N/A'} />
                                    <InfoItem icon={MapPin} label="Pincode" value={admin.pincode || 'N/A'} />
                                </div>
                            </>
                        )}
                    </div>
                </Section>
            </div>

            <div className="space-y-6">
                <Section title="Admin Details" icon={Shield}>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem icon={User} label="Admin Code" value={admin.admin_code || 'N/A'} />
                        <InfoItem icon={Briefcase} label="Designation" value={admin.designation || 'Administrator'} />
                        <InfoItem icon={Calendar} label="Date of Joining" value={admin.date_of_joining ? new Date(admin.date_of_joining).toLocaleDateString() : 'N/A'} />
                        <InfoItem icon={Building} label="Organization" value={country} />
                    </div>
                </Section>

                <Section title="Personal Information" icon={User}>
                    <div className="grid grid-cols-2 gap-4">
                        {isEditMode ? (
                            <EditableField
                                icon={Calendar}
                                label="Date of Birth"
                                value={editFormData.date_of_birth || ''}
                                onChange={(v: any) => handleEditChange('date_of_birth', v)}
                                type="date"
                            />
                        ) : (
                            <InfoItem icon={Calendar} label="Date of Birth" value={admin.date_of_birth ? new Date(admin.date_of_birth).toLocaleDateString() : 'N/A'} />
                        )}
                        {isEditMode ? (
                            <EditableField
                                icon={User}
                                label="Gender"
                                value={editFormData.gender || ''}
                                onChange={(v: any) => handleEditChange('gender', v)}
                                type="select"
                                options={[
                                    { value: '', label: 'Select Gender' },
                                    { value: 'male', label: 'Male' },
                                    { value: 'female', label: 'Female' },
                                    { value: 'other', label: 'Other' }
                                ]}
                            />
                        ) : (
                            <InfoItem icon={User} label="Gender" value={admin.gender ? admin.gender.charAt(0).toUpperCase() + admin.gender.slice(1) : 'N/A'} />
                        )}
                    </div>
                </Section>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-blue-900 mb-2">Administrator Profile</h4>
                            <p className="text-sm text-blue-800">
                                As an administrator, you have full access to manage the organization. Your profile contains basic information only.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper components (these should match the ones in EmployeeProfilePage)
function Section({ title, icon: Icon, children }: any) {
    return (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
                <Icon className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            </div>
            {children}
        </div>
    );
}

function InfoItem({ icon: Icon, label, value }: any) {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-slate-400" />
                <p className="text-xs font-medium text-slate-600">{label}</p>
            </div>
            <p className="text-sm font-semibold text-slate-900 pl-6">{value}</p>
        </div>
    );
}

function EditableField({ icon: Icon, label, value, onChange, type = 'text', options }: any) {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-slate-400" />
                <label className="text-xs font-medium text-slate-600">{label}</label>
            </div>
            {type === 'select' ? (
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                    {options.map((opt: any) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ) : type === 'textarea' ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows={3}
                />
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
            )}
        </div>
    );
}
