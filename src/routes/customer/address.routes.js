import express from "express";
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../../controllers/customer/address.controller.js";
import { authenticateCustomer } from "../../middlewares/authenticateCustomer.js";

const router = express.Router();

/* ======================================================
   ADDRESS ROUTES
   Base: /api/customer
====================================================== */

// GET all addresses
router.get("/addresses", authenticateCustomer, getAddresses);

// ADD new address
router.post("/addresses", authenticateCustomer, addAddress);

// UPDATE address
router.put(
  "/addresses/:addressId",
  authenticateCustomer,
  updateAddress
);

// DELETE address
router.delete(
  "/addresses/:addressId",
  authenticateCustomer,
  deleteAddress
);

// SET default address
router.patch(
  "/addresses/:addressId/default",
  authenticateCustomer,
  setDefaultAddress
);

export default router;
