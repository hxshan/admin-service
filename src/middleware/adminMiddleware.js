// admin-service/src/middleware/adminAuth.js
const jwt = require("jsonwebtoken");
const { Admin } = require("../models/admin");

/**
 * Middleware to verify if the request is from an authenticated admin
 */
const adminAuth = async (req, res, next) => {
  try {
    // Check if authorization header exists
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Access denied. No token provided."
      });
    }

    // Extract token from header
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Access denied. Invalid token format."
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
      
      // Check if isAdmin flag exists and is true
      if (!decoded.isAdmin) {
        return res.status(403).json({
          status: "error",
          message: "Access denied. Admin privileges required."
        });
      }

      // Find admin by ID
      const admin = await Admin.findById(decoded._id);
      if (!admin) {
        return res.status(401).json({
          status: "error",
          message: "Invalid token. Admin not found."
        });
      }

      // Attach admin info to request
      req.admin = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        status: "error",
        message: "Invalid token."
      });
    }
  } catch (error) {
    console.error("Error in admin auth middleware:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

module.exports = adminAuth;