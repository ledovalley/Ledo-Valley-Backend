import express from "express";
import { 
  register, 
  verifyEmailOtp, 
  login, 
  forgotPassword, 
  resetPassword, 
  googleLogin,
  googleSignup,
  sendOtp, 
  verifyOtpController 
} from "../../controllers/customer/auth.controller.js";
import { smsOtpLimiter, emailOtpLimiter } from "../../middlewares/rateLimiter.js";

const router = express.Router();

// New Email/Password Auth
router.post("/register", emailOtpLimiter, register);
router.post("/verify-email-otp", verifyEmailOtp);
router.post("/login", login);
router.post("/forgot-password", emailOtpLimiter, forgotPassword);
router.post("/reset-password", resetPassword);

// Google Auth
router.post("/google-login", googleLogin);
router.post("/google-signup", googleSignup);

// Legacy SMS Auth (Strictly Rate Limited)
router.post("/send-otp", smsOtpLimiter, sendOtp);
router.post("/verify-otp", verifyOtpController);

export default router;
