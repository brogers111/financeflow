import { ParsedTransaction, ParsedStatement } from './types';
import path from 'path';

interface TextItem {
  str: string;
  transform: number[];
}

/**
 * Parses Chase Personal Credit Card statements
 * Format: Date | Merchant + Location | Amount
 * Note: Credit cards don't have balance column
 */
export async function parseChaseCreditCard(buffer: Buffer): Promise<ParsedStatement> {
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
  // Chase Credit: "New Balance" followed by amount (negative for credit cards)
  const match = text.match(/New Balance[^\d]*\$?([\d,]+\.\d{2})/i);
  if (match) {
    // Credit card balance is typically shown as positive but represents debt
    return -parseFloat(match[1].replace(/,/g, ''));
  }
  return 0;
}

function parseTransactions(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Extract start and end dates from statement period to handle cross-year statements
  const periodMatch = text.match(/(\w+)\s+(\d+),\s+(\d{4})\s+through\s+(\w+)\s+(\d+),\s+(\d{4})/i);

  let startMonth = 0, startYear = new Date().getFullYear();
  let endMonth = 11, endYear = new Date().getFullYear();

  if (periodMatch) {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                        'july', 'august', 'september', 'october', 'november', 'december'];
    startMonth = monthNames.indexOf(periodMatch[1].toLowerCase());
    startYear = parseInt(periodMatch[3]);
    endMonth = monthNames.indexOf(periodMatch[4].toLowerCase());
    endYear = parseInt(periodMatch[6]);
  }

  const lines = text.split('\n');

  for (const line of lines) {
    // Must start with MM/DD
    if (!line.match(/^\d{2}\/\d{2}/)) continue;

    // Extract date
    const dateMatch = line.match(/^(\d{2})\/(\d{2})/);
    if (!dateMatch) continue;

    const [, month, day] = dateMatch;
    const transactionMonth = parseInt(month) - 1; // 0-indexed

    // Determine the correct year based on the transaction month
    let year = endYear;
    if (startYear !== endYear) {
      // Cross-year statement: use startYear for months matching start period
      if (transactionMonth === startMonth || transactionMonth > endMonth) {
        year = startYear;
      }
    }

    const date = new Date(year, transactionMonth, parseInt(day));

    // Split line into tokens
    const tokens = line.split(/\s+/).filter((t) => t.length > 0);

    // Last token = amount (no balance column on credit cards)
    if (tokens.length < 2) continue;

    const amountStr = tokens[tokens.length - 1];

    // Parse amount - handle "- 10.00" format
    let amount: number;
    let description: string;

    if (amountStr === '-') {
      const numStr = tokens[tokens.length - 2];
      amount = -parseFloat(numStr.replace(/,/g, ''));
      description = tokens.slice(1, -2).join(' ');
    } else {
      amount = parseFloat(amountStr.replace(/,/g, ''));
      description = tokens.slice(1, -1).join(' ');
    }

    if (isNaN(amount)) continue;

    // Skip payments and credits (negative amounts on credit cards)
    // These are already tracked in the checking account statement
    if (amount < 0) {
      continue;
    }

    // All positive amounts on credit cards are expenses (purchases/charges)
    const type: 'INCOME' | 'EXPENSE' | 'TRANSFER' = 'EXPENSE';

    amount = -amount; // Store expenses as negative amounts

    transactions.push({
      date,
      description,
      amount,
      type,
    });
  }

  return transactions;
}