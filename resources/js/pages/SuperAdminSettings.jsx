import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Mail,
  KeyRound,
  ShieldCheck,
  SlidersHorizontal,
  Bell,
  Database,
  Server,
  Palette,
} from 'lucide-react';

const cards = [
  {
    key: 'email',
    title: 'Email Settings',
    description: 'Configure email server and notification settings',
    icon: Mail,
    to: '/super-admin/settings/email',
    accent: 'from-sky-500/10 to-sky-500/0',
  },
  {
    key: 'credentials',
    title: 'Credential Settings',
    description: 'Update Super Admin login email and password',
    icon: KeyRound,
    to: '/super-admin/settings/credentials',
    accent: 'from-teal-500/10 to-teal-500/0',
  },
  {
    key: 'security',
    title: 'Security Settings',
    description: 'Manage authentication and security policies',
    icon: ShieldCheck,
    to: '/super-admin/settings/security',
    accent: 'from-emerald-500/10 to-emerald-500/0',
  },
  {
    key: 'general',
    title: 'General Settings',
    description: 'Configure application name, timezone, and locale',
    icon: SlidersHorizontal,
    to: '/super-admin/settings/general',
    accent: 'from-amber-500/10 to-amber-500/0',
  },
  {
    key: 'notification',
    title: 'Notification Settings',
    description: 'Manage system notifications and alert channels',
    icon: Bell,
    to: '/super-admin/settings/notification',
    accent: 'from-violet-500/10 to-violet-500/0',
  },
  {
    key: 'database',
    title: 'Database Settings',
    description: 'View database connection and optimization settings',
    icon: Database,
    to: '/super-admin/settings/database',
    accent: 'from-cyan-500/10 to-cyan-500/0',
  },
  {
    key: 'server',
    title: 'Server Settings',
    description: 'Configure server performance and maintenance',
    icon: Server,
    to: '/super-admin/settings/server',
    accent: 'from-rose-500/10 to-rose-500/0',
  },
  {
    key: 'branding',
    title: 'Branding Settings',
    description: 'Customize logo, colors, and company branding',
    icon: Palette,
    to: '/super-admin/settings/branding',
    accent: 'from-indigo-500/10 to-indigo-500/0',
  },
];

export default function SuperAdminSettings() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[var(--theme-primary)] rounded-xl shadow-lg p-6 text-[var(--theme-text-on-primary)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Settings className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1">Super Admin Settings</h1>
              <p className="opacity-90">
                Manage global configuration and per-facility preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Configuration</h2>
            <p className="text-sm text-gray-500">
              Configure system behavior across email, security, notifications and more.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => navigate(card.to)}
                className="group relative text-left bg-white rounded-xl shadow-sm border border-gray-100 hover:border-[var(--theme-primary)] hover:shadow-md transition-all p-4 sm:p-5 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] cursor-pointer"
              >
                <div
                  className={`absolute inset-0 rounded-xl bg-gradient-to-br ${card.accent} opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity`}
                />
                <div className="relative flex items-start space-x-4">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">
                    <Icon className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {card.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">{card.description}</p>
                    <span className="inline-flex items-center text-sm font-medium text-[var(--theme-primary)] group-hover:underline">
                      Manage
                      <span className="ml-1 group-hover:translate-x-0.5 transition-transform">
                        →
                      </span>
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}



















