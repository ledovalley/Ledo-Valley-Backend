import Order from "../../models/Order.js";
import Product from "../../models/Product.js";
import { sendRefundEmail, sendOrderShippedEmail, sendOrderDeliveredEmail, sendOrderConfirmationEmail } from "../../services/email.service.js";
import { refundPayU } from "../../services/payu.service.js";
import { createShiprocketOrder } from "../../services/shiprocket.service.js";
import { assignCourier, requestPickup } from "../../services/shiprocket.service.js";

/* ======================================================
   LIST ALL ORDERS (ADMIN)
====================================================== */
export const listAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      paymentStatus,
      startDate,
      endDate,
      sort = "newest",
    } = req.query;

    const query = {};

    /* ================= SEARCH ================= */

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "customerSnapshot.name": { $regex: search, $options: "i" } },
        { "customerSnapshot.email": { $regex: search, $options: "i" } },
        { "customerSnapshot.phone": { $regex: search, $options: "i" } },
      ];
    }

    /* ================= STATUS FILTER ================= */

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query["payment.status"] = paymentStatus;
    }

    /* ================= DATE FILTER ================= */

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    /* ================= SORT ================= */

    let sortOption = { createdAt: -1 };

    if (sort === "oldest") sortOption = { createdAt: 1 };
    if (sort === "highValue") sortOption = { grandTotal: -1 };

    /* ================= EXECUTE ================= */

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      Order.countDocuments(query),
    ]);

    res.json({
      orders,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });

  } catch (error) {
    console.error("LIST ORDERS ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch orders",
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).lean();

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json(order);
  } catch (error) {
    console.error("GET ORDER ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch order",
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    /* ================= VALID TRANSITIONS ================= */

    const allowedTransitions = {
      PAYMENT_SUCCESS: ["READY_TO_SHIP", "CANCELLED"],
      READY_TO_SHIP: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["DELIVERED"],
      DELIVERED: [],
      RETURN_REQUESTED: ["RETURN_APPROVED"],
      RETURN_APPROVED: ["REFUNDED"],
    };

    if (
      !allowedTransitions[order.status] ||
      !allowedTransitions[order.status].includes(status)
    ) {
      return res.status(400).json({
        message: `Cannot change status from ${order.status} to ${status}`,
      });
    }

    /* =====================================================
       READY TO SHIP
       → Create Shiprocket Order
       → Generate AWB
    ===================================================== */
    if (status === "READY_TO_SHIP") {

      if (order.payment.status !== "SUCCESS") {
        return res.status(400).json({
          message: "Cannot ship unpaid order",
        });
      }

      if (!order.shipping?.shipmentId) {

        // 1️⃣ Create Order
        const shipment = await createShiprocketOrder(order);

        // 2️⃣ Save immediately to prevent duplication
        order.shipping = {
          shiprocketOrderId: shipment.order_id,
          shipmentId: shipment.shipment_id,
          status: "CREATED",
        };

        await order.save();

        // 3️⃣ Assign AWB
        const awbResponse = await assignCourier(
          shipment.shipment_id
        );

        order.shipping.awbCode =
          awbResponse?.response?.awb_code || null;

        order.shipping.courierName =
          awbResponse?.response?.courier_name || null;

        // 4️⃣ Request Pickup (idempotent-safe)
        await requestPickup(shipment.shipment_id);

        order.shipping.status = "PICKUP_SCHEDULED";
        order.shipping.pickupScheduledAt = new Date();
      }
    }

    /* =====================================================
       SHIPPED (Manual override only)
       Webhook should normally handle this
    ===================================================== */
    if (status === "SHIPPED") {

      if (!order.shipping?.shipmentId) {
        return res.status(400).json({
          message: "Shipment not created yet",
        });
      }

      order.shipping.status = "SHIPPED";
      order.shipping.shippedAt = new Date();

      if (order.customerSnapshot?.email) {
        await sendOrderShippedEmail(order);
      }
    }

    /* =====================================================
       DELIVERED (Manual override)
       Webhook normally handles this
    ===================================================== */
    if (status === "DELIVERED") {

      if (!order.shipping) order.shipping = {};

      order.shipping.status = "DELIVERED";
      order.shipping.deliveredAt = new Date();

      if (order.customerSnapshot?.email) {
        await sendOrderDeliveredEmail(order);
      }
    }

    /* =====================================================
       CANCEL
    ===================================================== */
    if (status === "CANCELLED") {

      if (["SHIPPED", "DELIVERED"].includes(order.status)) {
        return res.status(400).json({
          message: "Cannot cancel shipped/delivered order",
        });
      }

      /* Refund if already paid */
      if (order.payment.status === "SUCCESS") {

        const refundResponse = await refundPayU(order);

        if (String(refundResponse.status) !== "1") {
          return res.status(400).json({
            message: "Refund failed. Cannot cancel order.",
          });
        }

        order.payment.status = "REFUNDED";
      }

      /* Restore stock */
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        const variant = product?.variants.id(item.variantId);

        if (variant) {
          variant.stock += item.quantity;
          variant.availability =
            variant.stock > 0 &&
            variant.status === "ACTIVE" &&
            product.status === "ACTIVE";

          await product.save();
        }
      }

      if (order.customerSnapshot?.email) {
        await sendRefundEmail(order);
      }
    }

    order.status = status;

    await order.save();

    res.json({
      message: "Order updated",
      order,
    });

  } catch (error) {
    console.error("UPDATE ORDER ERROR:", error);
    res.status(500).json({
      message: "Failed to update order",
    });
  }
};

export const approveReturn = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order || order.status !== "RETURN_REQUESTED") {
      return res.status(400).json({
        message: "Invalid return request",
      });
    }

    order.status = "RETURN_APPROVED";
    order.returnInfo.status = "APPROVED";
    order.returnInfo.approvedAt = new Date();

    await order.save();

    res.json({
      message: "Return approved",
    });

  } catch (error) {
    console.error("APPROVE RETURN ERROR:", error);
    res.status(500).json({
      message: "Failed to approve return",
    });
  }
};

export const completeRefund = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order || order.status !== "RETURN_APPROVED") {
      return res.status(400).json({
        message: "Refund not allowed",
      });
    }

    const refundResponse = await refundPayU(order);

    if (String(refundResponse.status) !== "1") {
      return res.status(400).json({
        message: "Refund failed",
      });
    }

    /* Restore stock */
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      const variant = product?.variants.id(item.variantId);

      if (variant) {
        variant.stock += item.quantity;

        variant.availability =
          variant.stock > 0 &&
          variant.status === "ACTIVE" &&
          product.status === "ACTIVE";

        await product.save();
      }
    }

    order.payment.status = "REFUNDED";
    order.status = "REFUNDED";
    order.returnInfo.status = "COMPLETED";
    order.returnInfo.refundedAt = new Date();

    await order.save();

    if (order.customerSnapshot?.email) {
      await sendRefundEmail(order);
    }

    res.json({
      message: "Refund completed",
    });

  } catch (error) {
    console.error("REFUND ERROR:", error);
    res.status(500).json({
      message: "Failed to process refund",
    });
  }
};
