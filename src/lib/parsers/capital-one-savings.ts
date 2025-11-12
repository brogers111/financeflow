import { ParsedTransaction } from './types';

/*
 * Parses Capital One Savings Account statements
 * - Date | Description | Amount | Balance
 */
export async function parseCapitalOneSavings(buffer: Buffer): Promise<ParsedTransaction[]> {
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

    textContent.items.forEach((item: any) => {
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

  // TODO: Adjust these patterns based on your actual Capital One statement
  // Extract year from statement (format may vary)
  const periodMatch = text.match(/(\w+)\s+\d+,\s+(\d{4})/i);
  const year = periodMatch ? parseInt(periodMatch[2]) : new Date().getFullYear();

  const lines = text.split('\n');

  for (const line of lines) {
    // Capital One date format - adjust if needed (e.g., "MM/DD/YYYY" or "MM/DD")
    if (!line.match(/^\d{2}\/\d{2}/)) continue;

    const dateMatch = line.match(/^(\d{2})\/(\d{2})(?:\/(\d{4}))?/);
    if (!dateMatch) continue;

    const [, month, day, fullYear] = dateMatch;
    const date = new Date(fullYear ? parseInt(fullYear) : year, parseInt(month) - 1, parseInt(day));

    const tokens = line.split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length < 3) continue;

    // Assume format: Date | Description | Amount | Balance
    const balanceStr = tokens[tokens.length - 1];
    const balance = parseFloat(balanceStr.replace(/,/g, ''));

    const amountStr = tokens[tokens.length - 2];
    const amount = parseFloat(amountStr.replace(/,/g, ''));

    if (isNaN(amount) || isNaN(balance)) continue;

    const description = tokens.slice(1, -2).join(' ');
    const descUpper = description.toUpperCase();

    let type: 'INCOME' | 'EXPENSE' | 'TRANSFER' = amount >= 0 ? 'INCOME' : 'EXPENSE';

    if (
      descUpper.includes('TRANSFER') ||
      descUpper.includes('XFER')
    ) {
      type = 'TRANSFER';
    } else if (descUpper.includes('INTEREST')) {
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