const Transaction = require('../models/Transaction');

// Helper function to get date range based on period
const getDateRange = (period) => {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
        case 'daily':
            startDate.setDate(endDate.getDate() - 1);
            break;
        case 'weekly':
            startDate.setDate(endDate.getDate() - 7);
            break;
        case 'monthly':
            startDate.setMonth(endDate.getMonth() - 1);
            break;
        case 'yearly':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
        default:
            startDate.setDate(endDate.getDate() - 30); // Default to 30 days
    }

    return { startDate, endDate };
};

// Get overall transaction summary
exports.getTransactionSummary = async (req, res) => {
    try {
        const { startDate, endDate } = getDateRange(req.query.period);

        const summary = await Transaction.aggregate([
            {
                $match: {
                    timestamp: { $gte: startDate, $lte: endDate },
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
                    },
                    credit_count: {
                        $sum: {
                            $cond: [{ $eq: ['$transaction_type', 'credit'] }, 1, 0]
                        }
                    },
                    debit_count: {
                        $sum: {
                            $cond: [{ $eq: ['$transaction_type', 'debit'] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: summary[0] || {
                total_transactions: 0,
                total_amount: 0,
                total_credit: 0,
                total_debit: 0,
                credit_count: 0,
                debit_count: 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get periodic statistics (daily/weekly/monthly)
exports.getPeriodicStats = async (req, res) => {
    try {
        const { startDate, endDate } = getDateRange(req.query.period);
        const groupByFormat = req.query.period === 'daily' ? '%Y-%m-%d' : '%Y-%m-%d-%H';

        const stats = await Transaction.aggregate([
            {
                $match: {
                    timestamp: { $gte: startDate, $lte: endDate },
                    is_deleted: false
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: groupByFormat, date: '$timestamp' } },
                        type: '$transaction_type'
                    },
                    count: { $sum: 1 },
                    total_amount: { $sum: '$amount' }
                }
            },
            {
                $group: {
                    _id: '$_id.date',
                    transactions: {
                        $push: {
                            type: '$_id.type',
                            count: '$count',
                            amount: '$total_amount'
                        }
                    }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get category-wise transaction breakdown
exports.getCategoryStats = async (req, res) => {
    try {
        const { startDate, endDate } = getDateRange(req.query.period);

        const categoryStats = await Transaction.aggregate([
            {
                $match: {
                    timestamp: { $gte: startDate, $lte: endDate },
                    is_deleted: false
                }
            },
            {
                $group: {
                    _id: '$category',
                    total_count: { $sum: 1 },
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
                    },
                    credit_count: {
                        $sum: {
                            $cond: [{ $eq: ['$transaction_type', 'credit'] }, 1, 0]
                        }
                    },
                    debit_count: {
                        $sum: {
                            $cond: [{ $eq: ['$transaction_type', 'debit'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $project: {
                    category: '$_id',
                    total_count: 1,
                    total_amount: 1,
                    credit_amount: 1,
                    debit_amount: 1,
                    credit_count: 1,
                    debit_count: 1,
                    average_amount: { $divide: ['$total_amount', '$total_count'] }
                }
            },
            { $sort: { total_count: -1 } }
        ]);

        res.json({
            success: true,
            data: categoryStats
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get status-wise transaction breakdown
exports.getStatusStats = async (req, res) => {
    try {
        const { startDate, endDate } = getDateRange(req.query.period);

        const statusStats = await Transaction.aggregate([
            {
                $match: {
                    timestamp: { $gte: startDate, $lte: endDate },
                    is_deleted: false
                }
            },
            {
                $group: {
                    _id: {
                        status: '$status',
                        type: '$transaction_type'
                    },
                    count: { $sum: 1 },
                    total_amount: { $sum: '$amount' }
                }
            },
            {
                $group: {
                    _id: '$_id.status',
                    transactions: {
                        $push: {
                            type: '$_id.type',
                            count: '$count',
                            amount: '$total_amount'
                        }
                    },
                    total_count: { $sum: '$count' },
                    total_amount: { $sum: '$total_amount' }
                }
            },
            {
                $project: {
                    status: '$_id',
                    transactions: 1,
                    total_count: 1,
                    total_amount: 1,
                    percentage: {
                        $multiply: [
                            { $divide: ['$total_count', { $sum: '$total_count' }] },
                            100
                        ]
                    }
                }
            },
            { $sort: { total_count: -1 } }
        ]);

        // Calculate trend
        const previousPeriod = new Date(startDate);
        previousPeriod.setDate(previousPeriod.getDate() - (endDate - startDate) / (1000 * 60 * 60 * 24));

        const trend = await Transaction.aggregate([
            {
                $match: {
                    timestamp: { $gte: previousPeriod, $lt: startDate },
                    is_deleted: false
                }
            },
            {
                $group: {
                    _id: '$status',
                    previous_count: { $sum: 1 }
                }
            }
        ]);

        // Add trend information to status stats
        const statusWithTrend = statusStats.map(status => {
            const previousStats = trend.find(t => t._id === status.status);
            const previousCount = previousStats ? previousStats.previous_count : 0;
            const trendPercentage = previousCount === 0 ? 100 : 
                ((status.total_count - previousCount) / previousCount) * 100;

            return {
                ...status,
                trend: {
                    previous_count: previousCount,
                    change_percentage: trendPercentage
                }
            };
        });

        res.json({
            success: true,
            data: statusWithTrend
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}; 