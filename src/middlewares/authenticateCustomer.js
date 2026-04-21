import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const authenticateCustomer = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if header exists and has correct format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Check if token is empty after splitting
    if (!token || token.trim() === "") {
      return res.status(401).json({
        success: false,
        message: "Access denied. Token is empty.",
      });
    }

    const decoded = jwt.verify(token, env.JWT_CUSTOMER_SECRET);

    // Check role
    if (decoded.role !== "CUSTOMER") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Not a customer account.",
      });
    }

    // Check token has subject
    if (!decoded.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid token structure.",
      });
    }

    req.customer = { id: decoded.sub };
    next();

  } catch (error) {
    // Specific error messages for different JWT errors
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};
