import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { BarChart3, TrendingUp, DollarSign, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import ModuleProtectedRoute from '../../components/ModuleProtectedRoute';
import PrintableReportLayout, { ReportPrintButton } from '../../components/reports/PrintableReportLayout';

function ExpenseReports() {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['expense-reports-summary', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/billing/reports/summary', { params: { start_date: startDate, end_date: endDate } });
      return res.data;
    },
  });

  const { data: byCategory, isLoading: categoryLoading, error: categoryError } = useQuery({
    queryKey: ['expense-reports-category', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/billing/reports/by-category', { params: { start_date: startDate, end_date: endDate } });
      return res.data;
    },
  });

  const { data: byDateRange } = useQuery({
    queryKey: ['expense-reports-daterange', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/billing/reports/by-date-range', { params: { start_date: startDate, end_date: endDate, group_by: 'day' } });
      return res.data;
    },
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  return (
    <PrintableReportLayout
      title="Expense Reports"
      subtitle={`${startDate} to ${endDate}`}
    >
      <div>
        <div className="bg-white rounded-lg shadow p-6 mb-6 no-print">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Expense Reports</h2>
              <p className="text-gray-600">View expense analytics and reports.</p>
            </div>
            <ReportPrintButton />
          </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
          </div>
        </div>
      </div>

      {summaryLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
        </div>
      ) : summaryError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">Error loading summary: {summaryError.message}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Expenses</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary?.data?.total_expenses || 0)}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-500 to-green-600"></div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Paid</p>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(summary?.data?.total_paid || 0)}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-500 to-yellow-600"></div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{formatCurrency(summary?.data?.total_pending || 0)}</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 to-red-600"></div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Overdue</p>
                  <p className="text-3xl font-bold text-red-600">{formatCurrency(summary?.data?.total_overdue || 0)}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {categoryLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
        </div>
      ) : categoryError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">Error loading category data: {categoryError.message}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {byCategory?.data && byCategory.data.length > 0 ? (
                  byCategory.data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.category_name || 'Uncategorized'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.category_type || '-'}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(item.total_amount)}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-500">{item.count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                      No expenses found for the selected date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </PrintableReportLayout>
  );
}

export default function ExpenseReportsPage() {
  return (
    <ModuleProtectedRoute module="billing_expenses">
      <ExpenseReports />
    </ModuleProtectedRoute>
  );
}

