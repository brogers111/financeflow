import { gql } from '@apollo/client';

export const typeDefs = gql`
  type Account {
    id: ID!
    name: String!
    type: AccountType!
    institution: String!
    balance: Float!
    currency: String!
    isActive: Boolean!
    transactions: [Transaction!]!
    balanceHistory: [BalanceSnapshot!]!
  }

  enum AccountType {
    CHECKING
    SAVINGS
    CREDIT_CARD
    INVESTMENT
    CASH
  }

  type Transaction {
    id: ID!
    account: Account!
    date: String!
    description: String!
    amount: Float!
    type: TransactionType!
    category: Category
    wasManual: Boolean!
    confidence: Float
    source: String
    notes: String
  }

  enum TransactionType {
    INCOME
    EXPENSE
    TRANSFER
  }

  # NEW: Statement type enum for upload
  enum StatementType {
    CHASE_CREDIT
    CHASE_CHECKING
    CHASE_PERSONAL_SAVINGS
    CHASE_BUSINESS_SAVINGS
    CAPITAL_ONE_SAVINGS
  }

  type Category {
    id: ID!
    name: String!
    type: TransactionType!
    icon: String
    color: String
    subcategories: [Category!]!
    transactions: [Transaction!]!
  }

  type BalanceSnapshot {
    id: ID!
    account: Account!
    balance: Float!
    date: String!
  }

  type Paycheck {
    id: ID!
    amount: Float!
    date: String!
    accountId: String!
  }

  type SpendingByCategory {
    category: Category!
    total: Float!
    percentage: Float!
  }

  type MonthlyStats {
    month: String!
    income: Float!
    expenses: Float!
    netChange: Float!
    byCategory: [SpendingByCategory!]!
  }

  type NetWorthData {
    date: String!
    totalCash: Float!
    investments: Float!
    netWorth: Float!
  }

  type DashboardScorecard {
    totalCash: Float!
    investments: Float!
    netWorth: Float!
    avgMonthlySpend: Float!
    avgYearlySpend: Float!
  }

  type Query {
    # Accounts
    accounts: [Account!]!
    account(id: ID!): Account

    # Transactions
    transactions(
      accountId: ID
      startDate: String
      endDate: String
      categoryId: ID
      type: TransactionType
    ): [Transaction!]!
    
    transaction(id: ID!): Transaction

    # Categories
    categories(type: TransactionType): [Category!]!

    # Analytics
    monthlyStats(year: Int!, month: Int!): MonthlyStats!
    netWorthHistory(startDate: String!, endDate: String!): [NetWorthData!]!
    dashboardStats: DashboardScorecard!
    
    # Paycheck depletion
    paycheckFlow(paycheckDate: String!): PaycheckFlowData!
  }

  type PaycheckFlowData {
    paycheckAmount: Float!
    paycheckDate: String!
    daysInCycle: Int!
    dailySpending: [DailySpend!]!
    remainingBalance: Float!
  }

  type DailySpend {
    date: String!
    spent: Float!
    balance: Float!
  }

  type Mutation {
    # Account management
    createAccount(input: CreateAccountInput!): Account!
    updateAccount(id: ID!, input: UpdateAccountInput!): Account!
    deleteAccount(id: ID!): Boolean!

    # Transaction management
    createTransaction(input: CreateTransactionInput!): Transaction!
    updateTransaction(id: ID!, input: UpdateTransactionInput!): Transaction!
    deleteTransaction(id: ID!): Boolean!
    
    # Categorization
    categorizeTransaction(id: ID!, categoryId: ID!): Transaction!

    categorizeTransactionsWithAI(transactionIds: [ID!]!): CategorizationResult!
    
    # Bulk operations
    uploadStatement(
      fileContent: String!
      accountId: ID!
      statementType: StatementType!
    ): UploadResult!
    
    # Category management
    createCategory(input: CreateCategoryInput!): Category!
    
    # Paycheck tracking
    recordPaycheck(input: PaycheckInput!): Paycheck!
  }

  input CreateAccountInput {
    name: String!
    type: AccountType!
    institution: String!
    balance: Float!
    userId: ID!
  }

  input UpdateAccountInput {
    name: String
    balance: Float
    isActive: Boolean
  }

  input CreateTransactionInput {
    accountId: ID!
    date: String!
    description: String!
    amount: Float!
    type: TransactionType!
    categoryId: ID
    notes: String
  }

  input UpdateTransactionInput {
    description: String
    amount: Float
    categoryId: ID
    notes: String
  }

  input CreateCategoryInput {
    name: String!
    type: TransactionType!
    icon: String
    color: String
    parentId: ID
  }

  input PaycheckInput {
    amount: Float!
    date: String!
    accountId: ID!
  }

  type UploadResult {
    success: Boolean!
    transactionsCreated: Int!
    needsCategorization: [Transaction!]!
  }

  type CategorizationResult {
    success: Boolean!
    categorized: Int!
    total: Int!
  }
`;