/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const pdf = require("pdf-parse");
const { PrismaClient } = require("@prisma/client");
const fetch = require("node-fetch"); // or global fetch if Node 18+

const prisma = new PrismaClient();
const OLLAMA_API = "http://localhost:11434/api/generate";

// Detect dry-run
const dryRun = process.argv.includes("--dry-run");

function logHeader(title) {
  console.log("━".repeat(100));
  console.log(title);
  console.log("━".repeat(100));
}

async function extractWithOllama(text, statementType) {
  const prompt = `You are a banking statement parser. Extract ALL transactions from this ${statementType} statement.

PARSING CHALLENGES:
- Text may be concatenated: "09/25Description123.45"
- Multiple numbers per line - the RIGHTMOST number with decimal is usually the balance
- Return JSON array ONLY
- Dates are in MM/DD format
- If you are uncertain about an amount, calculate it based on the balance from the previous transaction

RULES:
1. Return ONLY a valid JSON array
2. Format: [{"date":"YYYY-MM-DD","description":"text","amount":123.45,"balance":123.45}]
3. Positive amounts = money in, negative = money out

Statement text:
${text}

Return JSON array:`;

  const response = await fetch(OLLAMA_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "phi3",
      prompt: prompt,
      stream: false,
      format: "json",
      options: {
        temperature: 0.1,
        num_predict: 3000,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`);
  }

  const data = await response.json();
  let jsonStr = data.response.trim();

  // Clean code fences
  jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error("Ollama returned invalid JSON: " + err.message);
  }

  if (!Array.isArray(parsed) && parsed.transactions) {
    // Some responses wrap in {transactions:[...]} — unwrap
    parsed = parsed.transactions;
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Ollama returned invalid data structure, expected array");
  }

  return parsed;
}

function detectTransactionType(description, amount) {
  const descUpper = description.toUpperCase();

  if (
    descUpper.includes("TRANSFER FROM") ||
    descUpper.includes("TRANSFER TO") ||
    descUpper.includes("ONLINE TRANSFER")
  )
    return "TRANSFER";

  if (
    descUpper.includes("PAYROLL") ||
    descUpper.includes("SALARY") ||
    descUpper.includes("ZELLE PAYMENT FROM") ||
    descUpper.includes("INTEREST") ||
    (descUpper.includes("VENMO") && amount > 0)
  )
    return "INCOME";

  return amount >= 0 ? "INCOME" : "EXPENSE";
}

function shouldSkipTransaction(description) {
  const descUpper = description.toUpperCase();
  return (
    descUpper.includes("PAYMENT TO CHASE CARD") ||
    descUpper.includes("CREDIT CARD PAYMENT") ||
    descUpper.includes("CARD ENDING IN") ||
    descUpper.includes("BEGINNING BALANCE") ||
    descUpper.includes("ENDING BALANCE")
  );
}

async function main() {
  const pdfPath = process.argv[2];
  const accountId = process.argv[3];
  const statementType = process.argv[4] || "checking";

  if (!pdfPath || !accountId) {
    console.error(
      "Usage: node scripts/ollama-parse-statement.js <pdf-path> <account-id> [type] [--dry-run]"
    );
    process.exit(1);
  }

  console.log("📄 Loading PDF:", pdfPath);
  console.log("💳 Account ID:", accountId);
  console.log("📋 Type:", statementType);
  console.log("⚙️  Dry run:", dryRun);

  if (!fs.existsSync(pdfPath)) {
    console.error("❌ Error: PDF file not found");
    process.exit(1);
  }

  const buffer = fs.readFileSync(pdfPath);
  const data = await pdf(buffer);
  const text = data.text;

  console.log("📝 Extracted", text.length, "characters from PDF");
  console.log("\n🤖 Parsing with Ollama (phi3)...\n");

  const parsedTransactions = await extractWithOllama(text, statementType);

  // Extract beginning balance from first transaction that mentions it
  const beginningMatch = text.match(/Beginning Balance\s*\$([\d,]+\.\d{2})/i);
  let beginningBalance = 0;
  if (beginningMatch) {
    beginningBalance = parseFloat(beginningMatch[1].replace(/,/g, ""));
    console.log("💰 Beginning balance detected:", beginningBalance);
  }

  // Recompute amounts from balance changes
  let prevBalance = beginningBalance;
  const transactions = parsedTransactions.map((txn) => {
    if (typeof txn.balance === "number") {
      txn.amount = txn.balance - prevBalance;
      txn.confidence = 1.0;
      prevBalance = txn.balance;
    } else {
      txn.amount = parseFloat(txn.amount);
      txn.confidence = txn.confidence || 0.7;
    }
    txn.type = detectTransactionType(txn.description, txn.amount);
    txn.rawDescription = txn.description;
    return txn;
  });

  // Preview
  logHeader(`Parsed ${transactions.length} transactions`);
  transactions.slice(0, 10).forEach((t, i) => {
    const sign = t.amount >= 0 ? "+" : "";
    console.log(
      `${String(i + 1).padStart(2)}. ${t.date} | ${sign}$${t.amount
        .toFixed(2)
        .padStart(9)} | ${t.description} | confidence: ${t.confidence}`
    );
  });

  // Optional QA step
  const lowConfidenceTxns = transactions.filter((t) => t.confidence < 1.0);
  if (lowConfidenceTxns.length > 0) {
    console.log(
      `\n⚠️ Found ${lowConfidenceTxns.length} low-confidence transactions. Run Ollama QA? (y/n)`
    );

    await new Promise((resolve) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once("data", async (data) => {
        const answer = data.toString().trim().toLowerCase();
        if (answer === "y") {
          for (const txn of lowConfidenceTxns) {
            console.log(
              "💡 QA placeholder: check transaction",
              txn.description
            );
            // Optionally call Ollama here for review
          }
        }
        process.stdin.setRawMode(false);
        resolve();
      });
    });
  }

  if (dryRun) {
    fs.writeFileSync(
      "parsed_transactions.json",
      JSON.stringify(transactions, null, 2)
    );
    console.log(
      "\n📄 Dry run complete. Transactions written to parsed_transactions.json, DB unchanged."
    );
    await prisma.$disconnect();
    process.exit(0);
  }

  // Import into Prisma
  let imported = 0;
  for (const txn of transactions) {
    if (shouldSkipTransaction(txn.description)) {
      console.log("⏭️  Skipping transaction:", txn.description);
      continue;
    }

    await prisma.transaction.create({
      data: {
        date: new Date(txn.date),
        description: txn.description,
        amount: txn.amount,
        type: txn.type,
        source: `CHASE_${statementType.toUpperCase()}`,
        rawDescription: txn.rawDescription,
        confidence: txn.confidence,
        wasManual: false,
        accountId: accountId,
      },
    });
    imported++;
  }

  const totalChange = transactions.reduce((sum, t) => sum + t.amount, 0);
  await prisma.account.update({
    where: { id: accountId },
    data: { balance: { increment: totalChange } },
  });

  console.log(`\n✅ Successfully imported ${imported} transactions`);
  console.log("📊 Account balance changed by: $" + totalChange.toFixed(2));
  console.log("🔗 View in Prisma Studio: http://localhost:5555");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  prisma.$disconnect();
  process.exit(1);
});
