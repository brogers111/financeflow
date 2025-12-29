const fs = require('fs');
const path = require('path');

async function extractCapitalOneText() {
  console.log('='.repeat(80));
  console.log('Capital One Savings PDF Text Extraction');
  console.log('='.repeat(80));

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

  // Use absolute path to worker in public directory
  const workerPath = path.join(process.cwd(), 'public', 'pdf.worker.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

  // Read the PDF file from Desktop
  const pdfPath = path.join(require('os').homedir(), 'Desktop', 'capital-one-statement.pdf');

  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ File not found: ${pdfPath}`);
    console.log('Please save a Capital One statement as "capital-one-statement.pdf" on your Desktop');
    return;
  }

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

  // Save full extracted text to file
  console.log('='.repeat(80));
  console.log('SAVING FULL TEXT TO FILE');
  console.log('='.repeat(80));

  const outputPath = path.join(__dirname, 'capital-one-extracted.txt');
  fs.writeFileSync(outputPath, fullText, 'utf8');
  console.log(`✓ Full extracted text saved to: ${outputPath}`);
  console.log(`✓ File size: ${fullText.length} characters`);

  // Display all lines with line numbers
  console.log('\n' + '='.repeat(80));
  console.log('FULL TEXT (All lines)');
  console.log('='.repeat(80));
  allLines.forEach((line, i) => {
    console.log(`${String(i + 1).padStart(4, ' ')}| ${line}`);
  });

  // Look for the specific transaction
  console.log('\n' + '='.repeat(80));
  console.log('SEARCHING FOR "BRANDON E ROGERS" TRANSACTION');
  console.log('='.repeat(80));

  const matchingLines = allLines
    .map((line, i) => ({ line, index: i + 1 }))
    .filter(({ line }) => line.includes('BRANDON') || line.includes('ROGERS') || line.includes('Instant Funds'));

  if (matchingLines.length > 0) {
    matchingLines.forEach(({ line, index }) => {
      console.log(`Line ${index}: ${line}`);
    });
  } else {
    console.log('No matching lines found');
  }
}

extractCapitalOneText().catch(console.error);
