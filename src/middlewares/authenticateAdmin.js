import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_ADMIN_SECRET);

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    req.admin = {
      id: decoded.sub,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
