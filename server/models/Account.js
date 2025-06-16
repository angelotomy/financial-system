const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    account_number: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    user_id: {
        type: String,
        required: true,
        ref: 'User'
    },
    balance: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    account_type: {
        type: String,
        required: true,
        enum: ['savings', 'checking', 'credit'],
        default: 'savings'
    },
    currency: {
        type: String,
        required: true,
        default: 'INR'
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'inactive', 'frozen'],
        default: 'active'
    },
    last_transaction_date: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for faster queries
accountSchema.index({ user_id: 1, account_number: 1 });

const Account = mongoose.model('Account', accountSchema);

module.exports = Account; 