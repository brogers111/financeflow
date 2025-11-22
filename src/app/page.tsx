'use client';

import { useQuery } from '@apollo/client';
import { GET_DASHBOARD_STATS, GET_ACCOUNTS, GET_INVESTMENT_PORTFOLIOS } from '@/lib/graphql/queries';
import InvestmentScorecard from '@/components/InvestmentScorecard';

export default function Dashboard() {
  const { data: statsData, loading: statsLoading } = useQuery(GET_DASHBOARD_STATS);
  const { data: accountsData, loading: accountsLoading } = useQuery(GET_ACCOUNTS);
  const { data: investmentsData, loading: investmentsLoading, refetch: refetchInvestments } = useQuery(GET_INVESTMENT_PORTFOLIOS);

  if (statsLoading || accountsLoading || investmentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  const stats = statsData?.dashboardStats || {};
  const accounts = accountsData?.accounts || [];
  const investments = investmentsData?.investmentPortfolios || [];

  const totalInvestments = investments.reduce(
    (sum: number, inv: any) => sum + inv.currentValue, 
    0
  );

  const incomeChange = stats.incomeChange || 0;
  const expensesChange = stats.expensesChange || 0;
  const cashChange = stats.cashChange || 0;
  const investmentChange = stats.investmentChange || 0;
  const netWorthChange = stats.netWorthChange || 0;

  return (
    <div className="flex gap-6 p-6 max-w-full">
      {/* Main Content Area */}
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Financial Dashboard</h1>

        {/* Top Scorecards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Monthly Income */}
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-xs text-gray-500 mb-1">Last Month Income</p>
            <p className="text-2xl font-bold text-gray-900">
              ${stats.lastMonthIncome?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {incomeChange >= 0 ? (
                <span className="text-green-600 text-xs">↑ {incomeChange.toFixed(1)}%</span>
              ) : (
                <span className="text-red-600 text-xs">↓ {Math.abs(incomeChange.toFixed(1))}%</span>
              )}
            </div>
          </div>

          {/* Monthly Expenses */}
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-xs text-gray-500 mb-1">Last Month Expenses</p>
            <p className="text-2xl font-bold text-gray-900">
              ${stats.lastMonthExpenses?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {expensesChange >= 0 ? (
                <span className="text-green-600 text-xs">↑ {expensesChange.toFixed(1)}%</span>
              ) : (
                <span className="text-red-600 text-xs">↓ {Math.abs(expensesChange.toFixed(1))}%</span>
              )}
            </div>
          </div>

          {/* Total Cash */}
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-xs text-gray-500 mb-1">Total Cash</p>
            <p className="text-2xl font-bold text-green-600">
              ${stats.totalCash?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {cashChange >= 0 ? (
                <span className="text-green-600 text-xs">↑ {cashChange.toFixed(1)}%</span>
              ) : (
                <span className="text-red-600 text-xs">↓ {Math.abs(cashChange.toFixed(1))}%</span>
              )}
            </div>
          </div>

          {/* Total Investments */}
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-xs text-gray-500 mb-1">Investments</p>
            <p className="text-2xl font-bold text-blue-600">
              ${totalInvestments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {investmentChange >= 0 ? (
                <span className="text-green-600 text-xs">↑ {investmentChange.toFixed(1)}%</span>
              ) : (
                <span className="text-red-600 text-xs">↓ {Math.abs(investmentChange.toFixed(1))}%</span>
              )}
            </div>
          </div>

          {/* Net Worth */}
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-xs text-gray-500 mb-1">Net Worth</p>
            <p className="text-2xl font-bold text-gray-900">
              ${stats.netWorth?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {netWorthChange >= 0 ? (
                <span className="text-green-600 text-xs">↑ {netWorthChange.toFixed(1)}%</span>
              ) : (
                <span className="text-red-600 text-xs">↓ {Math.abs(netWorthChange.toFixed(1))}%</span>
              )}
            </div>
          </div>
        </div>

        {/* Main Graph Area - Placeholder */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Monthly Paycheck Flow</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm bg-gray-100 rounded">Date</button>
              <button className="px-3 py-1 text-sm bg-gray-100 rounded">Account</button>
              <button className="px-3 py-1 text-sm bg-gray-100 rounded">Category</button>
            </div>
          </div>
          <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
            <p className="text-gray-400">Paycheck flow graph - Coming soon</p>
          </div>
        </div>

        {/* Second Graph Area - Placeholder */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Net Worth History</h2>
            <button className="px-3 py-1 text-sm bg-gray-100 rounded">Date</button>
          </div>
          <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
            <p className="text-gray-400">Historical overlay graph - Coming soon</p>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 space-y-6">
        {/* Accounts Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Accounts</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {accounts.map((account: any) => (
              <div key={account.id} className="px-4 py-2 flex justify-between items-center">
                <p className="text-sm text-gray-700">{account.name}</p>
                <p className={`text-sm font-semibold ${account.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Investments Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Investments</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {investments.map((portfolio: any) => (
              <div key={portfolio.id} className="px-4 py-2 flex justify-between items-center">
                <p className="text-sm text-gray-700">{portfolio.name}</p>
                <p className="text-sm font-semibold text-gray-900">
                  ${portfolio.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Category Spend Pie Chart - Placeholder */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Category Spend</h2>
            <div className="flex gap-2">
              <button className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Month</button>
              <button className="px-2 py-1 text-xs bg-gray-100 rounded">Year</button>
            </div>
          </div>
          <div className="flex gap-2 mb-3">
            <button className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">%</button>
            <button className="px-2 py-1 text-xs bg-gray-100 rounded">$</button>
          </div>
          <div className="h-48 bg-gray-50 rounded flex items-center justify-center">
            <p className="text-xs text-gray-400">Pie chart - Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}