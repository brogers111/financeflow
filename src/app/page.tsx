'use client';

import { useQuery } from '@apollo/client';
import { GET_DASHBOARD_STATS, GET_ACCOUNTS } from '@/lib/graphql/queries';
import Link from 'next/link';

export default function Dashboard() {
  const { data: statsData, loading: statsLoading } = useQuery(GET_DASHBOARD_STATS);
  const { data: accountsData, loading: accountsLoading } = useQuery(GET_ACCOUNTS);

  if (statsLoading || accountsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  const stats = statsData?.dashboardStats || {};
  const accounts = accountsData?.accounts || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Financial Dashboard</h1>

      {/* Net Worth Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Net Worth</p>
          <p className="text-3xl font-bold text-gray-900">
            ${stats.netWorth?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Total Cash</p>
          <p className="text-3xl font-bold text-green-600">
            ${stats.totalCash?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Investments</p>
          <p className="text-3xl font-bold text-blue-600">
            ${stats.investments?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </p>
        </div>
      </div>

      {/* Spending Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Average Monthly Spend</p>
          <p className="text-2xl font-bold text-red-600">
            ${stats.avgMonthlySpend?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Average Yearly Spend</p>
          <p className="text-2xl font-bold text-red-600">
            ${stats.avgYearlySpend?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </p>
        </div>
      </div>

      {/* Accounts List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Accounts</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {accounts.map((account: any) => (
            <div key={account.id} className="px-6 py-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{account.name}</p>
                <p className="text-sm text-gray-500">{account.institution} • {account.type}</p>
              </div>
              <p className={`text-lg font-semibold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/upload"
          className="bg-blue-600 text-white p-4 rounded-lg text-center hover:bg-blue-700 transition"
        >
          📤 Upload Statement
        </Link>
        <Link
          href="/transactions"
          className="bg-purple-600 text-white p-4 rounded-lg text-center hover:bg-purple-700 transition"
        >
          💳 Review Transactions
        </Link>
        <Link
          href="/accounts"
          className="bg-green-600 text-white p-4 rounded-lg text-center hover:bg-green-700 transition"
        >
          🏦 Manage Accounts
        </Link>
      </div>
    </div>
  );
}