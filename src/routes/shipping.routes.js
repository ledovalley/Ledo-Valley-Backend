import express from "express";
import { shiprocketWebhook } from "../controllers/customer/shipping.controller.js";

const router = express.Router();

router.post("/shipping/webhook", shiprocketWebhook);

export default router;
