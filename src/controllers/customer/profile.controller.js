import Customer from "../../models/Customer.js";
import crypto from "crypto";
import { sendVerificationEmail } from "../../services/email.service.js";

/* ======================================================
   GET PROFILE
====================================================== */
export const getProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.id).select(
      "-emailVerificationToken -emailVerificationTokenExpires"
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};

/* ======================================================
   UPDATE NAME
====================================================== */
export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Valid name is required (minimum 2 characters)",
      });
    }

    if (name.trim().length > 80) {
      return res.status(400).json({
        success: false,
        message: "Name cannot exceed 80 characters",
      });
    }

    const customer = await Customer.findByIdAndUpdate(
      req.customer.id,
      { name: name.trim() },
      { new: true, runValidators: true }
    ).select("-emailVerificationToken -emailVerificationTokenExpires");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: customer,
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

/* ======================================================
   ADD / UPDATE EMAIL
====================================================== */
export const updateEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const existing = await Customer.findOne({ email: normalizedEmail });
    if (existing && existing._id.toString() !== req.customer.id) {
      return res.status(400).json({
        success: false,
        message: "Email already in use by another account",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const customer = await Customer.findById(req.customer.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    customer.email = normalizedEmail;
    customer.emailVerified = false;
    customer.emailVerificationToken = hashedToken;
    customer.emailVerificationTokenExpires = Date.now() + 1000 * 60 * 60;
    await customer.save();

    await sendVerificationEmail(normalizedEmail, rawToken);

    res.json({
      success: true,
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("UPDATE EMAIL ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update email",
    });
  }
};

/* ======================================================
   VERIFY EMAIL
====================================================== */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is missing",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const customer = await Customer.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpires: { $gt: Date.now() },
    });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    customer.emailVerified = true;
    customer.emailVerificationToken = undefined;
    customer.emailVerificationTokenExpires = undefined;
    await customer.save();

    res.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("VERIFY EMAIL ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify email",
    });
  }
};