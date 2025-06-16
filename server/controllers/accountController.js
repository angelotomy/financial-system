const Account = require('../models/Account');
const BalanceService = require('../services/balanceService');

// Helper function to handle errors
const handleError = (res, error) => {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
};

// Create a new account
exports.createAccount = async (req, res) => {
    try {
        const account = new Account(req.body);
        const savedAccount = await account.save();
        res.status(201).json({ success: true, data: savedAccount });
    } catch (error) {
        handleError(res, error);
    }
};

// Process a new transaction
exports.processTransaction = async (req, res) => {
    try {
        const result = await BalanceService.processTransaction(req.body);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        if (error.message === 'Insufficient funds') {
            res.status(400).json({ success: false, error: error.message });
        } else {
            handleError(res, error);
        }
    }
};

// Get account balance and summary
exports.getAccountSummary = async (req, res) => {
    try {
        const summary = await BalanceService.getAccountSummary(req.params.accountNumber);
        res.json({ success: true, data: summary });
    } catch (error) {
        handleError(res, error);
    }
};

// Get user's total balance across all accounts
exports.getUserBalance = async (req, res) => {
    try {
        const balance = await BalanceService.getUserBalance(req.params.userId);
        res.json({ success: true, data: balance });
    } catch (error) {
        handleError(res, error);
    }
};

// Get spending analysis
exports.getSpendingAnalysis = async (req, res) => {
    try {
        const timeframe = parseInt(req.query.timeframe) || 30;
        const analysis = await BalanceService.getSpendingAnalysis(
            req.params.accountNumber,
            timeframe
        );
        res.json({ success: true, data: analysis });
    } catch (error) {
        handleError(res, error);
    }
}; 