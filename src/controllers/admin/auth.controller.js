import bcrypt from "bcrypt";
import Admin from "../../models/Admin.js";
import { generateAdminToken } from "../../services/token.service.js";

// Simple in-memory brute force protection
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

export const adminLogin = async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        message: "User ID and password are required",
      });
    }

    if (userId.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Check brute force
    const key = userId.toLowerCase();
    const attempt = loginAttempts.get(key);

    if (attempt) {
      const timePassed = Date.now() - attempt.firstAttempt;

      if (attempt.count >= MAX_ATTEMPTS && timePassed < LOCK_TIME) {
        const minutesLeft = Math.ceil(
          (LOCK_TIME - timePassed) / 60000
        );
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Please try again in ${minutesLeft} minute(s)`,
        });
      }

      // Reset after lock time
      if (timePassed >= LOCK_TIME) {
        loginAttempts.delete(key);
      }
    }

    const admin = await Admin.findOne({ userId });

    if (!admin || !admin.isActive) {
      // Track failed attempt
      const current = loginAttempts.get(key) || {
        count: 0,
        firstAttempt: Date.now(),
      };
      current.count += 1;
      loginAttempts.set(key, current);

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      admin.passwordHash
    );

    if (!isPasswordValid) {
      // Track failed attempt
      const current = loginAttempts.get(key) || {
        count: 0,
        firstAttempt: Date.now(),
      };
      current.count += 1;
      loginAttempts.set(key, current);

      const attemptsLeft = MAX_ATTEMPTS - current.count;

      return res.status(401).json({
        success: false,
        message:
          attemptsLeft > 0
            ? `Invalid credentials. ${attemptsLeft} attempt(s) remaining`
            : "Account temporarily locked. Try again in 15 minutes",
      });
    }

    // Clear attempts on successful login
    loginAttempts.delete(key);

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = generateAdminToken(admin._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
