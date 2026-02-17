import ShopBanner from "../../models/ShopBanner.js";
import cloudinary from "../../services/cloudinary.service.js";

/* =========================
   GET ALL (ADMIN)
========================= */
export const getAllBanners = async (req, res) => {
    const banners = await ShopBanner.find()
        .sort({ order: 1 })
        .lean();

    res.json(banners);
};

/* =========================
   CREATE
========================= */
export const createBanner = async (req, res) => {
    try {
        const { title, subtitle, buttonText, buttonLink } =
            req.body;

        if (!req.file) {
            return res
                .status(400)
                .json({ message: "Image required" });
        }

        const banner = await ShopBanner.create({
            image: {
                url: req.file.path,
                publicId: req.file.filename,
            },
            title,
            subtitle,
            buttonText,
            buttonLink,
        });

        res.json(banner);
    } catch (error) {
        res.status(500).json({
            message: "Failed to create banner",
        });
    }
};

/* =========================
   DELETE
========================= */
export const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;

        const banner = await ShopBanner.findById(id);

        if (!banner) {
            return res
                .status(404)
                .json({ message: "Not found" });
        }

        // delete from cloudinary
        await cloudinary.uploader.destroy(
            banner.image.publicId
        );

        await banner.deleteOne();

        res.json({ message: "Deleted successfully" });
    } catch {
        res.status(500).json({
            message: "Failed to delete",
        });
    }
};

/* =========================
   TOGGLE ACTIVE
========================= */
export const toggleBanner = async (req, res) => {
    const { id } = req.params;

    const banner = await ShopBanner.findById(id);

    banner.isActive = !banner.isActive;

    await banner.save();

    res.json({ message: "Updated" });
};
