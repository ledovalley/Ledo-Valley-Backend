import mongoose from "mongoose";
import fs from "fs";
import path from "path";

import NewsletterSubscriber from "../../models/NewsletterSubscriber.js";
import NewsletterCampaign from "../../models/NewsletterCampaign.js";
import { sendBulkNewsletter } from "../../services/email.service.js";

/* ======================================================
   SEND NEWSLETTER (ADMIN - PRODUCTION SAFE FINAL)
====================================================== */
export const sendNewsletter = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { subject, htmlContent, campaignId } = req.body;

        /* ================= VALIDATION ================= */

        if (!subject || !htmlContent) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                message: "Subject and content required",
            });
        }

        /* ================= FETCH ACTIVE SUBSCRIBERS ================= */

        const subscribers = await NewsletterSubscriber.find({
            status: "ACTIVE",
            unsubscribeToken: { $ne: null },
        }).select("email unsubscribeToken");

        if (!subscribers.length) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                message: "No active subscribers",
            });
        }

        /* ================= CAMPAIGN HANDLING ================= */

        let campaign;

        if (campaignId) {
            campaign = await NewsletterCampaign.findById(campaignId).session(session);

            if (!campaign) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: "Campaign not found" });
            }

            if (campaign.status === "SENT") {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: "Campaign already sent" });
            }

            campaign.subject = subject;
            campaign.htmlContent = htmlContent;
        } else {
            const created = await NewsletterCampaign.create(
                [
                    {
                        subject,
                        htmlContent,
                        status: "DRAFT",
                    },
                ],
                { session }
            );

            campaign = created[0];
        }

        /* ================= MARK AS SENDING ================= */

        campaign.status = "SENDING";
        await campaign.save({ session });

        /* ================= LOAD EMAIL LAYOUT ================= */

        const templatePath = path.join(
            process.cwd(),
            "emails",
            "newsletter-layout.html"
        );

        const layout = fs.readFileSync(templatePath, "utf8");

        /* ================= PREPARE PERSONALIZED EMAILS ================= */

        const emailPayloads = subscribers.map((subscriber) => {
            const unsubscribeUrl = `${process.env.BASE_URL}/api/customer/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}`;

            const finalHtml = layout
                .replace(/{{CONTENT}}/g, htmlContent)
                .replace(/{{UNSUBSCRIBE_LINK}}/g, unsubscribeUrl);

            return {
                email: subscriber.email,
                html: finalHtml,
            };
        });

        /* ================= SEND EMAILS ================= */

        const result = await sendBulkNewsletter(emailPayloads, subject);

        /* ================= UPDATE CAMPAIGN STATUS ================= */

        campaign.status = "SENT";
        campaign.sentAt = new Date();
        campaign.totalRecipients = emailPayloads.length;
        campaign.successCount = result.success;
        campaign.failureCount = result.failure;

        await campaign.save({ session });

        await session.commitTransaction();
        session.endSession();

        return res.json({
            message: "Newsletter sent successfully",
            total: emailPayloads.length,
            success: result.success,
            failure: result.failure,
            campaignId: campaign._id,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error("NEWSLETTER SEND ERROR:", error);

        return res.status(500).json({
            message: "Failed to send newsletter",
        });
    }
};

export const listSubscribers = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;

        const query = {};
        if (status && ["PENDING", "ACTIVE", "UNSUBSCRIBED"].includes(status)) {
            query.status = status;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [subscribers, total] = await Promise.all([
            NewsletterSubscriber.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            NewsletterSubscriber.countDocuments(query),
        ]);

        res.json({
            subscribers,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
        });
    } catch (error) {
        console.error("LIST SUBSCRIBERS ERROR:", error);
        res.status(500).json({ message: "Failed to fetch subscribers" });
    }
};

export const listCampaigns = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const [campaigns, total] = await Promise.all([
            NewsletterCampaign.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            NewsletterCampaign.countDocuments(),
        ]);

        res.json({
            campaigns,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
        });
    } catch (error) {
        console.error("LIST CAMPAIGNS ERROR:", error);
        res.status(500).json({ message: "Failed to fetch campaigns" });
    }
};
