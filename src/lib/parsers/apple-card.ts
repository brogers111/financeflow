import { ParsedTransaction, ParsedStatement } from './types';
import path from 'path';

interface TextItem {
  str: string;
  transform: number[];
}

/**
 * Parses Apple Card monthly statements
 * Format: Date | Description | Daily Cash % | Daily Cash $ | Amount
 */
export async function parseAppleCard(buffer: Buffer): Promise<ParsedStatement> {
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

  const transactions = parseTransactions(fullText);
  const endingBalance = extractEndingBalance(fullText);

  return {
    transactions,
    endingBalance
  };
}

function extractEndingBalance(text: string): number {
  // Apple Card uses "Your [Month] Balance as of [Date] $XXX.XX"
  const patterns = [
    /Your\s+\w+\s+Balance\s+as\s+of[^\$]*\$([\d,]+\.\d{2})/i,
    /January Balance[^\$]*\$([\d,]+\.\d{2})/i,
    /February Balance[^\$]*\$([\d,]+\.\d{2})/i,
    /March Balance[^\$]*\$([\d,]+\.\d{2})/i,
    /April Balance[^\$]*\$([\d,]+\.\d{2})/i,
    /May Balance[^\$]*\$([\d,]+\.\d{2})/i,
    /June Balance[^\$]*\$([\d,]+\.\d{2})/i,
    /July Balance[^\$]*\$([\d,]+\.\d{2})/i,
    /August Balance[^\$]*\$([\d,]+\.\d{2})/i,
    /September Balance[^\$]*\$([\d,]+\.\d{2})/i,
    /October Balance[^\$]*\$([\d,]+\.\d{2})/i,
    /November Balance[^\$]*\$([\d,]+\.\d{2})/i,
    /December Balance[^\$]*\$([\d,]+\.\d{2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Convert to negative since credit cards show as negative balances
      return -Math.abs(parseFloat(match[1].replace(/,/g, '')));
    }
  }

  return 0;
}

function parseTransactions(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  const lines = text.split('\n');

  let inTransactionsSection = false;
  let inPaymentsSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect sections
    if (line === 'Transactions') {
      inTransactionsSection = true;
      inPaymentsSection = false;
      continue;
    }
    if (line === 'Payments') {
      inPaymentsSection = true;
      inTransactionsSection = false;
      continue;
    }
    // End sections on these markers
    if (line.startsWith('Apple Card Monthly Installments') ||
        line.startsWith('Interest Charged')) {
      inTransactionsSection = false;
      inPaymentsSection = false;
      continue;
    }

    // Skip header lines, totals, and metadata - but DON'T turn off section flags
    if (line.startsWith('Date') ||
        line.startsWith('Total') ||
        line.startsWith('Apple Card is issued') ||
        line.startsWith('Daily Cash Adjustment') ||
        line.startsWith('Statement') ||
        line.includes('Page ') ||
        line.includes('@gmail.com') ||
        line.includes('—')) {
      continue;
    }

    // Skip payment transactions - we don't track these
    // Payments are handled separately from the credit card statement
    if (inPaymentsSection) {
      continue;
    }

    // Parse charge transactions (complex format with Daily Cash)
    if (inTransactionsSection && line.match(/^\d{2}\/\d{2}\/\d{4}/)) {
      // Transaction format: MM/DD/YYYY Description [%] $X.XX $XX.XX
      // Positive amounts are charges (convert to negative for credit card)
      // Negative amounts are returns/credits (convert to positive for reimbursement)

      // Match date at start
      const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})/);
      if (!dateMatch) continue;

      const dateStr = dateMatch[1];
      const [month, day, year] = dateStr.split('/').map(Number);
      const date = new Date(year, month - 1, day);

      // Check if this is a return (has negative amount)
      const isReturn = line.includes('(RETURN)') || line.includes('-$');

      // Extract all dollar amounts from the line (both positive and negative)
      const amounts = line.match(/-?\$[\d,]+\.\d{2}/g);
      if (!amounts || amounts.length === 0) continue;

      // The last amount is the transaction amount
      const transactionAmountStr = amounts[amounts.length - 1];
      let amount = parseFloat(transactionAmountStr.replace(/[$,]/g, ''));

      // For credit cards:
      // - Positive amounts (charges) become negative (expenses)
      // - Negative amounts (returns) become positive (income/reimbursements)
      if (amount > 0) {
        amount = -amount; // Charge -> negative
      } else {
        amount = Math.abs(amount); // Return -> positive
      }

      // Extract description (everything between date and the amounts/percentage)
      let description = line.substring(dateStr.length).trim();

      // Remove (RETURN) marker if present
      description = description.replace(/\(RETURN\)/g, '').trim();

      // Remove the Daily Cash percentage and amounts from description
      // Pattern: remove everything from the first percentage sign to the end
      description = description.replace(/\s+\d+%.*$/, '').trim();

      // If description still contains dollar signs, remove everything after the first one
      if (description.includes('$')) {
        description = description.split('$')[0].trim();
      }

      // Remove any leading/trailing dashes or spaces
      description = description.replace(/^-+|-+$/g, '').trim();

      transactions.push({
        date,
        description,
        amount,
        balance: 0,
        type: isReturn ? 'INCOME' : 'EXPENSE',
      });
    }
  }

  return transactions;
}
