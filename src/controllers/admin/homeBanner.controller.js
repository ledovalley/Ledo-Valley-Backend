import HomeBanner from "../../models/HomeBanner.js";
import cloudinary from "../../services/cloudinary.service.js";

/* =========================
   GET ALL (ADMIN)
========================= */
export const getAllHomeBanners = async (req, res) => {
    try {
        const banners = await HomeBanner.find()
            .sort({ order: 1 })
            .lean();
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch home banners" });
    }
};

/* =========================
   CREATE
========================= */
export const createHomeBanner = async (req, res) => {
    try {
        const { title, subtitle, buttonText, buttonLink } = req.body;

        if (!req.files || !req.files["image"] || !req.files["image"][0]) {
            return res.status(400).json({ message: "Main image required" });
        }

        const imageFile = req.files["image"][0];
        const mobileImageFile = req.files["mobileImage"] ? req.files["mobileImage"][0] : null;

        const bannerData = {
            image: {
                url: imageFile.path,
                publicId: imageFile.filename,
            },
            title,
            subtitle,
            buttonText,
            buttonLink,
        };

        if (mobileImageFile) {
            bannerData.mobileImage = {
                url: mobileImageFile.path,
                publicId: mobileImageFile.filename,
            };
        }

        const banner = await HomeBanner.create(bannerData);
        res.json(banner);
    } catch (error) {
        res.status(500).json({ message: "Failed to create home banner" });
    }
};

/* =========================
   DELETE
========================= */
export const deleteHomeBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await HomeBanner.findById(id);

        if (!banner) {
            return res.status(404).json({ message: "Banner not found" });
        }

        if (banner.image?.publicId) {
            await cloudinary.uploader.destroy(banner.image.publicId);
        }
        if (banner.mobileImage?.publicId) {
            await cloudinary.uploader.destroy(banner.mobileImage.publicId);
        }

        await banner.deleteOne();
        res.json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete" });
    }
};

/* =========================
   TOGGLE ACTIVE
========================= */
export const toggleHomeBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await HomeBanner.findById(id);
        if (!banner) return res.status(404).json({ message: "Not found" });

        banner.isActive = !banner.isActive;
        await banner.save();
        res.json({ message: "Status updated" });
    } catch (error) {
        res.status(500).json({ message: "Update failed" });
    }
};
