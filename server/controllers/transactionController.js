const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// Helper function to handle errors
const handleError = (res, error) => {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
};

// Build a filter that works with either ObjectId (_id) or custom transaction_id
const buildIdFilter = (id) => {
    return mongoose.Types.ObjectId.isValid(id)
        ? { _id: id }
        : { transaction_id: id };
};

// Create a single transaction
exports.createTransaction = async (req, res) => {
    try {
        const transaction = new Transaction(req.body);
        const savedTransaction = await transaction.save();
        res.status(201).json({ success: true, data: savedTransaction });
    } catch (error) {
        handleError(res, error);
    }
};

// Get transactions with advanced filtering, searching, and sorting
exports.getTransactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        // Special handling for first page to show 20 items
        const limit = page === 1 ? 20 : 10;
        const skip = page === 1 ? 0 : (page - 1) * 10 + 10;

        // Build filter object
        const filter = { is_deleted: false };

        // Basic filters
        if (req.query.transaction_type) filter.transaction_type = req.query.transaction_type;
        if (req.query.category) filter.category = req.query.category;
        if (req.query.status) filter.status = req.query.status;
        if (req.query.user_id) filter.user_id = req.query.user_id;

        // Date range filter
        if (req.query.start_date || req.query.end_date) {
            filter.timestamp = {};
            if (req.query.start_date) filter.timestamp.$gte = new Date(req.query.start_date);
            if (req.query.end_date) filter.timestamp.$lte = new Date(req.query.end_date);
        }

        // Amount range filter
        if (req.query.min_amount || req.query.max_amount) {
            filter.amount = {};
            if (req.query.min_amount) filter.amount.$gte = parseFloat(req.query.min_amount);
            if (req.query.max_amount) filter.amount.$lte = parseFloat(req.query.max_amount);
        }

        // Search functionality
        const searchTerms = req.query.search?.trim();
        if (searchTerms) {
            const searchRegex = new RegExp(searchTerms, 'i');
            filter.$or = [
                { description: searchRegex },
                { account_number: searchRegex },
                { transaction_id: searchRegex }
            ];
        }

        // Specific field search
        if (req.query.description) {
            filter.description = new RegExp(req.query.description, 'i');
        }
        if (req.query.account_number) {
            filter.account_number = new RegExp(req.query.account_number, 'i');
        }
        if (req.query.transaction_id) {
            filter.transaction_id = new RegExp(req.query.transaction_id, 'i');
        }

        // Sorting
        let sortOptions = { timestamp: -1 }; // default sort
        if (req.query.sort_by) {
            const sortField = req.query.sort_by;
            const sortOrder = req.query.sort_order === 'asc' ? 1 : -1;
            
            // Validate sort field
            const allowedSortFields = ['timestamp', 'amount', 'transaction_type', 'category', 'status'];
            if (allowedSortFields.includes(sortField)) {
                sortOptions = { [sortField]: sortOrder };
            }
        }

        // Execute query with all filters and sorting
        const transactions = await Transaction.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const total = await Transaction.countDocuments(filter);

        // Calculate summary statistics if requested
        let summary = null;
        if (req.query.include_summary === 'true') {
            const aggregateResult = await Transaction.aggregate([
                { $match: filter },
                { 
                    $group: {
                        _id: null,
                        total_amount: { $sum: '$amount' },
                        average_amount: { $avg: '$amount' },
                        min_amount: { $min: '$amount' },
                        max_amount: { $max: '$amount' },
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
                        transaction_count: { $sum: 1 }
                    }
                }
            ]);
            
            summary = aggregateResult[0] || null;
        }

        // Get category distribution if requested
        let categoryDistribution = null;
        if (req.query.include_category_distribution === 'true') {
            categoryDistribution = await Transaction.aggregate([
                { $match: filter },
                { 
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 },
                        total_amount: { $sum: '$amount' }
                    }
                },
                { $sort: { count: -1 } }
            ]);
        }

        res.json({
            success: true,
            data: transactions,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_records: total,
                records_per_page: limit
            },
            summary,
            categoryDistribution,
            appliedFilters: {
                ...filter,
                sort: sortOptions
            }
        });
    } catch (error) {
        handleError(res, error);
    }
};

// Get a single transaction by ID
exports.getTransactionById = async (req, res) => {
    try {
        const transaction = await Transaction.findOne({
            ...buildIdFilter(req.params.id),
            is_deleted: false
        });
        
        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }
        
        res.json({ success: true, data: transaction });
    } catch (error) {
        handleError(res, error);
    }
};

// Update a transaction
exports.updateTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findOneAndUpdate(
            { ...buildIdFilter(req.params.id), is_deleted: false },
            req.body,
            { new: true, runValidators: true }
        );

        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        res.json({ success: true, data: transaction });
    } catch (error) {
        handleError(res, error);
    }
};

// Soft delete a transaction
exports.deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findOneAndUpdate(
            { ...buildIdFilter(req.params.id), is_deleted: false },
            { is_deleted: true },
            { new: true }
        );

        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        res.json({ success: true, message: 'Transaction deleted successfully' });
    } catch (error) {
        handleError(res, error);
    }
};

// Bulk Operations
exports.bulkCreateTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.insertMany(req.body.transactions);
        res.status(201).json({ success: true, data: transactions });
    } catch (error) {
        handleError(res, error);
    }
};

exports.bulkUpdateTransactions = async (req, res) => {
    try {
        const operations = req.body.transactions.map(transaction => ({
            updateOne: {
                filter: { _id: transaction._id, is_deleted: false },
                update: transaction
            }
        }));

        const result = await Transaction.bulkWrite(operations);
        res.json({ success: true, data: result });
    } catch (error) {
        handleError(res, error);
    }
};

// Helper to convert JSON array to CSV
const convertToCSV = (dataArray) => {
    if (!dataArray || dataArray.length === 0) return '';

    const headers = Object.keys(dataArray[0]).join(',');

    const rows = dataArray.map(obj => {
        return Object.values(obj).map(value => {
            if (value === null || value === undefined) return '';
            const str = value.toString().replace(/"/g, '""');
            // Wrap fields that contain commas, quotes or new lines in double quotes
            if (/[",\n]/.test(str)) {
                return `"${str}"`;
            }
            return str;
        }).join(',');
    });

    return [headers, ...rows].join('\n');
};

exports.bulkUpdateStatus = async (req, res) => {
    try {
        const { transactionIds = [], status } = req.body;
        if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
            return res.status(400).json({ success: false, error: 'transactionIds array is required' });
        }
        const allowedStatuses = ['success', 'failed', 'pending'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status value' });
        }

        const result = await Transaction.updateMany(
            { _id: { $in: transactionIds }, is_deleted: false },
            { status }
        );

        res.json({
            success: true,
            message: `${result.modifiedCount} transaction(s) updated successfully`,
            data: result
        });
    } catch (error) {
        handleError(res, error);
    }
};

exports.bulkExport = async (req, res) => {
    try {
        const { transactionIds = [] } = req.body;
        if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
            return res.status(400).json({ success: false, error: 'transactionIds array is required' });
        }

        const transactions = await Transaction.find({ _id: { $in: transactionIds }, is_deleted: false }).lean();
        if (!transactions.length) {
            return res.status(404).json({ success: false, error: 'No transactions found' });
        }

        const csvData = convertToCSV(transactions);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="selected-transactions.csv"');
        return res.status(200).end(csvData);
    } catch (error) {
        handleError(res, error);
    }
};

exports.exportTransactions = async (req, res) => {
    try {
        // Reuse the filtering logic from getTransactions
        // Build filter object
        const filter = { is_deleted: false };

        if (req.query.transaction_type) filter.transaction_type = req.query.transaction_type;
        if (req.query.category) filter.category = req.query.category;
        if (req.query.status) filter.status = req.query.status;
        if (req.query.user_id) filter.user_id = req.query.user_id;

        if (req.query.start_date || req.query.end_date) {
            filter.timestamp = {};
            if (req.query.start_date) filter.timestamp.$gte = new Date(req.query.start_date);
            if (req.query.end_date) filter.timestamp.$lte = new Date(req.query.end_date);
        }

        if (req.query.min_amount || req.query.max_amount) {
            filter.amount = {};
            if (req.query.min_amount) filter.amount.$gte = parseFloat(req.query.min_amount);
            if (req.query.max_amount) filter.amount.$lte = parseFloat(req.query.max_amount);
        }

        const searchTerms = req.query.search?.trim();
        if (searchTerms) {
            const searchRegex = new RegExp(searchTerms, 'i');
            filter.$or = [
                { description: searchRegex },
                { account_number: searchRegex },
                { transaction_id: searchRegex }
            ];
        }

        const transactions = await Transaction.find(filter).lean();
        if (!transactions.length) {
            return res.status(404).json({ success: false, error: 'No transactions found with provided filters' });
        }

        const csvData = convertToCSV(transactions);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
        return res.status(200).end(csvData);
    } catch (error) {
        handleError(res, error);
    }
};

// Modify bulkDeleteTransactions to also accept transactionIds key
exports.bulkDeleteTransactions = async (req, res) => {
    try {
        const ids = req.body.ids || req.body.transactionIds;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, error: 'ids/transactionIds array is required' });
        }
        const result = await Transaction.updateMany(
            { _id: { $in: ids }, is_deleted: false },
            { is_deleted: true }
        );

        res.json({
            success: true,
            message: `${result.modifiedCount} transaction(s) deleted successfully`
        });
    } catch (error) {
        handleError(res, error);
    }
};

// Get all available categories
exports.getCategories = async (req, res) => {
    try {
        // Default categories that should always be available
        const defaultCategories = [
            'Salary',
            'Investment',
            'Transfer',
            'Withdrawal',
            'Deposit',
            'Payment',
            'Refund',
            'Shopping',
            'Food',
            'Transportation',
            'Utilities',
            'Entertainment',
            'Healthcare',
            'Education',
            'Other'
        ];

        // Get categories from existing transactions
        const dbCategories = await Transaction.distinct('category', { is_deleted: false });
        
        // Combine default and DB categories, remove duplicates and nulls, and sort
        const allCategories = [...new Set([...defaultCategories, ...dbCategories])]
            .filter(Boolean)
            .sort();

        res.json({
            success: true,
            data: allCategories
        });
    } catch (error) {
        handleError(res, error);
    }
}; 