import express from "express";
import {
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
  getAllCoupons,
} from "../../controllers/admin/coupon.controller.js";
import { authenticateAdmin } from "../../middlewares/authenticateAdmin.js";

const router = express.Router();

router.get("/coupons", authenticateAdmin, getAllCoupons);
router.post("/coupons", authenticateAdmin, createCoupon);
router.put("/coupons/:couponId", authenticateAdmin, updateCoupon);
router.put("/coupons/:couponId/toggle", authenticateAdmin, toggleCouponStatus);
router.delete("/coupons/:couponId", authenticateAdmin, deleteCoupon);

export default router;
