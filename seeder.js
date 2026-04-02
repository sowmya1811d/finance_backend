require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./User');
const Transaction = require('./Transaction');
const connectDB = require('./db');

const seed = async () => {
  await connectDB();

  // Clear existing data
  await User.deleteMany({});
  await Transaction.deleteMany({});

  // Create users
  const admin = await User.create({
    name: 'Alice Admin',
    email: 'admin@finance.com',
    password: 'password123',
    role: 'admin',
  });

  const analyst = await User.create({
    name: 'Bob Analyst',
    email: 'analyst@finance.com',
    password: 'password123',
    role: 'analyst',
  });

  await User.create({
    name: 'Carol Viewer',
    email: 'viewer@finance.com',
    password: 'password123',
    role: 'viewer',
  });

  // Create sample transactions
  const categories = [
    'salary', 'freelance', 'rent', 'groceries',
    'utilities', 'transport', 'entertainment', 'healthcare',
  ];

  const transactions = [];
  for (let i = 0; i < 30; i++) {
    const isIncome = i % 3 === 0;
    const month = (i % 12) + 1;
    transactions.push({
      amount: parseFloat((Math.random() * 4500 + 100).toFixed(2)),
      type: isIncome ? 'income' : 'expense',
      category: isIncome
        ? ['salary', 'freelance', 'investment'][i % 3]
        : categories[i % categories.length],
      date: new Date(2024, month - 1, (i % 28) + 1),
      notes: `Auto-seeded transaction #${i + 1}`,
      createdBy: i % 5 === 0 ? analyst._id : admin._id,
    });
  }

  await Transaction.insertMany(transactions);

  console.log('✅ Seed complete!');
  console.log('   admin@finance.com    / password123  (admin)');
  console.log('   analyst@finance.com  / password123  (analyst)');
  console.log('   viewer@finance.com   / password123  (viewer)');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
