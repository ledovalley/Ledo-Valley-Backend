import Settings from "../../models/Settings.js";

// @route   GET /api/admin/settings
// @desc    Get global settings (admin)
export const getSettingsAdmin = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({}); // Creates default settings
    }
    res.json(settings);
  } catch (error) {
    console.error("Get Settings Error:", error);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
};

// @route   PUT /api/admin/settings
// @desc    Update global settings (admin)
export const updateSettingsAdmin = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }
    res.json({ message: "Settings updated successfully", settings });
  } catch (error) {
    console.error("Update Settings Error:", error);
    res.status(500).json({ message: "Failed to update settings" });
  }
};
