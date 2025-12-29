import { useState } from 'react';
import {
    Clock,
    Calendar,
    History
} from 'lucide-react';
import { CheckInCard } from './CheckInCard';
import { AttendanceHistory } from './AttendanceHistory';
import { AttendanceCalendar } from '../AttendanceCalendar';

export function AttendanceEmployeePage({ onNavigate }: { onNavigate?: (page: string) => void }) {
    const [activeTab, setActiveTab] = useState('checkin');

    const tabs = [
        { id: 'checkin', label: 'Check In/Out', icon: Clock },
        { id: 'calendar', label: 'My Calendar', icon: Calendar },
        { id: 'history', label: 'My History', icon: History },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Attendance</h1>
                    <p className="text-slate-500">Track your work hours and manage leave requests</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8">
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
                {activeTab === 'checkin' && <CheckInCard />}
                {activeTab === 'calendar' && <AttendanceCalendar isAdmin={false} onNavigate={onNavigate} />}
                {activeTab === 'history' && <AttendanceHistory />}
            </div>
        </div>
    );
}
