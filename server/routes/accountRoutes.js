const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

// Account management routes
router.post('/', accountController.createAccount);
router.post('/transaction', accountController.processTransaction);
router.get('/:accountNumber/summary', accountController.getAccountSummary);
router.get('/user/:userId/balance', accountController.getUserBalance);
router.get('/:accountNumber/analysis', accountController.getSpendingAnalysis);

module.exports = router; 