import mongoose from "mongoose";
import crypto from "crypto";
import Order from "../../models/Order.js";
import Product from "../../models/Product.js";
import { env } from "../../config/env.js";

/* ======================================================
   LIST CUSTOMER ORDERS
====================================================== */
export const listMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            customerId: req.customer.id,
        })
            .sort({ createdAt: -1 })
            .lean();

        res.json(orders);
    } catch (error) {
        console.error("LIST MY ORDERS ERROR:", error);
        res.status(500).json({
            message: "Failed to fetch orders",
        });
    }
};

export const getMyOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findOne({
            _id: orderId,
            customerId: req.customer.id,
        }).lean();

        if (!order) {
            return res.status(404).json({
                message: "Order not found",
            });
        }

        res.json(order);
    } catch (error) {
        console.error("GET MY ORDER ERROR:", error);
        res.status(500).json({
            message: "Failed to fetch order",
        });
    }
};

export const cancelMyOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { orderId } = req.params;

        const order = await Order.findOne({
            _id: orderId,
            customerId: req.customer.id,
        }).session(session);

        if (!order) {
            throw new Error("Order not found");
        }

        if (
            ["READY_TO_SHIP", "SHIPPED", "DELIVERED"].includes(order.status)
        ) {
            throw new Error("Order cannot be cancelled now");
        }

        if (order.status === "CANCELLED") {
            throw new Error("Order already cancelled");
        }

        order.status = "CANCELLED";

        /* ==========================
           RESTORE STOCK IF PAID
        =========================== */

        if (order.payment.status === "SUCCESS") {
            for (const item of order.items) {
                const product = await Product.findById(
                    item.productId
                ).session(session);

                const variant = product?.variants.id(
                    item.variantId
                );

                if (variant) {
                    variant.stock += item.quantity;

                    variant.availability =
                        variant.stock > 0 &&
                        variant.status === "ACTIVE" &&
                        product.status === "ACTIVE";

                    await product.save({ session });
                }
            }

            order.payment.status = "REFUND_PENDING";
        }

        await order.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({
            message: "Order cancelled successfully",
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error("CANCEL ORDER ERROR:", error);
        res.status(400).json({
            message: error.message || "Failed to cancel order",
        });
    }
};

/* ======================================================
   RETRY PAYMENT
====================================================== */
export const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findOne({
            _id: orderId,
            customerId: req.customer.id,
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found",
            });
        }

        if (
            order.payment.status !== "FAILED" ||
            order.status !== "PAYMENT_FAILED"
        ) {
            return res.status(400).json({
                message: "Payment retry not allowed",
            });
        }

        const txnid = order.orderNumber; // 🔥 IMPORTANT: reuse same txn

        const amount = order.grandTotal.toFixed(2);

        const hashString = `${env.PAYU_KEY}|${txnid}|${amount}|Ledo Valley Order|${order.customerSnapshot.name}|${order.customerSnapshot.email}|||||||||||${env.PAYU_SALT}`;

        const hash = crypto
            .createHash("sha512")
            .update(hashString)
            .digest("hex");

        order.payment.status = "PENDING";

        await order.save();

        res.json({
            payu: {
                key: env.PAYU_KEY,
                txnid,
                amount,
                productinfo: "Ledo Valley Order",
                firstname: order.customerSnapshot.name,
                email: order.customerSnapshot.email,
                phone: order.customerSnapshot.phone,
                hash,
                surl: `${env.BASE_URL}/api/payment/success`,
                furl: `${env.BASE_URL}/api/payment/failure`,
            },
        });

    } catch (error) {
        console.error("RETRY PAYMENT ERROR:", error);
        res.status(500).json({
            message: "Failed to retry payment",
        });
    }
};

export const requestReturn = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await Order.findOne({
            _id: orderId,
            customerId: req.customer.id,
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found",
            });
        }

        if (order.status !== "DELIVERED") {
            return res.status(400).json({
                message: "Return not allowed",
            });
        }

        if (order.returnInfo?.status === "REQUESTED") {
            return res.status(400).json({
                message: "Return already requested",
            });
        }

        if (!order.shipping?.deliveredAt) {
            return res.status(400).json({
                message: "Delivery not confirmed",
            });
        }

        const diffDays =
            (Date.now() - order.shipping.deliveredAt) /
            (1000 * 60 * 60 * 24);

        if (diffDays > 7) {
            return res.status(400).json({
                message: "Return window expired",
            });
        }

        order.status = "RETURN_REQUESTED";

        order.returnInfo = {
            requestedAt: new Date(),
            reason,
            status: "REQUESTED",
            refundAmount: order.grandTotal,
        };

        await order.save();

        res.json({
            message: "Return request submitted",
        });

    } catch (error) {
        console.error("RETURN REQUEST ERROR:", error);
        res.status(500).json({
            message: "Failed to request return",
        });
    }
};
