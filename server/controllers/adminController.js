const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const AuditLog = require('../models/AuditLog');

// User Management
exports.createUser = async (req, res) => {
    try {
        const user = new User(req.body);
        const savedUser = await user.save();
        res.status(201).json({ success: true, data: savedUser });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;

        let query = {};
        if (search) {
            query = {
                $or: [
                    { name: new RegExp(search, 'i') },
                    { email: new RegExp(search, 'i') }
                ]
            };
        }

        const users = await User.find(query)
            .select('-password')
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: users,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_records: total,
                records_per_page: limit
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Analytics
exports.getAnalytics = async (req, res) => {
    try {
        const timeframe = req.query.timeframe || '30'; // days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(timeframe));

        // Transaction Summary
        const transactionSummary = await Transaction.aggregate([
            {
                $match: {
                    timestamp: { $gte: startDate },
                    status: 'success',
                    is_deleted: false
                }
            },
            {
                $group: {
                    _id: null,
                    total_transactions: { $sum: 1 },
                    total_amount: { $sum: '$amount' },
                    total_credit: {
                        $sum: {
                            $cond: [{ $eq: ['$transaction_type', 'credit'] }, '$amount', 0]
                        }
                    },
                    total_debit: {
                        $sum: {
                            $cond: [{ $eq: ['$transaction_type', 'debit'] }, '$amount', 0]
                        }
                    }
                }
            }
        ]);

        // Category-wise Analysis
        const categoryAnalysis = await Transaction.aggregate([
            {
                $match: {
                    timestamp: { $gte: startDate },
                    status: 'success',
                    is_deleted: false
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    total_amount: { $sum: '$amount' },
                    credit_amount: {
                        $sum: {
                            $cond: [{ $eq: ['$transaction_type', 'credit'] }, '$amount', 0]
                        }
                    },
                    debit_amount: {
                        $sum: {
                            $cond: [{ $eq: ['$transaction_type', 'debit'] }, '$amount', 0]
                        }
                    }
                }
            },
            { $sort: { total_amount: -1 } }
        ]);

        // Daily Transaction Trend
        const dailyTrend = await Transaction.aggregate([
            {
                $match: {
                    timestamp: { $gte: startDate },
                    status: 'success',
                    is_deleted: false
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                        type: '$transaction_type'
                    },
                    total_amount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.date',
                    transactions: {
                        $push: {
                            type: '$_id.type',
                            amount: '$total_amount',
                            count: '$count'
                        }
                    }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // User Statistics
        const userStats = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Account Statistics
        const accountStats = await Account.aggregate([
            {
                $group: {
                    _id: '$account_type',
                    count: { $sum: 1 },
                    total_balance: { $sum: '$balance' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                transaction_summary: transactionSummary[0] || null,
                category_analysis: categoryAnalysis,
                daily_trend: dailyTrend,
                user_statistics: userStats,
                account_statistics: accountStats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Audit Log Management
exports.getAuditLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startDate = req.query.start_date ? new Date(req.query.start_date) : null;
        const endDate = req.query.end_date ? new Date(req.query.end_date) : null;

        let query = {};
        
        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = startDate;
            if (endDate) query.createdAt.$lte = endDate;
        }

        // Action filter
        if (req.query.action) {
            query.action = req.query.action;
        }

        // Resource type filter
        if (req.query.resource_type) {
            query.resource_type = req.query.resource_type;
        }

        // User filter
        if (req.query.user_id) {
            query.user_id = req.query.user_id;
        }

        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await AuditLog.countDocuments(query);

        res.json({
            success: true,
            data: logs,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_records: total,
                records_per_page: limit
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}; 