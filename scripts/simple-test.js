/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");

// Register ts-node to handle TypeScript files
require("ts-node").register({
  compilerOptions: {
    module: "commonjs",
  },
});

// Test which parser to use
async function testParser(pdfPath, parserType) {
  console.log("📄 Testing parser:", parserType);
  console.log("📄 Loading PDF:", pdfPath);
  console.log("━".repeat(100));

  if (!fs.existsSync(pdfPath)) {
    console.error("❌ PDF not found");
    process.exit(1);
  }

  const buffer = fs.readFileSync(pdfPath);

  let transactions;
  let parserName;

  try {
    switch (parserType) {
      case "checking":
        parserName = "chase-checking";
        const {
          parseChaseChecking,
        } = require("../src/lib/parsers/chase-checking.ts");
        transactions = await parseChaseChecking(buffer);
        break;
      case "credit":
        parserName = "chase-credit-card";
        const {
          parseChaseCreditCard,
        } = require("../src/lib/parsers/chase-credit-card.ts");
        transactions = await parseChaseCreditCard(buffer);
        break;
      case "savings":
        parserName = "chase-personal-savings";
        const {
          parseChaseSavings,
        } = require("../src/lib/parsers/chase-personal-savings.ts");
        transactions = await parseChaseSavings(buffer);
        break;
      case "business-savings":
        parserName = "chase-business-savings";
        const {
          parseChaseBusinessSavings,
        } = require("../src/lib/parsers/chase-business-savings.ts");
        transactions = await parseChaseBusinessSavings(buffer);
        break;
      case "capital-one":
        parserName = "capital-one-savings";
        const {
          parseCapitalOneSavings,
        } = require("../src/lib/parsers/capital-one-savings.ts");
        transactions = await parseCapitalOneSavings(buffer);
        break;
      default:
        console.error("Unknown parser type:", parserType);
        console.error(
          "Available types: checking, credit, savings, business-savings, capital-one"
        );
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error loading parser:", error.message);
    console.error(error.stack);
    process.exit(1);
  }

  console.log(
    `\n✅ Parsed ${transactions.length} transactions using ${parserName}`
  );
  console.log("━".repeat(100));

  // Preview
  console.log("\nAll transactions:");
  transactions.forEach((t, i) => {
    const sign = t.amount >= 0 ? "+" : "";
    const balanceStr = t.balance ? ` | Bal: $${t.balance.toFixed(2)}` : "";
    console.log(
      `${String(i + 1).padStart(2)}. ${t.date.toISOString().split("T")[0]} | ` +
        `${sign}$${Math.abs(t.amount).toFixed(2).padStart(9)} | ` +
        `${t.type.padEnd(8)} | ${t.description}${balanceStr}`
    );
  });

  // Enhanced summary with breakdown by type
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const incomeTotal = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const transferTotal = transactions
    .filter((t) => t.type === "TRANSFER")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  console.log("\n📊 Summary:");
  console.log(`Total change: $${total.toFixed(2)}`);
  console.log(`💵 Income: $${incomeTotal.toFixed(2)}`);
  console.log(`💸 Expenses: $${expenseTotal.toFixed(2)}`);
  console.log(`🔄 Transfers: $${transferTotal.toFixed(2)}`);
  console.log(
    `   (${
      transactions.filter((t) => t.type === "TRANSFER").length
    } investment/savings transfers)`
  );

  // Save to JSON
  const outputFile = `test-transactions-${parserType}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(transactions, null, 2));
  console.log(`\n💾 Saved to ${outputFile}`);
}

// Usage
const pdfPath = process.argv[2];
const parserType = process.argv[3] || "checking";

if (!pdfPath) {
  console.error("Usage: node scripts/simple-test.js <pdf-path> <parser-type>");
  console.error("\nParser types:");
  console.error("  checking         - Chase Personal Checking");
  console.error("  credit           - Chase Credit Card");
  console.error("  savings          - Chase Personal Savings");
  console.error("  business-savings - Chase Business Savings");
  console.error("  capital-one      - Capital One Savings");
  console.error("\nExamples:");
  console.error(
    "  node scripts/simple-test.js ~/Desktop/chase-checking-oct.pdf checking"
  );
  console.error(
    "  node scripts/simple-test.js ~/Desktop/chase-credit-oct.pdf credit"
  );
  console.error(
    "  node scripts/simple-test.js ~/Desktop/chase-savings-oct.pdf savings"
  );
  process.exit(1);
}

testParser(pdfPath, parserType).catch((err) => {
  console.error("❌ Error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
