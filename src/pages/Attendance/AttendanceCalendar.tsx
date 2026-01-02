import { useState, useEffect } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isToday,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    parseISO
} from 'date-fns';
import {
    ChevronLeft,
    ChevronRight,
    Home,
    Calendar as CalendarIcon,
    AlertCircle,
    Info,
    CheckCircle2,
    CalendarDays,
    Users,
    Settings,
    X,
    RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AttendanceCalendarProps {
    employee_id?: string;
    isAdmin?: boolean;
    onNavigate?: (page: string) => void;
}

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    employee_code: string;
}

interface LeaveType {
    id: string;
    name: string;
    code: string;
    days_per_year: number;
}

interface LeaveBalance {
    leave_type_id: string;
    accrued: number;
}

export function AttendanceCalendar({ employee_id, isAdmin = false, onNavigate }: AttendanceCalendarProps) {
    const { membership, organization } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [leaveData, setLeaveData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        leavesTaken: 0,
        wfhTaken: 0,
        borrowedCount: 0,
        allowedLeaves: 0,
        allowedWfh: 0
    });
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employee_id || (isAdmin ? 'all' : membership?.employee_id || ''));
    const [localOrgId, setLocalOrgId] = useState<string | null>(null);

    // Fallback: If organization context is missing, use localOrgId recovered from employee profile
    const effectiveOrgId = organization?.id || localOrgId;
    const { user, profile } = useAuth(); // getting profile to help find employee_id if needed
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [selectedDateDetails, setSelectedDateDetails] = useState<{
        date: string;
        people: { name: string; type: 'WFH' | 'Leave'; details?: string }[];
    } | null>(null);

    // Recover Organization ID if missing
    useEffect(() => {
        const recoverOrg = async () => {
            if (!organization?.id && !localOrgId && (profile?.employee_id || membership?.employee_id)) {
                const empId = profile?.employee_id || membership?.employee_id;
                if (!empId) return;

                try {
                    const { data } = await supabase
                        .from('employees')
                        .select('organization_id')
                        .eq('id', empId)
                        .maybeSingle();

                    if (data?.organization_id) {
                        setLocalOrgId(data.organization_id);
                    }
                } catch (e) {
                    console.error("Error recovering Org ID", e);
                }
            }
        };
        recoverOrg();
    }, [organization?.id, localOrgId, profile, membership]);

    useEffect(() => {
        if (isAdmin && effectiveOrgId) {
            loadEmployees();
        }
    }, [isAdmin, effectiveOrgId]);

    const loadEmployees = async () => {
        try {
            const { data } = await supabase
                .from('employees')
                .select('id, first_name, last_name, employee_code')
                .eq('organization_id', effectiveOrgId!)
                .eq('is_active', true)
                .order('first_name');
            const typedData = data as Employee[] | null;
            setEmployees(typedData || []);
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    };

    const targetEmployeeId = selectedEmployeeId;

    useEffect(() => {
        if (effectiveOrgId) {
            loadMonthData();
        } else {
            // Safety timeout or stop loading if we truly have no org
            const t = setTimeout(() => setLoading(false), 3000);
            return () => clearTimeout(t);
        }
    }, [currentDate, targetEmployeeId, effectiveOrgId]);

    const loadMonthData = async () => {
        setLoading(true);
        try {
            const start = startOfMonth(currentDate);
            const end = endOfMonth(currentDate);
            const startStr = format(start, 'yyyy-MM-dd');
            const endStr = format(end, 'yyyy-MM-dd');

            // Fetch Leave Types
            const { data: typesData, error: typesError } = await supabase
                .from('leave_types')
                .select('*')
                .eq('organization_id', effectiveOrgId!);

            if (typesError) console.error('Error fetching leave types:', typesError);
            const currentTypes = (typesData || []) as LeaveType[];
            setLeaveTypes(currentTypes);

            const wfhType = currentTypes.find(t => t.code === 'WFH' || t.name.toLowerCase().includes('work from home'));

            let attendanceQuery = supabase
                .from('attendance_records')
                .select('*, employees(first_name, last_name)')
                .eq('organization_id', effectiveOrgId!)
                .gte('date', startStr)
                .lte('date', endStr);

            let leaveQuery = supabase
                .from('leave_applications')
                .select(`
                    *,
                    leave_types (id, name, code),
                    employees!leave_applications_employee_id_fkey (first_name, last_name)
                `)
                .eq('status', 'approved')
                .lte('start_date', endStr)
                .gte('end_date', startStr);

            if (targetEmployeeId && targetEmployeeId !== 'all') {
                attendanceQuery = attendanceQuery.eq('employee_id', targetEmployeeId);
                leaveQuery = leaveQuery.eq('employee_id', targetEmployeeId);

                // Fetch Balance for Quotas
                const { data: balancesData } = await supabase
                    .from('leave_balances')
                    .select('*')
                    .eq('employee_id', targetEmployeeId)
                    .eq('year', new Date().getFullYear());

                const balances = (balancesData || []) as LeaveBalance[];

                const casualLeave = currentTypes.find(t => t.code === 'CL' || t.name.toLowerCase().includes('casual'));
                const allowedLeavesYear = casualLeave ? (balances.find(b => b.leave_type_id === casualLeave.id)?.accrued || casualLeave.days_per_year || 24) : 24;
                const allowedWfhYear = wfhType ? (balances.find(b => b.leave_type_id === wfhType.id)?.accrued || wfhType.days_per_year || 24) : 24;

                const allowedMonthlyLeave = Math.floor(allowedLeavesYear / 12);
                const allowedMonthlyWfh = Math.floor(allowedWfhYear / 12);
                const { data: attendance, error: attErr } = await attendanceQuery;
                const { data: leaves, error: leaveErr } = await leaveQuery;

                if (attErr) console.error('Error fetching attendance:', attErr);
                if (leaveErr) console.error('Error fetching leaves:', leaveErr);

                const currentAttendance = (attendance || []) as any[];
                const currentLeaves = (leaves || []) as any[];

                setAttendanceData(currentAttendance);
                setLeaveData(currentLeaves);

                // Calculate Stats
                const wfhCount = currentAttendance.filter(r => r.work_type === 'Remote').length +
                    currentLeaves.filter(l => l.leave_types?.id === wfhType?.id).length;

                let leavesInMonth = 0;
                const daysInMonth = eachDayOfInterval({ start, end });
                daysInMonth.forEach(day => {
                    const isLeave = currentLeaves.some(l => {
                        if (l.leave_types?.id === wfhType?.id) return false; // Don't count WFH as leave for this stat
                        const lStart = parseISO(l.start_date);
                        const lEnd = parseISO(l.end_date);
                        return day >= lStart && day <= lEnd;
                    });
                    if (isLeave) leavesInMonth++;
                });

                setStats({
                    leavesTaken: leavesInMonth,
                    wfhTaken: wfhCount,
                    borrowedCount: Math.max(0, leavesInMonth - allowedMonthlyLeave),
                    allowedLeaves: allowedMonthlyLeave,
                    allowedWfh: allowedMonthlyWfh
                });
            } else {
                // All Employees View
                const { data: attendance, error: attErr } = await attendanceQuery;
                const { data: leaves, error: leaveErr } = await leaveQuery;

                if (attErr) console.error('Error fetching attendance (all):', attErr);
                if (leaveErr) console.error('Error fetching leaves (all):', leaveErr);

                const currentAttendance = (attendance || []) as any[];
                const currentLeaves = (leaves || []) as any[];

                setAttendanceData(currentAttendance);
                setLeaveData(currentLeaves);

                // For all employees, leavesTaken is total man-days on leave
                let totalLeavesInMonth = 0;
                let totalWfhInMonth = currentAttendance.filter(r => r.work_type === 'Remote').length;

                const daysInMonth = eachDayOfInterval({ start, end });
                daysInMonth.forEach(day => {
                    const leavesOnDay = currentLeaves.filter(l => {
                        if (l.leave_types?.id === wfhType?.id) return false;
                        const lStart = parseISO(l.start_date);
                        const lEnd = parseISO(l.end_date);
                        return day >= lStart && day <= lEnd;
                    });
                    totalLeavesInMonth += leavesOnDay.length;

                    const wfhLeavesOnDay = currentLeaves.filter(l => {
                        return l.leave_types?.id === wfhType?.id && day >= parseISO(l.start_date) && day <= parseISO(l.end_date);
                    });
                    totalWfhInMonth += wfhLeavesOnDay.length;
                });

                setStats({
                    leavesTaken: totalLeavesInMonth,
                    wfhTaken: totalWfhInMonth,
                    borrowedCount: 0,
                    allowedLeaves: 0,
                    allowedWfh: 0
                });
            }

        } catch (error) {
            console.error('Error loading calendar data:', error);
        } finally {
            setLoading(false);
        }
    };

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentDate)),
        end: endOfWeek(endOfMonth(currentDate))
    });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const getDayContent = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isAll = !selectedEmployeeId || selectedEmployeeId === 'all';
        const wfhType = leaveTypes.find(t => t.code === 'WFH' || t.name.toLowerCase().includes('work from home'));

        const attendanceAtDay = attendanceData.filter(r => r.date === dateStr);
        const leavesAtDay = leaveData.filter(l => {
            const lStart = parseISO(l.start_date);
            const lEnd = parseISO(l.end_date);
            return day >= lStart && day <= lEnd;
        });

        const wfhCountAtDay = attendanceAtDay.filter(r => r.work_type === 'Remote').length +
            leavesAtDay.filter(l => l.leave_types?.id === wfhType?.id).length;

        const standardLeavesAtDay = leavesAtDay.filter(l => l.leave_types?.id !== wfhType?.id);
        const presenceAtDay = attendanceAtDay.filter(r => r.status === 'Present' && r.work_type !== 'Remote').length;

        // Determine if this is a "borrowed" leave (only for individual view)
        let isBorrowed = false;
        if (!isAll && standardLeavesAtDay.length > 0) {
            const startOfCurrentMonth = startOfMonth(day);
            if (isSameMonth(day, startOfCurrentMonth)) {
                let leavesBefore = 0;
                const daysInMonthSoFar = eachDayOfInterval({ start: startOfCurrentMonth, end: day });
                daysInMonthSoFar.forEach(d => {
                    const hasLeave = leaveData.some(l => {
                        if (l.leave_types?.id === wfhType?.id) return false;
                        const lStart = parseISO(l.start_date);
                        const lEnd = parseISO(l.end_date);
                        return d >= lStart && d <= lEnd;
                    });
                    if (hasLeave) leavesBefore++;
                });

                if (leavesBefore > stats.allowedLeaves) {
                    isBorrowed = true;
                }
            }
        }

        const handleDayClick = (e: React.MouseEvent) => {
            if (!isAdmin) return;
            e.stopPropagation();

            const people: { name: string; type: 'WFH' | 'Leave'; details?: string }[] = [];

            // Collect WFH from Attendance Records
            attendanceAtDay.filter(r => r.work_type === 'Remote').forEach(r => {
                const name = r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : 'Unknown Employee';
                people.push({
                    name,
                    type: 'WFH',
                    details: 'Remote Attendance'
                });
            });

            // Collect Leaves and WFH from Leave Applications
            leavesAtDay.forEach(l => {
                const isWFH = l.leave_types?.id === wfhType?.id;
                people.push({
                    name: l.employees ? `${l.employees.first_name} ${l.employees.last_name}` : 'Unknown Employee',
                    type: isWFH ? 'WFH' : 'Leave',
                    details: l.leave_types?.name
                });
            });

            if (people.length > 0) {
                // Deduplicate by name and type to avoid double counting
                const uniquePeopleMap = new Map();
                people.forEach(p => {
                    uniquePeopleMap.set(`${p.name}-${p.type}`, p);
                });
                const uniquePeople = Array.from(uniquePeopleMap.values());

                setSelectedDateDetails({
                    date: dateStr,
                    people: uniquePeople
                });
            }
        };

        return (
            <div
                onClick={handleDayClick}
                className={`flex flex-col items-center gap-1 w-full h-full min-h-[50px] p-1.5 hover:bg-slate-50 transition-colors rounded-xl ${isAdmin ? 'cursor-pointer' : ''}`}
            >
                <div className="w-full flex justify-between items-start">
                    <span className={`text-2xl font-black ${!isSameMonth(day, currentDate) ? 'text-slate-300' : isToday(day) ? 'bg-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg shadow-indigo-200' : 'text-slate-600'}`}>
                        {format(day, 'd')}
                    </span>
                    {isAll && (standardLeavesAtDay.length > 0 || wfhCountAtDay > 0) && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-black">
                            {standardLeavesAtDay.length + wfhCountAtDay}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap justify-center gap-1.5 mt-auto pb-1">
                    {wfhCountAtDay > 0 && (
                        <div className="bg-purple-50 text-purple-600 p-1.5 rounded-lg flex items-center gap-1 border border-purple-100 shadow-sm" title={isAll ? `${wfhCountAtDay} Working from home` : 'Working from home'}>
                            <Home className="h-3.5 w-3.5" />
                            {isAll && wfhCountAtDay > 1 && <span className="text-[10px] font-black">{wfhCountAtDay}</span>}
                        </div>
                    )}

                    {standardLeavesAtDay.length > 0 && (
                        <div className={`p-1.5 rounded-lg flex items-center gap-1 border shadow-sm ${isBorrowed ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' : 'bg-orange-50 text-orange-600 border-orange-100'}`}
                            title={isAll ? `${standardLeavesAtDay.length} On Leave` : `On Leave: ${standardLeavesAtDay[0].leave_types?.name}`}>
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {isAll ? (standardLeavesAtDay.length > 1 && <span className="text-[10px] font-black">{standardLeavesAtDay.length}</span>) : (isBorrowed && <span className="text-[8px] font-black uppercase">Borrowed</span>)}
                        </div>
                    )}

                    {!isAll && presenceAtDay > 0 && (
                        <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg border border-emerald-100 shadow-sm" title="Present in Office">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn relative">
            {/* Calendar Header */}
            <div className="bg-white px-8 py-10 text-slate-900 border-b border-slate-50">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
                    <div className="flex items-center gap-5">
                        <div className="h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-200">
                            <CalendarDays className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{format(currentDate, 'MMMM yyyy')}</h2>
                            <p className="text-slate-500 text-sm font-semibold flex items-center gap-2 mt-1">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Attendance & Performance Calendar
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {isAdmin && (
                            <button
                                onClick={() => onNavigate?.('leave')}
                                className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-600 hover:bg-slate-50 rounded-2xl text-sm font-black transition-all border-2 border-slate-100 shadow-sm"
                                title="Set leave quotas in Leave Configuration"
                            >
                                <Settings className="h-4 w-4" />
                                Manage Configuration
                            </button>
                        )}

                        {isAdmin && (
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                <Users className="h-4 w-4 text-slate-400 ml-2" />
                                <select
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                    className="bg-transparent border-none text-slate-900 text-sm font-black rounded-xl focus:ring-0 p-2 min-w-[240px] cursor-pointer"
                                >
                                    <option value="all">Organization Overview</option>
                                    {employees.map((emp: Employee) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.first_name} {emp.last_name} ({emp.employee_code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
                            <button onClick={prevMonth} className="p-2.5 hover:bg-white hover:shadow-md rounded-xl transition-all text-slate-600 hover:text-indigo-600">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button onClick={() => setCurrentDate(new Date())} className="px-6 py-2.5 hover:bg-white hover:shadow-md rounded-xl text-sm font-black text-slate-700 transition-all">
                                Today
                            </button>
                            <button onClick={nextMonth} className="p-2.5 hover:bg-white hover:shadow-md rounded-xl transition-all text-slate-600 hover:text-indigo-600">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quota Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-3xl hover:border-orange-200 transition-all group hover:shadow-xl hover:shadow-orange-50/50">
                        <div className="flex items-center justify-between mb-5">
                            <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-orange-600 transition-colors">Monthly Leaves</span>
                            <div className="p-2.5 bg-orange-100 rounded-xl text-orange-600 shadow-sm">
                                <CalendarIcon className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900">{stats.leavesTaken}</span>
                            {stats.allowedLeaves > 0 && <span className="text-slate-400 text-sm font-black italic">of {stats.allowedLeaves} limit</span>}
                        </div>
                        {stats.allowedLeaves > 0 && (
                            <div className="mt-5 w-full bg-slate-200 h-3 rounded-full overflow-hidden shadow-inner">
                                <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${stats.leavesTaken > stats.allowedLeaves ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-orange-400 to-amber-500'}`} style={{ width: `${Math.min(100, (stats.leavesTaken / stats.allowedLeaves) * 100)}%` }}></div>
                            </div>
                        )}
                        {stats.borrowedCount > 0 && (
                            <div className="mt-4 flex items-center gap-2 text-red-600 text-[10px] font-black uppercase tracking-wider bg-red-50 px-3 py-1.5 rounded-xl w-fit border border-red-100 animate-bounce-subtle">
                                <AlertCircle className="h-4 w-4" />
                                {stats.borrowedCount} Days Borrowed
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-3xl hover:border-purple-200 transition-all group hover:shadow-xl hover:shadow-purple-50/50">
                        <div className="flex items-center justify-between mb-5">
                            <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-purple-600 transition-colors">Work From Home</span>
                            <div className="p-2.5 bg-purple-100 rounded-xl text-purple-600 shadow-sm">
                                <Home className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900">{stats.wfhTaken}</span>
                            {stats.allowedWfh > 0 && <span className="text-slate-400 text-sm font-black italic">of {stats.allowedWfh} limit</span>}
                        </div>
                        {stats.allowedWfh > 0 && (
                            <div className="mt-5 w-full bg-slate-200 h-3 rounded-full overflow-hidden shadow-inner">
                                <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${stats.wfhTaken > stats.allowedWfh ? 'bg-gradient-to-r from-purple-500 to-indigo-600' : 'bg-gradient-to-r from-purple-400 to-fuchsia-500'}`} style={{ width: `${Math.min(100, (stats.wfhTaken / stats.allowedWfh) * 100)}%` }}></div>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-3xl lg:col-span-2 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Live Legend</span>
                            <Info className="h-5 w-5 text-slate-300" />
                        </div>
                        <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50 shadow-sm"></div>
                                <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">Active In-Office</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-3 h-3 rounded-full bg-purple-500 ring-4 ring-purple-50 shadow-sm"></div>
                                <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">Remote WFH</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-3 h-3 rounded-full bg-orange-500 ring-4 ring-orange-50 shadow-sm"></div>
                                <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">Planned Leave</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse ring-4 ring-amber-50 shadow-sm"></div>
                                <span className="text-[11px] font-black text-amber-700 uppercase tracking-tight">Borrowed Day</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-6 bg-white overflow-x-auto">
                <div className="min-w-[900px]">
                    <div className="grid grid-cols-7 gap-px bg-slate-100 border-2 border-slate-100 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-50">
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                            <div key={day} className="py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] bg-slate-50/80">
                                {day.substring(0, 3)}
                            </div>
                        ))}
                        {days.map((day, idx) => (
                            <div key={idx} className={`bg-white min-h-[85px] transition-all hover:bg-slate-50/50 group/day ${!isSameMonth(day, currentDate) ? 'bg-slate-50/20' : ''}`}>
                                {getDayContent(day)}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Date Details Modal */}
            {selectedDateDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedDateDetails(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn" onClick={e => e.stopPropagation()}>
                        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-black text-lg">
                                    {format(parseISO(selectedDateDetails.date), 'MMMM d, yyyy')}
                                </h3>
                                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Employee Status Details</p>
                            </div>
                            <button
                                onClick={() => setSelectedDateDetails(null)}
                                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="space-y-4">
                                {selectedDateDetails.people.map((person, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm ${person.type === 'WFH' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'
                                                }`}>
                                                {person.name.split(' ').filter(Boolean).map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900">{person.name}</p>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{person.details || person.type}</p>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${person.type === 'WFH' ? 'bg-purple-600 text-white' : 'bg-orange-600 text-white'
                                            }`}>
                                            {person.type}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {loading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-md flex items-center justify-center z-20 animate-fadeIn">
                    <div className="flex flex-col items-center gap-4">
                        <RefreshCw className="h-12 w-12 text-indigo-600 animate-spin" />
                        <p className="text-indigo-900 font-black text-xs uppercase tracking-widest">Synchronizing Data...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
