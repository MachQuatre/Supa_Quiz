module.exports = function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
      const { role } = req.user; // injecté par authMiddleware.js
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ message: "Accès interdit : rôle insuffisant" });
      }
      next();
    };
  };
  