import { gql } from '@apollo/client';

export const typeDefs = gql`
  enum AccountCategory {
    PERSONAL
    BUSINESS
  }

  type Account {
    id: ID!
    name: String!
    type: AccountType!
    accountType: AccountCategory!
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
    totalSavings: Float!
    personalCash: Float!
    businessCash: Float!
    investments: Float!
    netWorth: Float!
    lastMonthChange: Float!
    lastMonthIncome: Float!
    lastMonthExpenses: Float!
    incomeChange: Float!
    expensesChange: Float!
    cashChange: Float!
    savingsChange: Float!
    investmentChange: Float!
    netWorthChange: Float!
    avgMonthlySpend: Float!
    avgYearlySpend: Float!
  }

  type InvestmentPortfolio {
    id: ID!
    name: String!
    type: String!
    institution: String!
    currentValue: Float!
    valueHistory: [InvestmentSnapshot!]!
    createdAt: String!
    updatedAt: String!
  }

  type InvestmentSnapshot {
    id: ID!
    portfolioId: String!
    value: Float!
    date: String!
    notes: String
    createdAt: String!
  }

  type BudgetPeriod {
    id: ID!
    userId: String!
    startDate: String!
    endDate: String!
    isPinned: Boolean!
    lineItems: [BudgetLineItem!]!
    totalBudgeted: Float!      # Computed: sum of all budgetAmounts
    totalActual: Float!         # Computed: sum of all actual/override amounts
    totalBalance: Float!        # Computed: totalBudgeted - totalActual
    createdAt: String!
  }

  type BudgetLineItem {
    id: ID!
    budgetPeriodId: String!
    category: Category
    description: String!
    budgetAmount: Float!
    actualAmount: Float         # Auto-calculated
    manualOverride: Float       # User override
    displayAmount: Float!       # Computed: manualOverride ?? actualAmount
    balance: Float!             # Computed: budgetAmount - displayAmount
    isManuallyOverridden: Boolean! # Computed: manualOverride != null
  }

  type BudgetOverlapWarning {
    hasOverlap: Boolean!
    overlappingPeriods: [BudgetPeriod!]!
  }

  input CreateBudgetPeriodInput {
    startDate: String!
    endDate: String!
    copyFromPeriodId: ID  # Optional: copy line items from another period
  }

  input CreateBudgetLineItemInput {
    categoryId: ID
    description: String!
    budgetAmount: Float!
    manualOverride: Float
  }

  input UpdateBudgetLineItemInput {
    description: String
    budgetAmount: Float
    manualOverride: Float
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

    investmentPortfolios: [InvestmentPortfolio!]!
    investmentPortfolio(id: ID!): InvestmentPortfolio

    budgetPeriods(pinned: Boolean): [BudgetPeriod!]!
    budgetPeriod(id: ID!): BudgetPeriod
    suggestBudgetAmounts(startDate: String!, endDate: String!): [SuggestedBudgetAmount!]!
  }

  type SuggestedBudgetAmount {
    categoryId: ID
    categoryName: String!
    suggestedAmount: Float!
    basedOnPeriods: [String!]!
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
    
    # Bulk operations
    uploadStatement(
      fileContent: String!
      accountId: ID!
      statementType: StatementType!
    ): UploadResult!
    
    # Category management
    createCategory(input: CreateCategoryInput!): Category!
    updateCategory(id: ID!, input: UpdateCategoryInput!): Category!
    deleteCategory(id: ID!): Boolean!
    
    # Paycheck tracking
    recordPaycheck(input: PaycheckInput!): Paycheck!

    # Investment portfolio management
    createInvestmentPortfolio(
      name: String!
      type: String!
      institution: String!
      currentValue: Float
    ): InvestmentPortfolio!

    updateInvestmentPortfolio(id: ID!, input: updateInvestmentPortfolioInput!): InvestmentPortfolio!
    deleteInvestmentPortfolio(id: ID!): Boolean!

    updateInvestmentValue(
      portfolioId: ID!
      value: Float!
      date: String!
      notes: String
    ): InvestmentPortfolio!

    createBudgetPeriod(input: CreateBudgetPeriodInput!): BudgetPeriod!
    updateBudgetPeriod(id: ID!, input: UpdateBudgetPeriodInput!): BudgetPeriod!
    deleteBudgetPeriod(id: ID!): Boolean!
    togglePinBudgetPeriod(id: ID!): BudgetPeriod!
    
    createBudgetLineItem(budgetPeriodId: ID!, input: CreateBudgetLineItemInput!): BudgetLineItem!
    updateBudgetLineItem(id: ID!, input: UpdateBudgetLineItemInput!): BudgetLineItem!
    deleteBudgetLineItem(id: ID!): Boolean!
    
    # Helper mutation to check for overlaps before creating
    checkBudgetOverlap(startDate: String!, endDate: String!): BudgetOverlapWarning!
  }

  input CreateAccountInput {
    name: String!
    type: AccountType!
    accountType: AccountCategory
    institution: String!
    balance: Float!
  }

  input UpdateAccountInput {
    name: String
    type: AccountType
    accountType: AccountCategory
    institution: String
    balance: Float
    isActive: Boolean
  }

  input UpdateBudgetPeriodInput {
    startDate: String
    endDate: String
    isPinned: Boolean
  }

  input CreateTransactionInput {
    accountId: ID!
    date: String!
    description: String!
    amount: Float!
    type: TransactionType!
    categoryId: ID
    notes: String
    wasManual: Boolean
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

  input UpdateCategoryInput {
    name: String
    icon: String
    color: String
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

  input updateInvestmentPortfolioInput{
    name: String
    type: String
    institution: String
  }
`;