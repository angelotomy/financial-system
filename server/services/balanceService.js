const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

class BalanceService {
    /**
     * Validate and process a transaction
     */
    static async processTransaction(transactionData) {
        // Ensure mandatory fields exist or generate defaults
        const populatedData = {
            ...transactionData,
            transaction_id: transactionData.transaction_id || require('crypto').randomBytes(5).toString('hex'),
            // Only set category to 'misc' if it's not provided
            category: transactionData.category || 'misc'
        };

        let session;
        try {
            session = await mongoose.startSession();
            session.startTransaction();

            const result = await this._processWithSession(populatedData, session);
            await session.commitTransaction();
            return result;
        } catch (err) {
            if (session) await session.abortTransaction();
            
            // Fallback if sessions / transactions are not supported (code 20)
            if (err?.code === 20 || /Transaction numbers are only allowed/.test(err?.message || '')) {
                if (session) await session.endSession();
                return await this._processWithoutSession(populatedData);
            }
            
            throw err;
        } finally {
            if (session) await session.endSession();
        }
    }

    // Internal helper using a session
    static async _processWithSession(transactionData, session) {
        try {
            const account = await Account.findOne({
                account_number: transactionData.account_number,
                status: 'active'
            }).session(session);

            if (!account) {
                throw new Error('Account not found or inactive');
            }

            // attach user_id from account if missing
            if (!transactionData.user_id) transactionData.user_id = account.user_id.toString();

            await this.validateTransaction(account, transactionData);

            // Create transaction first
            const transaction = new Transaction({
                ...transactionData,
                status: 'pending'
            });

            // Save the pending transaction
            await transaction.save({ session });

            const newBalance = this.calculateNewBalance(account.balance, transactionData);

            // Update account balance
            await Account.findByIdAndUpdate(
                account._id,
                {
                    balance: newBalance,
                    last_transaction_date: new Date()
                },
                { session, new: true }
            );

            // Update transaction status to success
            transaction.status = 'success';
            await transaction.save({ session });

            return { success: true, transaction, newBalance };
        } catch (error) {
            throw error;
        }
    }

    // Internal helper without session (stand-alone Mongo)
    static async _processWithoutSession(transactionData) {
        try {
            const account = await Account.findOne({
                account_number: transactionData.account_number,
                status: 'active'
            });

            if (!account) {
                throw new Error('Account not found or inactive');
            }

            if (!transactionData.user_id) transactionData.user_id = account.user_id.toString();

            await this.validateTransaction(account, transactionData);

            // Create transaction first
            const transaction = await Transaction.create({
                ...transactionData,
                status: 'pending'
            });

            const newBalance = this.calculateNewBalance(account.balance, transactionData);

            // Update account balance
            await Account.updateOne(
                { _id: account._id },
                {
                    $set: { last_transaction_date: new Date() },
                    $inc: { balance: transactionData.transaction_type === 'credit' ? transactionData.amount : -transactionData.amount }
                }
            );

            // Update transaction status to success
            await Transaction.findByIdAndUpdate(
                transaction._id,
                { status: 'success' },
                { new: true }
            );

            return { success: true, transaction: { ...transaction.toObject(), status: 'success' }, newBalance };
        } catch (error) {
            // If there's an error, mark the transaction as failed
            if (transaction) {
                await Transaction.findByIdAndUpdate(
                    transaction._id,
                    { status: 'failed' }
                );
            }
            throw error;
        }
    }

    /**
     * Validate a transaction
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