import express from "express";
import {
    getAllHomeBanners,
    createHomeBanner,
    deleteHomeBanner,
    toggleHomeBanner,
} from "../../controllers/admin/homeBanner.controller.js";

import { authenticateAdmin } from "../../middlewares/authenticateAdmin.js";
import { uploadShopBannerImage } from "../../middlewares/uploadImage.js"; // Reusing the same uploader

const router = express.Router();

router.get("/", authenticateAdmin, getAllHomeBanners);

router.post(
    "/",
    authenticateAdmin,
    uploadShopBannerImage.fields([
        { name: "image", maxCount: 1 },
        { name: "mobileImage", maxCount: 1 },
    ]),
    createHomeBanner
);

router.delete("/:id", authenticateAdmin, deleteHomeBanner);
router.patch("/:id/toggle", authenticateAdmin, toggleHomeBanner);

export default router;
