import mongoose from "mongoose";
import Customer from "./src/models/Customer.js";
import dotenv from "dotenv";

dotenv.config();

const deleteUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/ledo_valley");
    console.log("Connected to DB");

    const email = "trakzen.services@gmail.com";
    const result = await Customer.deleteOne({ email: email });
    
    if (result.deletedCount > 0) {
      console.log(`Successfully deleted user with email: ${email}`);
    } else {
      console.log(`User with email ${email} not found.`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

deleteUser();
