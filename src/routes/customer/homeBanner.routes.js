import express from "express";
import { getActiveHomeBanners } from "../../controllers/customer/homeBanner.controller.js";

const router = express.Router();

router.get("/", getActiveHomeBanners);

export default router;
