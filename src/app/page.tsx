'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import {
  GET_DASHBOARD_STATS,
  GET_ACCOUNTS,
  GET_INVESTMENT_PORTFOLIOS,
  GET_MONTHLY_STATS,
  GET_TRANSACTIONS,
  GET_CATEGORIES
} from '@/lib/graphql/queries';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#AAB7B8'];

export default function Dashboard() {
  const [categoryViewMode, setCategoryViewMode] = useState<'percentage' | 'amount'>('percentage');
  const [categoryTimeframe, setCategoryTimeframe] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Balance flow filters
  const [flowMonthsToShow, setFlowMonthsToShow] = useState(1);
  const [flowSelectedMonth, setFlowSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [flowSelectedYear, setFlowSelectedYear] = useState(new Date().getFullYear());
  const [excludedAccountIds, setExcludedAccountIds] = useState<string[]>([]);
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<string[]>([]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Net worth history filter
  const [netWorthRange, setNetWorthRange] = useState<'3' | '6' | '12' | 'ytd'>('12');

  const { data: statsData, loading: statsLoading } = useQuery(GET_DASHBOARD_STATS);
  const { data: accountsData, loading: accountsLoading } = useQuery(GET_ACCOUNTS);
  const { data: investmentsData, loading: investmentsLoading } = useQuery(GET_INVESTMENT_PORTFOLIOS);
  const { data: categoriesData } = useQuery(GET_CATEGORIES);

  // Monthly stats query (1-12 month)
  const { data: monthlyData } = useQuery(GET_MONTHLY_STATS, {
    variables: { year: selectedYear, month: selectedMonth },
    skip: categoryTimeframe === 'year'
  });

  // Yearly transactions (aggregate)
  const { data: yearlyTransactions } = useQuery(GET_TRANSACTIONS, {
    variables: {
      startDate: `${selectedYear}-01-01`,
      endDate: `${selectedYear}-12-31`
    },
    skip: categoryTimeframe === 'month'
  });

  // Memoize flow date range
  const flowDateRange = useMemo(() => {
    // flowSelectedMonth is 0-11
    // compute start by subtracting (flowMonthsToShow - 1) months from flowSelectedMonth
    const end = new Date(flowSelectedYear, flowSelectedMonth + 1, 0); // last day of selected month
    const start = new Date(flowSelectedYear, flowSelectedMonth, 1); // first day of selected month
    start.setMonth(start.getMonth() - (flowMonthsToShow - 1));
    // ensure start is the 1st of that month
    const startDate = new Date(start.getFullYear(), start.getMonth(), 1);
    const endDate = end;
    return { startDate, endDate };
  }, [flowSelectedYear, flowSelectedMonth, flowMonthsToShow]);

  // Balance flow transactions
  const { data: flowTransactionsData } = useQuery(GET_TRANSACTIONS, {
    variables: {
      startDate: flowDateRange.startDate.toISOString().split('T')[0],
      endDate: flowDateRange.endDate.toISOString().split('T')[0]
    }
  });

  // Net worth date range
  const netWorthDateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    if (netWorthRange === 'ytd') {
      startDate.setMonth(0, 1); // Jan 1 current year
      startDate.setHours(0, 0, 0, 0);
    } else {
      const months = parseInt(netWorthRange, 10);
      startDate.setMonth(startDate.getMonth() - months);
      startDate.setHours(0, 0, 0, 0);
    }
    return { startDate, endDate };
  }, [netWorthRange]);

  // Net worth transactions for range
  const { data: netWorthTransactions } = useQuery(GET_TRANSACTIONS, {
    variables: {
      startDate: netWorthDateRange.startDate.toISOString().split('T')[0],
      endDate: netWorthDateRange.endDate.toISOString().split('T')[0]
    }
  });

  // Calculate balance flow data
  const balanceFlowData = useMemo(() => {
    const transactions = flowTransactionsData?.transactions || [];

    // Filter OUT excluded accounts and categories
    const filteredTransactions = transactions.filter((t: any) => {
      const accountIncluded = !excludedAccountIds.includes(t.account?.id);
      const categoryIncluded = !t.category || !excludedCategoryIds.includes(t.category.id);
      return accountIncluded && categoryIncluded;
    });

    // Group transactions by day
    const dailyData: Record<string, {
      income: any[];
      expenses: any[];
      incomeTotal: number;
      expenseTotal: number;
      isMonthBoundary?: boolean;
    }> = {};

    // Initialize days in range (from startDate to endDate inclusive)
    const start = new Date(flowDateRange.startDate);
    const end = new Date(flowDateRange.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = new Date(d).toISOString().split('T')[0];
      const isFirstOfMonth = new Date(d).getDate() === 1;
      dailyData[iso] = {
        income: [],
        expenses: [],
        incomeTotal: 0,
        expenseTotal: 0,
        isMonthBoundary: isFirstOfMonth
      };
    }

    // populate from transactions (safe date parsing)
    filteredTransactions.forEach((t: any) => {
      // support timestamps or ISO strings
      const parsedDate = (() => {
        if (!t.date) return null;
        // if it's numeric (timestamp)
        if (!Number.isNaN(Number(t.date))) {
          return new Date(Number(t.date));
        }
        // fallback: try ISO string
        return new Date(t.date);
      })();

      if (!parsedDate || isNaN(parsedDate.getTime())) return;

      const dateStr = parsedDate.toISOString().split('T')[0];
      if (dailyData[dateStr]) {
        if (t.type === 'INCOME') {
          dailyData[dateStr].income.push(t);
          dailyData[dateStr].incomeTotal += Number(t.amount) || 0;
        } else if (t.type === 'EXPENSE') {
          dailyData[dateStr].expenses.push(t);
          dailyData[dateStr].expenseTotal += Math.abs(Number(t.amount) || 0);
        }
      }
    });

    // Build chart data with running balance
    const chartData = Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce((acc, [date, data]) => {
        const netChange = (data.incomeTotal || 0) - (data.expenseTotal || 0);
        const previousBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
        const newBalance = previousBalance + netChange;
        acc.push({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: date,
          balance: Math.round((newBalance + Number.EPSILON) * 100) / 100,
          income: data.income,
          expenses: data.expenses,
          incomeTotal: data.incomeTotal,
          expenseTotal: data.expenseTotal,
          netChange,
          isMonthBoundary: data.isMonthBoundary
        });
        return acc;
      }, [] as any[]);

    return chartData;
  }, [flowTransactionsData, excludedAccountIds, excludedCategoryIds, flowDateRange]);

  // Month boundaries for vertical lines (use the short 'date' label which matches the X axis values)
  const monthBoundaries = useMemo(() =>
    balanceFlowData.filter(d => d.isMonthBoundary).map(d => d.date),
    [balanceFlowData]
  );

  // Loading state
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
  const categories = categoriesData?.categories || [];

  const totalInvestments = investments.reduce(
    (sum: number, inv: any) => sum + (inv.currentValue || 0),
    0
  );

  const incomeChange = stats.incomeChange || 0;
  const expensesChange = stats.expensesChange || 0;
  const cashChange = stats.cashChange || 0;
  const investmentChange = stats.investmentChange || 0;
  const netWorthChange = stats.netWorthChange || 0;

  // Calculate category data
  let categoryData: any[] = [];
  let totalSpend = 0;

  if (categoryTimeframe === 'month') {
    const monthlyStats = monthlyData?.monthlyStats || { byCategory: [], expenses: 0 };
    totalSpend = monthlyStats.expenses || 0;
    categoryData = (monthlyStats.byCategory || []).map((item: any) => ({
      name: item.category.name,
      value: categoryViewMode === 'percentage' ? item.percentage : item.total,
      color: item.category.color
    }));
  } else {
    const transactions = yearlyTransactions?.transactions || [];
    const expenseTransactions = transactions.filter((t: any) => t.type === 'EXPENSE');
    totalSpend = expenseTransactions.reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0);

    const categoryTotals: Record<string, { name: string; total: number; color: string }> = {};
    expenseTransactions.forEach((t: any) => {
      if (t.category) {
        const catId = t.category.id;
        if (!categoryTotals[catId]) {
          categoryTotals[catId] = {
            name: t.category.name,
            total: 0,
            color: t.category.color
          };
        }
        categoryTotals[catId].total += Math.abs(t.amount || 0);
      }
    });

    categoryData = Object.values(categoryTotals).map(item => ({
      name: item.name,
      value: categoryViewMode === 'percentage'
        ? (item.total / (totalSpend || 1)) * 100
        : item.total,
      color: item.color
    })).sort((a, b) => b.value - a.value);
  }

  // Net worth history (simple snapshot per month based on current stats + investments)
  const netWorthHistory: any[] = [];
  if (netWorthTransactions?.transactions) {
    const monthlyBalances: Record<string, { cash: number; investments: number }> = {};
    const runningCash = stats.totalCash || 0;
    const runningInvestments = totalInvestments;

    // build months from start to end
    const start = new Date(netWorthDateRange.startDate);
    const end = new Date(netWorthDateRange.endDate);
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      const key = d.toISOString().slice(0, 7);
      monthlyBalances[key] = {
        cash: runningCash,
        investments: runningInvestments
      };
    }

    Object.entries(monthlyBalances)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([month, values]) => {
        netWorthHistory.push({
          date: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          cash: values.cash,
          investments: values.investments,
          netWorth: values.cash + values.investments
        });
      });
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Custom tooltip for balance flow
  const BalanceFlowTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-gray-300 rounded shadow-lg max-w-md">
        <p className="font-semibold mb-2">{data.date}</p>
        <p className="text-lg font-bold mb-2">
          Balance: ${data.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>

        {data.income.length > 0 && (
          <div className="mb-2">
            <p className="font-semibold text-green-600">Income: ${data.incomeTotal.toFixed(2)}</p>
            {data.income.map((t: any) => (
              <p key={t.id} className="text-xs text-gray-600 ml-2">
                • {t.description}: ${Number(t.amount).toFixed(2)}
              </p>
            ))}
          </div>
        )}

        {data.expenses.length > 0 && (
          <div>
            <p className="font-semibold text-red-600">Expenses: ${data.expenseTotal.toFixed(2)}</p>
            {data.expenses.map((t: any) => (
              <p key={t.id} className="text-xs text-gray-600 ml-2">
                • {t.description}: ${Math.abs(Number(t.amount)).toFixed(2)}
              </p>
            ))}
          </div>
        )}

        {data.income.length === 0 && data.expenses.length === 0 && (
          <p className="text-xs text-gray-500">No transactions</p>
        )}
      </div>
    );
  };

  // toggle helpers
  const toggleAccountFilter = (accountId: string) => {
    setExcludedAccountIds(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const toggleCategoryFilter = (categoryId: string) => {
    setExcludedCategoryIds(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const selectAllAccounts = () => setExcludedAccountIds([]);
  const unselectAllAccounts = () => setExcludedAccountIds(accounts.map((a: any) => a.id));

  const selectAllCategories = () => setExcludedCategoryIds([]);
  const unselectAllCategories = () => setExcludedCategoryIds(categories.map((c: any) => c.id));

  return (
    <div className="flex gap-6 p-6 max-w-full bg-[#282427]">
      {/* Main Content Area */}
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-[#EEEBD9] mb-6">Dashboard</h1>

        {/* Top Scorecards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Monthly Income */}
          <div className="p-4 rounded-lg bg-[#EEEBD9]">
            <p className="text-xs text-gray-500 mb-1">Last Month Income</p>
            <p className="text-2xl font-bold text-gray-900">
              ${stats.lastMonthIncome?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {incomeChange >= 0 ? (
                <span className="text-green-600 text-xs">↑ {incomeChange.toFixed(1)}%</span>
              ) : (
                <span className="text-red-600 text-xs">↓ {Math.abs(incomeChange).toFixed(1)}%</span>
              )}
            </div>
          </div>

          {/* Monthly Expenses */}
          <div className="bg-[#EEEBD9] p-4 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Last Month Expenses</p>
            <p className="text-2xl font-bold text-gray-900">
              ${stats.lastMonthExpenses?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {expensesChange >= 0 ? (
                <span className="text-red-600 text-xs">↑ {expensesChange.toFixed(1)}%</span>
              ) : (
                <span className="text-green-600 text-xs">↓ {Math.abs(expensesChange).toFixed(1)}%</span>
              )}
            </div>
          </div>

          {/* Total Cash */}
          <div className="bg-[#EEEBD9] p-4 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Total Cash</p>
            <p className="text-2xl font-bold text-green-600">
              ${stats.totalCash?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {cashChange >= 0 ? (
                <span className="text-green-600 text-xs">↑ {cashChange.toFixed(1)}%</span>
              ) : (
                <span className="text-red-600 text-xs">↓ {Math.abs(cashChange).toFixed(1)}%</span>
              )}
            </div>
          </div>

          {/* Total Investments */}
          <div className="bg-[#EEEBD9] p-4 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Investments</p>
            <p className="text-2xl font-bold text-blue-600">
              ${totalInvestments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {investmentChange >= 0 ? (
                <span className="text-green-600 text-xs">↑ {investmentChange.toFixed(1)}%</span>
              ) : (
                <span className="text-red-600 text-xs">↓ {Math.abs(investmentChange).toFixed(1)}%</span>
              )}
            </div>
          </div>

          {/* Net Worth */}
          <div className="bg-[#EEEBD9] p-4 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Net Worth</p>
            <p className="text-2xl font-bold text-gray-900">
              ${stats.netWorth?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {netWorthChange >= 0 ? (
                <span className="text-green-600 text-xs">↑ {netWorthChange.toFixed(1)}%</span>
              ) : (
                <span className="text-red-600 text-xs">↓ {Math.abs(netWorthChange).toFixed(1)}%</span>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Balance Flow Graph */}
        <div className="bg-[#EEEBD9] rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Monthly Balance Flow</h2>
            <div className="flex gap-2">
              {/* Date Selector */}
              <select
                value={`${flowSelectedYear}-${flowSelectedMonth}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-').map(v => parseInt(v, 10));
                  setFlowSelectedYear(year);
                  setFlowSelectedMonth(month);
                }}
                className="px-3 py-1 text-sm rounded cursor-pointer border border-gray-300"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - i);
                  return (
                    <option key={i} value={`${d.getFullYear()}-${d.getMonth()}`}>
                      {monthNames[d.getMonth()]} {d.getFullYear()}
                    </option>
                  );
                })}
              </select>

              {/* Months to Show */}
              <select
                value={flowMonthsToShow}
                onChange={(e) => setFlowMonthsToShow(parseInt(e.target.value, 10))}
                className="px-3 py-1 text-sm rounded cursor-pointer border border-gray-300"
              >
                <option value={1}>1 Month</option>
                <option value={2}>2 Months</option>
                <option value={3}>3 Months</option>
                <option value={4}>4 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months</option>
              </select>

              {/* Account Filter */}
              <button
                onClick={() => setShowAccountModal(!showAccountModal)}
                className="px-3 py-1 text-sm rounded cursor-pointer border border-gray-300 hover:bg-gray-100"
              >
                Accounts {excludedAccountIds.length > 0 && `(-${excludedAccountIds.length})`}
              </button>

              {/* Category Filter */}
              <button
                onClick={() => setShowCategoryModal(!showCategoryModal)}
                className="px-3 py-1 text-sm rounded cursor-pointer border border-gray-300 hover:bg-gray-100"
              >
                Categories {excludedCategoryIds.length > 0 && `(-${excludedCategoryIds.length})`}
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={balanceFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
              <XAxis dataKey="date" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip content={<BalanceFlowTooltip />} />
              {monthBoundaries.map((boundary, i) => (
                <ReferenceLine
                  key={i}
                  x={boundary}
                  stroke="#ccc"
                  strokeDasharray="3 3"
                />
              ))}
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#4ECDC4"
                strokeWidth={2}
                dot={{ fill: '#4ECDC4', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Net Worth History Graph */}
        <div className="bg-[#EEEBD9] rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Net Worth History</h2>
            <select
              value={netWorthRange}
              onChange={(e) => setNetWorthRange(e.target.value as '3' | '6' | '12' | 'ytd')}
              className="px-3 py-1 text-sm rounded cursor-pointer border border-gray-300"
            >
              <option value="3">Last 3 Months</option>
              <option value="6">Last 6 Months</option>
              <option value="12">Last 12 Months</option>
              <option value="ytd">Year to Date</option>
            </select>
          </div>
          {netWorthHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={netWorthHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                <XAxis dataKey="date" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd' }}
                  formatter={(value: any) => `$${value.toLocaleString()}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cash"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Cash"
                />
                <Line
                  type="monotone"
                  dataKey="investments"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Investments"
                />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  name="Net Worth"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No historical data available yet. Upload more statements to see your net worth over time.
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 space-y-6 mt-6">
        {/* Accounts Section */}
        <div className="bg-[#EEEBD9] rounded-lg">
          <div className="px-4 py-3 border-b-2 border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900">Accounts</h2>
          </div>
          <div className="divide-y divide-gray-700">
            {accounts.map((account: any) => (
              <div key={account.id} className="px-4 py-2 flex justify-between items-center">
                <p className="text-sm text-gray-700">{account.name}</p>
                <p className={`text-sm font-semibold ${account.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  ${Number(account.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Investments Section */}
        <div className="bg-[#EEEBD9] rounded-lg">
          <div className={`px-4 py-3 ${investments.length > 0 ? "border-b-2 border-gray-700" : ""}`}>
            <h2 className="text-sm font-semibold text-gray-900">Investments</h2>
          </div>
          <div className="divide-y divide-gray-700">
            {investments.map((portfolio: any) => (
              <div key={portfolio.id} className="px-4 py-2 flex justify-between items-center">
                <p className="text-sm text-gray-700">{portfolio.name}</p>
                <p className="text-sm font-semibold text-gray-900">
                  ${Number(portfolio.currentValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Category Spend Pie Chart */}
        <div className="bg-[#EEEBD9] rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Category Spend</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCategoryViewMode(categoryViewMode === 'percentage' ? 'amount' : 'percentage')}
                className="px-2 py-1 text-xs rounded cursor-pointer bg-[#282427] text-white"
              >
                {categoryViewMode === 'percentage' ? '%' : '$'}
              </button>
              <button
                onClick={() => setCategoryTimeframe(categoryTimeframe === 'month' ? 'year' : 'month')}
                className="px-2 py-1 text-xs rounded cursor-pointer bg-[#282427] text-white"
              >
                {categoryTimeframe === 'month' ? 'Month' : 'Year'}
              </button>
            </div>
          </div>

          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) =>
                      categoryViewMode === 'percentage'
                        ? `${value.toFixed(1)}%`
                        : `$${value.toLocaleString()}`
                    }
                  />
                  {/* center text - render as SVG text */}
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: 14, fontWeight: 700 }}
                  >
                    ${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </text>
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="mt-4 space-y-1">
                {categoryData.slice(0, 5).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                      />
                      <span className="text-gray-700">{item.name}</span>
                    </div>
                    <span className="font-semibold">
                      {categoryViewMode === 'percentage'
                        ? `${item.value.toFixed(1)}%`
                        : `$${item.value.toLocaleString()}`
                      }
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-xs text-gray-500">
                No spending data for {categoryTimeframe === 'month' ? 'this month' : 'this year'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Account Filter Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#EEEBD9] rounded-lg p-6 max-w-md w-full text-center">
            <h3 className="text-2xl font-semibold mb-4">Filter by Account</h3>

            <div className="flex gap-2 mb-3 justify-end text-sm">
              {excludedAccountIds.length === 0 ? (
                // All accounts selected → show Unselect All
                <button onClick={unselectAllAccounts} className="px-2 py-1 cursor-pointer">
                  Unselect All
                </button>
              ) : (
                // One or more excluded → show Select All
                <button onClick={selectAllAccounts} className="px-2 py-1 cursor-pointer">
                  Select All
                </button>
              )}
            </div>


            <div className="space-y-2 max-h-96 overflow-y-auto">
              {accounts.map((account: any) => {
                const isSelected = !excludedAccountIds.includes(account.id);

                return (
                  <div
                    key={account.id}
                    onClick={() => toggleAccountFilter(account.id)}
                    className={`
                      p-2 rounded cursor-pointer hover:bg-[#d7d5c5]
                      ${isSelected ? "border-2 border-black" : "border-2 border-transparent"}
                    `}
                  >
                    {account.name}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowAccountModal(false)}
              className="mt-4 w-full bg-[#282427] text-white py-2 px-4 rounded-lg cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Category Filter Modal */}
      {showCategoryModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[#EEEBD9] rounded-lg p-6 max-w-md w-full text-center">
          <h3 className="text-2xl font-semibold mb-4">Filter by Category</h3>

          <div className="flex gap-2 mb-3 justify-end text-sm">
            {excludedCategoryIds.length === 0 ? (
              <button onClick={unselectAllCategories} className="px-2 py-1 cursor-pointer">
                Unselect All
              </button>
            ) : (
              <button onClick={selectAllCategories} className="px-2 py-1 cursor-pointer">
                Select All
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {categories.map((category: any) => {
              const isSelected = !excludedCategoryIds.includes(category.id);

              return (
                <div
                  key={category.id}
                  onClick={() => toggleCategoryFilter(category.id)}
                  className={`
                    p-2 rounded cursor-pointer flex items-center justify-center gap-2 hover:bg-[#d7d5c5]
                    border-2
                    ${isSelected ? "border-black" : "border-transparent"}
                  `}
                  style={{
                    borderColor: isSelected
                      ? category.color || "black"
                      : "transparent"
                  }}
                >
                  <span>{category.icon ? `${category.icon} ` : ""}{category.name}</span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setShowCategoryModal(false)}
            className="mt-4 w-full bg-[#282427] text-white py-2 px-4 rounded-lg cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    )}
    </div>
  );
}
