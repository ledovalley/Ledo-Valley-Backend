import Customer from "../../models/Customer.js";
import { generateCustomerToken } from "../../services/token.service.js";
import { sendOtpSms, verifyOtpSms } from "../../services/smsOtp.service.js";
import { sendEmailOtp } from "../../services/email.service.js";
import { normalizePhone } from "../../utils/normalizePhone.js";
import { isValidPhone } from "../../utils/validatePhone.js";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";

// Generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/* ======================================================
   REGISTER (Email/Password)
====================================================== */
export const register = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    if (!name || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ message: "Invalid phone number format. Must be 10 digits and not a repeating sequence." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const normalizedPhone = normalizePhone(phone);
    const lowercaseEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await Customer.findOne({
      $or: [{ email: lowercaseEmail }, { phone: normalizedPhone }],
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email or phone number already in use" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Create unverified customer
    const newCustomer = await Customer.create({
      name,
      email: lowercaseEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      emailVerificationOtp: otp,
      emailVerificationOtpExpires: otpExpires,
    });

    try {
      // Send OTP to email
      await sendEmailOtp(lowercaseEmail, otp, "verification");
    } catch (emailErr) {
      // If email fails to send (e.g., bad API key), delete the user so they can try again
      await Customer.findByIdAndDelete(newCustomer._id);
      throw emailErr; 
    }

    res.status(201).json({ message: "Registration successful. OTP sent to your email." });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Registration failed. Please check email service configuration." });
  }
};

/* ======================================================
   VERIFY EMAIL OTP (After Register)
====================================================== */
export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP required" });

    const customer = await Customer.findOne({ email: email.toLowerCase() }).select("+emailVerificationOtp +emailVerificationOtpExpires");
    
    if (!customer) return res.status(404).json({ message: "User not found" });
    if (customer.emailVerified) return res.status(400).json({ message: "Email already verified" });
    if (customer.emailVerificationOtp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (customer.emailVerificationOtpExpires < new Date()) return res.status(400).json({ message: "OTP has expired" });

    // Mark as verified
    customer.emailVerified = true;
    customer.emailVerificationOtp = undefined;
    customer.emailVerificationOtpExpires = undefined;
    await customer.save();

    const token = generateCustomerToken(customer._id);
    res.json({ message: "Email verified successfully", token, customer });
  } catch (err) {
    console.error("Verify Email OTP Error:", err);
    res.status(500).json({ message: "Verification failed" });
  }
};

/* ======================================================
   LOGIN (Email/Password)
====================================================== */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const customer = await Customer.findOne({ email: email.toLowerCase() }).select("+password");
    if (!customer) return res.status(401).json({ message: "Invalid email or password" });
    if (!customer.password) return res.status(401).json({ message: "Please use Google Sign-In or reset your password" });

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });
    if (!customer.emailVerified) return res.status(403).json({ message: "Please verify your email first", unverified: true });

    const token = generateCustomerToken(customer._id);
    // Remove password from response
    customer.password = undefined;

    res.json({ message: "Login successful", token, customer });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Login failed" });
  }
};

/* ======================================================
   FORGOT PASSWORD
====================================================== */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const lowercaseEmail = email.toLowerCase();
    const customer = await Customer.findOne({ email: lowercaseEmail });
    
    if (!customer) {
      // Return 200 even if not found to prevent email enumeration
      return res.json({ message: "If your email is registered, you will receive an OTP." });
    }

    const otp = generateOTP();
    customer.resetPasswordOtp = otp;
    customer.resetPasswordOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
    await customer.save();

    await sendEmailOtp(lowercaseEmail, otp, "reset_password");
    res.json({ message: "If your email is registered, you will receive an OTP." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Failed to process request" });
  }
};

/* ======================================================
   RESET PASSWORD
====================================================== */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ message: "All fields are required" });

    const customer = await Customer.findOne({ email: email.toLowerCase() }).select("+resetPasswordOtp +resetPasswordOtpExpires");
    if (!customer) return res.status(404).json({ message: "User not found" });

    if (customer.resetPasswordOtp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (customer.resetPasswordOtpExpires < new Date()) return res.status(400).json({ message: "OTP has expired" });

    customer.password = await bcrypt.hash(newPassword, 10);
    customer.resetPasswordOtp = undefined;
    customer.resetPasswordOtpExpires = undefined;
    await customer.save();

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Password reset failed" });
  }
};

/* ======================================================
   GOOGLE LOGIN
====================================================== */
export const googleLogin = async (req, res) => {
  try {
    const { token: googleToken } = req.body;
    if (!googleToken) return res.status(400).json({ message: "Google token required" });

    const clientId = "269574519983-ivgnorj2j3mev4t7p3ijn172gv58unnu.apps.googleusercontent.com";
    const client = new OAuth2Client(clientId);

    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: clientId,
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email } = payload;
    const lowercaseEmail = email.toLowerCase();

    let customer = await Customer.findOne({ email: lowercaseEmail });

    if (customer) {
      if (!customer.googleId) {
        customer.googleId = googleId;
        await customer.save();
      }
      const token = generateCustomerToken(customer._id);
      return res.json({ message: "Login successful", token, customer });
    } else {
      // User doesn't exist, need to collect phone number first
      return res.status(202).json({ 
        message: "Please provide a phone number to complete registration",
        action: "COLLECT_PHONE",
        googleToken // Return it so frontend can pass it to googleSignup
      });
    }
  } catch (err) {
    console.error("Google Login Error:", err);
    res.status(500).json({ message: "Google login failed" });
  }
};

/* ======================================================
   GOOGLE SIGNUP (Complete Registration)
====================================================== */
export const googleSignup = async (req, res) => {
  try {
    const { token: googleToken, phone } = req.body;
    if (!googleToken || !phone) {
      return res.status(400).json({ message: "Google token and phone required" });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({ message: "Invalid phone number format. Must be 10 digits and not a repeating sequence." });
    }
    
    const normalizedPhone = normalizePhone(phone);
    const existingPhone = await Customer.findOne({ phone: normalizedPhone });
    if (existingPhone) {
      return res.status(400).json({ message: "Phone number already in use by another account" });
    }

    const clientId = "269574519983-ivgnorj2j3mev4t7p3ijn172gv58unnu.apps.googleusercontent.com";
    const client = new OAuth2Client(clientId);

    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: clientId,
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, email_verified } = payload;
    const lowercaseEmail = email.toLowerCase();

    let customer = await Customer.findOne({ email: lowercaseEmail });
    if (customer) {
       return res.status(400).json({ message: "User already exists. Please log in." });
    }

    customer = await Customer.create({
      name,
      email: lowercaseEmail,
      googleId,
      emailVerified: email_verified,
      phone: normalizedPhone,
    });

    const token = generateCustomerToken(customer._id);
    res.status(201).json({ message: "Registration successful", token, customer });
  } catch (err) {
    console.error("Google Signup Error:", err);
    res.status(500).json({ message: "Google signup failed" });
  }
};

/* ======================================================
   LEGACY SEND OTP (SMS)
====================================================== */
export const sendOtp = async (req, res) => {
  try {
    let { phone } = req.body;
    if (!phone)
      return res.status(400).json({ message: "Phone number required" });

    phone = normalizePhone(phone);

    // Only allow for existing users
    const exists = await Customer.findOne({ phone });
    if (!exists) {
        return res.status(404).json({ message: "Phone number not found. Please register a new account." });
    }

    await sendOtpSms(phone);

    res.json({ message: "OTP sent via SMS" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

/* ======================================================
   LEGACY VERIFY OTP (SMS)
====================================================== */
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
    if (!customer) {
       return res.status(404).json({ message: "User not found." });
    }

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
