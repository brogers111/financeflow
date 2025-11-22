'use client';

import { useQuery } from '@apollo/client';
import { GET_DASHBOARD_STATS, GET_ACCOUNTS, GET_INVESTMENT_PORTFOLIOS } from '@/lib/graphql/queries';
import InvestmentScorecard from '@/components/InvestmentScorecard';

export default function Dashboard() {
  const { data: statsData, loading: statsLoading } = useQuery(GET_DASHBOARD_STATS);
  const { data: accountsData, loading: accountsLoading } = useQuery(GET_ACCOUNTS);
  const { data: investmentsData, loading: investmentsLoading, refetch: refetchInvestments } = useQuery(GET_INVESTMENT_PORTFOLIOS);

  console.log(accountsData);
  console.log(statsData);

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

  // Calculate total investments
  const totalInvestments = investments.reduce(
    (sum: number, inv: any) => sum + inv.currentValue, 
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Financial Dashboard</h1>

      {/* Net Worth Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Net Worth</p>
          <p className="text-3xl font-bold text-gray-900">
            ${(stats.netWorth)?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Total Cash</p>
          <p className="text-3xl font-bold text-green-600">
            ${stats.totalCash?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Total Investments</p>
          <p className="text-3xl font-bold text-blue-600">
            ${totalInvestments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Investment Portfolios */}
      {investments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Investment Portfolios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {investments.map((portfolio: any) => (
              <InvestmentScorecard
                key={portfolio.id}
                portfolio={portfolio}
                onUpdate={refetchInvestments}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bank Accounts */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Bank Accounts</h2>
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
    </div>
  );
}