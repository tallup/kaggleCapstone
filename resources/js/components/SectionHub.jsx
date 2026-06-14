/**
 * SectionHub — reusable landing page for sidebar sections (Clinical, Operations, …).
 *
 * Renders a grid of feature tiles. Each tile can have:
 *   - icon, title, description, primary path
 *   - optional subLinks array for quick-access secondary paths
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowRight } from 'lucide-react';

export default function SectionHub({ title, subtitle, features = [] }) {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            {/* Section header */}
            <div className="bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-primary-dark)] rounded-2xl p-6 text-white shadow-sm">
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                {subtitle && <p className="mt-1 text-white/70 text-sm">{subtitle}</p>}
            </div>

            {/* Feature tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((feature) => {
                    const Icon = feature.icon;
                    return (
                        <div
                            key={feature.id}
                            className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                        >
                            {/* Main clickable area */}
                            <button
                                type="button"
                                onClick={() => navigate(feature.path)}
                                className="w-full text-left px-5 pt-5 pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-primary)]"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${feature.iconBg}`}>
                                        <Icon className={`w-6 h-6 ${feature.accent.split(' ')[1]}`} aria-hidden="true" />
                                    </div>

                                    {/* Text */}
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-base font-bold text-gray-900 group-hover:text-[var(--theme-primary)] transition-colors">
                                                {feature.title}
                                            </h2>
                                            <ChevronRight
                                                className="w-4 h-4 text-gray-300 group-hover:text-[var(--theme-primary)] group-hover:translate-x-0.5 transition-all shrink-0"
                                                aria-hidden="true"
                                            />
                                        </div>
                                        <p className="mt-1 text-sm text-gray-500 leading-snug line-clamp-2">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            </button>

                            {/* Sub-links (optional) */}
                            {feature.subLinks && feature.subLinks.length > 0 && (
                                <div className={`flex flex-wrap gap-2 px-5 pb-4 border-t border-gray-50 pt-3`}>
                                    {feature.subLinks.map((sub) => (
                                        <button
                                            key={sub.path}
                                            type="button"
                                            onClick={() => navigate(sub.path)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${feature.accent} hover:opacity-80 border`}
                                        >
                                            {sub.label}
                                            <ArrowRight className="w-3 h-3" aria-hidden="true" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
