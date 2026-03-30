import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
    ArrowLeft, Building2, MapPin, Phone, Mail, Globe, Key, Palette,
    CheckCircle, XCircle, Calendar, User, Copy, ExternalLink, Edit
} from 'lucide-react';
import logger from '../utils/logger';
import Tooltip from '../components/ui/Tooltip';

export default function FacilityView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [copiedField, setCopiedField] = React.useState(null);

    const { data: facility, isLoading, error } = useQuery({
        queryKey: ['facility', id],
        queryFn: async () => {
            const res = await api.get(`/facilities/${id}`);
            return res.data;
        },
    });

    const copyToClipboard = async (text, fieldName) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            logger.error('Failed to copy:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                    <p className="mt-4 text-gray-600">Loading facility details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <div className="bg-red-50 text-red-800 p-4 rounded-lg inline-block">
                    <p>Error loading facility details.</p>
                    <button
                        onClick={() => navigate('/super-admin/facilities')}
                        className="mt-2 text-sm underline hover:text-red-900"
                    >
                        Go back to list
                    </button>
                </div>
            </div>
        );
    }

    const {
        name,
        location,
        description,
        address,
        phone,
        email,
        logo_url,
        logo, // Also check raw logo field
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

    // Determine logo URL - prefer logo_url, fallback to constructing from logo path
    const displayLogoUrl = logo_url || (logo ? `/storage/${logo}` : null);

    return (
        <div>
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/super-admin/facilities')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Facility Details</h2>
                            <p className="text-sm text-gray-600">View complete facility information</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(`/super-admin/facilities/${id}/edit`)}
                        className="px-6 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] flex items-center gap-2"
                    >
                        <Edit className="w-4 h-4" />
                        Edit Facility
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {/* Facility Header Info */}
                <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                            {displayLogoUrl ? (
                                <img
                                    src={displayLogoUrl}
                                    alt={`${name} logo`}
                                    className="w-24 h-24 object-contain rounded-lg border border-gray-200 bg-white p-2"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextElementSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div
                                className={`w-24 h-24 rounded-lg flex items-center justify-center border border-gray-200 bg-white ${displayLogoUrl ? 'hidden' : ''}`}
                                style={{ backgroundColor: primary_color ? `${primary_color}15` : '#1E3A5F15' }}
                            >
                                <Building2
                                    className="w-12 h-12"
                                    style={{ color: primary_color || '#1E3A5F' }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <h1 className="text-3xl font-bold text-gray-900">{name}</h1>
                                {is_active ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Active
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Inactive
                                    </span>
                                )}
                            </div>
                            {location && (
                                <p className="text-gray-600 flex items-center text-lg">
                                    <MapPin className="w-5 h-5 mr-2" />
                                    {location}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {/* Description */}
                    {description && (
                        <Section title="Description" icon={<Building2 className="w-5 h-5" />}>
                            <p className="text-gray-700 leading-relaxed text-lg">{description}</p>
                        </Section>
                    )}

                    {/* Contact Information */}
                    <Section title="Contact Information" icon={<Phone className="w-5 h-5" />}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {address && (
                                <InfoItem
                                    icon={<MapPin className="w-5 h-5" />}
                                    label="Address"
                                    value={address}
                                    fullWidth
                                />
                            )}
                            {phone && (
                                <InfoItem
                                    icon={<Phone className="w-5 h-5" />}
                                    label="Phone"
                                    value={phone}
                                    copyable
                                    onCopy={() => copyToClipboard(phone, 'phone')}
                                    copied={copiedField === 'phone'}
                                />
                            )}
                            {email && (
                                <InfoItem
                                    icon={<Mail className="w-5 h-5" />}
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {brochure_url && (
                                    <InfoItem
                                        icon={<ExternalLink className="w-5 h-5" />}
                                        label="Brochure URL"
                                        value={
                                            <a
                                                href={brochure_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline flex items-center"
                                            >
                                                View Brochure
                                                <ExternalLink className="w-4 h-4 ml-1" />
                                            </a>
                                        }
                                    />
                                )}
                                {brochure_color && (
                                    <InfoItem
                                        icon={<Palette className="w-5 h-5" />}
                                        label="Brochure Theme"
                                        value={
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 capitalize">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {subdomain && (
                                    <InfoItem
                                        icon={<Globe className="w-5 h-5" />}
                                        label="Subdomain"
                                        value={
                                            <span className="font-mono text-base bg-gray-100 px-3 py-1 rounded">
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
                                        icon={<Key className="w-5 h-5" />}
                                        label="Provider Code"
                                        value={
                                            <span className="font-mono text-base bg-gray-100 px-3 py-1 rounded">
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
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <h4 className="text-base font-medium text-gray-700 mb-4">Brand Colors</h4>
                                    <div className="flex flex-wrap gap-6">
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <StatCard
                                label="Total Branches"
                                value={branches_count || 0}
                                icon={<Building2 className="w-6 h-6 text-blue-600" />}
                                color="blue"
                            />
                            <StatCard
                                label="Total Users"
                                value={users_count || 0}
                                icon={<User className="w-6 h-6 text-green-600" />}
                                color="green"
                            />
                            {owner && (
                                <div className="col-span-2">
                                    <InfoItem
                                        icon={<User className="w-5 h-5" />}
                                        label="Registered By"
                                        value={owner.name || 'System'}
                                    />
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* System Information */}
                    <Section title="System Information" icon={<Calendar className="w-5 h-5" />} collapsible defaultCollapsed>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {created_at && (
                                <InfoItem
                                    icon={<Calendar className="w-5 h-5" />}
                                    label="Created At"
                                    value={new Date(created_at).toLocaleString()}
                                />
                            )}
                            {updated_at && (
                                <InfoItem
                                    icon={<Calendar className="w-5 h-5" />}
                                    label="Last Updated"
                                    value={new Date(updated_at).toLocaleString()}
                                />
                            )}
                        </div>
                    </Section>
                </div>
            </div>
        </div>
    );
}

// Helper Components

function Section({ title, icon, children, collapsible = false, defaultCollapsed = false }) {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

    return (
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <div
                className={`flex items-center justify-between mb-4 ${collapsible ? 'cursor-pointer' : ''}`}
                onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
            >
                <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-3">
                    <span className="text-gray-600 p-1.5 bg-white rounded-lg border border-gray-200">{icon}</span>
                    <span>{title}</span>
                </h3>
                {collapsible && (
                    <button className="text-gray-400 hover:text-gray-600">
                        <svg
                            className={`w-6 h-6 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
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
                    <div className="flex items-center space-x-2 mb-1.5">
                        <span className="text-gray-400">{icon}</span>
                        <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">{label}</span>
                    </div>
                    <div className="text-gray-900 ml-7 text-lg font-medium">
                        {typeof value === 'string' ? value : value}
                    </div>
                </div>
                {copyable && (
                    <Tooltip content="Copy to clipboard" position="top">
                        <button
                            type="button"
                            onClick={onCopy}
                            className="ml-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                            aria-label="Copy to clipboard"
                        >
                            {copied ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <Copy className="w-5 h-5" strokeWidth={2.25} />
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
        <div className="flex items-center space-x-3 bg-white p-2 pr-4 rounded-lg border border-gray-200 shadow-sm">
            <div
                className="w-12 h-12 rounded-md border border-gray-200"
                style={{ backgroundColor: color }}
            />
            <div>
                <div className="text-sm font-semibold text-gray-900">{label}</div>
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
        <div className={`${colorClasses[color]} border rounded-xl p-5 flex flex-col items-center text-center`}>
            <div className="mb-3 p-3 bg-white rounded-full shadow-sm">
                {icon}
            </div>
            <span className="text-3xl font-bold text-gray-900 mb-1">{value}</span>
            <div className="text-sm font-medium text-gray-600">{label}</div>
        </div>
    );
}
