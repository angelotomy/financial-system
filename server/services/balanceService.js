const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

class BalanceService {
    /**
     * Process a new transaction
     */
    static async processTransaction(transactionData) {
        const session = await mongoose.startSession();
        
        try {
            await session.startTransaction();
            const result = await this._processWithSession(transactionData, session);
            await session.commitTransaction();
            return result;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Process transaction with session
     */
    static async _processWithSession(transactionData, session) {
        const account = await Account.findOne(
            { account_number: transactionData.account_number }
        ).session(session);

        if (!account) {
            throw new Error('Account not found');
        }

        // Validate transaction
        await this.validateTransaction(account, transactionData);

        // Calculate new balance
        const newBalance = this.calculateNewBalance(account.balance, transactionData);

        // Update account balance
        await Account.findOneAndUpdate(
            { account_number: transactionData.account_number },
            { 
                $set: { 
                    balance: newBalance,
                    last_transaction_date: new Date()
                }
            },
            { session }
        );

        // Create transaction record
        const transaction = new Transaction({
            ...transactionData,
            status: 'success',
            timestamp: new Date()
        });

        await transaction.save({ session });

        return {
            transaction_id: transaction._id,
            status: 'success',
            new_balance: newBalance
        };
    }

    /**
     * Process transaction without session (fallback)
     */
    static async _processWithoutSession(transactionData) {
        const account = await Account.findOne({ account_number: transactionData.account_number });

        if (!account) {
            throw new Error('Account not found');
        }

        // Validate transaction
        await this.validateTransaction(account, transactionData);

        // Calculate new balance
        const newBalance = this.calculateNewBalance(account.balance, transactionData);

        // Update account balance
        await Account.findOneAndUpdate(
            { account_number: transactionData.account_number },
            { 
                $set: { 
                    balance: newBalance,
                    last_transaction_date: new Date()
                }
            }
        );

        // Create transaction record
        const transaction = new Transaction({
            ...transactionData,
            status: 'success',
            timestamp: new Date()
        });

        await transaction.save();

        return {
            transaction_id: transaction._id,
            status: 'success',
            new_balance: newBalance
        };
    }

    /**
     * Validate transaction details
     */
    static async validateTransaction(account, transactionData) {
        // Check if account is active
        if (account.status !== 'active') {
            throw new Error('Account is not active');
        }

        // For debit transactions, check sufficient balance
        if (transactionData.transaction_type === 'debit') {
            if (account.balance < transactionData.amount) {
                throw new Error('Insufficient funds');
            }
        }

        // Validate transaction amount
        if (transactionData.amount <= 0) {
            throw new Error('Invalid transaction amount');
        }

        return true;
    }

    /**
     * Calculate new balance after transaction
     */
    static calculateNewBalance(currentBalance, transaction) {
        if (transaction.transaction_type === 'credit') {
            return currentBalance + transaction.amount;
        } else {
            return currentBalance - transaction.amount;
        }
    }

    /**
     * Get account balance and transaction summary
     */
    static async getAccountSummary(accountNumber) {
        const account = await Account.findOne({ account_number: accountNumber });
        
        if (!account) {
            throw new Error('Account not found');
        }

        const today = new Date();
        const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));

        const summary = await Transaction.aggregate([
            {
                $match: {
                    account_number: accountNumber,
                    timestamp: { $gte: thirtyDaysAgo },
                    status: 'success',
                    is_deleted: false
                }
            },
            {
                $group: {
                    _id: null,
                    total_credit: {
                        $sum: {
                            $cond: [{ $eq: ['$transaction_type', 'credit'] }, '$amount', 0]
                        }
                    },
                    total_debit: {
                        $sum: {
                            $cond: [{ $eq: ['$transaction_type', 'debit'] }, '$amount', 0]
                        }
                    },
                    transaction_count: { $sum: 1 },
                    categories: {
                        $addToSet: '$category'
                    }
                }
            }
        ]);

        // Get category-wise breakdown
        const categoryBreakdown = await Transaction.aggregate([
            {
                $match: {
                    account_number: accountNumber,
                    timestamp: { $gte: thirtyDaysAgo },
                    status: 'success',
                    is_deleted: false
                }
            },
            {
                $group: {
                    _id: '$category',
                    total_amount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { total_amount: -1 }
            }
        ]);

        return {
            account_details: account,
            current_balance: account.balance,
            thirty_day_summary: summary[0] || null,
            category_breakdown: categoryBreakdown
        };
    }

    /**
     * Get user's total balance across all accounts
     */
    static async getUserBalance(userId) {
        const accounts = await Account.find({ user_id: userId, status: 'active' });
        
        const balanceSummary = {
            total_balance: 0,
            accounts: accounts.map(acc => ({
                account_number: acc.account_number,
                account_type: acc.account_type,
                balance: acc.balance,
                currency: acc.currency,
                last_transaction_date: acc.last_transaction_date
            }))
        };

        balanceSummary.total_balance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
        
        return balanceSummary;
    }

    /**
     * Get spending patterns and category-wise analysis
     */
    static async getSpendingAnalysis(accountNumber, timeframe = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - timeframe);

        return await Transaction.aggregate([
            {
                $match: {
                    account_number: accountNumber,
                    timestamp: { $gte: startDate },
                    status: 'success',
                    is_deleted: false
                }
            },
            {
                $group: {
                    _id: {
                        category: '$category',
                        type: '$transaction_type'
                    },
                    total_amount: { $sum: '$amount' },
                    count: { $sum: 1 },
                    average_amount: { $avg: '$amount' }
                }
            },
            {
                $group: {
                    _id: '$_id.category',
                    transactions: {
                        $push: {
                            type: '$_id.type',
                            total_amount: '$total_amount',
                            count: '$count',
                            average_amount: '$average_amount'
                        }
                    }
                }
            }
        ]);
    }
}

module.exports = BalanceService; 