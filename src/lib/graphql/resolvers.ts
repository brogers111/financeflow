import { PrismaClient, AccountType, AccountCategory, TransactionType, Category, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateAccountInput {
  name: string;
  type: AccountType;
  accountType?: AccountCategory;
  institution: string;
  balance: number;
}

interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  accountType?: AccountCategory;
  institution?: string;
  balance?: number;
  isActive?: boolean;
}

interface PaycheckInput {
  accountId: string;
  date: string;
  amount: number;
}

interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
}

async function calculateActualAmount(
  categoryId: string | null,
  startDate: Date,
  endDate: Date,
  userId: string
): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: {
      categoryId: categoryId || null,
      date: {
        gte: startDate,
        lte: endDate
      },
      account: { userId }
    }
  });

  return transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export const resolvers = {
  Query: {
    // Fetch all active accounts
    accounts: async () => {
      return prisma.financialAccount.findMany({
        where: { isActive: true },
        include: { 
          transactions: true, 
          balanceHistory: true,
          user: true 
        }
      });
    },

    // Fetch single account by ID
    account: async (_parent: unknown, { id }: { id: string }) => {
      return prisma.financialAccount.findUnique({
        where: { id },
        include: { 
          transactions: true, 
          balanceHistory: true,
          user: true 
        }
      });
    },

    // Fetch transactions with filters
    transactions: async (_parent: unknown, filters: TransactionFilters) => {
      const where: Prisma.TransactionWhereInput = {};
      
      if (filters.accountId) where.accountId = filters.accountId;
      if (filters.categoryId) where.categoryId = filters.categoryId;
      if (filters.type) where.type = filters.type;
      if (filters.startDate || filters.endDate) {
        where.date = {};
        if (filters.startDate) where.date.gte = new Date(filters.startDate);
        if (filters.endDate) where.date.lte = new Date(filters.endDate);
      }

      return prisma.transaction.findMany({
        where,
        include: { account: true, category: true },
        orderBy: { date: 'desc' }
      });
    },

    // Fetch categories - properly typed now
    categories: async (_parent: unknown, { type }: { type?: TransactionType }, context: any) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      console.log('Fetching categories for userId:', context.user.id);
      console.log('Filter by type:', type);

      const categories = await prisma.category.findMany({
        where: {
          userId: context.user.id,
          ...(type && { type }),
        },
        include: {
          subcategories: true,
        },
      });

      return categories;
    },

    // Fetch dashboard stats
    dashboardStats: async (_parent: unknown, _args: unknown, context: any) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      // Get all active accounts
      const accounts = await prisma.financialAccount.findMany({
        where: { 
          isActive: true,
          userId: context.user.id
        }
      });

      // Calculate total savings (all SAVINGS accounts)
      const totalSavings = accounts
        .filter(a => a.type === AccountType.SAVINGS)
        .reduce((sum, a) => sum + a.balance, 0);

      // Calculate total cash (CHECKING minus CREDIT_CARD)
      const checkingBalance = accounts
        .filter(a => a.type === AccountType.CHECKING)
        .reduce((sum, a) => sum + a.balance, 0);
      
      const creditCardBalance = accounts
        .filter(a => a.type === AccountType.CREDIT_CARD)
        .reduce((sum, a) => sum + Math.abs(a.balance), 0);
      
      const totalCash = checkingBalance - creditCardBalance;

      // Calculate personal and business cash separately (for Net Worth History)
      const personalCash = accounts
        .filter(a => 
          (a.type === AccountType.CHECKING || a.type === AccountType.SAVINGS || a.type === AccountType.CASH) &&
          a.accountType === AccountCategory.PERSONAL
        )
        .reduce((sum, a) => sum + a.balance, 0);

      const businessCash = accounts
        .filter(a => 
          (a.type === AccountType.CHECKING || a.type === AccountType.SAVINGS || a.type === AccountType.CASH) &&
          a.accountType === AccountCategory.BUSINESS
        )
        .reduce((sum, a) => sum + a.balance, 0);

      // Get investment portfolios
      const investmentPortfolios = await prisma.investmentPortfolio.findMany({
        where: { userId: context.user.id }
      });

      const investments = investmentPortfolios.reduce((sum, p) => sum + p.currentValue, 0);
      const netWorth = totalCash + totalSavings + investments;

      // Get current month and last month dates
      const now = new Date();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // Calculate LAST MONTH income (most recent complete month)
      const lastMonthIncome = await prisma.transaction.aggregate({
        where: {
          type: TransactionType.INCOME,
          date: { 
            gte: lastMonthStart,
            lte: lastMonthEnd
          },
          account: { userId: context.user.id }
        },
        _sum: { amount: true }
      });

      // Calculate LAST MONTH expenses
      const lastMonthExpenses = await prisma.transaction.aggregate({
        where: {
          type: TransactionType.EXPENSE,
          date: { 
            gte: lastMonthStart,
            lte: lastMonthEnd
          },
          account: { userId: context.user.id }
        },
        _sum: { amount: true }
      });

      // Calculate MONTH BEFORE LAST income (for comparison)
      const monthBeforeLastStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const monthBeforeLastEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);

      const monthBeforeIncome = await prisma.transaction.aggregate({
        where: {
          type: TransactionType.INCOME,
          date: { 
            gte: monthBeforeLastStart,
            lte: monthBeforeLastEnd
          },
          account: { userId: context.user.id }
        },
        _sum: { amount: true }
      });

      const monthBeforeExpenses = await prisma.transaction.aggregate({
        where: {
          type: TransactionType.EXPENSE,
          date: { 
            gte: monthBeforeLastStart,
            lte: monthBeforeLastEnd
          },
          account: { userId: context.user.id }
        },
        _sum: { amount: true }
      });

      // Calculate month-over-month changes
      const lastMonthIncomeTotal = lastMonthIncome._sum.amount || 0;
      const lastMonthExpensesTotal = Math.abs(lastMonthExpenses._sum.amount || 0);
      const lastMonthChange = lastMonthIncomeTotal - lastMonthExpensesTotal;
      
      const monthBeforeIncomeTotal = monthBeforeIncome._sum.amount || 0;
      const monthBeforeExpensesTotal = Math.abs(monthBeforeExpenses._sum.amount || 0);

      const incomeChange = monthBeforeIncomeTotal > 0 
        ? ((lastMonthIncomeTotal - monthBeforeIncomeTotal) / monthBeforeIncomeTotal) * 100 
        : 0;
      
      const expensesChange = monthBeforeExpensesTotal > 0 
        ? ((lastMonthExpensesTotal - monthBeforeExpensesTotal) / monthBeforeExpensesTotal) * 100 
        : 0;

      // Calculate cash MoM change
      // Get transactions from last month to calculate the change in cash balance
      const lastMonthTransactions = await prisma.transaction.findMany({
        where: {
          date: { 
            gte: lastMonthStart,
            lte: lastMonthEnd
          },
          account: { 
            userId: context.user.id,
            type: { in: [AccountType.CHECKING, AccountType.CREDIT_CARD] }
          }
        }
      });

      const cashFlowLastMonth = lastMonthTransactions.reduce((sum, t) => {
        return sum + (t.amount || 0);
      }, 0);

      const previousCashBalance = totalCash - cashFlowLastMonth;
      const cashChange = previousCashBalance !== 0 
        ? ((totalCash - previousCashBalance) / Math.abs(previousCashBalance)) * 100 
        : 0;

      // Calculate savings MoM change
      const lastMonthSavingsTransactions = await prisma.transaction.findMany({
        where: {
          date: { 
            gte: lastMonthStart,
            lte: lastMonthEnd
          },
          account: { 
            userId: context.user.id,
            type: AccountType.SAVINGS
          }
        }
      });

      const savingsFlowLastMonth = lastMonthSavingsTransactions.reduce((sum, t) => {
        return sum + (t.amount || 0);
      }, 0);

      const previousSavingsBalance = totalSavings - savingsFlowLastMonth;
      const savingsChange = previousSavingsBalance !== 0 
        ? ((totalSavings - previousSavingsBalance) / Math.abs(previousSavingsBalance)) * 100 
        : 0;

      // Investment MoM change - calculate from snapshots
      const oneMonthAgoDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      
      // Get the most recent snapshot before one month ago for each portfolio
      const portfolioSnapshots = await Promise.all(
        investmentPortfolios.map(async (portfolio) => {
          const snapshot = await prisma.investmentSnapshot.findFirst({
            where: {
              portfolioId: portfolio.id,
              date: { lte: oneMonthAgoDate }
            },
            orderBy: { date: 'desc' }
          });
          return snapshot?.value || portfolio.currentValue; // Fallback to current if no snapshot
        })
      );

      const investmentsOneMonthAgo = portfolioSnapshots.reduce((sum, value) => sum + value, 0);
      const investmentChange = investmentsOneMonthAgo > 0 
        ? ((investments - investmentsOneMonthAgo) / investmentsOneMonthAgo) * 100 
        : 0;

      // Calculate net worth change
      const previousNetWorth = previousCashBalance + previousSavingsBalance + investmentsOneMonthAgo;
      const netWorthChange = previousNetWorth > 0 
        ? ((netWorth - previousNetWorth) / previousNetWorth) * 100 
        : 0;

      // Calculate average spending (last 12 months)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const yearExpenses = await prisma.transaction.aggregate({
        where: {
          type: TransactionType.EXPENSE,
          date: { gte: oneYearAgo },
          account: { userId: context.user.id }
        },
        _sum: { amount: true }
      });

      const totalExpenses = Math.abs(yearExpenses._sum.amount || 0);
      const avgMonthlySpend = totalExpenses / 12;
      const avgYearlySpend = totalExpenses;

      return {
        totalCash,
        totalSavings,
        personalCash,
        businessCash,
        investments,
        netWorth,
        lastMonthChange,
        lastMonthIncome: lastMonthIncomeTotal,
        lastMonthExpenses: lastMonthExpensesTotal,
        incomeChange,
        expensesChange,
        cashChange,
        savingsChange,
        investmentChange,
        netWorthChange,
        avgMonthlySpend,
        avgYearlySpend
      };
    },

    // Fetch monthly stats
    monthlyStats: async (_parent: unknown, { year, month }: { year: number; month: number }) => {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const transactions = await prisma.transaction.findMany({
        where: {
          date: { gte: startDate, lte: endDate }
        },
        include: { category: true }
      });

      const income = transactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = Math.abs(
        transactions
          .filter(t => t.type === TransactionType.EXPENSE)
          .reduce((sum, t) => sum + t.amount, 0)
      );

      const netChange = income - expenses;

      const byCategory: Record<string, { category: Category; total: number }> = {};
      
      transactions
        .filter(t => t.type === TransactionType.EXPENSE && t.category)
        .forEach(t => {
          const catId = t.categoryId!;
          if (!byCategory[catId]) {
            byCategory[catId] = { category: t.category!, total: 0 };
          }
          byCategory[catId].total += Math.abs(t.amount);
        });

      const byCategoryArray = Object.values(byCategory).map(item => ({
        category: item.category,
        total: item.total,
        percentage: expenses > 0 ? (item.total / expenses) * 100 : 0
      }));

      return {
        month: `${year}-${String(month).padStart(2, '0')}`,
        income,
        expenses,
        netChange,
        byCategory: byCategoryArray
      };
    },

    // Fetch net worth history
    netWorthHistory: async (_parent: unknown, { startDate, endDate }: { startDate: string; endDate: string }) => {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const snapshots = await prisma.balanceSnapshot.findMany({
        where: {
          date: { gte: start, lte: end }
        },
        include: { account: true },
        orderBy: { date: 'asc' }
      });

      const byDate: Record<string, { cash: number; investments: number }> = {};

      snapshots.forEach(snap => {
        const dateKey = snap.date.toISOString().split('T')[0];
        if (!byDate[dateKey]) {
          byDate[dateKey] = { cash: 0, investments: 0 };
        }

        if (snap.account.type === AccountType.CHECKING || 
            snap.account.type === AccountType.SAVINGS || 
            snap.account.type === AccountType.CASH) {
          byDate[dateKey].cash += snap.balance;
        } else if (snap.account.type === AccountType.INVESTMENT) {
          byDate[dateKey].investments += snap.balance;
        }
      });

      return Object.entries(byDate).map(([date, values]) => ({
        date,
        totalCash: values.cash,
        investments: values.investments,
        netWorth: values.cash + values.investments
      }));
    },

    investmentPortfolios: async (_parent: unknown, _args: unknown, context: any) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      return prisma.investmentPortfolio.findMany({
        where: { userId: context.user.id },  // Only user's portfolios
        include: {
          valueHistory: {
            orderBy: { date: 'desc' }
          }
        }
      });
    },

    investmentPortfolio: async (_parent: unknown, { id }: { id: string }) => {
      return prisma.investmentPortfolio.findUnique({
        where: { id },
        include: {
          valueHistory: {
            orderBy: { date: 'desc' }
          }
        }
      });
    },

    budgetPeriods: async (
      _parent: unknown,
      { pinned }: { pinned?: boolean },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      const periods = await prisma.budgetPeriod.findMany({
        where: {
          userId: context.user.id,
          ...(pinned !== undefined && { isPinned: pinned })
        },
        include: {
          lineItems: {
            include: { category: true }
          }
        },
        orderBy: [
          { isPinned: 'desc' },
          { startDate: 'desc' }
        ]
      });

      // Enrich with calculated fields
      return periods.map(period => ({
        ...period,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        createdAt: period.createdAt.toISOString()
      }));
    },

    budgetPeriod: async (
      _parent: unknown,
      { id }: { id: string },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      const period = await prisma.budgetPeriod.findFirst({
        where: {
          id,
          userId: context.user.id
        },
        include: {
          lineItems: {
            include: { category: true }
          }
        }
      });

      if (!period) {
        throw new Error('Budget period not found');
      }

      return {
        ...period,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        createdAt: period.createdAt.toISOString()
      };
    },

    suggestBudgetAmounts: async (
      _parent: unknown,
      { startDate, endDate }: { startDate: string; endDate: string },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      const parseLocalDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      };

      const targetStart = parseLocalDate(startDate);
      const targetEnd = parseLocalDate(endDate);
      const daysDiff = Math.ceil(
        (targetEnd.getTime() - targetStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Find similar-length periods (±3 days tolerance)
      const historicalPeriods = await prisma.budgetPeriod.findMany({
        where: {
          userId: context.user.id,
          // Find periods with similar length
        },
        include: {
          lineItems: {
            include: { category: true }
          }
        },
        orderBy: { startDate: 'desc' },
        take: 3
      });

      if (historicalPeriods.length < 2) {
        const allPeriods = await prisma.budgetPeriod.findMany({
          where: { userId: context.user.id },
          include: {
            lineItems: {
              include: { category: true }
            }
          },
          orderBy: { startDate: 'desc' },
          take: 2
        });

        if (allPeriods.length >= 2) {
          // Use the 2nd most recent (skips the immediately previous one)
          const twoPrior = allPeriods[1];
          return twoPrior.lineItems.map(item => ({
            categoryId: item.categoryId,
            categoryName: item.category?.name || 'Uncategorized',
            suggestedAmount: item.budgetAmount,
            basedOnPeriods: [
              `${twoPrior.startDate.toLocaleDateString()} - ${twoPrior.endDate.toLocaleDateString()}`
            ]
          }));
        }

        return [];
      }

      // Average amounts from similar periods
      const categoryAverages: Record<string, {
        total: number;
        count: number;
        name: string;
        periods: string[];
      }> = {};

      historicalPeriods.forEach(period => {
        const periodLabel = `${period.startDate.toLocaleDateString()} - ${period.endDate.toLocaleDateString()}`;
        
        period.lineItems.forEach(item => {
          const key = item.categoryId || 'uncategorized';
          if (!categoryAverages[key]) {
            categoryAverages[key] = {
              total: 0,
              count: 0,
              name: item.category?.name || 'Uncategorized',
              periods: []
            };
          }
          categoryAverages[key].total += item.budgetAmount;
          categoryAverages[key].count += 1;
          if (!categoryAverages[key].periods.includes(periodLabel)) {
            categoryAverages[key].periods.push(periodLabel);
          }
        });
      });

      return Object.entries(categoryAverages).map(([categoryId, data]) => ({
        categoryId: categoryId === 'uncategorized' ? null : categoryId,
        categoryName: data.name,
        suggestedAmount: Math.round((data.total / data.count) * 100) / 100,
        basedOnPeriods: data.periods
      }));
    },

        checkBudgetOverlap: async (
      _parent: unknown,
      { startDate, endDate }: { startDate: string; endDate: string },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      const parseLocalDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      };

      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);

      const overlapping = await prisma.budgetPeriod.findMany({
        where: {
          userId: context.user.id,
          AND: [
            { startDate: { lte: end } },
            { endDate: { gte: start } }
          ]
        },
        include: {
          lineItems: {
            include: { category: true }
          }
        }
      });

      return {
        hasOverlap: overlapping.length > 0,
        overlappingPeriods: overlapping.map(p => ({
          ...p,
          startDate: p.startDate.toISOString(),
          endDate: p.endDate.toISOString(),
          createdAt: p.createdAt.toISOString()
        }))
      };
    },
  },

  Mutation: {
    // Create account
    createAccount: async (_parent: unknown, { input }: { input: CreateAccountInput }, context: any) => {
      if (!context.user?.id){
        throw new Error('Not authenticated');
      }

      return prisma.financialAccount.create({
        data: {
          name: input.name,
          type: input.type,
          accountType: input.accountType ?? 'PERSONAL',
          institution: input.institution,
          balance: input.balance ?? 0,
          userId: context.user.id
        }
      });
    },

    // Update account
    updateAccount: async (
      _parent: unknown, 
      { id, input }: { id: string; input: Partial<UpdateAccountInput> },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      // Verify account belongs to user
      const existingAccount = await prisma.financialAccount.findFirst({
        where: {
          id,
          userId: context.user.id
        }
      });

      if (!existingAccount) {
        throw new Error('Account not found or access denied');
      }

      const data: Prisma.FinancialAccountUpdateInput = {};
      
      if (input.name !== undefined) data.name = input.name;
      if (input.type !== undefined) data.type = input.type;
      if (input.accountType !== undefined) data.accountType = input.accountType;
      if (input.institution !== undefined) data.institution = input.institution;
      if (input.balance !== undefined) data.balance = input.balance;
      if (input.isActive !== undefined) data.isActive = input.isActive;

      return prisma.financialAccount.update({
        where: { id },
        data
      });
    },

    // Delete account
    deleteAccount: async (_parent: unknown, { id }: { id: string }) => {
      await prisma.financialAccount.delete({ where: { id } });
      return true;
    },

    // Create transaction
    createTransaction: async (
      _parent: unknown,
      { input }: { input: any },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      // Verify account belongs to user
      const account = await prisma.financialAccount.findFirst({
        where: {
          id: input.accountId,
          userId: context.user.id
        }
      });

      if (!account) {
        throw new Error('Account not found or access denied');
      }

      // Parse date - handle multiple formats
      const parseDate = (dateInput: any): Date => {
        // If it's already a Date object
        if (dateInput instanceof Date) {
          return dateInput;
        }

        // If it's a timestamp (number)
        if (typeof dateInput === 'number') {
          return new Date(dateInput);
        }

        // If it's a string
        if (typeof dateInput === 'string') {
          // Check if it's an ISO string (contains 'T')
          if (dateInput.includes('T')) {
            return new Date(dateInput);
          }

          // Otherwise treat as YYYY-MM-DD format
          const [year, month, day] = dateInput.split('-').map(Number);
          
          // Validate the parsed values
          if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
            throw new Error(`Invalid date format: ${dateInput}`);
          }
          
          return new Date(year, month - 1, day);
        }

        throw new Error(`Unsupported date format: ${typeof dateInput}`);
      };

      const transaction = await prisma.transaction.create({
        data: {
          accountId: input.accountId,
          date: parseDate(input.date),
          description: input.description,
          amount: input.amount,
          type: input.type,
          categoryId: input.categoryId || null,
          wasManual: input.wasManual || false
        },
        include: {
          category: true,
          account: true
        }
      });

      return transaction;
    },

    // Delete transaction
    deleteTransaction: async (_parent: unknown, { id }: { id: string }) => {
      const transaction = await prisma.transaction.findUnique({
        where: { id }
      });

      if (transaction) {
        // Reverse the balance change
        await prisma.financialAccount.update({
          where: { id: transaction.accountId },
          data: {
            balance: {
              decrement: transaction.amount
            }
          }
        });

        await prisma.transaction.delete({ where: { id } });
      }

      return true;
    },

    // Categorize transaction
    categorizeTransaction: async (
      _parent: unknown, 
      { id, categoryId }: { id: string; categoryId: string },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      // Verify the transaction belongs to the user
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          id,
          account: { userId: context.user.id }
        }
      });

      if (!existingTransaction) {
        throw new Error('Transaction not found or access denied');
      }

      const transaction = await prisma.transaction.update({
        where: { id },
        data: {
          categoryId,
          wasManual: true
        },
        include: { account: true, category: true }
      });

      // Learn from this categorization
      if (transaction.description) {
        const pattern = transaction.description.toUpperCase().trim();

        console.log(`Learning pattern: "${pattern}" => category ${categoryId}`);

        await prisma.categorizationPattern.upsert({
          where: { descriptionPattern: pattern },
          update: {
            categoryId,
            confidence: 1.0,
            timesUsed: { increment: 1 },
            lastUsed: new Date()
          },
          create: {
            descriptionPattern: pattern,
            categoryId,
            confidence: 1.0,
            timesUsed: 1,
            userId: context.user.id
          }
        });
        
        console.log(`Transaction ${id} categorized to category ${categoryId}. Pattern: ${pattern}`);
      }

      return transaction;
    },

    createCategory: async (
      _parent: unknown,
      { input }: { input: { name: string; type: string; icon?: string; color?: string; parentId?: string } },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      console.log('Creating category with userId:', context.user.id);
      console.log('Input:', input);

      // Check if category with this name already exists for this user
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: input.name,
          userId: context.user.id,
        }
      });

      if (existingCategory) {
        throw new Error('You already have a category with this name');
      }

      const newCategory = await prisma.category.create({
        data: {
          name: input.name,
          type: input.type as TransactionType,
          icon: input.icon,
          color: input.color,
          parentId: input.parentId,
          userId: context.user.id,
        },
      });

      console.log('Created category:', newCategory);
      
      return newCategory;
    },

    updateCategory: async (
      _parent: unknown,
      { id, input }: { id: string; input: { name?: string; icon?: string; color?: string } },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      return await prisma.category.update({
        where: { id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.icon !== undefined && { icon: input.icon }),
          ...(input.color && { color: input.color }),
        },
      });
    },

    deleteCategory: async (
      _parent: unknown,
      { id }: { id: string },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      await prisma.category.delete({
        where: { id },
      });

      return true;
    },

    // Record paycheck
    recordPaycheck: async (_parent: unknown, { input }: { input: PaycheckInput }) => {
      const paycheck = await prisma.paycheck.create({
        data: {
          date: new Date(input.date),
          amount: input.amount,
          accountId: input.accountId
        }
      });

      // Create income transaction
      await prisma.transaction.create({
        data: {
          date: new Date(input.date),
          description: 'Paycheck',
          amount: input.amount,
          type: TransactionType.INCOME,
          source: 'Manual',
          wasManual: true,
          account: {
            connect: { id: input.accountId }
          }
        }
      });

      // Update account balance
      await prisma.financialAccount.update({
        where: { id: input.accountId },
        data: {
          balance: { increment: input.amount }
        }
      });

      return paycheck;
    },

    // Upload statement
    uploadStatement: async (
      _parent: unknown,
      { fileContent, accountId, statementType }: {
        fileContent: string;
        accountId: string;
        statementType: 'CHASE_CREDIT' | 'CHASE_CHECKING' | 'CHASE_PERSONAL_SAVINGS' | 'CHASE_BUSINESS_SAVINGS' | 'CAPITAL_ONE_SAVINGS';
      },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      try {
        // Verify account belongs to user
        const account = await prisma.financialAccount.findFirst({
          where: {
            id: accountId,
            userId: context.user.id
          }
        });

        if (!account) {
          throw new Error('Account not found or access denied');
        }

        const patterns = await prisma.categorizationPattern.findMany({
          where: { userId: context.user.id },
          orderBy: { confidence: 'desc' }
        });

        const needsCategorization: Array<{
          id: string;
          description: string;
          amount: number;
          date: Date;
        }> = [];

        let totalTransactionsCreated = 0;

        // Call the parsing API route
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const parseResponse = await fetch(`${baseUrl}/api/parse-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileContent,
            statementType
          })
        });

        if (!parseResponse.ok) {
          const contentType = parseResponse.headers.get('content-type');
          let errorMessage;
          
          if (contentType?.includes('application/json')) {
            const errorJson = await parseResponse.json();
            errorMessage = errorJson.error || 'Unknown error';
            console.error('❌ JSON error response:', errorJson);
          } else {
            const errorText = await parseResponse.text();
            errorMessage = errorText.substring(0, 500); // First 500 chars
            console.error('❌ Non-JSON error response:', errorText.substring(0, 200));
          }
          
          throw new Error(`PDF parsing failed: ${errorMessage}`);
        }

        const parseResult = await parseResponse.json();
        
        if (parseResult.error) {
          throw new Error(parseResult.error);
        }

        const { transactions, endingBalance } = parseResult;

        // Safety checks for parser failure or incorrect statement type selected
        if (!transactions || transactions.length === 0) {
          throw new Error(
            `No transactions found in this statement. This could mean:\n\n` +
            `• The statement is empty or has no transactions for this period\n` +
            `• You selected the wrong statement type (e.g., selected "Chase Credit" but uploaded a "Chase Savings" statement)\n` +
            `• The PDF format is not supported\n\n` +
            `Please verify you selected the correct statement type and try again.`
          );
        }

        if (endingBalance === 0 && transactions.length > 0) {
          console.warn('⚠️ Warning: Parser returned $0 ending balance with transactions present');
        }

        const uniqueAmounts = new Set(transactions.map((t: any) => t.amount));
        if (uniqueAmounts.size === 1 && transactions.length > 5) {
          throw new Error(
            `Parser detected an error: All transactions have the same amount ($${transactions[0].amount.toFixed(2)}). ` +
            `This likely means you uploaded the wrong statement type. Please verify you selected the correct statement type for your PDF.`
          );
        }

        const missingDescriptions = transactions.filter((t: any) => !t.description || t.description.trim() === '').length;
        if (missingDescriptions > transactions.length * 0.5) {
          throw new Error(
            `Parser error: More than half of the transactions are missing descriptions. ` +
            `This indicates the wrong statement type was selected or an unsupported PDF format. ` +
            `Please verify you selected the correct statement type.`
          );
        }

        if (transactions.length > 0) {
        // Get date range of this statement
        const dates = transactions.map((t: any) => new Date(t.date));
        const statementStartDate = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
        const statementEndDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));

        console.log(`📅 Statement date range: ${statementStartDate.toISOString()} to ${statementEndDate.toISOString()}`);

        // Check for existing transactions in this date range for this account
        const existingTransactions = await prisma.transaction.findMany({
          where: {
            accountId,
            date: {
              gte: statementStartDate,
              lte: statementEndDate
            }
          },
          select: {
            date: true,
            description: true,
            amount: true
          }
        });

        // Check if ALL transactions from the statement already exist
        if (existingTransactions.length > 0) {
          let matchCount = 0;

          for (const newTxn of transactions) {
            const matches = existingTransactions.some(existing => {
              const dateDiff = Math.abs(
                new Date(newTxn.date).getTime() - existing.date.getTime()
              );
              const sameDate = dateDiff < 24 * 60 * 60 * 1000; // Within 1 day
              const sameAmount = Math.abs(existing.amount - newTxn.amount) < 0.01;
              const sameDescription = existing.description.trim().toUpperCase() === newTxn.description.trim().toUpperCase();

              return sameDate && sameAmount && sameDescription;
            });

            if (matches) matchCount++;
          }

          // If 80% or more of transactions match, consider it a duplicate
          const matchPercentage = (matchCount / transactions.length) * 100;
          console.log(`🔍 Duplicate check: ${matchCount}/${transactions.length} transactions match (${matchPercentage.toFixed(1)}%)`);

          if (matchPercentage >= 80) {
            throw new Error(
              `This statement appears to be a duplicate. ${matchCount} of ${transactions.length} transactions already exist in this account for this time period.`
            );
          }
        }

        // Additional check: Compare ending balance if it exists
        if (endingBalance !== 0 && Math.abs(account.balance - endingBalance) < 0.01) {
          console.log(`⚠️ Account balance matches statement ending balance - possible duplicate`);
          
          // If balances match AND we have matching transactions, it's very likely a duplicate
          if (existingTransactions.length >= transactions.length * 0.5) {
            throw new Error(
              `This statement appears to be a duplicate. The ending balance ($${endingBalance.toFixed(2)}) matches your current account balance, and ${existingTransactions.length} transactions already exist for this period.`
            );
          }
        }
      }

        // Find the most recent transaction date from this statement
        let statementEndDate: Date | null = null;
        if (transactions.length > 0) {
          const dates = transactions.map((t: any) => new Date(t.date));
          statementEndDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
          console.log(`📅 Statement end date: ${statementEndDate.toISOString()}`);
        }

        // Process each transaction
        for (const txn of transactions) {
          const matchingPattern = patterns.find(p =>
            txn.description.toUpperCase().includes(p.descriptionPattern)
          );

          const prismaType = txn.type as TransactionType;
          const prismaAmount = txn.amount;

          if (matchingPattern && matchingPattern.confidence > 0.7) {
            await prisma.transaction.create({
              data: {
                date: new Date(txn.date),
                description: txn.description,
                amount: prismaAmount,
                type: prismaType,
                categoryId: matchingPattern.categoryId,
                source: statementType,
                wasManual: false,
                rawDescription: txn.description,
                accountId: accountId
              }
            });

            await prisma.categorizationPattern.update({
              where: { id: matchingPattern.id },
              data: {
                timesUsed: { increment: 1 },
                lastUsed: new Date()
              }
            });

            totalTransactionsCreated++;
          } else {
            const uncategorized = await prisma.transaction.create({
              data: {
                date: new Date(txn.date),
                description: txn.description,
                amount: prismaAmount,
                type: prismaType,
                source: statementType,
                wasManual: false,
                rawDescription: txn.description,
                account: {
                  connect: { id: accountId }
                }
              }
            });

            needsCategorization.push(uncategorized);
            totalTransactionsCreated++;
          }
        }

        // Only update account balance if this statement is newer than existing transactions
        if (statementEndDate && endingBalance !== 0) {
          // Get the most recent transaction date for this account
          const mostRecentTransaction = await prisma.transaction.findFirst({
            where: { accountId },
            orderBy: { date: 'desc' },
            select: { date: true }
          });

          const shouldUpdateBalance = !mostRecentTransaction ||
            statementEndDate >= mostRecentTransaction.date;

          if (shouldUpdateBalance) {
            console.log(`💰 Updating account balance to: $${endingBalance}`);
            await prisma.financialAccount.update({
              where: { id: accountId },
              data: {
                balance: endingBalance
              }
            });
          } else {
            console.log(`⏭️ Skipping balance update - statement is older than existing transactions`);
          }
        }

        return {
          success: true,
          transactionsCreated: totalTransactionsCreated,
          needsCategorization: needsCategorization.map(t => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            date: t.date.toISOString()
          }))
        };

      } catch (error: any) {
        console.error('Statement upload error:', error);
        throw new Error(`Failed to process statement: ${error.message || error}`);
      }
    },

    createInvestmentPortfolio: async (
      _parent: unknown,
      { name, type, institution, currentValue }: {
        name: string;
        type: string;
        institution: string;
        currentValue?: number;
      },
      context: any
    ) => {
        // Get user from auth context
        if (!context.user?.id) {
          throw new Error('Not authenticated');
        }

      const portfolio = await prisma.investmentPortfolio.create({
        data: {
          name,
          type,
          institution,
          currentValue: currentValue || 0,
          userId: context.user.id
        },
        include: {
          valueHistory: true
        }
      });

      // Create initial snapshot if value provided
      if (currentValue && currentValue > 0) {
        await prisma.investmentSnapshot.create({
          data: {
            portfolioId: portfolio.id,
            value: currentValue,
            date: new Date(),
            notes: 'Initial value'
          }
        });
      }

      return portfolio;
    },

    updateInvestmentValue: async (
      _parent: unknown,
      { portfolioId, value, date, notes }: {
        portfolioId: string;
        value: number;
        date: string;
        notes?: string;
      }
    ) => {
      // Create a new snapshot
      await prisma.investmentSnapshot.create({
        data: {
          portfolioId,
          value,
          date: new Date(date),
          notes
        }
      });

      // Update the current value on the portfolio
      const portfolio = await prisma.investmentPortfolio.update({
        where: { id: portfolioId },
        data: {
          currentValue: value,
          updatedAt: new Date()
        },
        include: {
          valueHistory: {
            orderBy: { date: 'desc' }
          }
        }
      });

      console.log(`📈 Updated ${portfolio.name} to $${value}`);

      return portfolio;
    },

    updateInvestmentPortfolio: async (
      _parent: unknown,
      { id, input }: { 
        id: string; 
        input: { name?: string; type?: string; institution?: string } 
      },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      // Verify portfolio belongs to user
      const existingPortfolio = await prisma.investmentPortfolio.findFirst({
        where: {
          id,
          userId: context.user.id
        }
      });

      if (!existingPortfolio) {
        throw new Error('Portfolio not found or access denied');
      }

      const data: any = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.type !== undefined) data.type = input.type;
      if (input.institution !== undefined) data.institution = input.institution;

      return prisma.investmentPortfolio.update({
        where: { id },
        data,
        include: {
          valueHistory: {
            orderBy: { date: 'desc' }
          }
        }
      });
    },

    deleteInvestmentPortfolio: async (
      _parent: unknown,
      { id }: { id: string },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      // Verify portfolio belongs to user
      const existingPortfolio = await prisma.investmentPortfolio.findFirst({
        where: {
          id,
          userId: context.user.id
        }
      });

      if (!existingPortfolio) {
        throw new Error('Portfolio not found or access denied');
      }

      await prisma.investmentPortfolio.delete({ where: { id } });
      return true;
    },

    createBudgetPeriod: async (
      _parent: unknown,
      { input }: { input: { startDate: string; endDate: string; copyFromPeriodId?: string } },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      const parseLocalDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      }

      const period = await prisma.budgetPeriod.create({
        data: {
          userId: context.user.id,
          startDate: parseLocalDate(input.startDate),
          endDate: parseLocalDate(input.endDate)
        },
        include: {
          lineItems: {
            include: { category: true }
          }
        }
      });

      if (input.copyFromPeriodId) {
        const sourcePeriod = await prisma.budgetPeriod.findFirst({
          where: {
            id: input.copyFromPeriodId,
            userId: context.user.id
          },
          include: {
            lineItems: true
          }
        });

        if (sourcePeriod) {
          await Promise.all(
            sourcePeriod.lineItems.map(item =>
              prisma.budgetLineItem.create({
                data: {
                  budgetPeriodId: period.id,
                  categoryId: item.categoryId,
                  description: item.description,
                  budgetAmount: item.budgetAmount,
                  // Don't copy actuals or overrides - start fresh
                }
              })
            )
          );
        }
      }

      // Refetch to get the copied line items
      const updatedPeriod = await prisma.budgetPeriod.findUnique({
        where: { id: period.id },
        include: {
          lineItems: {
            include: { category: true }
          }
        }
      });

      return {
        ...updatedPeriod!,
        startDate: updatedPeriod!.startDate.toISOString(),
        endDate: updatedPeriod!.endDate.toISOString(),
        createdAt: updatedPeriod!.createdAt.toISOString()
      };
    },

    updateBudgetPeriod: async (
      _parent: unknown,
      { id, input }: { 
        id: string; 
        input: { startDate?: string; endDate?: string; isPinned?: boolean } 
      },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      const period = await prisma.budgetPeriod.findFirst({
        where: { id, userId: context.user.id }
      });

      if (!period) {
        throw new Error('Budget period not found');
      }

      const parseLocalDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      };

      const data: any = {};
      if (input.startDate !== undefined) data.startDate = parseLocalDate(input.startDate);
      if (input.endDate !== undefined) data.endDate = parseLocalDate(input.endDate);
      if (input.isPinned !== undefined) data.isPinned = input.isPinned;

      const updated = await prisma.budgetPeriod.update({
        where: { id },
        data,
        include: {
          lineItems: {
            include: { category: true }
          }
        }
      });

      return {
        ...updated,
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate.toISOString(),
        createdAt: updated.createdAt.toISOString()
      };
    },

    deleteBudgetPeriod: async (
      _parent: unknown,
      { id }: { id: string },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      const period = await prisma.budgetPeriod.findFirst({
        where: { id, userId: context.user.id }
      });

      if (!period) {
        throw new Error('Budget period not found');
      }

      await prisma.budgetPeriod.delete({ where: { id } });
      return true;
    },

    togglePinBudgetPeriod: async (
      _parent: unknown,
      { id }: { id: string },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      const period = await prisma.budgetPeriod.findFirst({
        where: { id, userId: context.user.id }
      });

      if (!period) {
        throw new Error('Budget period not found');
      }

      const updated = await prisma.budgetPeriod.update({
        where: { id },
        data: { isPinned: !period.isPinned },
        include: {
          lineItems: {
            include: { category: true }
          }
        }
      });

      return {
        ...updated,
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate.toISOString(),
        createdAt: updated.createdAt.toISOString()
      };
    },

    createBudgetLineItem: async (
      _parent: unknown,
      { budgetPeriodId, input }: {
        budgetPeriodId: string;
        input: {
          categoryId?: string;
          description: string;
          budgetAmount: number;
          manualOverride?: number;
        }
      },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      // Verify the budget period belongs to the user
      const period = await prisma.budgetPeriod.findFirst({
        where: {
          id: budgetPeriodId,
          userId: context.user.id
        }
      });

      if (!period) {
        throw new Error('Budget period not found');
      }

      const lineItem = await prisma.budgetLineItem.create({
        data: {
          budgetPeriodId,
          categoryId: input.categoryId || null,
          description: input.description,
          budgetAmount: input.budgetAmount,
          manualOverride: input.manualOverride
        },
        include: {
          category: true
        }
      });

      return lineItem;
    },

    updateBudgetLineItem: async (
      _parent: unknown,
      { id, input }: {
        id: string;
        input: {
          description?: string;
          budgetAmount?: number;
          manualOverride?: number;
        }
      },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      // Verify ownership through budget period
      const lineItem = await prisma.budgetLineItem.findUnique({
        where: { id },
        include: {
          budgetPeriod: true
        }
      });

      if (!lineItem || lineItem.budgetPeriod.userId !== context.user.id) {
        throw new Error('Budget line item not found');
      }

      const updated = await prisma.budgetLineItem.update({
        where: { id },
        data: {
          ...(input.description !== undefined && { description: input.description }),
          ...(input.budgetAmount !== undefined && { budgetAmount: input.budgetAmount }),
          ...(input.manualOverride !== undefined && { manualOverride: input.manualOverride })
        },
        include: {
          category: true
        }
      });

      return updated;
    },

    deleteBudgetLineItem: async (
      _parent: unknown,
      { id }: { id: string },
      context: any
    ) => {
      if (!context.user?.id) {
        throw new Error('Not authenticated');
      }

      const lineItem = await prisma.budgetLineItem.findUnique({
        where: { id },
        include: {
          budgetPeriod: true
        }
      });

      if (!lineItem || lineItem.budgetPeriod.userId !== context.user.id) {
        throw new Error('Budget line item not found');
      }

      await prisma.budgetLineItem.delete({
        where: { id }
      });

      return true;
    },
  },

    Transaction: {
      date: (parent: any) => {
        // If it's already a Date object, convert to ISO string
        if (parent.date instanceof Date) {
          return parent.date.toISOString();
        }
        // If it's a timestamp number, convert to ISO string
        if (typeof parent.date === 'number') {
          return new Date(parent.date).toISOString();
        }
        // If it's already a string, return as-is
        return parent.date;
      }
    },

  BudgetPeriod: {
    // Computes totalBudgeted by summing all line item budget amounts
    totalBudgeted: async (parent: any) => {
      const lineItems = await prisma.budgetLineItem.findMany({
        where: { budgetPeriodId: parent.id }
      });
      return lineItems.reduce((sum, item) => sum + item.budgetAmount, 0);
    },

    // Computes totalActual by summing all line item actuals/overrides
    totalActual: async (parent: any, _args: unknown, context: any) => {
      const lineItems = await prisma.budgetLineItem.findMany({
        where: { budgetPeriodId: parent.id }
      });

      const period = await prisma.budgetPeriod.findUnique({
        where: { id: parent.id }
      });

      if (!period) return 0;

      const totals = await Promise.all(
        lineItems.map(async (item) => {
          // If user manually overrode, use that
          if (item.manualOverride !== null) {
            return item.manualOverride;
          }

          // Otherwise calculate from transactions
          const actualAmount = await calculateActualAmount(
            item.categoryId,
            period.startDate,
            period.endDate,
            period.userId
          );

          return actualAmount;
        })
      );

      return totals.reduce((sum, val) => sum + val, 0);
    },

    // Computes balance (budgeted - actual)
    totalBalance: async (parent: any, _args: unknown, context: any) => {
      // Calls the other field resolvers defined above
      const budgeted = await resolvers.BudgetPeriod.totalBudgeted(parent);
      const actual = await resolvers.BudgetPeriod.totalActual(parent, _args, context);
      return budgeted - actual;
    }
  },

  BudgetLineItem: {
    // Calculates actual spending from transactions for this line item
    actualAmount: async (parent: any) => {
      const period = await prisma.budgetPeriod.findUnique({
        where: { id: parent.budgetPeriodId }
      });

      if (!period) return 0;

      return calculateActualAmount(
        parent.categoryId,
        period.startDate,
        period.endDate,
        period.userId
      );
    },

    // Shows either manual override OR actual (whichever exists)
    displayAmount: async (parent: any) => {
      if (parent.manualOverride !== null) {
        return parent.manualOverride;
      }

      return resolvers.BudgetLineItem.actualAmount(parent);
    },

    // Calculates how over/under budget this line item is
    balance: async (parent: any) => {
      const display = await resolvers.BudgetLineItem.displayAmount(parent);
      return parent.budgetAmount - display;
    },

    isManuallyOverridden: (parent: any) => {
      return parent.manualOverride !== null;
    }
  }
};

