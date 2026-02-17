import express from "express";
import {
  listProducts,
  getSingleProduct,
} from "../../controllers/customer/product.controller.js";
import { authenticateCustomer } from "../../middlewares/authenticateCustomer.js";
import { addProductReview, checkReviewEligibility } from "../../controllers/customer/review.controller.js";

const router = express.Router();

/* =====================
   PRODUCT LISTING
===================== */
router.get("/products", listProducts);

/* =====================
   SINGLE PRODUCT VIEW
===================== */
router.get("/products/:slug", getSingleProduct);

router.post(
   "/products/:productId/review",
   authenticateCustomer,
   addProductReview,
);
router.get(
  "/products/:productId/review-eligibility",
  authenticateCustomer,
  checkReviewEligibility
);

export default router;
