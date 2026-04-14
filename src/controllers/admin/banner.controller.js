import Banner from "../../models/TopBanner.js";

/* ==========================
   GET ACTIVE BANNER (PUBLIC)
========================== */
export const getActiveBanners = async (req, res) => {
    try {
        const now = new Date();

        const banners = await Banner.find({
            isActive: true,
            $and: [
                {
                    $or: [
                        { startDate: { $exists: false } },
                        { startDate: null },
                        { startDate: { $lte: now } },
                    ],
                },
                {
                    $or: [
                        { endDate: { $exists: false } },
                        { endDate: null },
                        { endDate: { $gte: now } },
                    ],
                },
            ],
        })
            .sort({ order: 1, createdAt: -1 })
            .lean();

        res.json(banners);
    } catch {
        res.status(500).json({ message: "Failed to fetch banners" });
    }
};

/* ==========================
   ADMIN CREATE
========================== */
export const createBanner = async (req, res) => {
    try {
        const {
            message,
            couponCode,
            visibility,
            startDate,
            endDate,
            isActive,
        } = req.body;

        const count = await Banner.countDocuments();

        const banner = await Banner.create({
            message,
            couponCode,
            visibility,
            startDate: startDate || null,
            endDate: endDate || null,
            isActive: typeof isActive === "boolean" ? isActive : true,
            order: count,
        });

        res.json(banner);
    } catch {
        res.status(500).json({ message: "Failed to create banner" });
    }
};

/* ==========================
   ADMIN UPDATE
========================== */
export const updateBanner = async (req, res) => {
    try {
        const {
            message,
            couponCode,
            visibility,
            startDate,
            endDate,
            isActive,
        } = req.body;

        const banner = await Banner.findByIdAndUpdate(
            req.params.id,
            {
                message,
                couponCode,
                visibility,
                startDate: startDate || null,
                endDate: endDate || null,
                isActive,
            },
            { new: true, runValidators: true }
        );

        if (!banner) {
            return res.status(404).json({ message: "Banner not found" });
        }

        res.json(banner);
    } catch {
        res.status(500).json({ message: "Failed to update banner" });
    }
};

export const reorderBanners = async (req, res) => {
    try {
        const { orderedIds } = req.body;

        for (let i = 0; i < orderedIds.length; i++) {
            await Banner.findByIdAndUpdate(orderedIds[i], {
                order: i,
            });
        }

        res.json({ message: "Banners reordered" });
    } catch {
        res.status(500).json({ message: "Failed to reorder" });
    }
};