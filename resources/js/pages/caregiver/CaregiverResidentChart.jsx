import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Save, CheckCircle2, AlertCircle, Plus, X,
    ClipboardList, User, Calendar, FileText
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';
import logger from '../../utils/logger';
import Tooltip from '../../components/ui/Tooltip';

export default function CaregiverResidentChart({ residentId: residentIdProp = null, embedded = false } = {}) {
    const params = useParams();
    const residentId = residentIdProp != null && residentIdProp !== '' ? String(residentIdProp) : params.residentId;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const chartDate = searchParams.get('date');
    const isNew = searchParams.get('new') === 'true';

    const [chartData, setChartData] = useState({
        items: [],
        logs: []
    });
    const [currentTimeError, setCurrentTimeError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState(chartDate || new Date().toISOString().split('T')[0]);

    // Fetch resident info
    const { data: resident, isLoading: isLoadingResident } = useQuery({
        queryKey: ['resident-details', residentId],
        queryFn: async () => (await api.get(`/residents/${residentId}`)).data,
        enabled: !!residentId
    });

    // Fetch definitions and chart for the selected date
    const { data: initData, isLoading: isLoadingInit } = useQuery({
        queryKey: ['resident-chart-init', residentId, selectedDate, isNew],
        queryFn: async () => {
            const [definitionsRes] = await Promise.all([
                api.get('/chart-data-definitions')
            ]);
            
            let chart = null;
            if (!isNew) {
                try {
                    const chartRes = await api.get(`/resident-charts/${residentId}`, {
                        params: { date: selectedDate }
                    });
                    const fetchedChart = chartRes.data.chart;
                    const chartDateStr = fetchedChart?.chart_date ? String(fetchedChart.chart_date).slice(0, 10) : null;
                    const selectedDateStr = String(selectedDate).slice(0, 10);
                    if (fetchedChart && chartDateStr === selectedDateStr) {
                        chart = fetchedChart;
                    }
                } catch (error) {
                    // Chart doesn't exist, that's fine - we'll create a new one
                }
            }
            
            const allowedCategories = ['Resistive', 'Behavior', 'Others'];
            return {
                categories: definitionsRes.data.filter(cat => allowedCategories.includes(cat.name)),
                chart: chart
            };
        },
        enabled: !!residentId
    });

    useEffect(() => {
        if (!initData) return;
        const { categories, chart } = initData;

        const initialItems = [];
        (categories || []).forEach(cat => {
            (cat.definitions || []).forEach(def => {
                const existingItem = (!isNew && chart?.items) ? chart.items.find(item => item.behavior_definition_id === def.id) : null;
                initialItems.push({
                    behavior_definition_id: def.id,
                    name: def.name,
                    category_name: cat.name,
                    category_id: cat.id,
                    value: existingItem ? !!existingItem.value : false
                });
            });
        });

        const logs = (!isNew && chart?.logs?.length)
            ? chart.logs.map((log) => {
                let occurredAt = log.occurred_at;
                if (occurredAt) {
                    const d = new Date(occurredAt);
                    if (!Number.isNaN(d.getTime())) {
                        occurredAt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    }
                }
                return {
                    occurred_at: occurredAt || '',
                    behavior_description: log.behavior_description ?? '',
                    triggers: log.triggers ?? '',
                    caregiver_intervention: log.caregiver_intervention ?? '',
                    reported_to_provider: Boolean(log.reported_to_provider),
                    outcome: log.outcome ?? ''
                };
            })
            : [];
        setChartData({ items: initialItems, logs });
    }, [initData, isNew]);

    const checkTimeValidity = () => {
        const now = new Date();
        const hour = now.getHours();
        if (hour < 19 || hour > 21) {
            setCurrentTimeError('Entries are only permitted between 7:00 PM and 9:59 PM.');
            return false;
        }
        setCurrentTimeError(null);
        return true;
    };

    useEffect(() => {
        checkTimeValidity();
        const interval = setInterval(checkTimeValidity, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleItemChange = (definitionId, newValue) => {
        setChartData(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.behavior_definition_id === definitionId ? { ...item, value: newValue } : item
            )
        }));
    };

    const handleAddLog = () => {
        const now = new Date().toISOString().slice(0, 16);
        setChartData(prev => ({
            ...prev,
            logs: [...prev.logs, {
                occurred_at: now,
                behavior_description: '',
                triggers: '',
                caregiver_intervention: '',
                reported_to_provider: false,
                outcome: ''
            }]
        }));
    };

    const handleLogChange = (index, field, value) => {
        setChartData(prev => ({
            ...prev,
            logs: prev.logs.map((log, i) => i === index ? { ...log, [field]: value } : log)
        }));
    };

    const handleRemoveLog = (index) => {
        setChartData(prev => ({
            ...prev,
            logs: prev.logs.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (status) => {
        if (status === 'submitted' && !checkTimeValidity()) {
            toast.error('Charts can only be submitted between 7:00 PM and 9:59 PM.');
            return;
        }

        setSaving(true);
        try {
            await api.post('/resident-charts', {
                resident_id: residentId,
                chart_date: selectedDate,
                status: status,
                items: chartData.items.map(item => ({
                    behavior_definition_id: item.behavior_definition_id,
                    value: item.value
                })),
                logs: chartData.logs
            });

            toast.success(`Chart ${status === 'submitted' ? 'submitted' : 'saved as draft'} successfully!`, '', { isFormSubmission: true });
            queryClient.invalidateQueries({ queryKey: ['resident-chart-init', residentId, selectedDate, isNew] });
            await queryClient.refetchQueries({ queryKey: ['resident-chart-init', residentId, selectedDate, isNew] });
            queryClient.invalidateQueries(['behavior-charts']);
            if (status === 'submitted') navigate('/charts');
        } catch (error) {
            logger.error('Failed to save chart:', error);
            const msg = error.response?.data?.message || 'Failed to save chart';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (isLoadingResident || isLoadingInit) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--theme-primary)]"></div>
            </div>
        );
    }

    // Group items by category
    const groupedItems = chartData.items.reduce((acc, item) => {
        if (!acc[item.category_name]) acc[item.category_name] = [];
        acc[item.category_name].push(item);
        return acc;
    }, {});

    return (
        <div className={`max-w-7xl mx-auto space-y-6 ${embedded ? 'pb-4' : 'pb-12'}`}>
            {/* Header / Form Title */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        {!embedded && (
                        <button
                            type="button"
                            onClick={() => navigate('/charts')}
                            className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                            aria-label="Back to charts"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        )}
                        <div>
                            <h1 className={`font-bold text-gray-900 ${embedded ? 'text-lg' : 'text-2xl'}`}>
                                Behavioral Charting
                            </h1>
                            <p className="text-sm text-gray-500">
                                Logging behavior data for <span className="font-semibold text-gray-900">{resident?.first_name} {resident?.last_name}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleSubmit('draft')}
                            disabled={saving}
                            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button
                            onClick={() => handleSubmit('submitted')}
                            disabled={saving}
                            className="px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] shadow-[var(--theme-primary-light)]/20 active:scale-95 disabled:opacity-50"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {saving ? 'Submitting...' : 'Submit Charts'}
                        </button>
                    </div>
                </div>

                {currentTimeError && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div className="text-sm text-amber-800">
                            <strong>Note:</strong> Final submissions are only allowed between <strong>7:00 PM</strong> and <strong>9:59 PM</strong>.
                            You can still save your progress as a draft at any time.
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side: Behaviors Checklist */}
                <div className="lg:col-span-12">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[var(--theme-primary)]" />
                                Behavior Checklist
                            </h2>
                        </div>
                        <div className="p-6 overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3.5 font-bold border-b border-gray-200 bg-gray-50/50">Category</th>
                                        <th className="px-5 py-3.5 font-bold border-b border-gray-200 bg-gray-50/50">Behavior</th>
                                        <th className="px-5 py-3.5 font-bold border-b border-gray-200 bg-gray-50/50 text-center">Status (Yes/No)</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-700 divide-y divide-gray-100">
                                    {Object.entries(groupedItems).map(([catName, items]) => (
                                        items.map((item, idx) => (
                                            <tr key={item.behavior_definition_id} className="hover:bg-gray-50/40 transition-colors">
                                                {idx === 0 && (
                                                    <td className="px-5 py-4 align-middle font-bold text-gray-900 bg-gray-50/20 border-r border-gray-100" rowSpan={items.length}>
                                                        {catName}
                                                    </td>
                                                )}
                                                <td className="px-5 py-4 font-medium text-gray-800">{item.name}</td>
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        <select
                                                            value={item.value ? "true" : "false"}
                                                            onChange={(e) => handleItemChange(item.behavior_definition_id, e.target.value === "true")}
                                                            className="bg-white border-2 border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)] focus:border-[var(--theme-primary)] transition-all min-w-[120px]"
                                                        >
                                                            <option value="false">No</option>
                                                            <option value="true">Yes</option>
                                                        </select>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ))}
                                    {Object.keys(groupedItems).length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="px-5 py-16 text-center text-gray-400 italic font-medium">
                                                No behavior categories defined. Please check administration settings.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Bottom: Detailed Incident Logs */}
                <div className="lg:col-span-12">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-[var(--theme-primary)]" />
                                Detailed Incident Logs
                            </h2>
                            <button
                                onClick={handleAddLog}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--theme-primary-hover)] shadow-sm transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                Add New Log Entry
                            </button>
                        </div>
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1200px]">
                                <thead className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-widest font-black">
                                    <tr>
                                        <th className="px-6 py-4 border-b border-gray-200 border-r border-gray-100">Time Occurred</th>
                                        <th className="px-6 py-4 border-b border-gray-200 border-r border-gray-100">Behavior Description</th>
                                        <th className="px-6 py-4 border-b border-gray-200 border-r border-gray-100">Triggers</th>
                                        <th className="px-6 py-4 border-b border-gray-200 border-r border-gray-100">Intervention</th>
                                        <th className="px-6 py-4 border-b border-gray-200 border-r border-gray-100">Reported?</th>
                                        <th className="px-6 py-4 border-b border-gray-200 border-r border-gray-100">Outcome</th>
                                        <th className="px-6 py-4 border-b border-gray-200 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {chartData.logs.map((log, index) => (
                                        <tr key={index} className="hover:bg-gray-50/30 transition-colors">
                                            <td className="p-4 border-r border-gray-100 min-w-[200px]">
                                                <input
                                                    type="datetime-local"
                                                    value={log.occurred_at}
                                                    onChange={(e) => handleLogChange(index, 'occurred_at', e.target.value)}
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)] focus:border-[var(--theme-primary)] shadow-sm"
                                                />
                                            </td>
                                            <td className="p-4 border-r border-gray-100 min-w-[250px]">
                                                <textarea
                                                    value={log.behavior_description}
                                                    onChange={(e) => handleLogChange(index, 'behavior_description', e.target.value)}
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)] focus:border-[var(--theme-primary)] min-h-[100px] shadow-sm"
                                                    placeholder="What happened?"
                                                />
                                            </td>
                                            <td className="p-4 border-r border-gray-100 min-w-[200px]">
                                                <textarea
                                                    value={log.triggers}
                                                    onChange={(e) => handleLogChange(index, 'triggers', e.target.value)}
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)] focus:border-[var(--theme-primary)] min-h-[100px] shadow-sm"
                                                    placeholder="What triggered it?"
                                                />
                                            </td>
                                            <td className="p-4 border-r border-gray-100 min-w-[200px]">
                                                <textarea
                                                    value={log.caregiver_intervention}
                                                    onChange={(e) => handleLogChange(index, 'caregiver_intervention', e.target.value)}
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)] focus:border-[var(--theme-primary)] min-h-[100px] shadow-sm"
                                                    placeholder="What was done?"
                                                />
                                            </td>
                                            <td className="p-4 border-r border-gray-100 min-w-[120px]">
                                                <select
                                                    value={log.reported_to_provider ? "true" : "false"}
                                                    onChange={(e) => handleLogChange(index, 'reported_to_provider', e.target.value === "true")}
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)] focus:border-[var(--theme-primary)] shadow-sm"
                                                >
                                                    <option value="false">No</option>
                                                    <option value="true">Yes</option>
                                                </select>
                                            </td>
                                            <td className="p-4 border-r border-gray-100 min-w-[200px]">
                                                <textarea
                                                    value={log.outcome}
                                                    onChange={(e) => handleLogChange(index, 'outcome', e.target.value)}
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)] focus:border-[var(--theme-primary)] min-h-[100px] shadow-sm"
                                                    placeholder="Final result?"
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <Tooltip content="Remove log" position="left">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveLog(index)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl hover:bg-red-100 hover:border-red-300 transition-all active:scale-95 text-xs font-semibold"
                                                        aria-label="Remove log row"
                                                    >
                                                        <X className="w-4 h-4 shrink-0" />
                                                        <span>Remove</span>
                                                    </button>
                                                </Tooltip>
                                            </td>
                                        </tr>
                                    ))}
                                    {chartData.logs.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                                    <ClipboardList className="w-12 h-12 opacity-20" />
                                                    <p className="italic font-medium">No detailed logs added for today.</p>
                                                    <button
                                                        onClick={handleAddLog}
                                                        className="mt-2 text-[var(--theme-primary)] font-bold hover:underline"
                                                    >
                                                        Click here to add the first record
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
