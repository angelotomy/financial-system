const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// Bulk operation routes – MUST appear before routes with :id param to avoid conflicts
router.post('/bulk', transactionController.bulkCreateTransactions);
router.put('/bulk', transactionController.bulkUpdateTransactions);
router.delete('/bulk', transactionController.bulkDeleteTransactions);

// Additional bulk utility routes
router.post('/bulk-update-status', transactionController.bulkUpdateStatus);
router.post('/bulk-export', transactionController.bulkExport);

// Export transactions with filters
router.get('/export', transactionController.exportTransactions);

// Get all categories
router.get('/categories', transactionController.getCategories);

// Get all transactions with filtering
router.get('/', transactionController.getTransactions);

// Get a single transaction
router.get('/:id', transactionController.getTransactionById);

// Create a new transaction
router.post('/', transactionController.createTransaction);

// Update a transaction
router.put('/:id', transactionController.updateTransaction);

// Delete a transaction
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router; 