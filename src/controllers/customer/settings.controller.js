import Settings from "../../models/Settings.js";

// @route   GET /api/public/settings
// @desc    Get global settings (public frontend)
export const getSettingsPublic = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({}); // Creates default settings
    }
    // Only return safe fields for the frontend
    res.json({
      codCharge: settings.codCharge,
      freeShippingThreshold: settings.freeShippingThreshold,
      flatShippingCharge: settings.flatShippingCharge,
      gstPercent: settings.gstPercent,
      companyName: settings.companyName,
      companyEmail: settings.companyEmail,
      companyPhone: settings.companyPhone,
    });
  } catch (error) {
    console.error("Get Public Settings Error:", error);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
};
