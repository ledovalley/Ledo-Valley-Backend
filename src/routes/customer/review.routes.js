import express from "express";
import {
  addProductReview,
  addExternalReview,
  checkReviewEligibility,
  getTestimonials,
} from "../../controllers/customer/review.controller.js";
import { authenticateCustomer } from "../../middlewares/authenticateCustomer.js";
import { uploadImage } from "../../middlewares/uploadImage.js";

const router = express.Router();

// Check if customer can review a product
router.get(
  "/eligibility/:productId",
  authenticateCustomer,
  checkReviewEligibility
);

// Add review for a purchased product
router.post(
  "/:productId",
  authenticateCustomer,
  addProductReview
);

// Submit external/guest review (with optional image)
router.post(
  "/external",
  uploadImage.single("image"),
  addExternalReview
);

// Get testimonials (public)
router.get("/testimonials", getTestimonials);

export default router;