import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Save, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { toast } from 'sonner';

export default function ResidentChartModal({ isOpen, onClose, resident }) {
    const queryClient = useQueryClient();
    const [chartData, setChartData] = useState({
        items: [],
        logs: []
    });
    const [currentTimeError, setCurrentTimeError] = useState(null);
    const [saving, setSaving] = useState(false);

    // Fetch definitions and today's chart
    const { data: initData, isLoading: isLoadingInit } = useQuery({
        queryKey: ['resident-chart-init', resident.id],
        queryFn: async () => {
            const [definitionsRes, chartRes] = await Promise.all([
                api.get('/chart-data-definitions'),
                api.get(`/resident-charts/${resident.id}`)
            ]);
            return {
                categories: definitionsRes.data,
                chart: chartRes.data.chart
            };
        },
        enabled: isOpen && !!resident.id
    });

    useEffect(() => {
        if (initData) {
            const { categories, chart } = initData;

            // Map definitions to items
            const initialItems = [];
            categories.forEach(cat => {
                cat.definitions.forEach(def => {
                    const existingItem = chart?.items?.find(item => item.behavior_definition_id === def.id);
                    initialItems.push({
                        behavior_definition_id: def.id,
                        name: def.name,
                        category_name: cat.name,
                        category_id: cat.id,
                        value: existingItem ? !!existingItem.value : false
                    });
                });
            });

            setChartData({
                items: initialItems,
                logs: chart?.logs || []
            });
        }
    }, [initData]);

    const checkTimeValidity = () => {
        const now = new Date();
        const hour = now.getHours();
        // 7:00 PM (19) to 9:59 PM (21)
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
        const now = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
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
            return;
        }

        setSaving(true);
        try {
            await api.post('/resident-charts', {
                resident_id: resident.id,
                chart_date: new Date().toISOString().split('T')[0],
                status: status,
                items: chartData.items.map(item => ({
                    behavior_definition_id: item.behavior_definition_id,
                    value: item.value
                })),
                logs: chartData.logs
            });

            toast.success(`Chart ${status === 'submitted' ? 'submitted' : 'saved as draft'} successfully!`);
            queryClient.invalidateQueries(['resident-chart-init', resident.id]);
            if (status === 'submitted') onClose();
        } catch (error) {
            console.error('Failed to save chart:', error);
            const msg = error.response?.data?.message || 'Failed to save chart';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    // Group items by category for table spanning
    const groupedItems = chartData.items.reduce((acc, item) => {
        if (!acc[item.category_name]) acc[item.category_name] = [];
        acc[item.category_name].push(item);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-slate-900 w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        Charts for {resident.first_name} {resident.last_name}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Behaviors Section */}
                    <div>
                        <h3 className="text-[var(--theme-primary)] font-bold text-lg mb-4">Behaviors</h3>
                        <div className="overflow-hidden border border-slate-700 rounded-lg">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-800 text-slate-300 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold border-b border-slate-700 border-r border-slate-700">Category</th>
                                        <th className="px-4 py-3 font-semibold border-b border-slate-700 border-r border-slate-700">Log</th>
                                        <th className="px-4 py-3 font-semibold border-b border-slate-700">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-300">
                                    {Object.entries(groupedItems).map(([catName, items]) => (
                                        items.map((item, idx) => (
                                            <tr key={item.behavior_definition_id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                                {idx === 0 && (
                                                    <td className="px-4 py-3 border-r border-slate-700 align-middle font-medium" rowSpan={items.length}>
                                                        {catName}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 border-r border-slate-700">{item.name}</td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        value={item.value ? "true" : "false"}
                                                        onChange={(e) => handleItemChange(item.behavior_definition_id, e.target.value === "true")}
                                                        className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                                                    >
                                                        <option value="false">No</option>
                                                        <option value="true">Yes</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))
                                    ))}
                                    {Object.keys(groupedItems).length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="px-4 py-8 text-center text-slate-500 italic">No behavior categories defined.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Behavior Descriptions Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[var(--theme-primary)] font-bold text-lg">Behavior Descriptions</h3>
                            <button
                                onClick={handleAddLog}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--theme-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--theme-primary-hover)] transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add Record
                            </button>
                        </div>
                        <div className="overflow-x-auto border border-slate-700 rounded-lg">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead className="bg-slate-800 text-slate-300 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold border-b border-slate-700 border-r border-slate-700">Date</th>
                                        <th className="px-4 py-3 font-semibold border-b border-slate-700 border-r border-slate-700">Behavior Description</th>
                                        <th className="px-4 py-3 font-semibold border-b border-slate-700 border-r border-slate-700">Triggers</th>
                                        <th className="px-4 py-3 font-semibold border-b border-slate-700 border-r border-slate-700">Caregiver Intervention</th>
                                        <th className="px-4 py-3 font-semibold border-b border-slate-700 border-r border-slate-700">Reported to Provider & Care Team</th>
                                        <th className="px-4 py-3 font-semibold border-b border-slate-700 border-r border-slate-700">Outcome</th>
                                        <th className="px-4 py-3 font-semibold border-b border-slate-700">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-300">
                                    {chartData.logs.map((log, index) => (
                                        <tr key={index} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                            <td className="p-2 border-r border-slate-700">
                                                <input
                                                    type="datetime-local"
                                                    value={log.occurred_at}
                                                    onChange={(e) => handleLogChange(index, 'occurred_at', e.target.value)}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                                                />
                                            </td>
                                            <td className="p-2 border-r border-slate-700">
                                                <textarea
                                                    value={log.behavior_description}
                                                    onChange={(e) => handleLogChange(index, 'behavior_description', e.target.value)}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] min-h-[60px]"
                                                    placeholder="Enter Behavior"
                                                />
                                            </td>
                                            <td className="p-2 border-r border-slate-700">
                                                <textarea
                                                    value={log.triggers}
                                                    onChange={(e) => handleLogChange(index, 'triggers', e.target.value)}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] min-h-[60px]"
                                                    placeholder="Enter Triggers"
                                                />
                                            </td>
                                            <td className="p-2 border-r border-slate-700">
                                                <textarea
                                                    value={log.caregiver_intervention}
                                                    onChange={(e) => handleLogChange(index, 'caregiver_intervention', e.target.value)}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] min-h-[60px]"
                                                    placeholder="Enter Intervention"
                                                />
                                            </td>
                                            <td className="p-2 border-r border-slate-700">
                                                <select
                                                    value={log.reported_to_provider ? "true" : "false"}
                                                    onChange={(e) => handleLogChange(index, 'reported_to_provider', e.target.value === "true")}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                                                >
                                                    <option value="false">No</option>
                                                    <option value="true">Yes</option>
                                                </select>
                                            </td>
                                            <td className="p-2 border-r border-slate-700">
                                                <textarea
                                                    value={log.outcome}
                                                    onChange={(e) => handleLogChange(index, 'outcome', e.target.value)}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] min-h-[60px]"
                                                    placeholder="Enter Outcome"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <button onClick={() => handleRemoveLog(index)} className="p-2 text-red-500 hover:text-red-400">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {chartData.logs.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-8 text-center text-slate-500 italic">No detailed logs added. Click "Add Record" to log a specific behavior incident.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Time Error Alert */}
                    {currentTimeError && (
                        <div className="bg-red-900/40 border-2 border-red-500/50 rounded-xl p-6 flex items-center justify-center text-center">
                            <div className="flex flex-col items-center gap-2">
                                <AlertCircle className="w-8 h-8 text-red-500" />
                                <span className="text-xl font-bold text-red-400">
                                    Entries are only permitted between <span className="underline underline-offset-4 decoration-red-500/50">7:00 PM</span> and <span className="underline underline-offset-4 decoration-red-500/50">9:59 PM</span>.
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex justify-between items-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
                    >
                        Close
                    </button>
                    <div className="flex gap-4">
                        <button
                            onClick={() => handleSubmit('draft')}
                            disabled={saving}
                            className="px-6 py-2.5 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-500 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button
                            onClick={() => handleSubmit('submitted')}
                            disabled={saving || !!currentTimeError}
                            className={`px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg ${currentTimeError
                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600'
                                    : 'bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] shadow-[var(--theme-primary)]/20 shadow-xl active:scale-95'
                                } disabled:opacity-50`}
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {saving ? 'Submitting...' : 'Submit Charts'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
