import crypto from "crypto";
import mongoose from "mongoose";
import Order from "../../models/Order.js";
import Product from "../../models/Product.js";
import Customer from "../../models/Customer.js";
import Coupon from "../../models/Coupon.js";
import { generateInvoicePDF } from "../../services/invoice.service.js";
import { sendOrderConfirmationEmail } from "../../services/email.service.js";
import { env } from "../../config/env.js";

/* ======================================================
   PAYU SUCCESS CALLBACK
====================================================== */
export const payuSuccess = async (req, res) => {
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

    const order = await Order.findOne({
      orderNumber: txnid,
    }).session(session);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.payment.status === "SUCCESS") {
      await session.commitTransaction();
      session.endSession();
      return res.redirect(
        `${env.FRONTEND_URL}/payment/payment-success`
      );
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

    /* =============================
       POST OPERATIONS
    ============================== */

    await generateInvoicePDF(order);

    order.invoiceUrl = `/invoices/${order.orderNumber}.pdf`;
    await order.save();

    await sendOrderConfirmationEmail(order);

    return res.redirect(
      `${env.FRONTEND_URL}/payment/payment-success`
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("PAYU SUCCESS ERROR:", error);

    return res.redirect(
      `${env.FRONTEND_URL}/payment/payment-failed`
    );
  }
};

/* ======================================================
   PAYU FAILURE CALLBACK
====================================================== */
export const payuFailure = async (req, res) => {
  try {
    const payload =
      req.body && Object.keys(req.body).length
        ? req.body
        : req.query;

    const { txnid, error_Message } = payload || {};

    if (!txnid) {
      return res.redirect(
        `${env.FRONTEND_URL}/payment/payment-failed`
      );
    }

    const order = await Order.findOne({
      orderNumber: txnid,
    });

    if (order && order.payment.status !== "SUCCESS") {
      order.payment.status = "FAILED";
      order.payment.failureReason = error_Message || null;
      order.status = "PAYMENT_FAILED";
      await order.save();
    }

    return res.redirect(
      `${env.FRONTEND_URL}/payment/payment-failed`
    );
  } catch (error) {
    console.error("PAYU FAILURE ERROR:", error);

    return res.redirect(
      `${env.FRONTEND_URL}/payment/payment-failed`
    );
  }
};
