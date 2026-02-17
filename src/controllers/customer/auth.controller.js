import Customer from "../../models/Customer.js";
import { generateCustomerToken } from "../../services/token.service.js";
import { sendOtpSms, verifyOtpSms } from "../../services/smsOtp.service.js";
import { normalizePhone } from "../../utils/normalizePhone.js";

/**
 * SEND OTP
 */
export const sendOtp = async (req, res) => {
  try {
    let { phone } = req.body;
    if (!phone)
      return res.status(400).json({ message: "Phone number required" });

    phone = normalizePhone(phone);

    await sendOtpSms(phone);

    res.json({ message: "OTP sent via SMS" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

/**
 * VERIFY OTP
 */
export const verifyOtpController = async (req, res) => {
  try {
    let { phone, otp } = req.body;
    if (!phone || !otp)
      return res.status(400).json({ message: "Phone and OTP required" });

    phone = normalizePhone(phone);

    const approved = await verifyOtpSms(phone, otp);
    if (!approved)
      return res.status(401).json({ message: "Invalid OTP" });

    let customer = await Customer.findOne({ phone });
    if (!customer) customer = await Customer.create({ phone });

    const token = generateCustomerToken(customer._id);

    res.json({
      message: "Login successful",
      token,
      customer,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "OTP verification failed" });
  }
};
