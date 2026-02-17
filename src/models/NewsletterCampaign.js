import mongoose from "mongoose";

const newsletterCampaignSchema = new mongoose.Schema(
  {
    /* ================= CORE CONTENT ================= */

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    htmlContent: {
      type: String,
      required: true,
    },

    previewText: {
      type: String, // shown in inbox preview
    },

    /* ================= STATUS ================= */

    status: {
      type: String,
      enum: ["DRAFT", "SCHEDULED", "SENDING", "SENT", "FAILED"],
      default: "DRAFT",
      index: true,
    },

    /* ================= SCHEDULING ================= */

    scheduledFor: Date,
    sentAt: Date,

    /* ================= RECIPIENT STATS ================= */

    totalRecipients: {
      type: Number,
      default: 0,
    },

    successCount: {
      type: Number,
      default: 0,
    },

    failureCount: {
      type: Number,
      default: 0,
    },

    openCount: {
      type: Number,
      default: 0,
    },

    clickCount: {
      type: Number,
      default: 0,
    },

    /* ================= TARGETING ================= */

    targetFilter: {
      type: String, // ALL | ACTIVE_ONLY | SEGMENT_X
      default: "ALL",
    },

    /* ================= ADMIN METADATA ================= */

    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },

    notes: String, // internal admin notes

    /* ================= ERROR LOGGING ================= */

    errorMessage: String,
  },
  { timestamps: true }
);

/* ======================================================
   INDEXES
====================================================== */

newsletterCampaignSchema.index({ createdAt: -1 });
newsletterCampaignSchema.index({ scheduledFor: 1 });

export default mongoose.model(
  "NewsletterCampaign",
  newsletterCampaignSchema
);
