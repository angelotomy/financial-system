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

// Single transaction routes
router.post('/', transactionController.createTransaction);
router.get('/', transactionController.getTransactions);
router.get('/:id', transactionController.getTransactionById);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router; 