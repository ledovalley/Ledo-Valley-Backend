import express from "express";
import {
    getAllBanners,
    createBanner,
    deleteBanner,
    toggleBanner,
} from "../../controllers/admin/shopBanner.controller.js";

import { authenticateAdmin } from "../../middlewares/authenticateAdmin.js";
import { uploadShopBannerImage } from "../../middlewares/uploadImage.js";

const router = express.Router();

router.get("/", authenticateAdmin, getAllBanners);

router.post(
    "/",
    authenticateAdmin,
    uploadShopBannerImage.single("image"),
    createBanner
);

router.delete(
    "/:id",
    authenticateAdmin,
    deleteBanner
);

router.patch(
    "/:id/toggle",
    authenticateAdmin,
    toggleBanner
);

export default router;
