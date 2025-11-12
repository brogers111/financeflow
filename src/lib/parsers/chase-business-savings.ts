import { ParsedTransaction } from './types';

interface TextItem {
  str: string;
  transform: number[];
}

/**
 * Parses Chase Business Savings Account statements
 * Format: Date | Description | Balance
 * Same format as personal savings - amounts calculated from balance changes
 */
export async function parseChaseBusinessSavings(buffer: Buffer): Promise<ParsedTransaction[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data });
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

  return parseTransactions(fullText);
}

function parseTransactions(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Extract year
  const periodMatch = text.match(/(\w+)\s+\d+,\s+(\d{4})\s+through/i);
  const year = periodMatch ? parseInt(periodMatch[2]) : new Date().getFullYear();

  // Get beginning balance
  const beginMatch = text.match(/Beginning Balance\s*\$?([\d,]+\.\d{2})/i);
  const beginningBalance = beginMatch
    ? parseFloat(beginMatch[1].replace(/,/g, ''))
    : 0;

  const lines = text.split('\n');
  let prevBalance = beginningBalance;

  for (const line of lines) {
    if (!line.match(/^\d{2}\/\d{2}/)) continue;
    if (line.match(/Beginning Balance|Ending Balance/i)) continue;

    const dateMatch = line.match(/^(\d{2})\/(\d{2})/);
    if (!dateMatch) continue;

    const [, month, day] = dateMatch;
    const date = new Date(year, parseInt(month) - 1, parseInt(day));

    const tokens = line.split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length < 2) continue;

    // Last token = balance
    const balanceStr = tokens[tokens.length - 1];
    const balance = parseFloat(balanceStr.replace(/,/g, ''));

    if (isNaN(balance)) continue;

    // Calculate amount from balance change
    const amount = balance - prevBalance;

    // Description is everything except date and balance
    const description = tokens.slice(1, -1).join(' ');

    const descUpper = description.toUpperCase();
    let type: 'INCOME' | 'EXPENSE' | 'TRANSFER' = amount >= 0 ? 'INCOME' : 'EXPENSE';

    // Classify transfers
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

    transactions.push({
      date,
      description,
      amount,
      balance,
      type,
    });

    prevBalance = balance;
  }

  return transactions;
}