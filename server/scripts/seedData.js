require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');

const connectDB = require('../config/database');

// Configuration
const USERS_TO_CREATE = 5;
const ACCOUNTS_PER_USER = 2;
const TRANSACTIONS_TO_CREATE = 10000;
const BATCH_SIZE = 500;

// Categories for transactions
const TRANSACTION_CATEGORIES = [
    'shopping', 'food', 'transportation', 'utilities',
    'entertainment', 'healthcare', 'education', 'investment',
    'salary', 'other'
];

const ACCOUNT_TYPES = ['savings', 'checking', 'credit'];

async function createUsers() {
    console.log('Creating users...');
    const users = [];

    // Create admin user
    const adminUser = new User({
        name: 'Admin User',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10),
        role: 'admin'
    });
    users.push(adminUser);

    // Create regular users
    for (let i = 0; i < USERS_TO_CREATE; i++) {
        const user = new User({
            name: faker.person.fullName(),
            email: faker.internet.email(),
            password: await bcrypt.hash('password123', 10),
            role: faker.helpers.arrayElement(['user', 'viewer'])
        });
        users.push(user);
    }

    await User.insertMany(users);
    console.log(`Created ${users.length} users`);
    return users;
}

async function createAccounts(users) {
    console.log('Creating accounts...');
    const accounts = [];

    for (const user of users) {
        for (let i = 0; i < ACCOUNTS_PER_USER; i++) {
            const account = new Account({
                user_id: user._id,
                account_number: faker.finance.accountNumber(),
                balance: faker.number.float({ min: 1000, max: 100000, multipleOf: 0.01 }),
                account_type: faker.helpers.arrayElement(ACCOUNT_TYPES),
                currency: 'USD',
                status: 'active',
                last_transaction_date: faker.date.past()
            });
            accounts.push(account);
        }
    }

    await Account.insertMany(accounts);
    console.log(`Created ${accounts.length} accounts`);
    return accounts;
}

async function createTransactionsInBatches(accounts) {
    console.log('Creating transactions...');
    let transactionsCreated = 0;

    for (let i = 0; i < TRANSACTIONS_TO_CREATE; i += BATCH_SIZE) {
        const transactions = [];
        const batchSize = Math.min(BATCH_SIZE, TRANSACTIONS_TO_CREATE - i);

        for (let j = 0; j < batchSize; j++) {
            const account = faker.helpers.arrayElement(accounts);
            const amount = faker.number.float({ min: 10, max: 5000, multipleOf: 0.01 });
            const transactionType = faker.helpers.arrayElement(['credit', 'debit']);
            const timestamp = faker.date.between({ 
                from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
                to: new Date() 
            });
            
            const transaction = {
                transaction_id: faker.string.alphanumeric(10),
                user_id: account.user_id,
                account_number: account.account_number,
                transaction_type: transactionType,
                amount: amount,
                description: faker.finance.transactionDescription(),
                timestamp: timestamp,
                category: faker.helpers.arrayElement(TRANSACTION_CATEGORIES),
                status: faker.helpers.arrayElement(['success', 'pending', 'failed']),
                is_deleted: false
            };
            transactions.push(transaction);
        }

        await Transaction.insertMany(transactions);
        transactionsCreated += transactions.length;
        console.log(`Created ${transactionsCreated} transactions (${Math.round(transactionsCreated/TRANSACTIONS_TO_CREATE * 100)}%)`);
    }

    console.log('Finished creating transactions');
}

async function seedData() {
    try {
        // Connect to database
        await connectDB();

        // Clear existing data
        console.log('Clearing existing data...');
        await Promise.all([
            User.deleteMany({}),
            Account.deleteMany({}),
            Transaction.deleteMany({})
        ]);

        // Create new data
        const users = await createUsers();
        const accounts = await createAccounts(users);
        await createTransactionsInBatches(accounts);

        console.log('Data seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
}

seedData(); 