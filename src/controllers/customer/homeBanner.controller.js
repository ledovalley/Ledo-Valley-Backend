import HomeBanner from "../../models/HomeBanner.js";

export const getActiveHomeBanners = async (req, res) => {
    try {
        const banners = await HomeBanner.find({ isActive: true })
            .sort({ order: 1 })
            .lean();
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch home banners" });
    }
};
