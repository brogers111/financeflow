// @ts-expect-error - pdf-parse doesn't have proper TypeScript types
import pdf from 'pdf-parse';
import { ParsedTransaction } from './types';

/**
 * Parses Chase Business Savings Account statements
 * Format: Date | Description | Number | Amount | Balance
 */
export async function parseChaseBusinessSavings(buffer: Buffer): Promise<ParsedTransaction[]> {
  const data = await pdf(buffer);
  const text = data.text;
  
  const transactions: ParsedTransaction[] = [];
  
  // Extract TRANSACTION DETAIL section
  const detailMatch = text.match(/TRANSACTION DETAIL([\s\S]+?)(?:15 deposited items|IN CASE OF ERRORS|$)/i);
  if (!detailMatch) {
    throw new Error('Could not find TRANSACTION DETAIL section in business savings statement');
  }
  
  const detailSection = detailMatch[1];
  
  // Business savings format: "MM/DD DESCRIPTION NUMBER AMOUNT BALANCE"
  const transactionRegex = /(\d{2}\/\d{2})\s+(.+?)\s+(?:\d+\s+)?([-]?[\d,]+\.\d{2})\s+([-]?[\d,]+\.\d{2})/gm;
  
  // Extract year from statement period
  const yearMatch = text.match(/(\d{4}) through/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  
  let match;
  while ((match = transactionRegex.exec(detailSection)) !== null) {
    const [_, dateStr, description, amountStr, balanceStr] = match;
    
    // Skip headers and summary rows
    if (dateStr === 'DATE' || 
        description.includes('Beginning Balance') || 
        description.includes('Ending Balance')) {
      continue;
    }
    
    // Parse date (MM/DD)
    const [month, day] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    
    // Parse amount
    const rawAmount = parseFloat(amountStr.replace(/,/g, ''));
    const amount = Math.abs(rawAmount);
    
    // Clean description (remove trailing numbers)
    const cleanDescription = description.trim().replace(/\s+\d+$/, '');
    
    const type: 'INCOME' | 'EXPENSE' = rawAmount >= 0 ? 'INCOME' : 'EXPENSE';
    
    transactions.push({
      date,
      description: cleanDescription,
      amount,
      type
    });
  }
  
  return transactions;
}