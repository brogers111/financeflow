import { ParsedTransaction } from './types';

interface TextItem {
  str: string;
  transform: number[];
}

/**
 * Parses Chase Personal Checking Account statements
 * Format: Date | Description | Amount | Balance
 */
export async function parseChaseChecking(buffer: Buffer): Promise<ParsedTransaction[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  
  const data = new Uint8Array(buffer);
  
  // Suppress warnings about canvas and fonts
  const loadingTask = pdfjsLib.getDocument({
    data,
    verbosity: 0,
    standardFontDataUrl: null,
  });
  
  const pdfDoc = await loadingTask.promise;

  let fullText = '';

  // Extract text with positioning
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const rows: { [key: number]: Array<{ text: string; x: number }> } = {};

    textContent.items.forEach((item: TextItem) => {
      const y = Math.round(item.transform[5]);
      if (!rows[y]) rows[y] = [];
      rows[y].push({
        text: item.str,
        x: item.transform[4],
      });
    });

    // Sort rows top-to-bottom, items left-to-right
    const sortedY = Object.keys(rows)
      .map(Number)
      .sort((a, b) => b - a);

    sortedY.forEach((y) => {
      const items = rows[y].sort((a, b) => a.x - b.x);
      const line = items.map((i) => i.text).join(' ');
      fullText += line + '\n';
    });
  }

  return parseTransactions(fullText);
}

function parseTransactions(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Extract year from statement period
  const periodMatch = text.match(/(\w+)\s+\d+,\s+(\d{4})\s+through/i);
  const year = periodMatch ? parseInt(periodMatch[2]) : new Date().getFullYear();

  const lines = text.split('\n');

  for (const line of lines) {
    // Must start with MM/DD date format
    if (!line.match(/^\d{2}\/\d{2}/)) continue;
    
    // Skip balance summary lines
    if (line.match(/Beginning Balance|Ending Balance/i)) continue;

    // Extract date
    const dateMatch = line.match(/^(\d{2})\/(\d{2})/);
    if (!dateMatch) continue;

    const [, month, day] = dateMatch;
    const date = new Date(year, parseInt(month) - 1, parseInt(day));

    // Tokenize line
    const tokens = line.split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length < 3) continue;

    // Last token = balance
    const balanceStr = tokens[tokens.length - 1];
    const balance = parseFloat(balanceStr.replace(/,/g, ''));

    // Second-to-last token = amount (or "-" if negative amount follows)
    const amountStr = tokens[tokens.length - 2];
    let amount: number;
    let description: string;

    if (amountStr === '-') {
      // Format: "... - 123.45 1000.00"
      const numStr = tokens[tokens.length - 3];
      amount = -parseFloat(numStr.replace(/,/g, ''));
      description = tokens.slice(1, -3).join(' ');
    } else {
      // Format: "... 123.45 1000.00"
      amount = parseFloat(amountStr.replace(/,/g, ''));
      description = tokens.slice(1, -2).join(' ');

      // Handle edge case: description ends with "-" (negative indicator)
      if (description.endsWith('-')) {
        amount = -Math.abs(amount);
        description = description.slice(0, -1).trim();
      }
    }

    if (isNaN(amount) || isNaN(balance)) continue;

    const descUpper = description.toUpperCase();

    // Skip credit card payments (already tracked in credit card statement)
    if (
      descUpper.includes('PAYMENT TO CHASE CARD') ||
      descUpper.includes('PAYMENT TO CARD')
    ) {
      continue;
    }

    // Determine transaction type
    let type: 'INCOME' | 'EXPENSE' | 'TRANSFER' = 'EXPENSE';

    // Priority 1: Investment contributions → TRANSFER
    if (
      descUpper.includes('AXOSADVSERV') ||
      descUpper.includes('AMERICAN FUNDS') ||
      descUpper.includes('INVESTMENT') ||
      descUpper.includes('401K') ||
      descUpper.includes('ROTH IRA') ||
      descUpper.includes('BROKERAGE') ||
      descUpper.includes('CONTRIB')
    ) {
      type = 'TRANSFER';
    }
    // Priority 2: Account transfers → TRANSFER
    else if (
      descUpper.includes('TRANSFER FROM') ||
      descUpper.includes('TRANSFER TO') ||
      descUpper.includes('ONLINE TRANSFER')
    ) {
      type = 'TRANSFER';
    }
    // Priority 3: Income keywords → INCOME
    else if (
      descUpper.includes('PAYROLL') ||
      descUpper.includes('ZELLE PAYMENT FROM') ||
      descUpper.includes('VENMO CASHOUT') ||
      descUpper.includes('INTEREST') ||
      descUpper.includes('DEPOSIT')
    ) {
      type = 'INCOME';
    }
    // Priority 4: Positive amount (default) → INCOME
    else if (amount > 0) {
      type = 'INCOME';
    }

    transactions.push({
      date,
      description,
      amount,
      balance,
      type,
    });
  }

  return transactions;
}