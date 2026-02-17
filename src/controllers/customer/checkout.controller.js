import mongoose from "mongoose";
import crypto from "crypto";
import Customer from "../../models/Customer.js";
import Product from "../../models/Product.js";
import Coupon from "../../models/Coupon.js";
import Order from "../../models/Order.js";
import { env } from "../../config/env.js";

/* ======================================================
   CONSTANTS
====================================================== */
const GST_PERCENT = 8;
const SHIPPING_CHARGE = 60;

/* ======================================================
   CREATE ORDER & INITIATE PAYMENT
====================================================== */
export const createCheckout = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { addressId, couponCode } = req.body;

    const customer = await Customer.findById(req.customer.id).session(session);

    if (!customer) throw new Error("Customer not found");
    if (!customer.cart.length) throw new Error("Cart is empty");

    /* ============================
       ADDRESS VALIDATION
    ============================ */

    const address = customer.addresses.id(addressId);
    if (!address) throw new Error("Invalid address");

    /* ============================
       VALIDATE CART ITEMS
    ============================ */

    let itemsTotal = 0;
    const orderItems = [];

    for (const cartItem of customer.cart) {
      const product = await Product.findById(cartItem.product).session(session);

      if (!product || product.status !== "ACTIVE") {
        throw new Error("Product unavailable");
      }

      const variant = product.variants.id(cartItem.variantId);

      if (!variant || variant.status !== "ACTIVE" || !variant.availability) {
        throw new Error("Variant unavailable");
      }

      if (variant.stock < cartItem.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      const subtotal = variant.finalPrice * cartItem.quantity;
      itemsTotal += subtotal;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        productSlug: product.slug,
        variantId: variant._id,
        variantSku: variant.variantSku,
        image: variant.images?.[0]?.url || "",
        weight: variant.weight,
        dimensions: variant.dimensions,
        quantity: cartItem.quantity,
        price: variant.sellingPrice,
        finalPrice: variant.finalPrice,
        subtotal,
      });
    }

    /* ============================
       COUPON VALIDATION
    ============================ */

    let discountAmount = 0;
    let couponSnapshot = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
      }).session(session);

      if (!coupon) throw new Error("Invalid coupon");
      if (coupon.status !== "ACTIVE") throw new Error("Coupon inactive");
      if (coupon.expiresAt < new Date()) throw new Error("Coupon expired");

      if (
        coupon.usageLimit !== null &&
        coupon.usedCount >= coupon.usageLimit
      ) {
        throw new Error("Coupon usage limit reached");
      }

      if (itemsTotal < coupon.minOrderAmount) {
        throw new Error(
          `Minimum order ₹${coupon.minOrderAmount} required`
        );
      }

      if (coupon.type === "PERCENT") {
        discountAmount = (itemsTotal * coupon.value) / 100;
        if (coupon.maxDiscount) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscount);
        }
      } else {
        discountAmount = coupon.value;
      }

      discountAmount = Math.min(discountAmount, itemsTotal);

      couponSnapshot = {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount,
      };
    }

    /* ============================
       GST + TOTAL
    ============================ */

    const taxableAmount = itemsTotal - discountAmount;

    const gstAmount = Number(
      ((taxableAmount * GST_PERCENT) / 100).toFixed(2)
    );

    const grandTotal = Number(
      (taxableAmount + gstAmount + SHIPPING_CHARGE).toFixed(2)
    );

    if (grandTotal <= 0) {
      throw new Error("Invalid order total");
    }

    const existingPendingOrder = await Order.findOne({
      customerId: customer._id,
      status: "PAYMENT_PENDING",
    });

    if (existingPendingOrder) {
      return res.status(400).json({
        message:
          "You already have a pending payment. Please complete it.",
      });
    }

    /* ============================
       CREATE ORDER
    ============================ */

    const order = await Order.create(
      [
        {
          customerId: customer._id,
          customerSnapshot: {
            name: String(address.name || "").trim(),
            phone: address.phone,
            email: String(customer.email || "").trim(),
          },
          items: orderItems,
          shippingAddress: address.toObject(),
          itemsTotal,
          gstAmount,
          shippingAmount: SHIPPING_CHARGE,
          discountAmount,
          grandTotal,
          coupon: couponSnapshot,
          status: "PAYMENT_PENDING",
          payment: { status: "PENDING" },
        },
      ],
      { session }
    );

    const txnid = order[0].orderNumber;

    /* ============================
       PAYU HASH (EXACT FORMAT)
    ============================ */

    const PAYU_KEY = env.PAYU_KEY.trim();
    const PAYU_SALT = env.PAYU_SALT.trim();

    const amount = Number(grandTotal).toFixed(2);
    const firstname = String(
      address.name || customer.name || "Customer"
    ).trim();
    const email = String(customer.email || "").trim();

    if (!email) {
      throw new Error("Customer email required for payment");
    }

    const hashString =
      PAYU_KEY +
      "|" +
      txnid +
      "|" +
      amount +
      "|Ledo Valley Order|" +
      firstname +
      "|" +
      email +
      "|||||||||||" + // 🔥 EXACT 11 pipes
      PAYU_SALT;

    const hash = crypto
      .createHash("sha512")
      .update(hashString)
      .digest("hex");

    await session.commitTransaction();
    session.endSession();

    return res.json({
      key: PAYU_KEY,
      txnid,
      amount,
      productinfo: "Ledo Valley Order",
      firstname,
      email,
      phone: address.phone,
      surl: `${env.BASE_URL}/api/payment/success`,
      furl: `${env.BASE_URL}/api/payment/failure`,
      hash,
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return res.status(400).json({
      message: error.message || "Checkout failed",
    });
  }
};
