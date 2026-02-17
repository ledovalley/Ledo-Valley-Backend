import express from "express";
import {
  getProfile,
  updateProfile,
  updateEmail,
  verifyEmail,
} from "../../controllers/customer/profile.controller.js";
import { authenticateCustomer } from "../../middlewares/authenticateCustomer.js";

const router = express.Router();

/* ======================================================
   PROFILE ROUTES
   Base: /api/customer
====================================================== */

// GET profile
router.get("/profile", authenticateCustomer, getProfile);

// UPDATE basic profile data (name etc)
router.put("/profile", authenticateCustomer, updateProfile);

// UPDATE email (sends verification)
router.put("/profile/email", authenticateCustomer, updateEmail);

// VERIFY email (public route)
router.get("/profile/verify-email", verifyEmail);

export default router;
