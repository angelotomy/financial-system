const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        ref: 'User'
    },
    action: {
        type: String,
        required: true,
        enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT']
    },
    resource_type: {
        type: String,
        required: true,
        enum: ['USER', 'TRANSACTION', 'ACCOUNT', 'SYSTEM']
    },
    resource_id: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    ip_address: String,
    user_agent: String,
    old_values: mongoose.Schema.Types.Mixed,
    new_values: mongoose.Schema.Types.Mixed,
    status: {
        type: String,
        required: true,
        enum: ['SUCCESS', 'FAILURE'],
        default: 'SUCCESS'
    }
}, {
    timestamps: true
});

// Indexes for faster queries
auditLogSchema.index({ user_id: 1, action: 1 });
auditLogSchema.index({ resource_type: 1, resource_id: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog; 