const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_dev_jwt_key_900b9562";

/**
 * Middleware to verify JWT token and attach user to req.user
 */
const authenticateToken = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header: Bearer <token>
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query && req.query.token) {
      // Support token in query string for file downloads / PDF links
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: "Access denied. Authentication token is missing." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ error: "User associated with token no longer exists." });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Your account has been deactivated. Please contact an administrator." });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token has expired. Please log in again." });
    }
    return res.status(401).json({ error: "Invalid authentication token." });
  }
};

/**
 * Middleware to restrict access to administrators only
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin privileges required." });
  }
  next();
};

/**
 * Middleware to verify staff or admin access
 */
const requireStaffOrAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== "staff" && req.user.role !== "admin")) {
    return res.status(403).json({ error: "Forbidden: Authorized staff or admin access required." });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireStaffOrAdmin,
  JWT_SECRET,
};
