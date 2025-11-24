import { PrismaClient, AccountType, TransactionType, Category, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface AccountInput {
  name: string;
  type: AccountType;
  institution: string;
  balance?: number;
  currency?: string;
  isActive?: boolean;
  userId: string;
}

interface TransactionInput {
  accountId: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId?: string;
  notes?: string;
}

interface CategoryInput {
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
  parentId?: string;
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
    categories: async (_parent: unknown, { type }: { type?: TransactionType }) => {
      return prisma.category.findMany({
        where: type ? { type } : undefined,
        include: { 
          subcategories: true,
          parent: true 
        }
      });
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

      // Calculate total cash (checking, savings, cash accounts)
      const totalCash = accounts
        .filter(a => a.type === AccountType.CHECKING || a.type === AccountType.SAVINGS || a.type === AccountType.CASH)
        .reduce((sum, a) => sum + a.balance, 0);

      // Get investment portfolios
      const investmentPortfolios = await prisma.investmentPortfolio.findMany({
        where: { userId: context.user.id }
      });

      const investments = investmentPortfolios.reduce((sum, p) => sum + p.currentValue, 0);
      const netWorth = totalCash + investments;

      // Get current month and last month dates
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
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
      const monthBeforeIncomeTotal = monthBeforeIncome._sum.amount || 0;
      const monthBeforeExpensesTotal = Math.abs(monthBeforeExpenses._sum.amount || 0);

      const incomeChange = monthBeforeIncomeTotal > 0 
        ? ((lastMonthIncomeTotal - monthBeforeIncomeTotal) / monthBeforeIncomeTotal) * 100 
        : 0;
      
      const expensesChange = monthBeforeExpensesTotal > 0 
        ? ((lastMonthExpensesTotal - monthBeforeExpensesTotal) / monthBeforeExpensesTotal) * 100 
        : 0;

      // Get cash balance from one month ago for MoM change
      // This is approximate - we'd need historical snapshots for exact values
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const cashOneMonthAgo = totalCash; // TODO: Implement historical balance tracking
      const cashChange = 0; // TODO: Calculate when we have historical data

      // Investment MoM change - get from investment snapshots
      const investmentSnapshots = await prisma.investmentSnapshot.findMany({
        where: {
          portfolio: { userId: context.user.id },
          date: { gte: lastMonthStart }
        },
        orderBy: { date: 'desc' }
      });

      const investmentChange = 0; // TODO: Calculate from snapshots

      const netWorthChange = 0; // TODO: Calculate when we have historical data

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
        investments,
        netWorth,
        lastMonthIncome: lastMonthIncomeTotal,
        lastMonthExpenses: lastMonthExpensesTotal,
        incomeChange,
        expensesChange,
        cashChange,
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

    // Fetch paycheck flow
    paycheckFlow: async (_parent: unknown, { paycheckDate }: { paycheckDate: string }) => {
      const pcDate = new Date(paycheckDate);
      const nextPaycheck = new Date(pcDate);
      nextPaycheck.setDate(nextPaycheck.getDate() + 14);

      const paycheck = await prisma.paycheck.findFirst({
        where: { date: pcDate }
      });

      if (!paycheck) {
        throw new Error('Paycheck not found');
      }

      const transactions = await prisma.transaction.findMany({
        where: {
          type: TransactionType.EXPENSE,
          date: { gte: pcDate, lt: nextPaycheck }
        },
        orderBy: { date: 'asc' }
      });

      const dailySpending: { date: string; spent: number; balance: number }[] = [];
      let balance = paycheck.amount;

      for (let d = new Date(pcDate); d < nextPaycheck; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayTransactions = transactions.filter(
          t => t.date.toISOString().split('T')[0] === dateStr
        );
        
        const spent = dayTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        balance -= spent;

        dailySpending.push({
          date: dateStr,
          spent,
          balance
        });
      }

      return {
        paycheckAmount: paycheck.amount,
        paycheckDate: pcDate.toISOString(),
        daysInCycle: 14,
        dailySpending,
        remainingBalance: balance
      };
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
  },

  Mutation: {
    // Create account
    createAccount: async (_parent: unknown, { input }: { input: AccountInput }) => {
      return prisma.financialAccount.create({
        data: {
          name: input.name,
          type: input.type,
          institution: input.institution,
          balance: input.balance ?? 0,
          currency: input.currency ?? 'USD',
          isActive: input.isActive ?? true,
          user: {
            connect: { id: input.userId }
          }
        },
        include: { user: true }
      });
    },

    // Update account
    updateAccount: async (_parent: unknown, { id, input }: { id: string; input: Partial<AccountInput> }) => {
      const data: Prisma.FinancialAccountUpdateInput = {};
      
      if (input.name !== undefined) data.name = input.name;
      if (input.type !== undefined) data.type = input.type;
      if (input.institution !== undefined) data.institution = input.institution;
      if (input.balance !== undefined) data.balance = input.balance;
      if (input.currency !== undefined) data.currency = input.currency;
      if (input.isActive !== undefined) data.isActive = input.isActive;

      return prisma.financialAccount.update({
        where: { id },
        data,
        include: { user: true }
      });
    },

    // Delete account
    deleteAccount: async (_parent: unknown, { id }: { id: string }) => {
      await prisma.financialAccount.delete({ where: { id } });
      return true;
    },

    // Create transaction
    createTransaction: async (_parent: unknown, { input }: { input: TransactionInput }) => {
      const transaction = await prisma.transaction.create({
        data: {
          date: new Date(input.date),
          description: input.description,
          amount: input.amount,
          type: input.type,
          wasManual: true,
          source: 'Manual',
          notes: input.notes,
          account: {
            connect: { id: input.accountId }
          },
          category: input.categoryId ? {
            connect: { id: input.categoryId }
          } : undefined
        },
        include: { account: true, category: true }
      });

      // Update account balance
      await prisma.financialAccount.update({
        where: { id: input.accountId },
        data: {
          balance: {
            increment: input.amount
          }
        }
      });

      return transaction;
    },

    // Update transaction
    updateTransaction: async (_parent: unknown, { id, input }: { id: string; input: Partial<TransactionInput> }) => {
      const data: Prisma.TransactionUpdateInput = {};
      
      if (input.date !== undefined) data.date = new Date(input.date);
      if (input.description !== undefined) data.description = input.description;
      if (input.amount !== undefined) data.amount = input.amount;
      if (input.type !== undefined) data.type = input.type;
      if (input.notes !== undefined) data.notes = input.notes;
      if (input.categoryId !== undefined) {
        data.category = { connect: { id: input.categoryId } };
      }

      return prisma.transaction.update({
        where: { id },
        data,
        include: { account: true, category: true }
      });
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

    // Create category
    createCategory: async (_parent: unknown, { input }: { input: CategoryInput }) => {
      return prisma.category.create({
        data: {
          name: input.name,
          type: input.type,
          icon: input.icon,
          color: input.color,
          parent: input.parentId ? {
            connect: { id: input.parentId }
          } : undefined
        },
        include: {
          parent: true,
          subcategories: true
        }
      });
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

        let transactionsCreated = 0;

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

        console.log('📡 Parse API response status:', parseResponse.status);
        console.log('📡 Parse API response headers:', Object.fromEntries(parseResponse.headers.entries()));

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

        console.log(`✅ Parsed ${transactions.length} transactions from ${statementType}`);
        console.log(`✅ Ending balance from statement: ${endingBalance}`);

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

            transactionsCreated++;
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
          transactionsCreated,
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
  }
};