import { useState } from 'react';
import {
    LayoutDashboard,
    MapPin,
    Calendar,
    FileText,
    Settings,
    AlertTriangle,
    Users
} from 'lucide-react';
import { AttendanceDashboard } from './AttendanceDashboard';
import { OfficeLocations } from './OfficeLocations';
import { ScheduleManagement } from './ScheduleManagement';
import { AttendanceReport } from './AttendanceReport';
import { AttendanceSettings } from './AttendanceSettings';
import { LeaveManagement } from './LeaveManagement';

export function AttendanceAdminPage() {
    const [activeTab, setActiveTab] = useState('dashboard');

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'locations', label: 'Office Locations', icon: MapPin },
        { id: 'schedules', label: 'Schedules', icon: Calendar },
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'leaves', label: 'Leave Requests', icon: Users },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Attendance Management</h1>
                    <p className="text-slate-500">Monitor attendance, manage locations, and configure settings</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                  ${activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    }
                `}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Content */}
            <div className="min-h-[500px]">
                {activeTab === 'dashboard' && <AttendanceDashboard />}
                {activeTab === 'locations' && <OfficeLocations />}
                {activeTab === 'schedules' && <ScheduleManagement />}
                {activeTab === 'reports' && <AttendanceReport />}
                {activeTab === 'leaves' && <LeaveManagement />}
                {activeTab === 'settings' && <AttendanceSettings />}
            </div>
        </div>
    );
}
