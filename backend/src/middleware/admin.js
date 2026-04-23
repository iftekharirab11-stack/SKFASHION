// Admin role check middleware
const { authenticateToken } = require('./auth');

/**
 * Middleware to check if user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const checkAdminRole = (req, res, next) => {
  // First authenticate the token
  authenticateToken(req, res, () => {
    // Then check if user has admin role
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  });
};

module.exports = { checkAdminRole };