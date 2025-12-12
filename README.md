# FinanceFlow

A modern, privacy-focused personal finance application that automatically parses bank statements, categorizes transactions with intelligent pattern learning, and provides powerful visualizations to track spending, savings, and net worth over time.

## Project Overview

FinanceFlow is a full-stack web application designed for personal financial management with a focus on:

- **Privacy-first architecture** - Bank statement parsing happens locally
- **Smart pattern learning** - Remembers your category selections for future transactions
- **Comprehensive tracking** - Monitor cash, savings, investments, and net worth
- **Budget management** - Create flexible budgets with real-time tracking
- **Mobile-optimized** - Responsive design with PWA support for mobile devices

## Key Features

### PDF Statement Parsing

- **Multi-bank support**: Chase and Capital One (expandable to other institutions)
- **Automatic extraction**: Pulls date, merchant name, and amount from statements
- **Local processing**: PDFs never leave your machine during parsing
- **Pattern learning**: Remembers your category selections and auto-applies them to matching transactions

### Dashboard & Visualizations

- **Scorecards**: Real-time view of total cash, savings, investments, and net worth
- **Monthly Balance Flow**: Track how your checking account balance changes day-by-day with income/expense tooltips
- **Net Worth History**: Stacked area chart showing growth across personal cash, personal savings, business savings, and investments over time
- **Expense Breakdown**: Interactive pie chart of spending by category with percentage/dollar toggle and month/year view
- **Account & Category Filters**: Exclude specific accounts or categories from balance flow visualization
- **Month/Year filtering**: View last complete month or current year spending patterns

### Account Management

- **Multiple account types**: Checking, Savings, Credit Cards, Investments, Cash, Business accounts
- **Balance snapshots**: Historical tracking of account balances over time with forward-fill logic
- **Investment tracking**: Monitor portfolio values with historical snapshots
- **Account categorization**: Separate personal and business finances

### Budget System

- **Flexible periods**: Create budgets for any date range (weekly, monthly, annual, etc.)
- **Overlap detection**: Warns when creating overlapping budget periods (allows override)
- **Real-time actuals**: Automatically calculates spending from transactions by category
- **Manual overrides**: Adjust actual amounts when needed (marked with orange border)
- **Category-level budgeting**: Budget by expense category with visual tracking
- **Inline editing**: Click to edit descriptions, budget amounts, and actual overrides
- **Three key graphs**:
  - **Budget vs Actual**: Grouped bar chart by category showing budgeted vs actual spending
  - **Over/Under Budget**: Horizontal bar chart showing which categories are over/under budget
  - **Spend Distribution**: Pie chart showing breakdown of actual spending by line item

### Category Learning System

- **Pattern matching**: Stores transaction descriptions and their assigned categories
- **Auto-categorization**: Automatically applies learned categories to matching transactions
- **Manual correction**: Easy dropdown to override and update learned patterns
- **Confidence tracking**: System improves accuracy over time based on your corrections

### Mobile Experience

- **Responsive design**: Optimized layouts for mobile and desktop
- **PWA support**: Install as native app on iOS/Android
- **Touch-optimized**: Mobile-friendly interactions and navigation

## Technology Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **State Management**: React Hooks + Apollo Client cache

### Backend

- **API Layer**: GraphQL with Apollo Server
- **Runtime**: Node.js (Next.js API routes)
- **Database ORM**: Prisma
- **Database**: PostgreSQL (Neon)
- **Authentication**: NextAuth.js (Google OAuth)

### Tools

- **PDF Parsing**: pdf-parse with custom regex patterns
- **Date Handling**: Native JavaScript Date objects
- **Type Safety**: TypeScript strict mode throughout

### Deployment & Infrastructure

- **Frontend Hosting**: Vercel
- **Database**: Neon (Serverless PostgreSQL)
- **Package Manager**: npm
- **Code Quality**: ESLint + TypeScript strict mode
- **Version Control**: Git

## Future Enhancements

### Planned Features

- [ ] **Recurring transaction detection**: Identify subscriptions automatically
- [ ] **Bill reminders**: Notifications for upcoming payments
- [ ] **Goal tracking**: Save toward specific financial goals with visual progress
- [ ] **Export functionality**: Download data as CSV/Excel
- [ ] **Insights dashboard**: Pattern-based spending insights
- [ ] **Shared budgets**: Family/partner budget collaboration
- [ ] **Transaction search**: Full-text search across transaction descriptions
- [ ] **Additional bank parsers**: Support for Bank of America, Wells Fargo, and other institutions
- [ ] **Bulk transaction editing**: Select and categorize multiple transactions at once

---

**Built for better financial awareness and full-stack learning**
