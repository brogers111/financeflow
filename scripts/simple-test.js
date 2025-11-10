/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const { PDFParse } = require("pdf-parse"); // ✅ Import the class
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const ACCOUNT_ID = "c27b1128-99aa-425b-9625-3549a7a58b6c";

async function parsePDF(buffer) {
  // ✅ Create instance and call parse
  const pdfParser = new PDFParse();
  const data = await pdfParser.parse(buffer);
  const text = data.text;

  const transactions = [];
  const activityMatch = text.match(
    /ACCOUNT ACTIVITY([\s\S]+?)(?:2025 Totals Year-to-Date|INTEREST CHARGES|$)/i
  );

  if (!activityMatch) {
    throw new Error("Could not find ACCOUNT ACTIVITY section");
  }

  const activitySection = activityMatch[1];
  const purchaseMatch = activitySection.match(
    /PURCHASE([\s\S]+?)(?:FEES CHARGED|2025 Totals|$)/i
  );
  const feesMatch = activitySection.match(
    /FEES CHARGED([\s\S]+?)(?:2025 Totals|$)/i
  );

  const yearMatch = text.match(/Statement Date:\s*\d{2}\/\d{2}\/(\d{2})/);
  const year = yearMatch
    ? 2000 + parseInt(yearMatch[1])
    : new Date().getFullYear();

  const transactionRegex = /(\d{2}\/\d{2})\s+(.+?)\s+([\d,]+\.\d{2})$/gm;

  // Parse PURCHASE section
  if (purchaseMatch) {
    const purchaseSection = purchaseMatch[1];
    let match;

    while ((match = transactionRegex.exec(purchaseSection)) !== null) {
      const [_, dateStr, description, amountStr] = match;

      if (
        description.toUpperCase() === "PURCHASE" ||
        description.toUpperCase().includes("FEES CHARGED")
      ) {
        continue;
      }

      const [month, day] = dateStr.split("/").map(Number);
      const date = new Date(year, month - 1, day);
      const amount = parseFloat(amountStr.replace(/,/g, ""));

      transactions.push({ date, description: description.trim(), amount });
    }
  }

  // Parse FEES section
  if (feesMatch) {
    const feesSection = feesMatch[1];
    transactionRegex.lastIndex = 0;
    let match;

    while ((match = transactionRegex.exec(feesSection)) !== null) {
      const [_, dateStr, description, amountStr] = match;

      if (description.toUpperCase().includes("TOTAL FEES")) {
        continue;
      }

      const [month, day] = dateStr.split("/").map(Number);
      const date = new Date(year, month - 1, day);
      const amount = parseFloat(amountStr.replace(/,/g, ""));

      transactions.push({ date, description: description.trim(), amount });
    }
  }

  return transactions;
}

async function main() {
  const pdfPath = process.argv[2];

  if (!pdfPath || !fs.existsSync(pdfPath)) {
    console.error("Usage: node scripts/simple-test.js <pdf-path>");
    process.exit(1);
  }

  console.log("📄 Loading:", pdfPath);
  console.log("💳 Account ID:", ACCOUNT_ID);

  const buffer = fs.readFileSync(pdfPath);
  const transactions = await parsePDF(buffer);

  console.log("\n✅ Parsed", transactions.length, "transactions\n");

  console.log("Preview (first 5):");
  console.log("━".repeat(100));

  transactions.slice(0, 5).forEach((t, i) => {
    const dateStr = t.date.toISOString().split("T")[0];
    console.log(
      `${i + 1}. ${dateStr} | $${t.amount.toFixed(2).padStart(8)} | ${
        t.description
      }`
    );
  });

  if (transactions.length > 5) {
    console.log(`... and ${transactions.length - 5} more`);
  }

  console.log("\n💾 Importing to database...\n");

  let imported = 0;

  for (const txn of transactions) {
    await prisma.transaction.create({
      data: {
        date: txn.date,
        description: txn.description,
        amount: -txn.amount, // Negative for expenses
        type: "EXPENSE",
        source: "CHASE_CREDIT",
        wasManual: false,
        rawDescription: txn.description,
        accountId: ACCOUNT_ID,
      },
    });
    imported++;
  }

  const totalChange = -transactions.reduce((sum, t) => sum + t.amount, 0);

  await prisma.account.update({
    where: { id: ACCOUNT_ID },
    data: { balance: { increment: totalChange } },
  });

  console.log("✅ Successfully imported", imported, "transactions");
  console.log("📊 Account balance changed by: $" + totalChange.toFixed(2));
  console.log("🏷️  All transactions need categorization");

  console.log("\n🔗 View in Prisma Studio: http://localhost:5555");
  console.log("   - Check Account table (balance updated)");
  console.log("   - Check Transaction table (" + imported + " new rows)");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  prisma.$disconnect();
  process.exit(1);
});
