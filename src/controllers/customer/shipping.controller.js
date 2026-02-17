import axios from "axios";
import Order from "../../models/Order.js";
import { getShiprocketToken, assignCourier } from "../../services/shiprocket.service.js";
import { env } from "../../config/env.js";

/* ======================================================
   SHIPROCKET WEBHOOK
====================================================== */
export const shiprocketWebhook = async (req, res) => {
    try {
        const {
            order_id,
            shipment_id,
            current_status,
            awb,
            courier_name,
        } = req.body;

        if (!order_id) {
            return res.status(400).json({ message: "Invalid payload" });
        }

        const order = await Order.findOne({
            "shipping.shiprocketOrderId": order_id,
        });

        if (!order) {
            return res.status(200).json({ message: "Order not found" });
        }

        if (!order.shipping) order.shipping = {};

        order.shipping.shipmentId = shipment_id || order.shipping.shipmentId;
        order.shipping.awbCode = awb || order.shipping.awbCode;
        order.shipping.courierName = courier_name || order.shipping.courierName;
        order.shipping.status = current_status;

        switch (current_status) {

            case "AWB_ASSIGNED":
            case "PICKUP_SCHEDULED":
                order.status = "READY_TO_SHIP";
                break;

            case "PICKED_UP":
            case "IN_TRANSIT":
            case "OUT_FOR_DELIVERY":
                order.status = "SHIPPED";

                if (!order.shipping.shippedAt) {
                    order.shipping.shippedAt = new Date();
                }

                if (order.customerSnapshot?.email) {
                    await sendOrderShippedEmail(order);
                }

                break;

            case "DELIVERED":
                order.status = "DELIVERED";
                order.shipping.deliveredAt = new Date();

                if (order.customerSnapshot?.email) {
                    await sendOrderDeliveredEmail(order);
                }

                break;

            case "CANCELLED":
                order.status = "CANCELLED";
                break;
        }

        await order.save();

        return res.status(200).json({ message: "Webhook processed" });

    } catch (error) {
        console.error("SHIPROCKET WEBHOOK ERROR:", error);
        return res.status(500).json({ message: "Webhook failed" });
    }
};
