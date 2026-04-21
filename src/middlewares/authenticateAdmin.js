import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const authenticateAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token || token.trim() === "") {
      return res.status(401).json({
        success: false,
        message: "Access denied. Token is empty.",
      });
    }

    const decoded = jwt.verify(token, env.JWT_ADMIN_SECRET);

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Not an admin account.",
      });
    }

    if (!decoded.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid token structure.",
      });
    }

    req.admin = { id: decoded.sub };
    next();

  } catch (error) {
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