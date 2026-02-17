import ShopBanner from "../../models/ShopBanner.js";

export const getActiveShopBanners = async (req, res) => {
  const banners = await ShopBanner.find({
    isActive: true,
  })
    .sort({ order: 1 })
    .lean();

  res.json(banners);
};
