import { gql } from '@apollo/client';

// QUERIES
export const GET_BUDGET_PERIODS = gql`
  query GetBudgetPeriods($pinned: Boolean) {
    budgetPeriods(pinned: $pinned) {
      id
      startDate
      endDate
      isPinned
      totalBudgeted
      totalActual
      totalBalance
      createdAt
      lineItems {
        id
        description
        budgetAmount
        displayAmount
        balance
        isManuallyOverridden
        category {
          id
          name
          icon
          color
          type
        }
      }
    }
  }
`;

export const GET_BUDGET_PERIOD = gql`
  query GetBudgetPeriod($id: ID!) {
    budgetPeriod(id: $id) {
      id
      startDate
      endDate
      isPinned
      totalBudgeted
      totalActual
      totalBalance
      createdAt
      lineItems {
        id
        description
        budgetAmount
        actualAmount
        manualOverride
        displayAmount
        balance
        isManuallyOverridden
        category {
          id
          name
          icon
          color
          type
        }
      }
    }
  }
`;

export const CHECK_BUDGET_OVERLAP = gql`
  query CheckBudgetOverlap($startDate: String!, $endDate: String!) {
    checkBudgetOverlap(startDate: $startDate, endDate: $endDate) {
      hasOverlap
      overlappingPeriods {
        id
        startDate
        endDate
        totalBudgeted
      }
    }
  }
`;

export const SUGGEST_BUDGET_AMOUNTS = gql`
  query SuggestBudgetAmounts($startDate: String!, $endDate: String!) {
    suggestBudgetAmounts(startDate: $startDate, endDate: $endDate) {
      categoryId
      categoryName
      suggestedAmount
      basedOnPeriods
    }
  }
`;

// MUTATIONS
export const CREATE_BUDGET_PERIOD = gql`
  mutation CreateBudgetPeriod($input: CreateBudgetPeriodInput!) {
    createBudgetPeriod(input: $input) {
      id
      startDate
      endDate
      isPinned
      totalBudgeted
      totalActual
      totalBalance
      lineItems {
        id
        description
        budgetAmount
        category {
          id
          name
          icon
          color
        }
      }
    }
  }
`;

export const UPDATE_BUDGET_PERIOD = gql`
  mutation UpdateBudgetPeriod($id: ID!, $input: UpdateBudgetPeriodInput!) {
    updateBudgetPeriod(id: $id, input: $input) {
      id
      startDate
      endDate
      isPinned
    }
  }
`;

export const DELETE_BUDGET_PERIOD = gql`
  mutation DeleteBudgetPeriod($id: ID!) {
    deleteBudgetPeriod(id: $id)
  }
`;

export const TOGGLE_PIN_BUDGET = gql`
  mutation TogglePinBudgetPeriod($id: ID!) {
    togglePinBudgetPeriod(id: $id) {
      id
      isPinned
    }
  }
`;

export const CREATE_BUDGET_LINE_ITEM = gql`
  mutation CreateBudgetLineItem($budgetPeriodId: ID!, $input: CreateBudgetLineItemInput!) {
    createBudgetLineItem(budgetPeriodId: $budgetPeriodId, input: $input) {
      id
      description
      budgetAmount
      displayAmount
      balance
      category {
        id
        name
        icon
        color
      }
    }
  }
`;

export const UPDATE_BUDGET_LINE_ITEM = gql`
  mutation UpdateBudgetLineItem($id: ID!, $input: UpdateBudgetLineItemInput!) {
    updateBudgetLineItem(id: $id, input: $input) {
      id
      description
      budgetAmount
      manualOverride
      displayAmount
      balance
      isManuallyOverridden
    }
  }
`;

export const DELETE_BUDGET_LINE_ITEM = gql`
  mutation DeleteBudgetLineItem($id: ID!) {
    deleteBudgetLineItem(id: $id)
  }
`;