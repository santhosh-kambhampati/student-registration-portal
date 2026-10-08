/**
 * Authentication Middleware
 * Validates that the user is authenticated via session.
 */
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in.'
  });
}

module.exports = {
  isAuthenticated
};
