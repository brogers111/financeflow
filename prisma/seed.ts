import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding categories...');

  const expenseCategories = [
    { name: 'Food (Groceries)', icon: '🛒', color: '#10B981', type: 'EXPENSE' },
    { name: 'Food (Eat Out)', icon: '🍽️', color: '#F59E0B', type: 'EXPENSE' },
    { name: 'Entertainment (Alcohol)', icon: '🍺', color: '#EC4899', type: 'EXPENSE' },
    { name: 'Entertainment (Non-Alcohol)', icon: '🎮', color: '#8B5CF6', type: 'EXPENSE' },
    { name: 'Car', icon: '🚗', color: '#3B82F6', type: 'EXPENSE' },
    { name: 'Travel', icon: '✈️', color: '#F97316', type: 'EXPENSE' },
    { name: 'Rent/Utilities Expenses', icon: '🏠', color: '#EF4444', type: 'EXPENSE' },
    { name: 'Other (Gifts)', icon: '🎁', color: '#DB2777', type: 'EXPENSE' },
    { name: 'Other (Needs)', icon: '🔧', color: '#6B7280', type: 'EXPENSE' },
    { name: 'Other (Wants)', icon: '🛍️', color: '#A855F7', type: 'EXPENSE' },
    { name: 'Education', icon: '📚', color: '#0EA5E9', type: 'EXPENSE' },
    { name: 'Investments', icon: '📈', color: '#8B5CF6', type: 'EXPENSE' },
  ];

  const incomeCategories = [
    { name: 'Salary', icon: '💰', color: '#10B981', type: 'INCOME' },
    { name: 'Freelance', icon: '💼', color: '#3B82F6', type: 'INCOME' },
    { name: 'Investment Returns', icon: '📈', color: '#8B5CF6', type: 'INCOME' },
    { name: 'Refund', icon: '↩️', color: '#06B6D4', type: 'INCOME' },
    { name: 'Gift', icon: '🎁', color: '#EC4899', type: 'INCOME' },
    { name: 'Other Income', icon: '💵', color: '#6B7280', type: 'INCOME' },
  ];

  for (const category of [...expenseCategories, ...incomeCategories]) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: {
        name: category.name,
        icon: category.icon,
        color: category.color,
        type: category.type as TransactionType,
      },
    });
  }

  console.log('✅ Categories seeded successfully!');
  console.log(`📊 Created ${expenseCategories.length} expense categories`);
  console.log(`💵 Created ${incomeCategories.length} income categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });