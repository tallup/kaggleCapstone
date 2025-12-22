import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, ClipboardList, AlertCircle, Clock } from 'lucide-react';
import api from '../../services/api';
import ResidentChartModal from '../../components/residents/ResidentChartModal';

function getInitials(first = '', last = '') {
    return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

export default function CaregiverChartsPage() {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [activeTab, setActiveTab] = useState('new'); // 'new' or 'pending'
    const [selectedResident, setSelectedResident] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedSearch(search.trim());
        }, 350);
        return () => clearTimeout(timeout);
    }, [search]);

    const { data: residentsData, isLoading } = useQuery({
        queryKey: ['residents-for-charts', debouncedSearch],
        queryFn: async () => {
            const params = {
                per_page: 50,
                is_active: 1,
            };
            if (debouncedSearch) params.search = debouncedSearch;
            const response = await api.get('/residents', { params });
            return response.data;
        }
    });

    const residents = residentsData?.data ?? [];

    const handleOpenChart = (resident) => {
        setSelectedResident(resident);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <header className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ClipboardList className="w-8 h-8 text-[var(--theme-primary)]" />
                            Resident Charts
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Select a resident to record or view behavior charts.
                        </p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search residents..."
                            className="w-full rounded-lg border border-gray-200 py-2 pl-11 pr-4 text-sm focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent outline-none"
                        />
                    </div>
                </div>
            </header>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {residents.map((resident) => (
                        <div key={resident.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                                    {resident.profile_image_url ? (
                                        <img src={resident.profile_image_url} alt={resident.name} className="w-full h-full object-cover" />
                                    ) : (
                                        getInitials(resident.first_name, resident.last_name)
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-gray-900 truncate">
                                        {[resident.first_name, resident.last_name].filter(Boolean).join(' ')}
                                    </h3>
                                    <div className="space-y-1 mt-1">
                                        <p className="text-xs text-gray-500 truncate">DOB: {resident.date_of_birth}</p>
                                        <p className="text-xs text-gray-500 truncate">Diagnosis: {resident.diagnosis || 'N/A'}</p>
                                        <p className="text-xs text-gray-500 truncate">Physician: {resident.physician_name || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleOpenChart(resident)}
                                    className="flex-1 px-4 py-2.5 bg-[var(--theme-primary)] text-white rounded-xl text-xs font-bold hover:bg-[var(--theme-primary-hover)] transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    New Charts
                                </button>
                                <button
                                    className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    Pending Charts
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && selectedResident && (
                <ResidentChartModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    resident={selectedResident}
                />
            )}
        </div>
    );
}
