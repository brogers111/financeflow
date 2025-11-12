export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  balance?: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
}