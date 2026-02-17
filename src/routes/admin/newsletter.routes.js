import express from "express";
import {
  sendNewsletter,
  listSubscribers,
  listCampaigns,
} from "../../controllers/admin/newsletter.controller.js";
import { authenticateAdmin } from "../../middlewares/authenticateAdmin.js";

const router = express.Router();

/* ======================================================
   ADMIN NEWSLETTER ROUTES
   Mounted at: /api/admin/newsletter
====================================================== */

router.get("/subscribers", authenticateAdmin, listSubscribers);
router.get("/campaigns", authenticateAdmin, listCampaigns);
router.post("/send", authenticateAdmin, sendNewsletter);

export default router;
