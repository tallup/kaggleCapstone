import React from 'react';
import {
    Building2, MapPin, Phone, Mail, Globe, Key, Palette,
    CheckCircle, XCircle, Calendar, User, Copy, ExternalLink
} from 'lucide-react';
import logger from '../../utils/logger';
import Tooltip from '../ui/Tooltip';

/**
 * FacilityDetailView Component
 * Comprehensive view of facility details with all information sections
 */
export default function FacilityDetailView({ facility, onEdit, onClose }) {
    const [copiedField, setCopiedField] = React.useState(null);

    const copyToClipboard = async (text, fieldName) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            logger.error('Failed to copy:', err);
        }
    };

    const {
        name,
        location,
        description,
        address,
        phone,
        email,
        logo_url,
        subdomain,
        provider_code,
        is_active,
        primary_color,
        secondary_color,
        accent_color,
        brochure_url,
        brochure_color,
        branches_count,
        users_count,
        created_at,
        updated_at,
        owner,
    } = facility;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 p-6 border-b bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                            {logo_url && (
                                <img
                                    src={logo_url}
                                    alt={`${name} logo`}
                                    className="w-16 h-16 object-contain rounded-lg border border-gray-200 bg-white p-2"
                                />
                            )}
                            <div>
                                <div className="flex items-center space-x-3 mb-2">
                                    <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
                                    {is_active ? (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            <XCircle className="w-3 h-3 mr-1" />
                                            Inactive
                                        </span>
                                    )}
                                </div>
                                {location && (
                                    <p className="text-gray-600 flex items-center">
                                        <MapPin className="w-4 h-4 mr-1" />
                                        {location}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(facility)}
                                    className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span>Edit</span>
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Description */}
                        {description && (
                            <Section title="Description" icon={<Building2 className="w-5 h-5" />}>
                                <p className="text-gray-700 leading-relaxed">{description}</p>
                            </Section>
                        )}

                        {/* Contact Information */}
                        <Section title="Contact Information" icon={<Phone className="w-5 h-5" />}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {address && (
                                    <InfoItem
                                        icon={<MapPin className="w-4 h-4" />}
                                        label="Address"
                                        value={address}
                                        fullWidth
                                    />
                                )}
                                {phone && (
                                    <InfoItem
                                        icon={<Phone className="w-4 h-4" />}
                                        label="Phone"
                                        value={phone}
                                        copyable
                                        onCopy={() => copyToClipboard(phone, 'phone')}
                                        copied={copiedField === 'phone'}
                                    />
                                )}
                                {email && (
                                    <InfoItem
                                        icon={<Mail className="w-4 h-4" />}
                                        label="Email"
                                        value={email}
                                        copyable
                                        onCopy={() => copyToClipboard(email, 'email')}
                                        copied={copiedField === 'email'}
                                    />
                                )}
                            </div>
                        </Section>

                        {/* Marketing Information */}
                        {(brochure_url || brochure_color) && (
                            <Section title="Marketing Information" icon={<ExternalLink className="w-5 h-5" />}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {brochure_url && (
                                        <InfoItem
                                            icon={<ExternalLink className="w-4 h-4" />}
                                            label="Brochure URL"
                                            value={
                                                <a
                                                    href={brochure_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline flex items-center"
                                                >
                                                    View Brochure
                                                    <ExternalLink className="w-3 h-3 ml-1" />
                                                </a>
                                            }
                                        />
                                    )}
                                    {brochure_color && (
                                        <InfoItem
                                            icon={<Palette className="w-4 h-4" />}
                                            label="Brochure Theme"
                                            value={
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                                                    {brochure_color}
                                                </span>
                                            }
                                        />
                                    )}
                                </div>
                            </Section>
                        )}

                        {/* Branding & Customization */}
                        {(subdomain || provider_code || primary_color || secondary_color || accent_color) && (
                            <Section title="Branding & Customization" icon={<Palette className="w-5 h-5" />}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {subdomain && (
                                        <InfoItem
                                            icon={<Globe className="w-4 h-4" />}
                                            label="Subdomain"
                                            value={
                                                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                                    {subdomain}.yourapp.com
                                                </span>
                                            }
                                            copyable
                                            onCopy={() => copyToClipboard(`${subdomain}.yourapp.com`, 'subdomain')}
                                            copied={copiedField === 'subdomain'}
                                        />
                                    )}
                                    {provider_code && (
                                        <InfoItem
                                            icon={<Key className="w-4 h-4" />}
                                            label="Provider Code"
                                            value={
                                                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                                    {provider_code}
                                                </span>
                                            }
                                            copyable
                                            onCopy={() => copyToClipboard(provider_code, 'provider_code')}
                                            copied={copiedField === 'provider_code'}
                                        />
                                    )}
                                </div>

                                {/* Color Swatches */}
                                {(primary_color || secondary_color || accent_color) && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <h4 className="text-sm font-medium text-gray-700 mb-3">Brand Colors</h4>
                                        <div className="flex flex-wrap gap-4">
                                            {primary_color && (
                                                <ColorSwatch color={primary_color} label="Primary" />
                                            )}
                                            {secondary_color && (
                                                <ColorSwatch color={secondary_color} label="Secondary" />
                                            )}
                                            {accent_color && (
                                                <ColorSwatch color={accent_color} label="Accent" />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Section>
                        )}

                        {/* Statistics */}
                        <Section title="Statistics" icon={<Building2 className="w-5 h-5" />}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard
                                    label="Total Branches"
                                    value={branches_count || 0}
                                    icon={<Building2 className="w-5 h-5 text-blue-600" />}
                                    color="blue"
                                />
                                <StatCard
                                    label="Total Users"
                                    value={users_count || 0}
                                    icon={<User className="w-5 h-5 text-green-600" />}
                                    color="green"
                                />
                                {owner && (
                                    <div className="col-span-2">
                                        <InfoItem
                                            icon={<User className="w-4 h-4" />}
                                            label="Registered By"
                                            value={owner.name || 'System'}
                                        />
                                    </div>
                                )}
                            </div>
                        </Section>

                        {/* System Information */}
                        <Section title="System Information" icon={<Calendar className="w-5 h-5" />} collapsible defaultCollapsed>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {created_at && (
                                    <InfoItem
                                        icon={<Calendar className="w-4 h-4" />}
                                        label="Created At"
                                        value={new Date(created_at).toLocaleString()}
                                    />
                                )}
                                {updated_at && (
                                    <InfoItem
                                        icon={<Calendar className="w-4 h-4" />}
                                        label="Last Updated"
                                        value={new Date(updated_at).toLocaleString()}
                                    />
                                )}
                            </div>
                        </Section>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Components

function Section({ title, icon, children, collapsible = false, defaultCollapsed = false }) {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

    return (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div
                className={`flex items-center justify-between mb-3 ${collapsible ? 'cursor-pointer' : ''}`}
                onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
            >
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <span className="text-gray-600">{icon}</span>
                    <span>{title}</span>
                </h3>
                {collapsible && (
                    <button className="text-gray-400 hover:text-gray-600">
                        <svg
                            className={`w-5 h-5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                )}
            </div>
            {(!collapsible || !isCollapsed) && children}
        </div>
    );
}

function InfoItem({ icon, label, value, copyable, onCopy, copied, fullWidth }) {
    return (
        <div className={fullWidth ? 'md:col-span-2' : ''}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                        <span className="text-gray-400">{icon}</span>
                        <span className="text-sm font-medium text-gray-600">{label}</span>
                    </div>
                    <div className="text-gray-900 ml-6">
                        {typeof value === 'string' ? value : value}
                    </div>
                </div>
                {copyable && (
                    <Tooltip content="Copy to clipboard" position="left">
                        <button
                            type="button"
                            onClick={onCopy}
                            className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Copy to clipboard"
                        >
                            {copied ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                                <Copy className="w-4 h-4" strokeWidth={2.25} />
                            )}
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    );
}

function ColorSwatch({ color, label }) {
    return (
        <div className="flex items-center space-x-2">
            <div
                className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm"
                style={{ backgroundColor: color }}
            />
            <div>
                <div className="text-xs font-medium text-gray-700">{label}</div>
                <div className="text-xs font-mono text-gray-500">{color}</div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }) {
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-200',
        green: 'bg-green-50 border-green-200',
        purple: 'bg-purple-50 border-purple-200',
        orange: 'bg-orange-50 border-orange-200',
    };

    return (
        <div className={`${colorClasses[color]} border rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-2">
                {icon}
                <span className="text-2xl font-bold text-gray-900">{value}</span>
            </div>
            <div className="text-sm text-gray-600">{label}</div>
        </div>
    );
}
