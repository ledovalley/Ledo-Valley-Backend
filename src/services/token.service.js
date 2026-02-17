import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const generateAdminToken = (adminId) => {
  return jwt.sign(
    {
      sub: adminId,
      role: "ADMIN",
      iss: "ledo-valley-admin",
    },
    env.JWT_ADMIN_SECRET,
    { expiresIn: env.JWT_ADMIN_EXPIRES }
  );
};

export const generateCustomerToken = (customerId) => {
  return jwt.sign(
    {
      sub: customerId,
      role: "CUSTOMER",
      iss: "ledo-valley-customer",
    },
    env.JWT_CUSTOMER_SECRET,
    { expiresIn: env.JWT_CUSTOMER_EXPIRES }
  );
};
