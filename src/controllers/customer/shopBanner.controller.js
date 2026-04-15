import ShopBanner from "../../models/ShopBanner.js";

export const getActiveShopBanners = async (req, res) => {
  const { teaType } = req.query;

  const query = { isActive: true };
  if (teaType) {
    query.teaType = teaType;
  } else {
    query.teaType = null;
  }

  let banners = await ShopBanner.find(query)
    .sort({ order: 1 })
    .lean();

  // Fallback: if no specific banners for requested teaType, show generic ones
  if (teaType && banners.length === 0) {
    banners = await ShopBanner.find({ isActive: true, teaType: null })
      .sort({ order: 1 })
      .lean();
  }

  res.json(banners);
};
