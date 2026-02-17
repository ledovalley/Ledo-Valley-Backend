import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Admin from "../src/models/Admin.js";
import { generateAdminPassword } from "../src/utils/generateAdminPassword.js";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const createAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const userId = `LV-ADMIN-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

    const plainPassword = generateAdminPassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const admin = await Admin.create({
      userId,
      passwordHash,
    });

    console.log("🎉 Admin created successfully");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`User ID  : ${admin.userId}`);
    console.log(`Password : ${plainPassword}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("⚠️  SAVE THESE CREDENTIALS. THEY WILL NOT BE SHOWN AGAIN.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to create admin", error);
    process.exit(1);
  }
};

createAdmin();
