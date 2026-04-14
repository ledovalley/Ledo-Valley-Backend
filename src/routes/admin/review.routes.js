import express from "express";
import {
  getAllReviews,
  deleteReview,
  toggleTestimonial,
  getTestimonials,
  updateReviewStatus,
} from "../../controllers/customer/review.controller.js";
import { authenticateAdmin } from "../../middlewares/authenticateAdmin.js";

const router = express.Router();

router.get("/", authenticateAdmin, getAllReviews);
router.get("/testimonials", getTestimonials);

router.delete(
  "/:productId/:reviewId",
  authenticateAdmin,
  deleteReview
);

router.patch(
  "/:productId/:reviewId/testimonial",
  authenticateAdmin,
  toggleTestimonial
);

router.put(
  "/:productId/:reviewId/status",
  authenticateAdmin,
  updateReviewStatus
);

export default router;
