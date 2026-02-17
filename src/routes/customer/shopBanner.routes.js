import express from "express";
import { getActiveShopBanners } from "../../controllers/customer/shopBanner.controller.js";

const router = express.Router();

router.get("/", getActiveShopBanners);

export default router;
