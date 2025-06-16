const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Role hierarchy
const roleHierarchy = {
    admin: ['admin', 'user', 'viewer'],
    user: ['user', 'viewer'],
    viewer: ['viewer']
};

// Permission matrix
const permissionMatrix = {
    admin: {
        users: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        transactions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        accounts: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        analytics: ['READ']
    },
    user: {
        users: ['READ'],
        transactions: ['CREATE', 'READ', 'UPDATE'],
        accounts: ['READ', 'UPDATE'],
        analytics: ['READ']
    },
    viewer: {
        users: ['READ'],
        transactions: ['READ'],
        accounts: ['READ'],
        analytics: ['READ']
    }
};

// Verify JWT token
exports.authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ success: false, error: 'Access token is required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

// Check role authorization
exports.authorize = (requiredRole) => {
    return async (req, res, next) => {
        try {
            const userRole = req.user.role;
            
            if (!roleHierarchy[userRole].includes(requiredRole)) {
                // Log unauthorized access attempt
                await createAuditLog({
                    user_id: req.user._id,
                    action: 'READ',
                    resource_type: 'SYSTEM',
                    resource_id: 'AUTHORIZATION',
                    description: `Unauthorized access attempt to ${req.originalUrl}`,
                    status: 'FAILURE',
                    ip_address: req.ip,
                    user_agent: req.get('user-agent')
                });

                return res.status(403).json({ 
                    success: false, 
                    error: 'Insufficient permissions' 
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

// Check specific permission
exports.checkPermission = (resource, action) => {
    return async (req, res, next) => {
        try {
            const userRole = req.user.role;
            const permissions = permissionMatrix[userRole][resource];

            if (!permissions || !permissions.includes(action)) {
                // Log unauthorized action attempt
                await createAuditLog({
                    user_id: req.user._id,
                    action: action,
                    resource_type: resource.toUpperCase(),
                    resource_id: req.params.id || 'GENERAL',
                    description: `Unauthorized action attempt: ${action} on ${resource}`,
                    status: 'FAILURE',
                    ip_address: req.ip,
                    user_agent: req.get('user-agent')
                });

                return res.status(403).json({ 
                    success: false, 
                    error: `Insufficient permissions for ${action} on ${resource}` 
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

// Audit logging middleware
exports.auditLog = (action, resourceType) => {
    return async (req, res, next) => {
        const oldSend = res.send;
        
        res.send = async function (data) {
            res.send = oldSend;
            
            try {
                const response = JSON.parse(data);
                
                await createAuditLog({
                    user_id: req.user._id,
                    action: action,
                    resource_type: resourceType,
                    resource_id: req.params.id || 'GENERAL',
                    description: `${action} operation on ${resourceType}`,
                    status: response.success ? 'SUCCESS' : 'FAILURE',
                    ip_address: req.ip,
                    user_agent: req.get('user-agent'),
                    old_values: req.method === 'PUT' ? req.body : null,
                    new_values: response.success ? response.data : null
                });
            } catch (error) {
                console.error('Error creating audit log:', error);
            }

            return res.send(data);
        };

        next();
    };
};

// Helper function to create audit logs
async function createAuditLog(logData) {
    try {
        const auditLog = new AuditLog(logData);
        await auditLog.save();
    } catch (error) {
        console.error('Error creating audit log:', error);
    }
} 