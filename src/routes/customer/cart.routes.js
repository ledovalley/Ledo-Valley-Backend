import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../../controllers/customer/cart.controller.js";
import { authenticateCustomer } from "../../middlewares/authenticateCustomer.js";

const router = express.Router();

router.get("/cart", authenticateCustomer, getCart);
router.post("/cart", authenticateCustomer, addToCart);
router.put("/cart/:productId", authenticateCustomer, updateCartItem);
router.delete("/cart/:productId", authenticateCustomer, removeCartItem);
router.delete("/cart", authenticateCustomer, clearCart);
router.put(
  "/cart/:productId/:variantId",
  authenticateCustomer,
  updateCartItem
);

router.delete(
  "/cart/:productId/:variantId",
  authenticateCustomer,
  removeCartItem
);

export default router;
