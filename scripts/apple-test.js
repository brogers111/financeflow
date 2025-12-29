const fs = require('fs');
const path = require('path');

async function extractAppleCardText() {
  console.log('='.repeat(80));
  console.log('Apple Card PDF Text Extraction');
  console.log('='.repeat(80));

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

  // Use absolute path to worker in public directory
  const workerPath = path.join(process.cwd(), 'public', 'pdf.worker.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

  // Read the PDF file from Desktop
  const pdfPath = path.join(require('os').homedir(), 'Desktop', 'apple-bill.pdf');
  const buffer = fs.readFileSync(pdfPath);
  const data = new Uint8Array(buffer);

  const loadingTask = pdfjsLib.getDocument({
    data,
    verbosity: 0,
  });

  const pdfDoc = await loadingTask.promise;

  console.log(`✓ PDF loaded (${pdfDoc.numPages} pages)\n`);

  let fullText = '';
  const allLines = [];

  // Extract text with positioning from all pages
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const rows = {};

    textContent.items.forEach((item) => {
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
      allLines.push(line);
      fullText += line + '\n';
    });
  }

  console.log('='.repeat(80));
  console.log('TRANSACTIONS SECTION - LINE BY LINE');
  console.log('='.repeat(80));

  let inTransactionsSection = false;
  let transactionLines = [];

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i].trim();

    // Detect sections
    if (line === 'Transactions') {
      inTransactionsSection = true;
      console.log('\n[TRANSACTIONS SECTION START]\n');
      continue;
    }
    if (line === 'Payments') {
      if (inTransactionsSection) {
        console.log('\n[TRANSACTIONS SECTION END - PAYMENTS SECTION START]\n');
      }
      inTransactionsSection = false;
      continue;
    }
    if (line.startsWith('Apple Card Monthly Installments') ||
        line.startsWith('Daily Cash') ||
        line.startsWith('Interest Charged')) {
      inTransactionsSection = false;
      continue;
    }

    // Show transaction lines
    if (inTransactionsSection) {
      // Check if it's a transaction line (starts with date)
      if (line.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        console.log(`\n[TRANSACTION LINE ${transactionLines.length + 1}]`);
        console.log(`Raw: ${line}`);

        // Try to parse it
        const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})/);
        if (dateMatch) {
          const dateStr = dateMatch[1];
          console.log(`  Date: ${dateStr}`);

          // Check for return
          if (line.includes('(RETURN)')) {
            console.log(`  Type: RETURN - SKIPPED`);
          } else {
            // Find all amounts
            const amounts = line.match(/\$[\d,]+\.\d{2}/g);
            if (amounts) {
              console.log(`  All amounts found: ${amounts.join(', ')}`);
              console.log(`  Transaction amount (last): ${amounts[amounts.length - 1]}`);
            }

            // Extract description
            let description = line.substring(dateStr.length).trim();
            description = description.replace(/\s+\d+%.*$/, '').trim();
            if (description.includes('$')) {
              description = description.split('$')[0].trim();
            }
            console.log(`  Description: ${description}`);
          }
        }

        transactionLines.push(line);
      } else if (line.startsWith('Daily Cash Adjustment')) {
        console.log(`\n[SKIP] ${line}`);
      } else if (line.startsWith('Total')) {
        console.log(`\n[TOTAL LINE] ${line}`);
      } else if (line !== 'Date   Description   Daily Cash   Amount' && line.trim()) {
        console.log(`[OTHER] ${line}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total transaction lines found: ${transactionLines.length}`);

  // Look for ending balance
  console.log('\n' + '='.repeat(80));
  console.log('ENDING BALANCE DETECTION');
  console.log('='.repeat(80));

  const balancePatterns = [
    /Your\s+\w+\s+Balance\s+as\s+of[^\$]*\$([\d,]+\.\d{2})/i,
    /January Balance[^\$]*\$([\d,]+\.\d{2})/i,
    /February Balance[^\$]*\$([\d,]+\.\d{2})/i,
  ];

  for (const pattern of balancePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      console.log(`Match found: "${match[0]}"`);
      console.log(`Ending balance: $${match[1]}`);
      break;
    }
  }

  // Save full extracted text to file
  console.log('\n' + '='.repeat(80));
  console.log('SAVING FULL TEXT TO FILE');
  console.log('='.repeat(80));

  const outputPath = path.join(__dirname, 'apple-card-extracted.txt');
  fs.writeFileSync(outputPath, fullText, 'utf8');
  console.log(`✓ Full extracted text saved to: ${outputPath}`);
  console.log(`✓ File size: ${fullText.length} characters`);

  // Also display first 100 lines in console
  console.log('\n' + '='.repeat(80));
  console.log('FULL TEXT PREVIEW (First 100 lines)');
  console.log('='.repeat(80));
  const lines = fullText.split('\n').slice(0, 100);
  lines.forEach((line, i) => {
    console.log(`${String(i + 1).padStart(3, ' ')}| ${line}`);
  });

  if (allLines.length > 100) {
    console.log(`\n... (${allLines.length - 100} more lines)`);
    console.log(`\nView full text in: ${outputPath}`);
  }
}

extractAppleCardText().catch(console.error);
