import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
    {
        message: {
            type: String,
            required: true,
        },

        couponCode: {
            type: String,
            trim: true,
        },

        visibility: {
            type: String,
            enum: ["ALL", "LOGGED_IN", "LOGGED_OUT"],
            default: "ALL",
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        order: {
            type: Number,
            default: 0,
        },

        startDate: Date,
        endDate: Date,
    },
    { timestamps: true }
);

export default mongoose.model("Banner", bannerSchema);
