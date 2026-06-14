import React, { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, FileText, MessageSquare, LogOut } from 'lucide-react';
import api, { clearStoredAuth } from '../services/api';
import PortalResidentHeader from './portal/PortalResidentHeader';
import PageBackButton, { PAGE_BACK_HIDE_PORTAL } from './ui/PageBackButton';

const nav = [
  { name: 'Dashboard', path: '/portal', icon: LayoutDashboard },
  { name: 'Care Updates', path: '/portal/care-updates', icon: FileText },
  { name: 'Messages', path: '/portal/messages', icon: MessageSquare },
];

export default function PortalLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => (await api.get('/user')).data,
  });
  const isFamilyPortalRole = user && ['family', 'family_member'].includes(user.role);
  const { data: careSummary } = useQuery({
    queryKey: ['family-care-updates'],
    queryFn: async () => (await api.get('/family/care-updates')).data,
    staleTime: 60 * 1000,
    enabled: !!isFamilyPortalRole,
  });
  useEffect(() => {
    if (user && !isFamilyPortalRole) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, isFamilyPortalRole]);

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (_) {}
    clearStoredAuth();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm shrink-0">
        <div className="flex items-center justify-between gap-4 px-4 py-3 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <PageBackButton hideOnPaths={PAGE_BACK_HIDE_PORTAL} />
            <Link
              to="/portal"
              className="hidden sm:flex flex-col shrink-0 border-r border-gray-200 pr-4"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Family</span>
              <span className="text-base font-bold text-[var(--theme-primary)] leading-tight">Portal</span>
            </Link>
            <PortalResidentHeader residents={careSummary?.residents ?? []} />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Navigate</span>
        </div>
        <nav className="p-2 flex-1 overflow-y-auto">
          {nav.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/portal' && location.pathname === '/portal');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-gray-200">
          <p className="px-3 py-1 text-xs text-gray-500">
            Next time, sign in at the login page with your email and password.
          </p>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
      </div>
    </div>
  );
}
