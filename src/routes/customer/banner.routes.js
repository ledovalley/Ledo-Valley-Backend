import express from "express";
import { getActiveBanners } from "../../controllers/admin/banner.controller.js";

const router = express.Router();

router.get("/banner", getActiveBanners);

export default router;
