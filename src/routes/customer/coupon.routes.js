import express from "express";
import {
  listActiveCoupons,
  validateCoupon,
} from "../../controllers/customer/coupon.controller.js";

const router = express.Router();

router.get("/coupons", listActiveCoupons);
router.post("/coupons/validate", validateCoupon);

export default router;
