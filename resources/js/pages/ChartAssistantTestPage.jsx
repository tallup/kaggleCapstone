import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import ChartAssistantPanel from '../components/reports/ChartAssistantPanel';

export default function ChartAssistantTestPage() {
    const [residentId, setResidentId] = useState('');
    const [residentName, setResidentName] = useState('');

    const { data: residentsData, isLoading: residentsLoading } = useQuery({
        queryKey: ['chart-assistant-residents'],
        queryFn: async () => (await api.get('/residents', { params: { per_page: 100, show_all: true } })).data,
    });

    const residents = useMemo(() => residentsData?.data ?? [], [residentsData]);

    const handleResidentChange = (event) => {
        const selectedId = event.target.value;
        setResidentId(selectedId);

        if (!selectedId) {
            setResidentName('');
            return;
        }

        const selectedResident = residents.find((resident) => String(resident.id) === String(selectedId));
        setResidentName([selectedResident?.first_name, selectedResident?.middle_names, selectedResident?.last_name].filter(Boolean).join(' '));
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-semibold text-slate-900">Chart Assistant test page</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Select a resident to load the assistant panel and test the resident chart analysis flow immediately.
                </p>

                <div className="mt-4">
                    <select
                        value={residentId}
                        onChange={handleResidentChange}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                        disabled={residentsLoading}
                    >
                        <option value="">{residentsLoading ? 'Loading residents...' : 'Select a resident'}</option>
                        {residents.map((resident) => {
                            const fullName = [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ') || 'Resident';
                            return (
                                <option key={resident.id} value={resident.id}>
                                    {fullName}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>

            <ChartAssistantPanel residentId={residentId ? Number(residentId) : null} residentName={residentName || undefined} />
        </div>
    );
}
