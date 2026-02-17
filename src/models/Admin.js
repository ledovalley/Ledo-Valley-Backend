import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Admin", adminSchema);
