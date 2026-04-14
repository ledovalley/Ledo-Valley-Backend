import express from "express";
import Banner from "../../models/TopBanner.js";
import {
  reorderBanners,
  createBanner,
  updateBanner,
} from "../../controllers/admin/banner.controller.js";
import { authenticateAdmin } from "../../middlewares/authenticateAdmin.js";

const router = express.Router();

router.get("/", authenticateAdmin, async (req, res) => {
  const banners = await Banner.find().sort({ order: 1 });
  res.json(banners);
});

router.post("/", authenticateAdmin, createBanner);

router.patch("/reorder", authenticateAdmin, reorderBanners);

router.patch("/:id/toggle", authenticateAdmin, async (req, res) => {
  const banner = await Banner.findById(req.params.id);

  if (!banner) {
    return res.status(404).json({ message: "Banner not found" });
  }

  banner.isActive = !banner.isActive;
  await banner.save();
  res.json(banner);
});

router.patch("/:id", authenticateAdmin, updateBanner);

router.delete("/:id", authenticateAdmin, async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);

  if (!banner) {
    return res.status(404).json({ message: "Banner not found" });
  }

  res.json({ message: "Deleted" });
});

export default router;