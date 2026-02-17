import mongoose from "mongoose";

const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "UNSUBSCRIBED"],
      default: "PENDING",
      index: true,
    },

    source: {
      type: String, // footer, popup, checkout, etc
      default: "unknown",
    },

    /* ================= SUBSCRIPTION TIMESTAMPS ================= */

    subscribedAt: Date,
    unsubscribedAt: Date,

    /* ================= DOUBLE OPT-IN ================= */

    verificationToken: {
      type: String,
      index: true,
    },

    verificationTokenExpires: Date,

    /* ================= SECURE UNSUBSCRIBE ================= */

    unsubscribeToken: {
      type: String,
      index: true,
    },

    /* ================= METADATA ================= */

    ipAddress: String,
    userAgent: String,

    /* ================= FUTURE ANALYTICS (OPTIONAL) ================= */

    lastEmailSentAt: Date,
    lastOpenedAt: Date,
    openCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/* ======================================================
   INDEXES
====================================================== */

newsletterSubscriberSchema.index({ createdAt: -1 });

export default mongoose.model(
  "NewsletterSubscriber",
  newsletterSubscriberSchema
);
