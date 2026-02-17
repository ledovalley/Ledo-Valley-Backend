import * as brevo from "@getbrevo/brevo";
import fs from "fs";
import path from "path";
import { env } from "../config/env.js";

/* ======================================================
   BREVO CONFIG
====================================================== */

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  env.BREVO_API_KEY
);

/* ======================================================
   LOAD TEMPLATE (SAFE)
====================================================== */
const loadTemplate = (templateName) => {
  try {
    const filePath = path.join(process.cwd(), "emails", templateName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }

    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    console.error("TEMPLATE LOAD ERROR:", error.message);
    throw error;
  }
};

/* ======================================================
   GENERIC SEND EMAIL
====================================================== */
const sendEmail = async ({ to, subject, html }) => {
  if (!to) return;

  try {
    await apiInstance.sendTransacEmail({
      subject,
      sender: {
        name: "Ledo Valley",
        email: env.EMAIL_SENDER || "ledovalley1@gmail.com",
      },
      to: [{ email: to }],
      htmlContent: html,
    });

  } catch (error) {
    console.error("EMAIL SEND ERROR:", error.response?.body || error.message);
    throw new Error("Email sending failed");
  }
};

/* ======================================================
   VERIFY ACCOUNT EMAIL
====================================================== */
export const sendVerificationEmail = async (to, token) => {
  if (!to) return;

  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  const template = loadTemplate("verify-email.html");

  const html = template.replace(/{{VERIFY_URL}}/g, verifyUrl);

  await sendEmail({
    to,
    subject: "Verify your email – Ledo Valley",
    html,
  });
};

/* ======================================================
   ORDER CONFIRMATION
====================================================== */
export const sendOrderConfirmationEmail = async (order) => {
  if (!order?.customerSnapshot?.email) return;

  const template = loadTemplate("order-confirmation.html");

  const html = template
    .replace(/{{ORDER_NUMBER}}/g, order.orderNumber)
    .replace(/{{TOTAL}}/g, order.grandTotal.toFixed(2))
    .replace(
      /{{INVOICE_URL}}/g,
      `${env.BASE_URL}${order.invoiceUrl || ""}`
    );

  await sendEmail({
    to: order.customerSnapshot.email,
    subject: `Order Confirmed – ${order.orderNumber}`,
    html,
  });
};

/* ======================================================
   ORDER SHIPPED
====================================================== */
export const sendOrderShippedEmail = async (order) => {
  if (!order?.customerSnapshot?.email) return;

  const template = loadTemplate("order-shipped.html");

  const html = template
    .replace(/{{ORDER_NUMBER}}/g, order.orderNumber)
    .replace(/{{AWB}}/g, order.shipping?.awbCode || "N/A");

  await sendEmail({
    to: order.customerSnapshot.email,
    subject: `Order Shipped – ${order.orderNumber}`,
    html,
  });
};

/* ======================================================
   ORDER DELIVERED
====================================================== */
export const sendOrderDeliveredEmail = async (order) => {
  if (!order?.customerSnapshot?.email) return;

  const template = loadTemplate("order-delivered.html");

  const html = template.replace(
    /{{ORDER_NUMBER}}/g,
    order.orderNumber
  );

  await sendEmail({
    to: order.customerSnapshot.email,
    subject: `Order Delivered – ${order.orderNumber}`,
    html,
  });
};

/* ======================================================
   REFUND CONFIRMED
====================================================== */
export const sendRefundEmail = async (order) => {
  if (!order?.customerSnapshot?.email) return;

  const template = loadTemplate("refund-confirmed.html");

  const html = template
    .replace(/{{ORDER_NUMBER}}/g, order.orderNumber)
    .replace(/{{AMOUNT}}/g, order.grandTotal.toFixed(2));

  await sendEmail({
    to: order.customerSnapshot.email,
    subject: `Refund Processed – ${order.orderNumber}`,
    html,
  });
};

/* ======================================================
   BULK NEWSLETTER (PERSONALIZED SAFE MODE)
====================================================== */
export const sendBulkNewsletter = async (
  emailPayloads, // [{ email, html }]
  subject
) => {
  let success = 0;
  let failure = 0;

  for (const item of emailPayloads) {
    try {
      await apiInstance.sendTransacEmail({
        subject,
        sender: {
          name: "Ledo Valley",
          email: "ledovalley1@gmail.com",
        },
        to: [{ email: item.email }],
        htmlContent: item.html,
      });

      success++;

    } catch (err) {
      console.error("NEWSLETTER SEND ERROR:", err.response?.body || err.message);
      failure++;
    }
  }

  return { success, failure };
};

/* ======================================================
   NEWSLETTER VERIFICATION EMAIL
====================================================== */
export const sendNewsletterVerificationEmail = async (to, token) => {
  if (!to) return;

  const verifyUrl = `${env.BASE_URL}/api/customer/newsletter/verify?token=${token}`;

  const template = loadTemplate("newsletter-verify.html");

  const html = template
    .replace(/{{VERIFY_URL}}/g, verifyUrl)
    .replace(/{{YEAR}}/g, new Date().getFullYear());

  await sendEmail({
    to,
    subject: "Confirm your subscription – Ledo Valley",
    html,
  });
};
