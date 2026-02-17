import express from "express";
import {
  subscribeNewsletter,
  verifyNewsletter,
  unsubscribeNewsletter,
} from "../../controllers/customer/newsletter.controller.js";

const router = express.Router();

/* ======================================================
   PUBLIC NEWSLETTER ROUTES
   Mounted at: /api/newsletter
====================================================== */

router.post("/subscribe", subscribeNewsletter);
router.get("/verify", verifyNewsletter);
router.get("/unsubscribe", unsubscribeNewsletter);

export default router;
