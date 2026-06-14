import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Save, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { toast } from 'sonner';
import logger from '../../utils/logger';

export default function ResidentChartModal({ isOpen, onClose, resident, initialChart = null }) {
    const queryClient = useQueryClient();
    const [chartData, setChartData] = useState({
        items: [],
        logs: []
    });
    const [currentTimeError, setCurrentTimeError] = useState(null);
    const [saving, setSaving] = useState(false);

    // Fetch definitions and chart (if not provided)
    const { data: initData, isLoading: isLoadingInit } = useQuery({
        queryKey: ['resident-chart-init', resident.id, initialChart?.id],
        queryFn: async () => {
            const promises = [api.get('/chart-data-definitions')];
            // Only fetch "today's chart" if we are NOT editing a specific past chart
            if (!initialChart) {
                promises.push(api.get(`/resident-charts/${resident.id}`));
            }

            const [definitionsRes, chartRes] = await Promise.all(promises);

            return {
                categories: definitionsRes.data,
                chart: initialChart || (chartRes ? chartRes.data.chart : null)
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
                    // Try to find in existing chart items by definition id
                    const existingItem = chart?.items?.find(item =>
                        item.behavior_definition_id === def.id ||
                        (item.definition && item.definition.id === def.id)
                    );

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
        // Time validation disabled for testing
        // const now = new Date();
        // const hour = now.getHours();
        // // 7:00 PM (19) to 9:59 PM (21)
        // if (hour < 19 || hour > 21) {
        //     setCurrentTimeError('Entries are only permitted between 7:00 PM and 9:59 PM.');
        //     return false;
        // }
        setCurrentTimeError(null);
        return true;
    };

    // useEffect(() => {
    //     checkTimeValidity();
    //     const interval = setInterval(checkTimeValidity, 60000);
    //     return () => clearInterval(interval);
    // }, []);

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
        // Time validation disabled for testing
        // if (status === 'submitted' && !checkTimeValidity()) {
        //     return;
        // }

        setSaving(true);
        try {
            await api.post('/resident-charts', {
                resident_id: resident.id,
                // Use existing chart date if editing, otherwise today
                chart_date: initialChart ? initialChart.chart_date : new Date().toISOString().split('T')[0],
                status: status,
                items: chartData.items.map(item => ({
                    behavior_definition_id: item.behavior_definition_id,
                    value: item.value
                })),
                logs: chartData.logs
            });

            toast.success(`Chart ${status === 'submitted' ? 'submitted' : 'saved as draft'} successfully!`, '', { isFormSubmission: true });
            queryClient.invalidateQueries(['resident-chart-init', resident.id]);
            queryClient.invalidateQueries(['behavior-charts']); // Also invalidate the list
            if (status === 'submitted') onClose();
        } catch (error) {
            logger.error('Failed to save chart:', error);
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
        <div className="behavior-chart-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 text-gray-900">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        Charts for {resident.first_name} {resident.last_name}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Behaviors Section */}
                    <div>
                        <h3 className="text-gray-900 font-bold text-lg mb-4">Behaviors</h3>
                        <div className="overflow-hidden border border-gray-200 rounded-xl shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-gray-900 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 font-bold border-b border-gray-200 border-r border-gray-200">Category</th>
                                        <th className="px-4 py-3 font-bold border-b border-gray-200 border-r border-gray-200">Log</th>
                                        <th className="px-4 py-3 font-bold border-b border-gray-200">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-900">
                                    {Object.entries(groupedItems).map(([catName, items]) => (
                                        items.map((item, idx) => (
                                            <tr key={item.behavior_definition_id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                {idx === 0 && (
                                                    <td className="px-4 py-3 border-r border-gray-200 align-middle font-bold text-gray-900 bg-gray-50/30" rowSpan={items.length}>
                                                        {catName}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 border-r border-gray-200 font-medium">{item.name}</td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        value={item.value ? "true" : "false"}
                                                        onChange={(e) => handleItemChange(item.behavior_definition_id, e.target.value === "true")}
                                                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)] focus:border-[var(--theme-primary)] transition-all"
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
                                            <td colSpan="3" className="px-4 py-12 text-center text-gray-400 italic">No behavior categories defined.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Behavior Descriptions Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-900 font-bold text-lg">Behavior Descriptions</h3>
                            <button
                                onClick={handleAddLog}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--theme-primary-hover)] shadow-sm transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                Add Record
                            </button>
                        </div>
                        <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead className="bg-gray-50 text-gray-900 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 font-bold border-b border-gray-200 border-r border-gray-200">Date</th>
                                        <th className="px-4 py-3 font-bold border-b border-gray-200 border-r border-gray-200">Behavior Description</th>
                                        <th className="px-4 py-3 font-bold border-b border-gray-200 border-r border-gray-200">Triggers</th>
                                        <th className="px-4 py-3 font-bold border-b border-gray-200 border-r border-gray-200">Caregiver Intervention</th>
                                        <th className="px-4 py-3 font-bold border-b border-gray-200 border-r border-gray-200">Reported to Provider & Care Team</th>
                                        <th className="px-4 py-3 font-bold border-b border-gray-200 border-r border-gray-200">Outcome</th>
                                        <th className="px-4 py-3 font-bold border-b border-gray-200">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-900">
                                    {chartData.logs.map((log, index) => (
                                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/50">
                                            <td className="p-3 border-r border-gray-200">
                                                <input
                                                    type="datetime-local"
                                                    value={log.occurred_at}
                                                    onChange={(e) => handleLogChange(index, 'occurred_at', e.target.value)}
                                                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)] focus:border-[var(--theme-primary)]"
                                                />
                                            </td>
                                            <td className="p-3 border-r border-gray-200">
                                                <textarea
                                                    value={log.behavior_description}
                                                    onChange={(e) => handleLogChange(index, 'behavior_description', e.target.value)}
                                                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)] focus:border-[var(--theme-primary)] min-h-[80px]"
                                                    placeholder="Enter Behavior"
                                                />
                                            </td>
                                            <td className="p-3 border-r border-gray-200">
                                                <textarea
                                                    value={log.triggers}
                                                    onChange={(e) => handleLogChange(index, 'triggers', e.target.value)}
                                                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)] focus:border-[var(--theme-primary)] min-h-[80px]"
                                                    placeholder="Enter Triggers"
                                                />
                                            </td>
                                            <td className="p-3 border-r border-gray-200">
                                                <textarea
                                                    value={log.caregiver_intervention}
                                                    onChange={(e) => handleLogChange(index, 'caregiver_intervention', e.target.value)}
                                                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)] focus:border-[var(--theme-primary)] min-h-[80px]"
                                                    placeholder="Enter Intervention"
                                                />
                                            </td>
                                            <td className="p-3 border-r border-gray-200">
                                                <select
                                                    value={log.reported_to_provider ? "true" : "false"}
                                                    onChange={(e) => handleLogChange(index, 'reported_to_provider', e.target.value === "true")}
                                                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)] focus:border-[var(--theme-primary)]"
                                                >
                                                    <option value="false">No</option>
                                                    <option value="true">Yes</option>
                                                </select>
                                            </td>
                                            <td className="p-3 border-r border-gray-200">
                                                <textarea
                                                    value={log.outcome}
                                                    onChange={(e) => handleLogChange(index, 'outcome', e.target.value)}
                                                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)] focus:border-[var(--theme-primary)] min-h-[80px]"
                                                    placeholder="Enter Outcome"
                                                />
                                            </td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => handleRemoveLog(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {chartData.logs.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-12 text-center text-gray-400 italic font-medium">No detailed logs added. Click "Add Record" to log a specific behavior incident.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Time Error Alert - DISABLED FOR TESTING */}
                    {/* {currentTimeError && (
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 flex items-center justify-center text-center">
                            <div className="flex flex-col items-center gap-2">
                                <AlertCircle className="w-8 h-8 text-amber-500" />
                                <span className="text-xl font-bold text-amber-700">
                                    Entries are only permitted between <span className="underline underline-offset-4 decoration-amber-500/50">7:00 PM</span> and <span className="underline underline-offset-4 decoration-amber-500/50">9:59 PM</span>.
                                </span>
                                <p className="text-sm text-amber-600 mt-1">You can still save your progress as a draft.</p>
                            </div>
                        </div>
                    )} */}
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Close
                    </button>
                    <div className="flex gap-4">
                        <button
                            onClick={() => handleSubmit('draft')}
                            disabled={saving}
                            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button
                            onClick={() => handleSubmit('submitted')}
                            disabled={saving}
                            className="px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] shadow-[var(--theme-primary-light)]/20 active:scale-95 disabled:opacity-50"
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
