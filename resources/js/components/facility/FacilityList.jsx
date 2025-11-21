import React, { useState } from 'react';
import { Building2, Search, Filter, Grid, List, Plus } from 'lucide-react';
import FacilityCard from './FacilityCard';

/**
 * FacilityList Component
 * Displays a list/grid of facilities with search and filter capabilities
 */
export default function FacilityList({
    facilities = [],
    isLoading = false,
    onEdit,
    onDelete,
    onView,
    onCreate,
    searchTerm = '',
    onSearchChange,
}) {
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
    const [sortBy, setSortBy] = useState('name'); // 'name', 'location', 'created_at'

    // Filter facilities
    const filteredFacilities = facilities.filter(facility => {
        // Status filter
        if (filterStatus === 'active' && !facility.is_active) return false;
        if (filterStatus === 'inactive' && facility.is_active) return false;

        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return (
                facility.name?.toLowerCase().includes(search) ||
                facility.location?.toLowerCase().includes(search) ||
                facility.address?.toLowerCase().includes(search) ||
                facility.email?.toLowerCase().includes(search)
            );
        }

        return true;
    });

    // Sort facilities
    const sortedFacilities = [...filteredFacilities].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return (a.name || '').localeCompare(b.name || '');
            case 'location':
                return (a.location || '').localeCompare(b.location || '');
            case 'created_at':
                return new Date(b.created_at) - new Date(a.created_at);
            default:
                return 0;
        }
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Facilities Management</h2>
                        <p className="text-gray-600">
                            Manage and configure facilities in the system
                        </p>
                    </div>
                    {onCreate && (
                        <button
                            onClick={onCreate}
                            className="w-full lg:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add Facility</span>
                        </button>
                    )}
                </div>

                {/* Search and Filters */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-2 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            placeholder="Search facilities..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                        >
                            <option value="all">All Facilities</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>

                    {/* Sort */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                        >
                            <option value="name">Sort by Name</option>
                            <option value="location">Sort by Location</option>
                            <option value="created_at">Sort by Date</option>
                        </select>
                    </div>
                </div>

                {/* View Mode Toggle and Stats */}
                <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Showing <span className="font-semibold">{sortedFacilities.length}</span> of{' '}
                        <span className="font-semibold">{facilities.length}</span> facilities
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid'
                                ? 'bg-blue-100 text-blue-600'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                }`}
                            title="Grid View"
                        >
                            <Grid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
                                ? 'bg-blue-100 text-blue-600'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                }`}
                            title="List View"
                        >
                            <List className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading facilities...</p>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && sortedFacilities.length === 0 && (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {searchTerm || filterStatus !== 'all' ? 'No facilities found' : 'No facilities yet'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                        {searchTerm || filterStatus !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Get started by creating your first facility'}
                    </p>
                    {onCreate && !searchTerm && filterStatus === 'all' && (
                        <button
                            onClick={onCreate}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add First Facility</span>
                        </button>
                    )}
                </div>
            )}

            {/* Facilities Grid/List */}
            {!isLoading && sortedFacilities.length > 0 && (
                <div
                    className={
                        viewMode === 'grid'
                            ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                            : 'space-y-4'
                    }
                >
                    {sortedFacilities.map((facility) => (
                        <FacilityCard
                            key={facility.id}
                            facility={facility}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onView={onView}
                        />
                    ))}
                </div>
            )}

            {/* Pagination Info (if needed) */}
            {!isLoading && sortedFacilities.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <div>
                            Displaying {sortedFacilities.length} {sortedFacilities.length === 1 ? 'facility' : 'facilities'}
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {facilities.filter(f => f.is_active).length} Active
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {facilities.filter(f => !f.is_active).length} Inactive
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
