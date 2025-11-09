// @ts-expect-error - pdf-parse doesn't have proper TypeScript types
import pdf from 'pdf-parse';
import { ParsedTransaction } from './types';

/**
 * Parses Capital One 360 Performance Savings statements
 * Format: Date | Description | Category | Amount | Balance
 */
export async function parseCapitalOneSavings(buffer: Buffer): Promise<ParsedTransaction[]> {
  const data = await pdf(buffer);
  const text = data.text;
  
  const transactions: ParsedTransaction[] = [];
  
  // Capital One format is different - it uses text like "Oct 21" instead of "10/21"
  // Format: "MMM DD DESCRIPTION CATEGORY +/- $AMOUNT $BALANCE"
  const transactionRegex = /(\w{3} \d{1,2})\s+(.+?)\s+(Credit|Debit)\s+([\+\-])\s+\$?([\d,]+\.\d{2})\s+\$?([\d,]+\.\d{2})/gm;
  
  // Extract year from statement period
  const yearMatch = text.match(/(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  
  // Month name to number mapping
  const monthMap: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  let match;
  while ((match = transactionRegex.exec(text)) !== null) {
    const [_, dateStr, description, category, sign, amountStr, balanceStr] = match;
    
    // Skip opening/closing balance rows
    if (description.includes('Opening Balance') || 
        description.includes('Closing Balance')) {
      continue;
    }
    
    // Parse date ("Oct 21" format)
    const [monthName, dayStr] = dateStr.split(' ');
    const month = monthMap[monthName];
    const day = parseInt(dayStr);
    const date = new Date(year, month, day);
    
    // Parse amount
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    
    // Determine type based on category and sign
    const type: 'INCOME' | 'EXPENSE' = category === 'Credit' || sign === '+' ? 'INCOME' : 'EXPENSE';
    
    // Clean description
    const cleanDescription = description.trim();
    
    transactions.push({
      date,
      description: cleanDescription,
      amount,
      type
    });
  }
  
  return transactions;
}