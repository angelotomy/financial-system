const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, authorize, checkPermission, auditLog } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Transaction Summary
router.get('/summary',
    authorize('viewer'),
    checkPermission('transactions', 'READ'),
    auditLog('READ', 'SYSTEM'),
    dashboardController.getTransactionSummary
);

// Periodic Statistics
router.get('/periodic-stats',
    authorize('viewer'),
    checkPermission('transactions', 'READ'),
    auditLog('READ', 'SYSTEM'),
    dashboardController.getPeriodicStats
);

// Category Statistics
router.get('/category-stats',
    authorize('viewer'),
    checkPermission('transactions', 'READ'),
    auditLog('READ', 'SYSTEM'),
    dashboardController.getCategoryStats
);

// Status Statistics
router.get('/status-stats',
    authorize('viewer'),
    checkPermission('transactions', 'READ'),
    auditLog('READ', 'SYSTEM'),
    dashboardController.getStatusStats
);

module.exports = router; 