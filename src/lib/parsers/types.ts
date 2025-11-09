export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
}

export type StatementType = 
  | 'CHASE_CREDIT' 
  | 'CHASE_CHECKING' 
  | 'CHASE_PERSONAL_SAVINGS'
  | 'CHASE_BUSINESS_SAVINGS'
  | 'CAPITAL_ONE_SAVINGS';