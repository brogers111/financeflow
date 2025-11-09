import { ParsedTransaction } from './types';

/**
 * Parses Chase Personal Checking Account statements
 * Skips credit card payments to avoid double-counting with credit card statements
 * Format: Date | Description | Amount | Balance
 * Example: "05/30 Amsive LLC Payroll PPD ID: 6506940773 1,213.49 2,228.68"
 */
export async function parseChaseChecking(buffer: Buffer): Promise<ParsedTransaction[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParse = (await import('pdf-parse')) as any;
  const data = await pdfParse(buffer);
  const text = data.text;
  
  const transactions: ParsedTransaction[] = [];
  
  // Extract TRANSACTION DETAIL section only
  const detailMatch = text.match(/TRANSACTION DETAIL([\s\S]+?)(?:CHECKING SUMMARY|IN CASE OF ERRORS|$)/i);
  if (!detailMatch) {
    throw new Error('Could not find TRANSACTION DETAIL section in checking statement');
  }
  
  const detailSection = detailMatch[1];
  
  // Checking format: "MM/DD DESCRIPTION AMOUNT BALANCE"
  // Example: "05/30 Amsive LLC Payroll PPD ID: 6506940773 1,213.49 2,228.68"
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
    
    // CRITICAL: Skip credit card payments to avoid double-counting
    // Patterns to match:
    // - "Payment To Chase Card Ending IN 7192"
    // - "MM/DD Payment To Chase Card"
    // - Any payment to a credit card
    const upperDesc = description.toUpperCase();
    if (upperDesc.includes('PAYMENT TO CHASE CARD') ||
        upperDesc.includes('PAYMENT TO CREDIT CARD') ||
        upperDesc.includes('CHASE CARD ENDING')) {
      console.log(`Skipping credit card payment: ${description}`);
      continue;
    }
    
    // Parse date (MM/DD)
    const [month, day] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    
    // Parse amount
    const rawAmount = parseFloat(amountStr.replace(/,/g, ''));
    const amount = Math.abs(rawAmount);
    
    // For checking accounts:
    // - Negative amounts = withdrawals/payments (EXPENSE - money out)
    // - Positive amounts = deposits (INCOME - money in)
    const type: 'INCOME' | 'EXPENSE' = rawAmount < 0 ? 'EXPENSE' : 'INCOME';
    
    transactions.push({
      date,
      description: description.trim(),
      amount,
      type
    });
  }
  
  return transactions;
}