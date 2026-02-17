import Customer from "../../models/Customer.js";
import crypto from "crypto";
import { sendVerificationEmail } from "../../services/email.service.js";

/* ======================================================
   GET PROFILE
====================================================== */
export const getProfile = async (req, res) => {
  const customer = await Customer.findById(req.customer.id).select(
    "-emailVerificationToken -emailVerificationTokenExpires"
  );

  if (!customer)
    return res.status(404).json({ message: "Customer not found" });

  res.json(customer);
};

/* ======================================================
   UPDATE NAME
====================================================== */
export const updateProfile = async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      message: "Valid name required",
    });
  }

  const customer = await Customer.findByIdAndUpdate(
    req.customer.id,
    { name: name.trim() },
    { new: true, runValidators: true }
  ).select("-emailVerificationToken -emailVerificationTokenExpires");

  res.json(customer);
};

/* ======================================================
   ADD / UPDATE EMAIL
====================================================== */
export const updateEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  // Check if email already exists
  const existing = await Customer.findOne({ email: normalizedEmail });

  if (
    existing &&
    existing._id.toString() !== req.customer.id
  ) {
    return res.status(400).json({
      message: "Email already in use",
    });
  }

  // Generate secure token
  const rawToken = crypto.randomBytes(32).toString("hex");

  // Hash token before saving (SECURITY)
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const customer = await Customer.findById(req.customer.id);

  customer.email = normalizedEmail;
  customer.emailVerified = false;
  customer.emailVerificationToken = hashedToken;
  customer.emailVerificationTokenExpires =
    Date.now() + 1000 * 60 * 60; // 1 hour

  await customer.save();

  // Send raw token to email (not hashed)
  await sendVerificationEmail(normalizedEmail, rawToken);

  res.json({
    message: "Verification email sent",
  });
};

/* ======================================================
   VERIFY EMAIL
====================================================== */
export const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({
      message: "Token missing",
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
      message: "Invalid or expired token",
    });
  }

  customer.emailVerified = true;
  customer.emailVerificationToken = undefined;
  customer.emailVerificationTokenExpires = undefined;

  await customer.save();

  res.json({
    message: "Email verified successfully",
  });
};
