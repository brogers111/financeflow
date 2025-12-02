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
  Area,
  AreaChart,
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
  const [categoryTimeframe, setCategoryTimeframe] = useState<'month' | 'year'>('year');

  // Balance flow filters
  const [flowMonthsToShow, setFlowMonthsToShow] = useState(1);
  const [flowSelectedMonth, setFlowSelectedMonth] = useState(() => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    return lastMonth.getMonth();
  });
  const [flowSelectedYear, setFlowSelectedYear] = useState(() => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    return lastMonth.getFullYear();
  });
  const [excludedAccountIds, setExcludedAccountIds] = useState<string[]>([]);
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<string[]>([]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const { data: statsData, loading: statsLoading } = useQuery(GET_DASHBOARD_STATS);
  const { data: accountsData, loading: accountsLoading } = useQuery(GET_ACCOUNTS);
  const { data: investmentsData, loading: investmentsLoading } = useQuery(GET_INVESTMENT_PORTFOLIOS);
  const { data: categoriesData } = useQuery(GET_CATEGORIES);

  // Get last complete month for monthly category breakdown
  const lastCompleteMonth = useMemo(() => {
    const now = new Date();
    return {
      year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
      month: now.getMonth() === 0 ? 12 : now.getMonth()
    };
  }, []);

  // Monthly stats query for last complete month
  const { data: monthlyData } = useQuery(GET_MONTHLY_STATS, {
    variables: { 
      year: lastCompleteMonth.year, 
      month: lastCompleteMonth.month 
    },
    skip: categoryTimeframe === 'year'
  });

  // Yearly transactions (aggregate)
  const { data: allTransactionsData } = useQuery(GET_TRANSACTIONS, {
    variables: {
      startDate: `1900-01-01`,
      endDate: new Date().toISOString().split('T')[0]
    }
  });

  // Current year transactions for category breakdown
  const currentYear = new Date().getFullYear();
  const { data: yearlyTransactions } = useQuery(GET_TRANSACTIONS, {
    variables: {
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`
    },
    skip: categoryTimeframe === 'month'
  });

  // Memoize flow date range
  const flowDateRange = useMemo(() => {
    const end = new Date(flowSelectedYear, flowSelectedMonth + 1, 0);
    const start = new Date(flowSelectedYear, flowSelectedMonth, 1);
    start.setMonth(start.getMonth() - (flowMonthsToShow - 1));
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

  const earliestTransactionDate = useMemo(() => {
    const transactions = allTransactionsData?.transactions || [];
    if (transactions.length === 0) return new Date();
    
    const dates = transactions.map((t: any) => {
      if (!t.date) return new Date();
      if (!Number.isNaN(Number(t.date))) {
        return new Date(Number(t.date));
      }
      return new Date(t.date);
    }).filter(d => !isNaN(d.getTime()));
    
    return dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
  }, [allTransactionsData]);

  const availableMonthsBack = useMemo(() => {
    const now = new Date();
    const earliest = earliestTransactionDate;
    const monthsDiff = (now.getFullYear() - earliest.getFullYear()) * 12 + 
                      (now.getMonth() - earliest.getMonth()) + 1;
    return monthsDiff;
  }, [earliestTransactionDate]);

  // Net worth date range
  const netWorthDateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date(earliestTransactionDate);
    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate };
  }, [earliestTransactionDate]);

  // Calculate balance flow data
  const balanceFlowData = useMemo(() => {
    const transactions = flowTransactionsData?.transactions || [];

    const filteredTransactions = transactions.filter((t: any) => {
      const accountIncluded = !excludedAccountIds.includes(t.account?.id);
      const categoryIncluded = !t.category || !excludedCategoryIds.includes(t.category.id);
      return accountIncluded && categoryIncluded;
    });

    const dailyData: Record<string, {
      income: any[];
      expenses: any[];
      incomeTotal: number;
      expenseTotal: number;
      isMonthBoundary?: boolean;
    }> = {};

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

    filteredTransactions.forEach((t: any) => {
      const parsedDate = (() => {
        if (!t.date) return null;
        if (!Number.isNaN(Number(t.date))) {
          return new Date(Number(t.date));
        }
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

  const monthBoundaries = useMemo(() =>
    balanceFlowData.filter(d => d.isMonthBoundary).map(d => d.date),
    [balanceFlowData]
  );

  // Net worth history - using BalanceSnapshots
  const netWorthHistory = useMemo(() => {
    const accounts = accountsData?.accounts || [];
    const investments = investmentsData?.investmentPortfolios || [];
    
    if (!accounts.length && !investments.length) return [];

    const start = new Date(netWorthDateRange.startDate);
    const end = new Date(netWorthDateRange.endDate);
    
    // UPDATED: Include current month in the range
    const now = new Date();
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endDate = currentMonthEnd > end ? currentMonthEnd : end;
    
    const monthlyBalances: Record<string, { 
      personalCash: number; 
      personalSavings: number;
      businessSavings: number;
      investments: number;
      hasData: boolean; 
    }> = {};
    
    // Initialize all months from start to current month
    for (let d = new Date(start); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const key = d.toISOString().slice(0, 7);
      monthlyBalances[key] = {
        personalCash: 0,
        personalSavings: 0,
        businessSavings: 0,
        investments: 0,
        hasData: false
      };
    }

    const sortedMonths = Object.keys(monthlyBalances).sort();

    // Process each month
    for (const monthKey of sortedMonths) {
      const [year, monthNum] = monthKey.split('-').map(Number);
      const monthEnd = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

      // For each account, find most recent balance snapshot at or before month-end
      for (const account of accounts) {
        const snapshots = account.balanceHistory || [];
        
        const relevantSnapshots = snapshots.filter((snap: any) => {
          let snapDate: Date;
          if (typeof snap.date === 'string') {
            if (!isNaN(Number(snap.date))) {
              snapDate = new Date(Number(snap.date));
            } else {
              snapDate = new Date(snap.date);
            }
          } else if (typeof snap.date === 'number') {
            snapDate = new Date(snap.date);
          } else {
            snapDate = new Date(snap.date);
          }
          
          const snapYear = snapDate.getUTCFullYear();
          const snapMonth = snapDate.getUTCMonth();
          const monthEndYear = monthEnd.getUTCFullYear();
          const monthEndMonth = monthEnd.getUTCMonth();
          
          const snapYearMonth = snapYear * 12 + snapMonth;
          const monthEndYearMonth = monthEndYear * 12 + monthEndMonth;
          
          return snapYearMonth <= monthEndYearMonth;
        });

        if (relevantSnapshots.length === 0) continue;

        const mostRecent = relevantSnapshots.sort((a: any, b: any) => {
          let dateA: Date, dateB: Date;
          
          if (typeof a.date === 'string' && !isNaN(Number(a.date))) {
            dateA = new Date(Number(a.date));
          } else if (typeof a.date === 'number') {
            dateA = new Date(a.date);
          } else {
            dateA = new Date(a.date);
          }
          
          if (typeof b.date === 'string' && !isNaN(Number(b.date))) {
            dateB = new Date(Number(b.date));
          } else if (typeof b.date === 'number') {
            dateB = new Date(b.date);
          } else {
            dateB = new Date(b.date);
          }
          
          return dateB.getTime() - dateA.getTime();
        })[0];

        const balance = mostRecent.balance;

        if (account.accountType === 'PERSONAL') {
          if (account.type === 'CHECKING' || account.type === 'CASH') {
            monthlyBalances[monthKey].personalCash += balance;
            monthlyBalances[monthKey].hasData = true;
          } else if (account.type === 'CREDIT_CARD') {
            monthlyBalances[monthKey].personalCash += balance;
            monthlyBalances[monthKey].hasData = true;
          } else if (account.type === 'SAVINGS') {
            monthlyBalances[monthKey].personalSavings += balance;
            monthlyBalances[monthKey].hasData = true;
          }
        } else if (account.accountType === 'BUSINESS') {
          if (account.type === 'SAVINGS' || account.type === 'CHECKING' || account.type === 'CASH') {
            monthlyBalances[monthKey].businessSavings += balance;
            monthlyBalances[monthKey].hasData = true;
          }
        }
      }

      // Get investment values
      for (const portfolio of investments) {
        const snapshots = portfolio.valueHistory || [];
        
        const relevantSnapshots = snapshots.filter((snap: any) => {
          let snapDate: Date;
          if (typeof snap.date === 'string') {
            if (!isNaN(Number(snap.date))) {
              snapDate = new Date(Number(snap.date));
            } else {
              snapDate = new Date(snap.date);
            }
          } else if (typeof snap.date === 'number') {
            snapDate = new Date(snap.date);
          } else {
            snapDate = new Date(snap.date);
          }
          
          const snapYear = snapDate.getUTCFullYear();
          const snapMonth = snapDate.getUTCMonth();
          const monthEndYear = monthEnd.getUTCFullYear();
          const monthEndMonth = monthEnd.getUTCMonth();
          
          const snapYearMonth = snapYear * 12 + snapMonth;
          const monthEndYearMonth = monthEndYear * 12 + monthEndMonth;
          
          return snapYearMonth <= monthEndYearMonth;
        });

        if (relevantSnapshots.length > 0) {
          const mostRecent = relevantSnapshots.sort((a: any, b: any) => {
            let dateA: Date, dateB: Date;
            
            if (typeof a.date === 'string' && !isNaN(Number(a.date))) {
              dateA = new Date(Number(a.date));
            } else if (typeof a.date === 'number') {
              dateA = new Date(a.date);
            } else {
              dateA = new Date(a.date);
            }
            
            if (typeof b.date === 'string' && !isNaN(Number(b.date))) {
              dateB = new Date(Number(b.date));
            } else if (typeof b.date === 'number') {
              dateB = new Date(b.date);
            } else {
              dateB = new Date(b.date);
            }
            
            return dateB.getTime() - dateA.getTime();
          })[0];
          
          monthlyBalances[monthKey].investments += mostRecent.value;
          monthlyBalances[monthKey].hasData = true;
        }
      }
    }

    // Forward-fill missing months
    for (let i = 1; i < sortedMonths.length; i++) {
      const currentMonth = sortedMonths[i];
      const prevMonth = sortedMonths[i - 1];
      
      // If current month has NO data at all, copy everything from previous month
      if (!monthlyBalances[currentMonth].hasData) {
        monthlyBalances[currentMonth] = { 
          ...monthlyBalances[prevMonth], 
          hasData: true // Mark as having data so it shows up
        };
      } else {
        // If current month has SOME data, forward-fill individual zero components
        if (monthlyBalances[currentMonth].personalCash === 0 && monthlyBalances[prevMonth].personalCash !== 0) {
          monthlyBalances[currentMonth].personalCash = monthlyBalances[prevMonth].personalCash;
        }
        if (monthlyBalances[currentMonth].personalSavings === 0 && monthlyBalances[prevMonth].personalSavings !== 0) {
          monthlyBalances[currentMonth].personalSavings = monthlyBalances[prevMonth].personalSavings;
        }
        if (monthlyBalances[currentMonth].businessSavings === 0 && monthlyBalances[prevMonth].businessSavings !== 0) {
          monthlyBalances[currentMonth].businessSavings = monthlyBalances[prevMonth].businessSavings;
        }
        if (monthlyBalances[currentMonth].investments === 0 && monthlyBalances[prevMonth].investments !== 0) {
          monthlyBalances[currentMonth].investments = monthlyBalances[prevMonth].investments;
        }
      }
    }

    // Build chart data - include all months with data
    const chartData = sortedMonths
      .filter(month => monthlyBalances[month].hasData)
      .map(month => {
        const data = monthlyBalances[month];
        const [year, monthNum] = month.split('-').map(Number);
        const monthDate = new Date(year, monthNum - 1, 1);
        
        return {
          date: monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          personalCash: Math.round(data.personalCash * 100) / 100,
          personalSavings: Math.round(data.personalSavings * 100) / 100,
          businessSavings: Math.round(data.businessSavings * 100) / 100,
          investments: Math.round(data.investments * 100) / 100,
          netWorth: Math.round((data.personalCash + data.personalSavings + data.businessSavings + data.investments) * 100) / 100
        };
      });

    return chartData;
  }, [accountsData, investmentsData, netWorthDateRange]);

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
  
  const cashChange = stats.cashChange || 0;
  const savingsChange = stats.savingsChange || 0;
  const investmentChange = stats.investmentChange || 0;
  const netWorthChange = stats.netWorthChange || 0;

  // Calculate category data
  let categoryData: any[] = [];
  let totalSpend = 0;

  if (categoryTimeframe === 'month') {
    const monthlyStats = monthlyData?.monthlyStats || { byCategory: [], expenses: 0 };
    totalSpend = monthlyStats.expenses || 0;
    categoryData = (monthlyStats.byCategory || [])
      .map((item: any) => ({
        name: item.category.name,
        value: categoryViewMode === 'percentage' ? item.percentage : item.total,
        color: item.category.color
      }))
      .sort((a, b) => b.value - a.value); // SORT DESCENDING
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
    })).sort((a, b) => b.value - a.value); // ALREADY SORTED
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Custom tooltip for Balance Flow
  const BalanceFlowTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    const data = payload[0].payload;
    console.log(data);
    return (
      <div className="max-w-md">
        <p className="text-xs font-semibold bg-[#EEEBD9] px-2 border border-[#282427] rounded shadow-lg inline-block">{data.date}</p>
        <div className='mt-1 bg-[#EEEBD9] px-2 py-1 border border-[#282427] rounded shadow-lg'>
          <p className="text-md font-bold">
            Balance: ${data.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

          {data.income.length > 0 && (
            <div className="mt-1 bg-[#EEEBD9] px-2 py-1 border border-[#282427] rounded shadow-lg">
              <p className="text-sm font-semibold text-green-600">Income: ${data.incomeTotal.toFixed(2)}</p>
              {data.income.map((t: any) => (
                <p key={t.id} className="text-xs text-gray-800 flex items-center gap-1">
                  {/* Dot */}
                  <span 
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: t.category?.color || '#666' }}
                  ></span>
                  <strong>
                    {t.description.length > 15 ? t.description.slice(0, 15) + '…' : t.description}:
                  </strong> 
                  ${Number(t.amount).toFixed(2)}
                </p>
              ))}
            </div>
          )}

          {data.expenses.length > 0 && (
            <div className='mt-1 bg-[#EEEBD9] px-2 py-1 border border-[#282427] rounded shadow-lg'>
              <p className="text-sm font-semibold text-red-600">Expenses: ${data.expenseTotal.toFixed(2)}</p>
              {data.expenses.map((t: any) => (
                <p key={t.id} className="text-xs text-gray-800 flex items-center gap-1">
                  <span 
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: t.category?.color || '#666' }}
                  ></span>
                  <strong>
                    {t.description.length > 10 ? t.description.slice(0, 10) + '…' : t.description}:
                  </strong> 
                  ${Math.abs(Number(t.amount)).toFixed(2)}
                </p>
              ))}
            </div>
          )}
      </div>
    );
  };

  // Custom tooltip for Net Worth History
  const NetWorthTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    const data = payload[0].payload;

    const parseShortDate = (str: string) => {
      const [monthShort, yearShort] = str.split(" ");
      const monthIndex = [
        "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"
      ].indexOf(monthShort);
      const fullYear = 2000 + parseInt(yearShort, 10);
      return new Date(fullYear, monthIndex, 1);
    };
    const parsed = parseShortDate(data.date);
    const fullMonth = parsed.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });

    return (
      <div className="max-w-md">
        <p className="text-xs font-semibold bg-[#EEEBD9] px-2 border border-[#282427] rounded shadow-lg inline-block">
          {fullMonth}
        </p>

        {/* Personal Cash */}
        <div className="flex justify-between mt-1 bg-[#EEEBD9] px-2 py-1 border border-[#282427] rounded shadow-lg">
          <p className="text-sm font-semibold text-[#D496A7]">Personal Cash:</p>
          <p className="text-sm font-semibold text-[#D496A7]">${data.personalCash.toLocaleString()}</p>
        </div>

        {/* Personal Savings */}
        <div className="flex justify-between mt-1 bg-[#EEEBD9] px-2 py-1 border border-[#282427] rounded shadow-lg">
          <p className="text-sm font-semibold text-[#35B79B]">Personal Savings:</p>
          <p className="text-sm font-semibold text-[#35B79B]">${data.personalSavings.toLocaleString()}</p>
        </div>

        {/* Business Savings */}
        <div className="flex justify-between mt-1 bg-[#EEEBD9] px-2 py-1 border border-[#282427] rounded shadow-lg">
          <p className="text-sm font-semibold text-[#EF8354]">Business Savings:</p>
          <p className="text-sm font-semibold text-[#EF8354]">${data.businessSavings.toLocaleString()}</p>
        </div>

        {/* Investments */}
        <div className="flex justify-between mt-1 bg-[#EEEBD9] px-2 py-1 border border-[#282427] rounded shadow-lg">
          <p className="text-sm font-semibold text-[#6CA6C1]">Investments:</p>
          <p className='text-sm font-semibold text-[#6CA6C1]'>
            ${data.investments.toLocaleString()}
          </p>
        </div>

        {/* Net Worth */}
        <div className="flex justify-between mt-1 bg-[#EEEBD9] px-2 py-1 border border-[#282427] rounded shadow-lg">
          <p className="text-md font-bold text-[#282427]">Net Worth:</p>
          <p className="text-md font-bold text-[#282427]">${data.netWorth.toLocaleString()}</p>
        </div>
      </div>
    );
  };

  const NetWorthLegend = ({ payload }) => {
    return (
      <div className="flex gap-4 justify-center">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            {/* Circle color indicator */}
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            ></span>

            {/* Capitalized label */}
            <span className="text-sm font-medium capitalize">
              {entry.value}
            </span>
          </div>
        ))}
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
          {/* Last Month Change */}
          <div className="p-4 rounded-lg bg-[#EEEBD9]">
            <p className="text-xs text-gray-500 mb-1">Last Month Change</p>
            <p className={`text-2xl font-bold ${(stats.lastMonthChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(stats.lastMonthChange || 0) >= 0 ? '+' : ''}
              ${stats.lastMonthChange?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-gray-500">
                Income - Expenses
              </span>
            </div>
          </div>

          {/* Total Cash (Checking - Credit Cards) */}
          <div className="bg-[#EEEBD9] p-4 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Total Cash</p>
            <p className="text-2xl font-bold text-gray-900">
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

          {/* Total Savings */}
          <div className="bg-[#EEEBD9] p-4 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Total Savings</p>
            <p className="text-2xl font-bold text-[#35B79B]">
              ${stats.totalSavings?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {(savingsChange || 0) >= 0 ? (
                <span className="text-green-600 text-xs">↑ {(savingsChange || 0).toFixed(1)}%</span>
              ) : (
                <span className="text-red-600 text-xs">↓ {Math.abs(savingsChange || 0).toFixed(1)}%</span>
              )}
            </div>
          </div>

          {/* Total Investments */}
          <div className="bg-[#EEEBD9] p-4 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Investments</p>
            <p className="text-2xl font-bold text-[#463A85]">
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
                className="px-3 py-1 text-sm rounded cursor-pointer border border-gray-300 focus:outline-none focus:ring-0"
              >
                {Array.from({ length: availableMonthsBack }, (_, i) => {
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
                className="px-3 py-1 text-sm rounded cursor-pointer border border-gray-300 focus:outline-none focus:ring-0"
              >
                <option value={1}>1 Month</option>
                <option value={3} disabled={availableMonthsBack < 3}>3 Months</option>
                <option value={6} disabled={availableMonthsBack < 6}>6 Months</option>
                <option value={12} disabled={availableMonthsBack < 12}>12 Months</option>
                <option value={24} disabled={availableMonthsBack < 24}>24 Months</option>
                <option value={60} disabled={availableMonthsBack < 60}>60 Months</option>
              </select>

              {/* Account Filter */}
              <button
                onClick={() => setShowAccountModal(!showAccountModal)}
                className="px-3 py-1 text-sm rounded cursor-pointer border border-gray-300 focus:outline-none focus:ring-0"
              >
                Accounts {excludedAccountIds.length > 0 && `(-${excludedAccountIds.length})`}
              </button>

              {/* Category Filter */}
              <button
                onClick={() => setShowCategoryModal(!showCategoryModal)}
                className="px-3 py-1 text-sm rounded cursor-pointer border border-gray-300 focus:outline-none focus:ring-0"
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
                  stroke="#666"
                  strokeDasharray="5 3"
                />
              ))}
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#666"
                strokeWidth={1}
                dot={(props) => {
                  const { cx, cy, value } = props;

                  // Choose color based on balance value
                  const color = value >= 0 ? "#00B177" : "#EF3A3F";

                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill={color}
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Net Worth History Graph */}
        <div className="bg-[#EEEBD9] rounded-lg p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Net Worth History</h2>
          </div>
          {netWorthHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={netWorthHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                <XAxis dataKey="date" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip content={<NetWorthTooltip />} cursor={false} />
                <Legend content={<NetWorthLegend />} />

                {/* Personal Cash */}
                <Area
                  type="monotone"
                  dataKey="personalCash"
                  stackId="a"
                  stroke="#D496A7"
                  strokeWidth={3}
                  fill="#D496A7"
                  fillOpacity={0.3}
                />

                {/* Personal Savings */}
                <Area
                  type="monotone"
                  dataKey="personalSavings"
                  stackId="a"
                  stroke="#35B79B"
                  strokeWidth={3}
                  fill="#35B79B"
                  fillOpacity={0.3}
                />

                {/* Business Savings */}
                <Area
                  type="monotone"
                  dataKey="businessSavings"
                  stackId="a"
                  stroke="#EF8354"
                  strokeWidth={3}
                  fill="#EF8354"
                  fillOpacity={0.3}
                />

                {/* Investments */}
                <Area
                  type="monotone"
                  dataKey="investments"
                  stackId="a"
                  stroke="#6CA6C1"
                  strokeWidth={3}
                  fill="#6CA6C1"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>

          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No historical data available yet. Upload more statements to see your net worth over time.
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 space-y-6 mt-15">
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
            <h2 className="text-md font-semibold text-gray-900">Expense Breakdown</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCategoryViewMode(categoryViewMode === 'percentage' ? 'amount' : 'percentage')}
                className="px-2 py-1 text-xs rounded cursor-pointer text-[#282427] border border-gray-300"
              >
                {categoryViewMode === 'percentage' ? '%' : '$'}
              </button>
              <button
                onClick={() => setCategoryTimeframe(categoryTimeframe === 'month' ? 'year' : 'month')}
                className="px-2 py-1 text-xs rounded cursor-pointer text-[#282427] border border-gray-300"
              >
                {categoryTimeframe === 'month' ? 'Month' : 'Year'}
              </button>
            </div>
          </div>

          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    innerRadius={50}
                    outerRadius={80}
                    cornerRadius={5}
                    fill="#8884d8"
                    dataKey="value"
                    className='cursor-pointer'
                  >
                    {categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} stroke='#EEEBD9' />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) =>
                      categoryViewMode === 'percentage'
                        ? `${value.toFixed(1)}%`
                        : `$${value.toLocaleString()}`
                    }
                    contentStyle={{
                      backgroundColor: '#EEEBD9',
                      border: '1px solid #282427',
                      borderRadius: '8px',
                      padding: '2px 10px',
                      color: '#282427',
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.25',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  />
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
                {categoryData.map((item: any, index: number) => (
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
            {categories
              .filter((category: any) => category.type !== 'TRANSFER')
              .map((category: any) => {
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
