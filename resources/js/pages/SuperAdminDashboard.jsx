import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Clock, 
  CheckCircle, 
  Users, 
  Plus, 
  AlertCircle, 
  TrendingUp,
  MapPin,
  Calendar,
  Shield,
  Settings,
  Eye
} from 'lucide-react';
import api from '../services/api';
import { DashboardSkeleton } from '../components/ui/SkeletonLoader';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: async () => {
      const [facilitiesRes, registrationsRes, usersRes, branchesRes, residentsRes, appointmentsRes] = await Promise.all([
        api.get('/facilities'),
        api.get('/facility-registrations?status=pending'),
        api.get('/users?per_page=1'),
        api.get('/branches?per_page=1'),
        api.get('/residents?per_page=1'),
        api.get('/appointments?per_page=1'),
      ]);
      
      const facilities = facilitiesRes.data.data || facilitiesRes.data || [];
      const totalFacilities = facilitiesRes.data.total || facilities.length;
      const activeFacilities = facilities.filter(f => f.is_active).length;
      const pendingRegistrations = registrationsRes.data.data?.length || 0;
      const totalUsers = usersRes.data.total || usersRes.data.data?.length || 0;
      const totalBranches = branchesRes.data.total || branchesRes.data.data?.length || 0;
      const totalResidents = residentsRes.data.total || residentsRes.data.data?.length || 0;
      const totalAppointments = appointmentsRes.data.total || appointmentsRes.data.data?.length || 0;
      
      return {
        totalFacilities,
        activeFacilities,
        pendingRegistrations,
        totalUsers,
        totalBranches,
        totalResidents,
        totalAppointments,
        facilities: Array.isArray(facilities) ? facilities : [],
      };
    },
  });

  const { data: recentRegistrations, isLoading: registrationsLoading } = useQuery({
    queryKey: ['recent-registrations'],
    queryFn: async () => {
      const res = await api.get('/facility-registrations?per_page=10');
      return res.data.data || [];
    },
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const primaryStats = [
    {
      title: 'Total Facilities',
      value: stats?.totalFacilities || 0,
      description: `${stats?.activeFacilities || 0} active`,
      icon: Building2,
      color: 'bg-[var(--theme-primary)]',
      hoverColor: 'hover:bg-[var(--theme-primary-hover)]',
      link: '/super-admin/facilities',
    },
    {
      title: 'Pending Registrations',
      value: stats?.pendingRegistrations || 0,
      description: 'Awaiting approval',
      icon: Clock,
      color: 'bg-[var(--theme-primary)]',
      hoverColor: 'hover:bg-[var(--theme-primary-hover)]',
      link: '/super-admin/facility-registrations',
      highlight: stats?.pendingRegistrations > 0,
    },
    {
      title: 'Total Branches',
      value: stats?.totalBranches || 0,
      description: 'Care locations',
      icon: MapPin,
      color: 'bg-[var(--theme-primary)]',
      hoverColor: 'hover:bg-[var(--theme-primary-hover)]',
    },
    {
      title: 'System Users',
      value: stats?.totalUsers || 0,
      description: 'All facility users',
      icon: Users,
      color: 'bg-[var(--theme-primary)]',
      hoverColor: 'hover:bg-[var(--theme-primary-hover)]',
      link: '/team/users',
    },
  ];

  const systemOverviewStats = [
    {
      title: 'Total Residents',
      value: stats?.totalResidents || 0,
      description: 'Across all facilities',
      icon: Users,
      color: 'bg-[var(--theme-primary)]',
    },
    {
      title: 'Appointments',
      value: stats?.totalAppointments || 0,
      description: 'Scheduled',
      icon: Calendar,
      color: 'bg-[var(--theme-primary)]',
    },
  ];

  const quickActions = [
    {
      title: 'Manage Facilities',
      description: 'View and edit all facilities',
      icon: Building2,
      color: 'text-[var(--theme-primary)]',
      bgColor: 'bg-[var(--theme-primary-bg-light)]',
      hoverColor: 'hover:bg-[var(--theme-primary-bg-light)]',
      onClick: () => navigate('/super-admin/facilities'),
    },
    {
      title: 'Review Registrations',
      description: 'Approve or reject facility registration requests',
      icon: Clock,
      color: 'text-[var(--theme-primary)]',
      bgColor: 'bg-[var(--theme-primary-bg-light)]',
      hoverColor: 'hover:bg-[var(--theme-primary-bg-light)]',
      onClick: () => navigate('/super-admin/facility-registrations'),
    },
    {
      title: 'Manage Users',
      description: 'System users across all facilities',
      icon: Users,
      color: 'text-[var(--theme-primary)]',
      bgColor: 'bg-[var(--theme-primary-bg-light)]',
      hoverColor: 'hover:bg-[var(--theme-primary-bg-light)]',
      onClick: () => navigate('/team/users'),
    },
    {
      title: 'Roles & Permissions',
      description: 'Access control and permissions',
      icon: Shield,
      color: 'text-[var(--theme-primary)]',
      bgColor: 'bg-[var(--theme-primary-bg-light)]',
      hoverColor: 'hover:bg-[var(--theme-primary-bg-light)]',
      onClick: () => navigate('/super-admin/permissions'),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-primary-dark)] to-[var(--theme-primary)] rounded-2xl shadow-2xl p-8 text-[var(--theme-text-on-primary)] animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold mb-2 tracking-tight">Super Admin Dashboard</h1>
            <p className="text-lg opacity-95 font-medium">System Administrator - Managing all facilities and system operations</p>
          </div>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {primaryStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              onClick={() => stat.link && navigate(stat.link)}
              className={`group bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-[var(--theme-primary)]/20 ${
                stat.link ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default'
              } ${stat.highlight ? 'ring-2 ring-[var(--theme-primary)] ring-opacity-50' : ''} animate-in fade-in slide-in-from-bottom-4`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className={`p-3.5 rounded-xl bg-gradient-to-br ${stat.color} to-[var(--theme-primary-dark)] text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  {stat.highlight && (
                    <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-[var(--theme-secondary)] to-[var(--theme-secondary-light)] text-[var(--theme-primary)] rounded-full shadow-sm animate-pulse">
                      Action Needed
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-4xl font-extrabold text-gray-900 mb-2 group-hover:text-[var(--theme-primary)] transition-colors">{stat.value}</p>
                  <p className="text-sm font-semibold text-gray-900 mb-1">{stat.title}</p>
                  <p className="text-xs text-gray-500 font-medium">{stat.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* System Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {systemOverviewStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[var(--theme-primary)]/20 p-6 animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${(index + 4) * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className={`p-3.5 rounded-xl bg-gradient-to-br ${stat.color} to-[var(--theme-primary-dark)] text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6" strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <p className="text-4xl font-extrabold text-gray-900 mb-2 group-hover:text-[var(--theme-primary)] transition-colors">{stat.value}</p>
                <p className="text-sm font-semibold text-gray-900 mb-1">{stat.title}</p>
                <p className="text-xs text-gray-500 font-medium">{stat.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Quick Actions</h2>
            <p className="text-sm text-gray-500 font-medium">Fast access to common tasks</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.onClick}
                className="group p-5 border-2 border-gray-200 rounded-xl hover:border-[var(--theme-primary)]/30 hover:shadow-lg transition-all duration-300 text-left bg-gradient-to-br from-white to-gray-50/50 hover:from-white hover:to-[var(--theme-primary-bg-light)] hover:-translate-y-1 cursor-pointer"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${action.bgColor} to-[var(--theme-primary-bg)] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md`}>
                  <Icon className={`w-6 h-6 ${action.color} group-hover:scale-110 transition-transform`} strokeWidth={2.5} />
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5 group-hover:text-[var(--theme-primary)] transition-colors">{action.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Facilities Overview */}
      {stats?.facilities && stats.facilities.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Facilities Overview</h2>
              <p className="text-sm text-gray-500 font-medium">Recent facilities and their status</p>
            </div>
            <button
              onClick={() => navigate('/super-admin/facilities')}
              className="text-sm font-semibold text-[var(--theme-primary)] hover:text-[var(--theme-primary-dark)] transition-colors flex items-center gap-1 cursor-pointer"
            >
              View All
              <span className="text-lg">→</span>
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                  <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">Facility Name</th>
                  <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">Registered</th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.facilities.slice(0, 5).map((facility) => (
                  <tr key={facility.id} className="hover:bg-gradient-to-r hover:from-[var(--theme-primary-bg-light)] hover:to-transparent transition-all duration-200 group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--theme-primary-bg-light)] group-hover:bg-[var(--theme-primary)] transition-colors">
                          <Building2 className="w-4 h-4 text-[var(--theme-primary)] group-hover:text-white transition-colors" />
                        </div>
                        <span className="font-semibold text-gray-900 group-hover:text-[var(--theme-primary)] transition-colors">{facility.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${
                        facility.is_active 
                          ? 'bg-gradient-to-r from-[var(--theme-secondary)] to-[var(--theme-secondary-light)] text-[var(--theme-primary)]' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {facility.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600 font-medium">
                      {facility.created_at ? new Date(facility.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => navigate(`/super-admin/facilities?editFacilityId=${facility.id}`)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-[var(--theme-primary)] hover:bg-[var(--theme-primary-bg-light)] rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" strokeWidth={2.5} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Registrations */}
      {recentRegistrations && recentRegistrations.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Recent Facility Registrations</h2>
              <p className="text-sm text-gray-500 font-medium">Latest registration requests</p>
            </div>
            <button
              onClick={() => navigate('/super-admin/facility-registrations')}
              className="text-sm font-semibold text-[var(--theme-primary)] hover:text-[var(--theme-primary-dark)] transition-colors flex items-center gap-1 cursor-pointer"
            >
              View All
              <span className="text-lg">→</span>
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                  <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">Facility Name</th>
                  <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">Contact</th>
                  <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">Submitted</th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentRegistrations.slice(0, 5).map((registration) => (
                  <tr key={registration.id} className="hover:bg-gradient-to-r hover:from-[var(--theme-primary-bg-light)] hover:to-transparent transition-all duration-200 group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--theme-primary-bg-light)] group-hover:bg-[var(--theme-primary)] transition-colors">
                          <Building2 className="w-4 h-4 text-[var(--theme-primary)] group-hover:text-white transition-colors" />
                        </div>
                        <span className="font-semibold text-gray-900 group-hover:text-[var(--theme-primary)] transition-colors">{registration.facility_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600 font-medium">
                      {registration.contact_name || registration.email || 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${
                        registration.status === 'pending' 
                          ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200' 
                          : registration.status === 'approved'
                          ? 'bg-gradient-to-r from-[var(--theme-secondary)] to-[var(--theme-secondary-light)] text-[var(--theme-primary)]'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {registration.status || 'pending'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600 font-medium">
                      {registration.created_at ? new Date(registration.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => navigate(`/super-admin/facility-registrations?review=${registration.id}`)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-[var(--theme-primary)] hover:bg-[var(--theme-primary-bg-light)] rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" strokeWidth={2.5} />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
