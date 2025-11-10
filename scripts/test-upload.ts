import { PrismaClient, TransactionType } from '@prisma/client';
import fs from 'fs';
import { parseChaseCreditCard } from '../src/lib/parsers';

const prisma = new PrismaClient();

const ACCOUNT_ID = 'c27b1128-99aa-425b-9625-3549a7a58b6c';

async function testUpload() {
  try {
    const pdfPath = process.argv[2];
    
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      console.error('Usage: npx tsx scripts/test-upload.ts <pdf-path>');
      process.exit(1);
    }

    console.log('📄 Loading PDF:', pdfPath);
    console.log('💳 Account ID:', ACCOUNT_ID);
    
    const buffer = fs.readFileSync(pdfPath);
    const transactions = await parseChaseCreditCard(buffer);
    
    console.log('\n✅ Parsed', transactions.length, 'transactions\n');
    
    console.log('Preview (first 5):');
    console.log('━'.repeat(100));
    
    transactions.slice(0, 5).forEach((t, i) => {
      const dateStr = t.date.toISOString().split('T')[0];
      console.log(`${i+1}. ${dateStr} | $${t.amount.toFixed(2).padStart(8)} | ${t.description}`);
    });
    
    console.log('\n💾 Importing to database...\n');
    
    let imported = 0;
    const needsCategorization = [];
    
    for (const txn of transactions) {
      const prismaAmount = txn.type === 'EXPENSE' ? -txn.amount : txn.amount;
      const prismaType = txn.type === 'EXPENSE' ? TransactionType.EXPENSE : TransactionType.INCOME;
      
      const created = await prisma.transaction.create({
        data: {
          date: txn.date,
          description: txn.description,
          amount: prismaAmount,
          type: prismaType,
          source: 'CHASE_CREDIT',
          wasManual: false,
          rawDescription: txn.description,
          accountId: ACCOUNT_ID
        }
      });
      
      needsCategorization.push(created);
      imported++;
    }
    
    // Update account balance
    const totalChange = transactions.reduce((sum, t) => 
      sum + (t.type === 'EXPENSE' ? -t.amount : t.amount), 0
    );
    
    await prisma.account.update({
      where: { id: ACCOUNT_ID },
      data: { balance: { increment: totalChange } }
    });
    
    console.log('✅ Successfully imported', imported, 'transactions');
    console.log('📊 Account balance changed by: $' + totalChange.toFixed(2));
    console.log('🏷️  Uncategorized transactions:', needsCategorization.length);
    
    console.log('\n🔗 View in Prisma Studio: http://localhost:5555');
    console.log('   - Check the Account table (balance should be updated)');
    console.log('   - Check the Transaction table (should have', imported, 'new rows)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUpload();