@extends('reports.premium-base')

@section('content')
    <div class="section-header">Financial Summary & Revenue Analysis</div>

    <div style="display: flex; gap: 20px; margin-bottom: 30px;">
        <div style="flex: 1; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
            <p class="text-xs font-bold text-gray-500">MONTHLY REVENUE</p>
            <p class="text-2xl font-bold primary-text">${{ number_format($financialData['monthly_revenue']) }}</p>
        </div>
        <div style="flex: 1; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
            <p class="text-xs font-bold text-gray-500">MONTHLY EXPENSES</p>
            <p class="text-2xl font-bold text-red-600">${{ number_format($financialData['monthly_expenses']) }}</p>
        </div>
        <div style="flex: 1; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
            <p class="text-xs font-bold text-gray-500">NET PROFIT</p>
            <p class="text-2xl font-bold text-green-600">${{ number_format($financialData['net_profit']) }}</p>
        </div>
    </div>

    <table class="premium-table">
        <thead>
            <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>Percentage of Revenue</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="font-bold">Resident Fees (Revenue)</td>
                <td>${{ number_format($financialData['resident_fees']) }}</td>
                <td>76%</td>
            </tr>
            <tr>
                <td class="font-bold">Staff Costs (Expense)</td>
                <td>${{ number_format($financialData['staff_costs']) }}</td>
                <td>36%</td>
            </tr>
            <tr>
                <td class="font-bold">Facility Costs (Expense)</td>
                <td>${{ number_format($financialData['facility_costs']) }}</td>
                <td>20%</td>
            </tr>
            <tr>
                <td class="font-bold">Other Expenses</td>
                <td>${{ number_format($financialData['other_expenses']) }}</td>
                <td>12%</td>
            </tr>
        </tbody>
    </table>
@endsection
