import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const authenticateCustomer = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_CUSTOMER_SECRET);

    if (decoded.role !== "CUSTOMER") {
      return res.status(403).json({ message: "Forbidden" });
    }

    req.customer = { id: decoded.sub };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
