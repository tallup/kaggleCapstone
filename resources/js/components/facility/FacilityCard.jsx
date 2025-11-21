import React from 'react';
import { Building2, MapPin, Phone, Mail, Globe, Key, Users, CheckCircle, XCircle } from 'lucide-react';

/**
 * FacilityCard Component
 * Displays a facility in a card format with all relevant information
 */
export default function FacilityCard({ facility, onEdit, onDelete, onView, showActions = true }) {
    const {
        id,
        name,
        location,
        address,
        phone,
        email,
        logo_url,
        subdomain,
        provider_code,
        is_active,
        primary_color,
        secondary_color,
        branches_count,
        users_count,
    } = facility;

    return (
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden group">
            {/* Header with Logo and Status */}
            <div
                className="h-2"
                style={{ backgroundColor: primary_color || '#1E3A5F' }}
            />

            <div className="p-6">
                {/* Top Section - Logo, Name, and Actions */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3 flex-1">
                        {/* Logo */}
                        <div className="flex-shrink-0">
                            {logo_url ? (
                                <img
                                    src={logo_url}
                                    alt={`${name} logo`}
                                    className="w-12 h-12 object-contain rounded-lg border border-gray-200 bg-white p-1"
                                />
                            ) : (
                                <div
                                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${primary_color}15` || '#1E3A5F15' }}
                                >
                                    <Building2
                                        className="w-6 h-6"
                                        style={{ color: primary_color || '#1E3A5F' }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Name and Location */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                                <h3 className="text-lg font-bold text-gray-900 truncate">
                                    {name}
                                </h3>
                                {is_active ? (
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" title="Active" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" title="Inactive" />
                                )}
                            </div>
                            {location && (
                                <div className="flex items-center text-sm text-gray-600">
                                    <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                                    <span className="truncate">{location}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {showActions && (
                        <div className="flex flex-col space-y-2 ml-2">
                            {onView && (
                                <button
                                    onClick={() => onView(facility)}
                                    className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors border border-blue-300"
                                    title="View Details"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </button>
                            )}
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(facility)}
                                    className="p-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-300"
                                    title="Edit Facility"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={() => onDelete(facility)}
                                    className="p-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors border border-red-300"
                                    title="Delete Facility"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Contact Information */}
                <div className="space-y-2 mb-4">
                    {address && (
                        <div className="flex items-start text-sm text-gray-700">
                            <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-500" />
                            <span className="line-clamp-2 text-gray-700">{address}</span>
                        </div>
                    )}
                    {phone && (
                        <div className="flex items-center text-sm">
                            <Phone className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500" />
                            <a href={`tel:${phone}`} className="text-gray-700 hover:text-blue-600 transition-colors">
                                {phone}
                            </a>
                        </div>
                    )}
                    {email && (
                        <div className="flex items-center text-sm">
                            <Mail className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500" />
                            <a href={`mailto:${email}`} className="text-gray-700 hover:text-blue-600 transition-colors truncate">
                                {email}
                            </a>
                        </div>
                    )}
                </div>

                {/* Additional Info */}
                {(subdomain || provider_code) && (
                    <div className="space-y-2 mb-4 pt-4 border-t border-gray-100">
                        {subdomain && (
                            <div className="flex items-center text-sm text-gray-600">
                                <Globe className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                    {subdomain}.yourapp.com
                                </span>
                            </div>
                        )}
                        {provider_code && (
                            <div className="flex items-center text-sm text-gray-600">
                                <Key className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                    {provider_code}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Statistics */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-4">
                        {branches_count !== undefined && (
                            <div className="flex items-center text-sm">
                                <Building2 className="w-4 h-4 mr-1 text-gray-400" />
                                <span className="font-semibold text-gray-900">{branches_count}</span>
                                <span className="text-gray-500 ml-1">
                                    {branches_count === 1 ? 'Branch' : 'Branches'}
                                </span>
                            </div>
                        )}
                        {users_count !== undefined && (
                            <div className="flex items-center text-sm">
                                <Users className="w-4 h-4 mr-1 text-gray-400" />
                                <span className="font-semibold text-gray-900">{users_count}</span>
                                <span className="text-gray-500 ml-1">
                                    {users_count === 1 ? 'User' : 'Users'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Color Indicators */}
                    {(primary_color || secondary_color) && (
                        <div className="flex items-center space-x-1">
                            {primary_color && (
                                <div
                                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                    style={{ backgroundColor: primary_color }}
                                    title={`Primary: ${primary_color}`}
                                />
                            )}
                            {secondary_color && (
                                <div
                                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                    style={{ backgroundColor: secondary_color }}
                                    title={`Secondary: ${secondary_color}`}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
