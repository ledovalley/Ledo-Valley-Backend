import mongoose from "mongoose";
import Customer from "./src/models/Customer.js";
import { env } from "./src/config/env.js";
import dotenv from "dotenv";

dotenv.config();

const cleanUnverified = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/ledo_valley");
    console.log("Connected to DB");

    const result = await Customer.deleteMany({ emailVerified: false });
    console.log(`Deleted ${result.deletedCount} unverified users.`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

cleanUnverified();
