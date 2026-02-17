import mongoose from "mongoose";

const contactInquirySchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        companyName: {
            type: String,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            index: true,
        },

        phone: {
            type: String,
        },

        subject: {
            type: String,
            required: true,
        },

        message: {
            type: String,
            required: true,
        },

        status: {
            type: String,
            enum: ["PENDING", "IN_PROGRESS", "RESPONDED", "CLOSED"],
            default: "PENDING",
            index: true,
        },

        adminNote: {
            type: String,
        },

        respondedAt: Date,
    },
    { timestamps: true }
);

/* Index for dashboard performance */
contactInquirySchema.index({ createdAt: -1 });

export default mongoose.model("ContactInquiry", contactInquirySchema);
