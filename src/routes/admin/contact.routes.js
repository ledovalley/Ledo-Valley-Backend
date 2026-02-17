import express from "express";
import {
  listInquiries,
  updateInquiryStatus,
} from "../../controllers/admin/contact.controller.js";
import { authenticateAdmin } from "../../middlewares/authenticateAdmin.js";

const router = express.Router();

router.get("/contact", authenticateAdmin, listInquiries);
router.patch(
  "/contact/:inquiryId",
  authenticateAdmin,
  updateInquiryStatus
);

export default router;
