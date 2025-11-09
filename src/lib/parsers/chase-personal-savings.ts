import { ParsedTransaction } from './types';

/**
 * Parses Chase Personal Savings Account statements
 * Works for: Operational Savings, Emergency Savings, or any Chase Savings
 * Format: Date | Description | Amount | Balance
*/
export async function parseChasePersonalSavings(buffer: Buffer): Promise<ParsedTransaction[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParse = (await import('pdf-parse')) as any;
  const data = await pdfParse(buffer);
  const text = data.text;
  
  const transactions: ParsedTransaction[] = [];
  
  // Extract TRANSACTION DETAIL section
  const detailMatch = text.match(/TRANSACTION DETAIL([\s\S]+?)(?:A monthly Service Fee|IN CASE OF ERRORS|$)/i);
  if (!detailMatch) {
    throw new Error('Could not find TRANSACTION DETAIL section in personal savings statement');
  }
  
  const detailSection = detailMatch[1];
  
  // Personal savings format: "MM/DD DESCRIPTION AMOUNT BALANCE"
  const transactionRegex = /(\d{2}\/\d{2})\s+(.+?)\s+([-]?[\d,]+\.\d{2})\s+([-]?[\d,]+\.\d{2})/gm;
  
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
    
    // Clean description (remove transaction IDs and extra numbers)
    const cleanDescription = description.trim().replace(/Transaction#:\s*\d+/g, '');
    
    // For savings accounts:
    // - Positive amounts = deposits/interest (INCOME)
    // - Negative amounts = withdrawals (EXPENSE)
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