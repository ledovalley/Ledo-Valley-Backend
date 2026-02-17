import express from "express";
import { createInquiry } from "../../controllers/customer/contact.controller.js";

const router = express.Router();

router.post("/contact", createInquiry);

export default router;
