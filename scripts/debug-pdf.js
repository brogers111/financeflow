/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

async function debugPDF(pdfPath) {
  console.log("📄 Loading PDF:", pdfPath);

  if (!fs.existsSync(pdfPath)) {
    console.error("❌ PDF not found:", pdfPath);
    process.exit(1);
  }

  const buffer = fs.readFileSync(pdfPath);
  const data = new Uint8Array(buffer);

  // Load PDF
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDoc = await loadingTask.promise;

  console.log("\n📊 PDF Stats:");
  console.log("━".repeat(100));
  console.log("Total pages:", pdfDoc.numPages);

  let fullText = "";
  let transactionLines = [];

  // Extract text from all pages
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group text items by Y position (rows)
    const rows = {};

    textContent.items.forEach((item) => {
      const y = Math.round(item.transform[5]); // Y coordinate
      if (!rows[y]) rows[y] = [];
      rows[y].push({
        text: item.str,
        x: item.transform[4],
        width: item.width,
      });
    });

    // Sort rows by Y position (top to bottom)
    const sortedY = Object.keys(rows)
      .map(Number)
      .sort((a, b) => b - a);

    // Build lines by sorting items in each row by X position
    sortedY.forEach((y) => {
      const items = rows[y].sort((a, b) => a.x - b.x);
      const line = items.map((i) => i.text).join(" ");
      fullText += line + "\n";

      // Track transaction lines
      if (line.match(/^\d{2}\/\d{2}/)) {
        transactionLines.push(line);
      }
    });
  }

  console.log("Total characters:", fullText.length);
  console.log("Total lines:", fullText.split("\n").length);
  console.log("━".repeat(100));

  // Extract statement period
  const periodMatch = fullText.match(
    /(\w+\s+\d+,\s+\d{4})\s+through\s+(\w+\s+\d+,\s+\d{4})/i
  );
  if (periodMatch) {
    console.log("\n📅 Statement Period:");
    console.log("From:", periodMatch[1]);
    console.log("To:", periodMatch[2]);
  }

  // Extract balances
  const beginMatch = fullText.match(/Beginning Balance\s*\$?([\d,]+\.\d{2})/i);
  const endMatch = fullText.match(/Ending Balance\s*\$?([\d,]+\.\d{2})/i);

  if (beginMatch || endMatch) {
    console.log("\n💰 Balances:");
    if (beginMatch) console.log("Beginning:", beginMatch[0]);
    if (endMatch) console.log("Ending:", endMatch[0]);
  }

  // Show transaction lines
  console.log("\n📝 Transaction Lines (first 20):");
  console.log("━".repeat(100));

  transactionLines.slice(0, 20).forEach((line) => {
    console.log(line);
  });

  console.log("━".repeat(100));
  console.log(`Total transaction lines found: ${transactionLines.length}`);

  // Show first 2000 chars
  console.log("\n📄 First 2000 characters:");
  console.log("━".repeat(100));
  console.log(fullText.substring(0, 2000));
  console.log("━".repeat(100));

  // Save full text for analysis
  fs.writeFileSync("debug-output.txt", fullText);
  console.log("\n💾 Full text saved to debug-output.txt");
}

// Usage
const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Usage: node scripts/debug-pdf.js <path-to-pdf>");
  console.error(
    "Example: node scripts/debug-pdf.js ~/Desktop/chase-checking-october-2025.pdf"
  );
  process.exit(1);
}

debugPDF(pdfPath).catch((err) => {
  console.error("❌ Error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
