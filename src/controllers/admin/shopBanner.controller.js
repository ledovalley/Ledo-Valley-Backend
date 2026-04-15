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

export const createBanner = async (req, res) => {
    try {
        const { title, subtitle, buttonText, buttonLink, teaType } =
            req.body;

        if (!req.files || !req.files["image"] || !req.files["image"][0]) {
            return res
                .status(400)
                .json({ message: "Main image required" });
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
            teaType: teaType || null,
        };

        if (mobileImageFile) {
            bannerData.mobileImage = {
                url: mobileImageFile.path,
                publicId: mobileImageFile.filename,
            };
        }

        const banner = await ShopBanner.create(bannerData);

        res.json(banner);
    } catch (error) {
        console.error("CREATE BANNER ERROR:", error);
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
        if (banner.image?.publicId) {
            await cloudinary.uploader.destroy(
                banner.image.publicId
            );
        }

        if (banner.mobileImage?.publicId) {
            await cloudinary.uploader.destroy(
                banner.mobileImage.publicId
            );
        }

        await banner.deleteOne();

        res.json({ message: "Deleted successfully" });
    } catch (error) {
        console.error("DELETE BANNER ERROR:", error);
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
