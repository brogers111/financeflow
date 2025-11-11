import { PrismaClient, AccountType, TransactionType, Category, Prisma } from '@prisma/client';
import { Ollama } from 'ollama';
const ollama = new Ollama({ host: 'http://localhost:11434' });

const prisma = new PrismaClient();

async function parseStatementWithOllama(
  buffer: Buffer,
  statementType: string
): Promise<Array<{ date: Date | string; description: string; amount: number; type?: string }>> {
// @ts-expect-error: no types for pdf-parse 1.1.1
  const pdfParse = await import('pdf-parse');
  const pdf = pdfParse.default || pdfParse;
  const data = await pdf(buffer);
  const text = data.text || '';

  // Build prompt for Ollama - include statementType so the model knows which format to expect.
  const prompt = `Parse this ${statementType} bank statement. Return JSON array of transactions.
Format: [{"date":"YYYY-MM-DD","description":"text","amount":number,"type":"INCOME"|"EXPENSE"(optional)}]

${text}`;

  // Call Ollama
  const response = await ollama.generate({
    model: 'phi3',
    prompt: prompt,
    format: 'json',
    options: { temperature: 0.1 }
  });

  // Ollama returns a string in response.response — parse it
  const parsed = JSON.parse(response.response);

  // Map to a safe shape — allow 'date' to be returned as string or Date
  return parsed.map((t: any) => ({
    date: t.date,
    description: t.description,
    amount: typeof t.amount === 'number' ? t.amount : Number(t.amount),
    type: t.type // optional
  }));
}

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
      return prisma.account.findMany({
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
      return prisma.account.findUnique({
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
    dashboardStats: async () => {
      const accounts = await prisma.account.findMany({
        where: { isActive: true }
      });

      const totalCash = accounts
        .filter(a => a.type === AccountType.CHECKING || a.type === AccountType.SAVINGS || a.type === AccountType.CASH)
        .reduce((sum, a) => sum + a.balance, 0);

      const investments = accounts
        .filter(a => a.type === AccountType.INVESTMENT)
        .reduce((sum, a) => sum + a.balance, 0);

      const netWorth = totalCash + investments;

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const expenses = await prisma.transaction.aggregate({
        where: {
          type: TransactionType.EXPENSE,
          date: { gte: oneYearAgo }
        },
        _sum: { amount: true }
      });

      const totalExpenses = Math.abs(expenses._sum.amount || 0);
      const avgMonthlySpend = totalExpenses / 12;
      const avgYearlySpend = totalExpenses;

      return {
        totalCash,
        investments,
        netWorth,
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
    }
  },

  Mutation: {
    // Create account
    createAccount: async (_parent: unknown, { input }: { input: AccountInput }) => {
      return prisma.account.create({
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
      const data: Prisma.AccountUpdateInput = {};
      
      if (input.name !== undefined) data.name = input.name;
      if (input.type !== undefined) data.type = input.type;
      if (input.institution !== undefined) data.institution = input.institution;
      if (input.balance !== undefined) data.balance = input.balance;
      if (input.currency !== undefined) data.currency = input.currency;
      if (input.isActive !== undefined) data.isActive = input.isActive;

      return prisma.account.update({
        where: { id },
        data,
        include: { user: true }
      });
    },

    // Delete account
    deleteAccount: async (_parent: unknown, { id }: { id: string }) => {
      await prisma.account.delete({ where: { id } });
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
      await prisma.account.update({
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
        await prisma.account.update({
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
    categorizeTransaction: async (_parent: unknown, { id, categoryId }: { id: string; categoryId: string }) => {
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
        await prisma.categorizationPattern.upsert({
          where: { descriptionPattern: transaction.description.toUpperCase() },
          update: {
            timesUsed: { increment: 1 },
            lastUsed: new Date()
          },
          create: {
            descriptionPattern: transaction.description.toUpperCase(),
            categoryId,
            confidence: 1.0,
            timesUsed: 1
          }
        });
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
      await prisma.account.update({
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
      }
    ) => {
      try {
        // Get existing categorization patterns
        const patterns = await prisma.categorizationPattern.findMany({
          orderBy: { confidence: 'desc' }
        });

        const needsCategorization: Array<{
          id: string;
          description: string;
          amount: number;
          date: Date;
        }> = [];

        let transactionsCreated = 0;

        // Convert base64 PDF to buffer
        const buffer = Buffer.from(fileContent, 'base64');

        // Parse transactions using Ollama + pdf-parse
        const transactions = await parseStatementWithOllama(buffer, statementType);

        console.log(`✅ Parsed ${transactions.length} transactions via Ollama`);

        // Process each transaction
        for (const txn of transactions) {
          // Check if we have a learned pattern for this description
          const matchingPattern = patterns.find(p => 
            txn.description.toUpperCase().includes(p.descriptionPattern)
          );

          // Determine the correct amount and type for Prisma
          // Our parsers return positive amounts with a type field
          // Prisma expects: negative for expenses, positive for income
          const prismaAmount = txn.type === 'EXPENSE' ? -txn.amount : txn.amount;
          const prismaType = txn.type === 'EXPENSE' ? TransactionType.EXPENSE : TransactionType.INCOME;

          if (matchingPattern && matchingPattern.confidence > 0.7) {
            // Auto-categorize based on learned pattern
            await prisma.transaction.create({
              data: {
                date: txn.date,
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

            // Update pattern usage
            await prisma.categorizationPattern.update({
              where: { id: matchingPattern.id },
              data: {
                timesUsed: { increment: 1 },
                lastUsed: new Date()
              }
            });

            transactionsCreated++;
          } else {
            // Create uncategorized transaction
            const uncategorized = await prisma.transaction.create({
              data: {
                date: txn.date,
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

        // Update account balance
        const totalChange = transactions.reduce((sum, t) => {
          return sum + (t.type === 'EXPENSE' ? -t.amount : t.amount);
        }, 0);
        
        await prisma.account.update({
          where: { id: accountId },
          data: {
            balance: { increment: totalChange }
          }
        });

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

      } catch (error) {
        console.error('Statement upload error:', error);
        throw new Error(`Failed to process statement: ${error}`);
      }
    }
  }
};