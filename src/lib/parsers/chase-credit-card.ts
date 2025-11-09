// @ts-expect-error - pdf-parse doesn't have proper TypeScript types
import pdf from 'pdf-parse';
import { ParsedTransaction } from './types';

/**
 * Parses Chase Personal Credit Card statements
 * Format: Date | Merchant + Location | Amount
 */
export async function parseChaseCreditCard(buffer: Buffer): Promise<ParsedTransaction[]> {
  const data = await pdf(buffer);
  const text = data.text;
  
  const transactions: ParsedTransaction[] = [];
  
  // Extract ACCOUNT ACTIVITY section
  const activityMatch = text.match(/ACCOUNT ACTIVITY([\s\S]+?)(?:2025 Totals Year-to-Date|INTEREST CHARGES|$)/i);
  if (!activityMatch) {
    throw new Error('Could not find ACCOUNT ACTIVITY section in credit card statement');
  }
  
  const activitySection = activityMatch[1];
  
  // Split into subsections
  const purchaseMatch = activitySection.match(/PURCHASE([\s\S]+?)(?:FEES CHARGED|2025 Totals|$)/i);
  const feesMatch = activitySection.match(/FEES CHARGED([\s\S]+?)(?:2025 Totals|$)/i);
  
  // Extract year from "Statement Date: MM/DD/YY"
  const yearMatch = text.match(/Statement Date:\s*\d{2}\/\d{2}\/(\d{2})/);
  const year = yearMatch ? 2000 + parseInt(yearMatch[1]) : new Date().getFullYear();
  
  // Transaction format: "MM/DD DESCRIPTION AMOUNT"
  const transactionRegex = /(\d{2}\/\d{2})\s+(.+?)\s+([\d,]+\.\d{2})$/gm;
  
  // Parse PURCHASE section
  if (purchaseMatch) {
    const purchaseSection = purchaseMatch[1];
    
    let match;
    while ((match = transactionRegex.exec(purchaseSection)) !== null) {
      const [_, dateStr, description, amountStr] = match;
      
      // Skip if this line is a section header
      if (description.toUpperCase() === 'PURCHASE' ||
          description.toUpperCase().includes('FEES CHARGED')) {
        continue;
      }
      
      // Parse date (MM/DD)
      const [month, day] = dateStr.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      
      // Parse amount
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      
      transactions.push({
        date,
        description: description.trim(),
        amount,
        type: 'EXPENSE'
      });
    }
  }
  
  // Parse FEES CHARGED section
  if (feesMatch) {
    const feesSection = feesMatch[1];
    
    let match;
    // Reset regex before reusing
    transactionRegex.lastIndex = 0;
    
    while ((match = transactionRegex.exec(feesSection)) !== null) {
      const [_, dateStr, description, amountStr] = match;
      
      // Skip total rows
      if (description.toUpperCase().includes('TOTAL FEES')) {
        continue;
      }
      
      // Parse date (MM/DD)
      const [month, day] = dateStr.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      
      // Parse amount
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      
      transactions.push({
        date,
        description: description.trim(),
        amount,
        type: 'EXPENSE'
      });
    }
  }
  
  return transactions;
}