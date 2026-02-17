import express from "express";
import Banner from "../../models/TopBanner.js";
import { reorderBanners, createBanner } from "../../controllers/admin/banner.controller.js";
import { authenticateAdmin } from "../../middlewares/authenticateAdmin.js";

const router = express.Router();


router.get("/", authenticateAdmin, async (req, res) => {
  const banners = await Banner.find().sort({ order: 1 });
  res.json(banners);
});

router.post("/", authenticateAdmin, createBanner);

router.delete("/:id", authenticateAdmin, async (req, res) => {
  await Banner.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

router.patch("/:id/toggle", authenticateAdmin, async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  banner.isActive = !banner.isActive;
  await banner.save();
  res.json(banner);
});

router.patch("/reorder", authenticateAdmin, reorderBanners);

export default router;
