import mongoose from "mongoose";
import Customer from "./src/models/Customer.js";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    try {
        const result = await Customer.aggregate([
            {
                $match: {
                    $or: [
                        { name: { $regex: "test", $options: "i" } },
                        { email: { $regex: "test", $options: "i" } },
                        { phone: { $regex: "test", $options: "i" } }
                    ]
                }
            }
        ]);
        console.log("Success, found", result.length);
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}
run();
