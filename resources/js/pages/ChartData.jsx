import React, { useState, useEffect } from 'react';
import api from '../services/api';
import logger from '../utils/logger';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';

export default function ChartData() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState([]);
    const [newBehavior, setNewBehavior] = useState({ categoryId: '', name: '' });
    const [stagedChanges, setStagedChanges] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/chart-data-definitions');
            // Filter categories to only show specific ones as requested
            const allowedCategories = ['Resistive', 'Behavior', 'Others'];
            const filteredCategories = response.data.filter(cat =>
                allowedCategories.includes(cat.name)
            );
            setCategories(filteredCategories);
            setLoading(false);
        } catch (error) {
            logger.error('Error fetching chart data:', error);
            toast.error('Failed to load chart data');
            setLoading(false);
        }
    };

    const handleAddBehavior = () => {
        if (!newBehavior.categoryId || !newBehavior.name.trim()) {
            toast.error('Please select a category and enter a behavior name');
            return;
        }

        const category = categories.find(c => c.id === parseInt(newBehavior.categoryId));
        if (!category) return;

        // Add to local state for immediate feedback
        const updatedCategories = categories.map(cat => {
            if (cat.id === category.id) {
                return {
                    ...cat,
                    definitions: [...cat.definitions, { name: newBehavior.name, is_new: true, tempId: Date.now() }]
                };
            }
            return cat;
        });

        setCategories(updatedCategories);

        // Stage the change for submission
        setStagedChanges([...stagedChanges, {
            behavior_category_id: category.id,
            name: newBehavior.name
        }]);

        setNewBehavior({ ...newBehavior, name: '' });
    };

    const handleRemoveBehavior = (categoryId, behaviorId, tempId) => {
        const updatedCategories = categories.map(cat => {
            if (cat.id === categoryId) {
                return {
                    ...cat,
                    definitions: cat.definitions.filter(def =>
                        behaviorId ? def.id !== behaviorId : def.tempId !== tempId
                    )
                };
            }
            return cat;
        });

        setCategories(updatedCategories);

        // If it was an existing behavior, stage for removal
        if (behaviorId) {
            setStagedChanges([...stagedChanges, {
                id: behaviorId,
                behavior_category_id: categoryId,
                name: '', // name not needed for removal but kept for consistency
                is_remove: true
            }]);
        } else {
            // If it was a newly added behavior that hasn't been submitted yet, just remove from staged changes
            setStagedChanges(stagedChanges.filter(change => change.tempId !== tempId));
        }
    };

    const handleSubmit = async () => {
        if (stagedChanges.length === 0) {
            toast.info('No changes to submit');
            return;
        }

        try {
            setSaving(true);
            await api.post('/chart-data-definitions/bulk', { data: stagedChanges });
            toast.success('Chart data updated successfully', '', { isFormSubmission: true });
            setStagedChanges([]);
            await fetchData();
        } catch (error) {
            logger.error('Error saving chart data:', error);
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">Chart Data</h1>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-700">
                            <th className="px-6 py-4 font-semibold border-b border-gray-200 border-r border-gray-200 w-1/4 uppercase tracking-wider text-xs">Category</th>
                            <th className="px-6 py-4 font-semibold border-b border-gray-200 border-r border-gray-200 w-1/2 uppercase tracking-wider text-xs">Behavior</th>
                            <th className="px-6 py-4 font-semibold border-b border-gray-200 w-1/4 uppercase tracking-wider text-xs">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((category) => (
                            <React.Fragment key={category.id}>
                                {category.definitions.length > 0 ? (
                                    category.definitions.map((behavior, index) => (
                                        <tr key={behavior.id || behavior.tempId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            {index === 0 && (
                                                <td
                                                    className="px-6 py-4 font-medium text-gray-700 border-r border-gray-200 align-middle"
                                                    rowSpan={category.definitions.length}
                                                >
                                                    {category.name}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-gray-600 border-r border-gray-200">
                                                {behavior.name}
                                                {behavior.is_new && <span className="ml-2 text-xs text-[var(--theme-primary)] font-medium italic">(New)</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleRemoveBehavior(category.id, behavior.id, behavior.tempId)}
                                                    className="inline-flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="border-b border-gray-100">
                                        <td className="px-6 py-4 font-medium text-gray-700 border-r border-gray-200 align-middle">
                                            {category.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 italic border-r border-gray-200">No behaviors defined</td>
                                        <td className="px-6 py-4"></td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add New Behavior Section */}
            <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Behavior</h2>
                <div className="flex flex-col md:flex-row gap-4 items-end bg-gray-50 p-6 rounded-lg border border-gray-100">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">Select Category</label>
                        <select
                            value={newBehavior.categoryId}
                            onChange={(e) => setNewBehavior({ ...newBehavior, categoryId: e.target.value })}
                            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] transition-shadow"
                        >
                            <option value="">Select Category</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-[2] w-full">
                        <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">Enter behavior</label>
                        <input
                            type="text"
                            value={newBehavior.name}
                            onChange={(e) => setNewBehavior({ ...newBehavior, name: e.target.value })}
                            placeholder="Enter behavior"
                            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] transition-shadow"
                        />
                    </div>
                    <button
                        onClick={handleAddBehavior}
                        className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center justify-center shadow-md"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                    </button>
                </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8 flex justify-start">
                <button
                    onClick={handleSubmit}
                    disabled={saving || stagedChanges.length === 0}
                    className={`
                        px-8 py-3 rounded-lg font-bold transition-all transform active:scale-95
                        ${stagedChanges.length > 0
                            ? 'bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] shadow-lg shadow-[var(--theme-primary)]/20'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                        flex items-center
                    `}
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Submit'
                    )}
                </button>
            </div>
        </div>
    );
}
