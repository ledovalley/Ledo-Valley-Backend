import express from "express";
import {
    listAllOrders,
    getOrderById,
    updateOrderStatus,
    approveReturn,
    completeRefund,
} from "../../controllers/admin/order.controller.js";
import { authenticateAdmin } from "../../middlewares/authenticateAdmin.js";

const router = express.Router();

router.get("/orders", authenticateAdmin, listAllOrders);
router.get("/orders/:orderId", authenticateAdmin, getOrderById);
router.patch("/orders/:orderId/status", authenticateAdmin, updateOrderStatus);
router.patch(
    "/orders/:orderId/approve-return",
    authenticateAdmin,
    approveReturn
);

router.patch(
    "/orders/:orderId/complete-refund",
    authenticateAdmin,
    completeRefund
);

export default router;
