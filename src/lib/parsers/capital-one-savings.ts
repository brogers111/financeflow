import { ParsedTransaction, ParsedStatement } from './types';
import path from 'path';

interface TextItem {
  str: string;
  transform: number[];
}

export async function parseCapitalOneSavings(buffer: Buffer): Promise<ParsedStatement> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  
  // Use absolute path to worker in public directory
  const workerPath = path.join(process.cwd(), 'public', 'pdf.worker.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
  
  const data = new Uint8Array(buffer);
  
  const loadingTask = pdfjsLib.getDocument({
    data,
    verbosity: 0,
  });
  
  const pdfDoc = await loadingTask.promise;

  let fullText = '';

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

    const sortedY = Object.keys(rows)
      .map(Number)
      .sort((a, b) => b - a);

    sortedY.forEach((y) => {
      const items = rows[y].sort((a, b) => a.x - b.x);
      const line = items.map((i) => i.text).join(' ');
      fullText += line + '\n';
    });
  }

  const transactions = parseTransactions(fullText);
  const endingBalance = extractEndingBalance(fullText);

  return {
    transactions,
    endingBalance
  };
}

function extractEndingBalance(text: string): number {
  // Capital One: "Closing Balance" followed by amount
  const match = text.match(/Closing Balance[^\d]*\$?([\d,]+\.\d{2})/i);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return 0;
}

function parseTransactions(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Extract start and end dates from statement period to handle cross-year statements
  // Capital One format: "Dec 1 - Dec 31, 2024" or "Dec 26 - Jan 24, 2025"
  const periodMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+\s+-\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+,\s+(\d{4})/i);

  const monthMap: { [key: string]: number } = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };

  let startMonth = 0, startYear = new Date().getFullYear();
  let endMonth = 11, endYear = new Date().getFullYear();

  if (periodMatch) {
    startMonth = monthMap[periodMatch[1]];
    endMonth = monthMap[periodMatch[2]];
    endYear = parseInt(periodMatch[3]);

    // If start month > end month, it's a cross-year statement
    if (startMonth > endMonth) {
      startYear = endYear - 1;
    } else {
      startYear = endYear;
    }
  } else {
    // Fallback: try to extract any year
    const yearMatch = text.match(/(\d{4})/);
    if (yearMatch) {
      endYear = parseInt(yearMatch[1]);
      startYear = endYear;
    }
  }

  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Match date at start - but must have day number
    const dateMatch = line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+/);
    if (!dateMatch) continue;

    // Skip date range lines like "Oct 1 - Oct 31, 2025"
    if (line.match(/\s+-\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/)) continue;

    // Skip balance/rate lines
    if (line.match(/Opening Balance|Closing Balance|Interest Rate Change/i)) continue;

    const [, monthName, day] = dateMatch;
    const month = monthMap[monthName];

    // Determine the correct year based on the transaction month
    let year = endYear;
    if (startYear !== endYear) {
      // Cross-year statement: use startYear for months matching start period
      if (month === startMonth || month > endMonth) {
        year = startYear;
      }
    }

    const date = new Date(year, month, parseInt(day));

    // Check if amount/balance are on next line
    let fullLine = line;
    let amountOnNextLine = false;
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      // If next line starts with amount indicator, it's a multi-line transaction
      if (nextLine.match(/^[-+]\s*\$/)) {
        fullLine += ' ' + nextLine;
        amountOnNextLine = true;
      }
    }

    const tokens = fullLine.split(/\s+/).filter((t) => t.length > 0);

    if (tokens.length < 5) continue;

    // Parse based on whether amount is on next line
    let amount = 0;
    let balance = 0;
    let descEndIndex = 0;

    if (amountOnNextLine) {
      // Multi-line: Oct 21 ... Debit $9,267.42
      //             - $3,633.74
      // Last token = amount, second-to-last = sign, third-to-last = balance
      const amountStr = tokens[tokens.length - 1];
      const sign = tokens[tokens.length - 2];
      const balanceStr = tokens[tokens.length - 3];
      
      balance = parseFloat(balanceStr.replace(/[$,]/g, ''));
      const amountValue = parseFloat(amountStr.replace(/[$,]/g, ''));
      amount = sign === '-' ? -amountValue : amountValue;
      
      descEndIndex = tokens.length - 3;
    } else {
      // Single line: Oct 27 ... Debit - $300.00 $8,967.42
      const balanceStr = tokens[tokens.length - 1];
      balance = parseFloat(balanceStr.replace(/[$,]/g, ''));
      
      const amountToken = tokens[tokens.length - 2];
      
      if (amountToken === '-' || amountToken === '+') {
        // Split format: ... - $300.00 $8,967.42
        const sign = amountToken;
        const numStr = tokens[tokens.length - 3];
        const numValue = parseFloat(numStr.replace(/[$,]/g, ''));
        amount = sign === '-' ? -numValue : numValue;
        descEndIndex = tokens.length - 3;
      } else if (amountToken.match(/^[+-]?\$?[\d,]+\.\d{2}$/)) {
        // Direct format: ... + $32.88 $9,000.30
        amount = parseFloat(amountToken.replace(/[$,+]/g, ''));
        if (amountToken.startsWith('-')) {
          amount = -Math.abs(amount);
        }
        descEndIndex = tokens.length - 2;
      } else {
        continue;
      }
    }

    if (isNaN(amount) || isNaN(balance)) continue;

    // Remove category from description
    const possibleCategory = tokens[descEndIndex - 1];
    if (possibleCategory === 'Debit' || possibleCategory === 'Credit') {
      descEndIndex = descEndIndex - 1;
    }

    let description = tokens.slice(2, descEndIndex).join(' ');
    
    // Clean up description (do this AFTER removing category):
    // 1. Remove trailing +/- signs
    description = description.replace(/\s*[+-]\s*$/, '').trim();
    // 2. Remove any remaining Debit/Credit words
    description = description.replace(/\s*(Debit|Credit)\s*$/i, '').trim();

    // Classify transaction type
    const descUpper = description.toUpperCase();
    let type: 'INCOME' | 'EXPENSE' | 'TRANSFER' = amount >= 0 ? 'INCOME' : 'EXPENSE';

    if (descUpper.includes('INTEREST')) {
      type = 'INCOME';
    } else if (descUpper.includes('WITHDRAWAL') || amount < 0) {
      // Withdrawals are expenses (money leaving your account)
      type = 'EXPENSE';
    } else if (descUpper.includes('TRANSFER') || descUpper.includes('XFER')) {
      type = 'TRANSFER';
    }

    // Normalize signs: expenses = negative, income = positive
    if (type === 'EXPENSE' && amount > 0) {
      amount = -amount;
    } else if (type === 'INCOME' && amount < 0) {
      amount = Math.abs(amount);
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