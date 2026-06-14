import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
    Pill, 
    History, 
    Truck, 
    ArrowRight, 
    Activity, 
    AlertCircle, 
    CheckCircle2,
    Clock,
    TrendingUp,
    ChevronRight,
    Users,
    CalendarCheck
} from 'lucide-react';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer 
} from 'recharts';

export default function MedicationHubPage() {
    const navigate = useNavigate();

    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['medication-dashboard'],
        queryFn: async () => {
            const res = await api.get('/medications/dashboard');
            return res.data;
        },
        refetchInterval: 120000,
        refetchIntervalInBackground: false,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    const stats = dashboardData?.today || { scheduled: 0, administered: 0, missed: 0, adherence: 0 };
    const upcoming = dashboardData?.upcoming || [];
    const trendData = dashboardData?.adherence_trend || [];

    return (
        <div className="space-y-6 pb-20">
            {/* Header / Banner */}
            <div className="relative bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 rounded-3xl p-8 overflow-hidden shadow-xl border border-teal-700/50">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Medication Hub</h1>
                        <p className="mt-2 text-teal-100/80 text-lg max-w-xl">
                            Real-time medication administration and adherence tracking for your facility.
                        </p>
                    </div>
                    <button 
                        onClick={() => navigate('/medications')}
                        className="flex items-center gap-2 bg-white text-teal-900 px-6 py-3.5 rounded-2xl font-bold hover:bg-teal-50 transition-all shadow-lg active:scale-95 group"
                    >
                        <span>Start Administration</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Performance Snapshot */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Adherence Score" 
                    value={`${stats.adherence}%`} 
                    subtitle="Goal: 100%" 
                    icon={TrendingUp} 
                    color="teal"
                />
                <StatCard 
                    title="Scheduled Today" 
                    value={stats.scheduled} 
                    subtitle="Total doses due" 
                    icon={Clock} 
                    color="blue"
                />
                <StatCard 
                    title="Administered" 
                    value={stats.administered} 
                    subtitle="Successfully given" 
                    icon={CheckCircle2} 
                    color="emerald"
                />
                <StatCard 
                    title="Late / Missed" 
                    value={stats.missed} 
                    subtitle="Requires attention" 
                    icon={AlertCircle} 
                    color="rose"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming Doses */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-teal-600" />
                            Due Soon
                        </h3>
                        {upcoming.length > 0 && (
                            <span className="text-xs font-semibold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Next 4h
                            </span>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {upcoming.length > 0 ? (
                            upcoming.map((item, idx) => (
                                <UpcomingDoseCard key={idx} item={item} />
                            ))
                        ) : (
                            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
                                <CheckCircle2 className="w-12 h-12 text-teal-200 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium font-sm">No doses due soon</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Adherence Trend Chart */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">7-Day Adherence Trend</h3>
                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                                Adherence %
                            </div>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorAdh" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="day" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 12, fill: '#64748b'}}
                                    dy={10}
                                />
                                <YAxis 
                                    hide 
                                    domain={[0, 100]}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '16px', 
                                        border: 'none', 
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                                    }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="adherence" 
                                    stroke="#14b8a6" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorAdh)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <HubActionCard 
                    title="Administration"
                    description="Record doses, refusals, and missed meds in real-time."
                    icon={Pill}
                    path="/medications"
                    color="teal"
                />
                <HubActionCard 
                    title="MAR & History"
                    description="Generate monthly PDF reports and review past records."
                    icon={History}
                    path="/reports"
                    color="blue"
                />
                <HubActionCard 
                    title="Stock & Inventory"
                    description="Manage pharmacy deliveries and verify stock levels."
                    icon={Truck}
                    path="/medication-deliveries"
                    color="purple"
                />
            </div>
        </div>
    );
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
    const colorClasses = {
        teal: 'bg-teal-50 text-teal-600 border-teal-100',
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100'
    };

    return (
        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${colorClasses[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">{title}</h4>
            <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
            <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
    );
}

function UpcomingDoseCard({ item }) {
    const navigate = useNavigate();
    return (
        <div 
            onClick={() => navigate(`/medications?resident_id=${item.resident_id}`)}
            className="group bg-white rounded-2xl p-4 border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all cursor-pointer"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-bold shrink-0">
                        {item.resident_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate">{item.resident_name}</div>
                        <div className="text-xs text-gray-500 truncate">{item.medication_name}</div>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-teal-600">{item.scheduled_time}</div>
                    <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
                        {item.minutes_until <= 0 ? 'Now' : `in ${item.minutes_until}m`}
                    </div>
                </div>
            </div>
        </div>
    );
}

function HubActionCard({ title, description, icon: Icon, path, color }) {
    const navigate = useNavigate();
    const colorClasses = {
        teal: 'text-teal-600 group-hover:bg-teal-600 group-hover:text-white',
        blue: 'text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
        purple: 'text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
    };

    return (
        <div 
            onClick={() => navigate(path)}
            className="group bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
        >
            <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center transition-all mb-6 ${colorClasses[color]}`}>
                    <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{description}</p>
                <div className="mt-6 flex items-center text-sm font-bold text-gray-400 group-hover:text-gray-900 transition-colors">
                    Get Started
                    <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
            {/* Background pattern */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-gray-50/50 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
        </div>
    );
}
