import { ParsedTransaction, ParsedStatement } from './types';
import path from 'path';

interface TextItem {
  str: string;
  transform: number[];
}

/**
 * Parses Chase Business Savings Account statements
 * Format: Date | Description | [Instances] | Amount | Balance
 * Note: Business savings has an extra "Instances" column that personal savings doesn't have
 */
export async function parseChaseBusinessSavings(buffer: Buffer): Promise<ParsedStatement> {
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
  const patterns = [
    /Ending\s+Balance[^\$]*\$([\d,]+\.\d{2})/i,  // Handles multiple spaces
    /Ending Balance[^\$]*\$([\d,]+\.\d{2})/i,
    /Ending[^\d]*(\d[\d,]*\.\d{2})/i,  // Fallback
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
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

    // Skip balance summary lines
    if (line.match(/Beginning Balance|Ending Balance/i)) continue;

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

    // Tokenize line
    const tokens = line.split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length < 3) continue;

    // Business savings format: Date | Description | [Instances] | Amount | Balance
    // Last token = balance
    const balanceStr = tokens[tokens.length - 1];
    const balance = parseFloat(balanceStr.replace(/,/g, ''));

    // Second-to-last token = amount
    const amountStr = tokens[tokens.length - 2];
    const amount = parseFloat(amountStr.replace(/,/g, ''));

    if (isNaN(amount) || isNaN(balance)) continue;

    // Description is everything between date and the last 2-3 tokens
    // We need to exclude: [instances (if numeric)], amount, balance
    let descEndIndex = tokens.length - 2; // Before amount
    
    // Check if there's an instances column (numeric value before amount)
    if (tokens.length >= 4) {
      const possibleInstance = tokens[tokens.length - 3];
      if (!isNaN(parseFloat(possibleInstance))) {
        descEndIndex = tokens.length - 3; // Before instances
      }
    }

    const description = tokens.slice(1, descEndIndex).join(' ');

    const descUpper = description.toUpperCase();
    let type: 'INCOME' | 'EXPENSE' | 'TRANSFER' = amount >= 0 ? 'INCOME' : 'EXPENSE';

    // Classify transfers (account-to-account movements)
    if (
      descUpper.includes('TRANSFER FROM') ||
      descUpper.includes('TRANSFER TO') ||
      descUpper.includes('ONLINE TRANSFER')
    ) {
      type = 'TRANSFER';
    }
    // Interest is income
    else if (descUpper.includes('INTEREST')) {
      type = 'INCOME';
    }
    // Remote deposits are business income (check deposits)
    else if (descUpper.includes('REMOTE ONLINE DEPOSIT')) {
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