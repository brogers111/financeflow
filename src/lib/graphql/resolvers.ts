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

      // Calculate personal and business cash separately
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

      // Total cash is sum of both
      const totalCash = personalCash + businessCash;

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
        personalCash,
        businessCash,
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

      const transaction = await prisma.transaction.create({
        data: {
          accountId: input.accountId,
          date: new Date(input.date),
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
  }
};