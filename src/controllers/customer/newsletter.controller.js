import crypto from "crypto";
import NewsletterSubscriber from "../../models/NewsletterSubscriber.js";
import { sendNewsletterVerificationEmail } from "../../services/email.service.js";

/* ======================================================
   SUBSCRIBE (DOUBLE OPT-IN SAFE + EXPIRY SAFE)
====================================================== */
export const subscribeNewsletter = async (req, res) => {
  try {
    let { email, source } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email required",
      });
    }

    /* ================= NORMALIZE EMAIL ================= */

    email = email.toLowerCase().trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    let subscriber = await NewsletterSubscriber.findOne({ email });

    /* ================= ALREADY ACTIVE ================= */

    if (subscriber?.status === "ACTIVE") {
      return res.json({
        message: "Already subscribed",
      });
    }

    /* ================= RATE LIMIT RE-SEND (OPTIONAL SAFE) ================= */

    if (
      subscriber?.verificationTokenExpires &&
      subscriber.verificationTokenExpires > new Date()
    ) {
      return res.json({
        message: "Verification email already sent. Please check your inbox.",
      });
    }

    /* ================= GENERATE TOKENS ================= */

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const unsubscribeToken = crypto.randomBytes(32).toString("hex");

    const verificationTokenExpires = new Date(
      Date.now() + 1000 * 60 * 60 * 24 // 24 hours
    );

    /* ================= UPSERT LOGIC ================= */

    if (subscriber) {
      subscriber.status = "PENDING";
      subscriber.verificationToken = verificationToken;
      subscriber.verificationTokenExpires = verificationTokenExpires;
      subscriber.unsubscribeToken = unsubscribeToken;
      subscriber.unsubscribedAt = null;
      subscriber.source = source || subscriber.source;
      subscriber.ipAddress = req.ip;
      subscriber.userAgent = req.headers["user-agent"];

      await subscriber.save();
    } else {
      subscriber = await NewsletterSubscriber.create({
        email,
        status: "PENDING",
        verificationToken,
        verificationTokenExpires,
        unsubscribeToken,
        source,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
    }

    /* ================= SEND EMAIL ================= */

    await sendNewsletterVerificationEmail(email, verificationToken);

    return res.json({
      message: "Verification email sent",
    });

  } catch (error) {
    console.error("SUBSCRIBE ERROR:", error);
    return res.status(500).json({
      message: "Subscription failed",
    });
  }
};


/* ======================================================
   VERIFY EMAIL (DOUBLE OPT-IN + EXPIRY SAFE)
====================================================== */
export const verifyNewsletter = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.redirect(`${process.env.FRONTEND_URL}/invalid-link`);
    }

    const subscriber = await NewsletterSubscriber.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    });

    if (!subscriber) {
      return res.redirect(`${process.env.FRONTEND_URL}/invalid-link`);
    }

    if (subscriber.status === "ACTIVE") {
      return res.redirect(`${process.env.FRONTEND_URL}/newsletter-success`);
    }

    /* ================= ACTIVATE ================= */

    subscriber.status = "ACTIVE";
    subscriber.subscribedAt = new Date();
    subscriber.verificationToken = null;
    subscriber.verificationTokenExpires = null;

    await subscriber.save();

    return res.redirect(`${process.env.FRONTEND_URL}/newsletter-success`);

  } catch (error) {
    console.error("VERIFY ERROR:", error);
    return res.redirect(`${process.env.FRONTEND_URL}/error`);
  }
};


/* ======================================================
   UNSUBSCRIBE (TOKEN SAFE + CLEANUP)
====================================================== */
export const unsubscribeNewsletter = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.redirect(`${process.env.FRONTEND_URL}`);
    }

    const subscriber = await NewsletterSubscriber.findOne({
      unsubscribeToken: token,
    });

    if (!subscriber) {
      return res.redirect(`${process.env.FRONTEND_URL}`);
    }

    if (subscriber.status === "UNSUBSCRIBED") {
      return res.redirect(`${process.env.FRONTEND_URL}/unsubscribed`);
    }

    subscriber.status = "UNSUBSCRIBED";
    subscriber.unsubscribedAt = new Date();
    subscriber.verificationToken = null;
    subscriber.verificationTokenExpires = null;

    await subscriber.save();

    return res.redirect(`${process.env.FRONTEND_URL}/unsubscribed`);

  } catch (error) {
    console.error("UNSUBSCRIBE ERROR:", error);
    return res.redirect(`${process.env.FRONTEND_URL}`);
  }
};
