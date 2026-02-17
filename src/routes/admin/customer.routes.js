import express from "express";
import {
  listCustomers,
  getCustomerProfile,
} from "../../controllers/admin/customer.controller.js";
import { authenticateAdmin } from "../../middlewares/authenticateAdmin.js";

const router = express.Router();

/* =======================
   ADMIN CUSTOMER ROUTES
   Mounted at: /api/admin/customers
======================= */

router.get("/", authenticateAdmin, listCustomers);
router.get("/:id", authenticateAdmin, getCustomerProfile);

export default router;
