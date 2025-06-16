const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, authorize, checkPermission, auditLog } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// User Management Routes
router.post('/users',
    authorize('admin'),
    checkPermission('users', 'CREATE'),
    auditLog('CREATE', 'USER'),
    adminController.createUser
);

router.get('/users',
    authorize('admin'),
    checkPermission('users', 'READ'),
    auditLog('READ', 'USER'),
    adminController.getUsers
);

router.put('/users/:id',
    authorize('admin'),
    checkPermission('users', 'UPDATE'),
    auditLog('UPDATE', 'USER'),
    adminController.updateUser
);

router.delete('/users/:id',
    authorize('admin'),
    checkPermission('users', 'DELETE'),
    auditLog('DELETE', 'USER'),
    adminController.deleteUser
);

// Analytics Routes
router.get('/analytics',
    authorize('admin'),
    checkPermission('analytics', 'READ'),
    auditLog('READ', 'SYSTEM'),
    adminController.getAnalytics
);

// Audit Log Routes
router.get('/audit-logs',
    authorize('admin'),
    checkPermission('users', 'READ'),
    auditLog('READ', 'SYSTEM'),
    adminController.getAuditLogs
);

module.exports = router; 