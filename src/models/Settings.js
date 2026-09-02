import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    codCharge: { type: Number, default: 29 },
    freeShippingThreshold: { type: Number, default: 1000 },
    flatShippingCharge: { type: Number, default: 90 },
    gstPercent: { type: Number, default: 5 },
    companyName: { type: String, default: "Ledo Valley" },
    companyEmail: { type: String, default: "hello@ledovalley.com" },
    companyPhone: { type: String, default: "+91 000 000 0000" },
  },
  { timestamps: true }
);

export default mongoose.model("Settings", settingsSchema);
