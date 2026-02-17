import express from "express";
import { createCheckout } from "../../controllers/customer/checkout.controller.js";
import { authenticateCustomer } from "../../middlewares/authenticateCustomer.js";

const router = express.Router();

router.post("/checkout", authenticateCustomer, createCheckout);

export default router;
