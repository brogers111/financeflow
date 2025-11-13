import { gql } from '@apollo/client';

// Queries
export const GET_ACCOUNTS = gql`
  query GetAccounts {
    accounts {
      id
      name
      type
      institution
      balance
      isActive
    }
  }
`;

export const GET_ACCOUNT = gql`
  query GetAccount($id: ID!) {
    account(id: $id) {
      id
      name
      type
      institution
      balance
      isActive
      transactions {
        id
        date
        description
        amount
        type
      }
      balanceHistory {
        id
        date
        balance
      }
    }
  }
`;

export const GET_TRANSACTIONS = gql`
  query GetTransactions(
    $accountId: ID
    $categoryId: ID
    $type: String
    $startDate: String
    $endDate: String
  ) {
    transactions(
      accountId: $accountId
      categoryId: $categoryId
      type: $type
      startDate: $startDate
      endDate: $endDate
    ) {
      id
      date
      description
      amount
      type
      category {
        id
        name
        color
      }
      account {
        id
        name
      }
    }
  }
`;

export const GET_CATEGORIES = gql`
  query GetCategories($type: String) {
    categories(type: $type) {
      id
      name
      type
      color
      icon
      subcategories {
        id
        name
        color
      }
    }
  }
`;

export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats {
    dashboardStats {
      totalCash
      investments
      netWorth
      avgMonthlySpend
      avgYearlySpend
    }
  }
`;

export const GET_MONTHLY_STATS = gql`
  query GetMonthlyStats($year: Int!, $month: Int!) {
    monthlyStats(year: $year, month: $month) {
      month
      income
      expenses
      netChange
      byCategory {
        category {
          id
          name
          color
        }
        total
        percentage
      }
    }
  }
`;

export const GET_NET_WORTH_HISTORY = gql`
  query GetNetWorthHistory($startDate: String!, $endDate: String!) {
    netWorthHistory(startDate: $startDate, endDate: $endDate) {
      date
      totalCash
      investments
      netWorth
    }
  }
`;

export const GET_PAYCHECK_FLOW = gql`
  query GetPaycheckFlow($paycheckDate: String!) {
    paycheckFlow(paycheckDate: $paycheckDate) {
      paycheckAmount
      paycheckDate
      daysInCycle
      remainingBalance
      dailySpending {
        date
        spent
        balance
      }
    }
  }
`;

// MUTATIONS
export const CREATE_ACCOUNT = gql`
  mutation CreateAccount($input: AccountInput!) {
    createAccount(input: $input) {
      id
      name
      type
      institution
      balance
    }
  }
`;

export const UPDATE_ACCOUNT = gql`
  mutation UpdateAccount($id: ID!, $input: AccountInput!) {
    updateAccount(id: $id, input: $input) {
      id
      name
      type
      institution
      balance
    }
  }
`;

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($id: ID!) {
    deleteAccount(id: $id)
  }
`;

export const CREATE_TRANSACTION = gql`
  mutation CreateTransaction($input: TransactionInput!) {
    createTransaction(input: $input) {
      id
      date
      description
      amount
      type
      category {
        id
        name
      }
    }
  }
`;

export const UPDATE_TRANSACTION = gql`
  mutation UpdateTransaction($id: ID!, $input: TransactionInput!) {
    updateTransaction(id: $id, input: $input) {
      id
      date
      description
      amount
      type
    }
  }
`;

export const DELETE_TRANSACTION = gql`
  mutation DeleteTransaction($id: ID!) {
    deleteTransaction(id: $id)
  }
`;

export const CATEGORIZE_TRANSACTION = gql`
  mutation CategorizeTransaction($id: ID!, $categoryId: ID!) {
    categorizeTransaction(id: $id, categoryId: $categoryId) {
      id
      description
      category {
        id
        name
        color
      }
    }
  }
`;

export const CATEGORIZE_WITH_AI = gql`
  mutation CategorizeTransactionsWithAI($transactionIds: [ID!]!) {
    categorizeTransactionsWithAI(transactionIds: $transactionIds) {
      success
      categorized
      total
    }
  }
`;

export const CREATE_CATEGORY = gql`
  mutation CreateCategory($input: CategoryInput!) {
    createCategory(input: $input) {
      id
      name
      type
      color
      icon
    }
  }
`;

export const RECORD_PAYCHECK = gql`
  mutation RecordPaycheck($input: PaycheckInput!) {
    recordPaycheck(input: $input) {
      id
      date
      amount
      accountId
    }
  }
`;

export const UPLOAD_STATEMENT = gql`
  mutation UploadStatement($fileContent: String!, $accountId: ID!, $statementType: StatementType!) {
    uploadStatement(fileContent: $fileContent, accountId: $accountId, statementType: $statementType) {
      success
      transactionsCreated
      needsCategorization {
        id
        description
        amount
        date
      }
    }
  }
`;