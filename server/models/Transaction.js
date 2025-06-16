const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transaction_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    required: true
  },
  account_number: {
    type: String,
    required: true
  },
  transaction_type: {
    type: String,
    enum: ['debit', 'credit'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  category: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  },
  is_deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // This will add createdAt and updatedAt fields
});

// Create an index on transaction_id for faster queries
transactionSchema.index({ transaction_id: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 