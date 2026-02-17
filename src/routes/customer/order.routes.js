import express from "express";
import {
    listMyOrders,
    getMyOrder,
    cancelMyOrder,
    retryPayment,
    requestReturn,
} from "../../controllers/customer/order.controller.js";
import { authenticateCustomer } from "../../middlewares/authenticateCustomer.js";

const router = express.Router();

router.get("/orders", authenticateCustomer, listMyOrders);
router.get("/orders/:orderId", authenticateCustomer, getMyOrder);
router.patch("/orders/:orderId/cancel", authenticateCustomer, cancelMyOrder);
router.post(
  "/orders/:orderId/retry-payment",
  authenticateCustomer,
  retryPayment
);
router.post(
  "/orders/:orderId/request-return",
  authenticateCustomer,
  requestReturn
);

export default router;
