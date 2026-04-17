import crypto from "crypto";
import mongoose from "mongoose";
import Order from "../../models/Order.js";
import Product from "../../models/Product.js";
import Customer from "../../models/Customer.js";
import Coupon from "../../models/Coupon.js";
import { sendOrderConfirmationEmail } from "../../services/email.service.js";
import { env } from "../../config/env.js";

/* ======================================================
   PAYU SUCCESS CALLBACK
====================================================== */
export const payuSuccess = async (req, res) => {
  const FRONTEND_URL = env.FRONTEND_URL || "https://www.ledovalley.com";
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payload =
      req.body && Object.keys(req.body).length
        ? req.body
        : req.query;

    const {
      txnid,
      mihpayid,
      status,
      hash,
      email,
      firstname,
      amount,
    } = payload || {};

    if (!txnid || !hash) {
      throw new Error("Invalid payment payload");
    }

    if (status !== "success") {
      throw new Error("Payment not successful");
    }

    /* =============================
       VERIFY HASH (CORRECT FORMAT)
    ============================== */

    const reverseHashString =
      env.PAYU_SALT +
      "|" +
      status +
      "|||||||||||" + // 🔥 11 empty fields
      (email || "") +
      "|" +
      (firstname || "") +
      "|Ledo Valley Order|" +
      amount +
      "|" +
      txnid +
      "|" +
      env.PAYU_KEY;

    const generatedHash = crypto
      .createHash("sha512")
      .update(reverseHashString)
      .digest("hex");

    if (generatedHash !== hash) {
      console.error("HASH MISMATCH");
      throw new Error("Invalid payment signature");
    }

    /* =============================
       FETCH ORDER
    ============================== */

    const baseOrderNumber = txnid.split("A")[0];

    const order = await Order.findOne({
      orderNumber: baseOrderNumber,
    }).session(session);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.payment.status === "SUCCESS") {
      await session.commitTransaction();
      session.endSession();
      return res.redirect(`${FRONTEND_URL}/payment/payment-success`);
    }

    /* =============================
       UPDATE PAYMENT STATUS
    ============================== */

    order.payment.status = "SUCCESS";
    order.payment.payuPaymentId = mihpayid;
    order.payment.paidAt = new Date();
    order.status = "PAYMENT_SUCCESS";

    /* =============================
       REDUCE STOCK
    ============================== */

    for (const item of order.items) {
      const product = await Product.findById(
        item.productId
      ).session(session);

      if (!product) {
        throw new Error("Product not found");
      }

      const variant = product.variants.id(item.variantId);

      if (!variant) {
        throw new Error("Variant not found");
      }

      if (variant.stock < item.quantity) {
        throw new Error("Stock mismatch");
      }

      variant.stock -= item.quantity;

      variant.availability =
        variant.stock > 0 &&
        variant.status === "ACTIVE" &&
        product.status === "ACTIVE";

      await product.save({ session });
    }

    /* =============================
       CLEAR CART
    ============================== */

    await Customer.findByIdAndUpdate(
      order.customerId,
      { cart: [] },
      { session }
    );

    /* =============================
       INCREMENT COUPON
    ============================== */

    if (order.coupon?.code) {
      await Coupon.findOneAndUpdate(
        { code: order.coupon.code },
        { $inc: { usedCount: 1 } },
        { session }
      );
    }

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    console.log("Before redirecting to success page");

    // ✅ Immediately redirect success
    res.redirect(`${FRONTEND_URL}/payment/payment-success`);

    // 🔥 Run async background tasks (don’t block response)
    (async () => {
      try {
        console.log("Starting post-payment background tasks");
        await sendOrderConfirmationEmail(order);
      } catch (err) {
        console.error("POST PROCESS ERROR:", err);
      }
    })();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("PAYU SUCCESS ERROR:", error);

    return res.redirect(
      `${FRONTEND_URL}/payment/payment-failed?error=Verification Failed`
    );
  }
};

/* ======================================================
   PAYU FAILURE CALLBACK
====================================================== */
export const payuFailure = async (req, res) => {
  const FRONTEND_URL = env.FRONTEND_URL || "https://www.ledovalley.com";

  try {
    const payload =
      req.body && Object.keys(req.body).length ? req.body : req.query;

    console.log("PAYU FAILURE RECEIVED:", JSON.stringify(payload, null, 2));

    const { txnid, status, error_Message } = payload || {};

    if (!txnid) {
      console.warn("PAYU FAILURE: No txnid found in payload");
      return res.redirect(`${FRONTEND_URL}/payment/payment-failed`);
    }

    const baseOrderNumber = txnid.split("A")[0];
    console.log(`Processing failure for Order: ${baseOrderNumber}`);

    const order = await Order.findOne({
      orderNumber: baseOrderNumber,
    });

    if (order && order.payment.status !== "SUCCESS") {
      order.payment.status = "FAILED";
      order.payment.failureReason = error_Message || status || "Cancelled";
      
      const currentRetries = order.payment.retryCount || 0;
      
      if (currentRetries >= 1) {
        order.status = "CANCELLED";
        console.log(`Order ${baseOrderNumber} status updated to CANCELLED (Retry Exhausted)`);
        
        // Restore stock since order is cancelled
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          for (const item of order.items) {
              const product = await Product.findById(item.productId).session(session);
              const variant = product?.variants.id(item.variantId);
              if (variant) {
                  variant.stock += item.quantity;
                  variant.availability = variant.stock > 0 && variant.status === "ACTIVE" && product.status === "ACTIVE";
                  await product.save({ session });
              }
          }
          await session.commitTransaction();
        } catch (e) {
          console.error("Failed to restore stock on auto-cancellation", e);
          await session.abortTransaction();
        } finally {
          session.endSession();
        }
      } else {
        order.status = "PAYMENT_FAILED";
        console.log(`Order ${baseOrderNumber} status updated to PAYMENT_FAILED`);
      }

      await order.save();
    }

    const redirectUrl = order
      ? `${FRONTEND_URL}/payment/payment-failed?orderId=${order._id}&error=${encodeURIComponent(
          error_Message || "Payment failed or cancelled"
        )}`
      : `${FRONTEND_URL}/payment/payment-failed`;

    console.log(`Redirecting user to: ${redirectUrl}`);
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("PAYU FAILURE HANDLER CRASHED:", error);

    // Final safety redirect to ensure user is never stuck on a 502/blank page
    return res.redirect(
      `${FRONTEND_URL}/payment/payment-failed?error=${encodeURIComponent(
        error.message || "An unexpected error occurred"
      )}`
    );
  }
};
