import pdf from 'pdf-parse';

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
}

export async function parseChaseStatement(buffer: Buffer): Promise<ParsedTransaction[]> {
  const data = await pdf(buffer);
  const text = data.text;
  
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');
  
  // Chase format: "MM/DD/YY DESCRIPTION $AMOUNT"
  // Example: "10/15/24 KICKIN CHICKEN $33.99"
  const transactionRegex = /(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+\$?([\d,]+\.\d{2})(-)?/g;
  
  let match;
  while ((match = transactionRegex.exec(text)) !== null) {
    const [_, dateStr, description, amountStr, isNegative] = match;
    
    // Parse date (MM/DD/YY)
    const [month, day, year] = dateStr.split('/').map(Number);
    const fullYear = 2000 + year; // Assumes 20xx
    const date = new Date(fullYear, month - 1, day);
    
    // Parse amount
    const amount = parseFloat(amountStr.replace(',', ''));
    const finalAmount = isNegative ? -amount : amount;
    
    // Determine type
    const type = finalAmount < 0 ? 'EXPENSE' : 'INCOME';
    
    // Clean description
    const cleanDescription = description
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s-]/g, '');
    
    transactions.push({
      date,
      description: cleanDescription,
      amount: finalAmount,
      type
    });
  }
  
  return transactions;
}