import bcrypt from "bcrypt";
import Admin from "../../models/Admin.js";
import { generateAdminToken } from "../../services/token.service.js";

export const adminLogin = async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({
        message: "User ID and password are required",
      });
    }

    const admin = await Admin.findOne({ userId });

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      admin.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = generateAdminToken(admin._id);

    return res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
