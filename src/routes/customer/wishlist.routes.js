import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../../controllers/customer/wishlist.controller.js";
import { authenticateCustomer } from "../../middlewares/authenticateCustomer.js";

const router = express.Router();

router.get("/wishlist", authenticateCustomer, getWishlist);
router.post("/wishlist/:productId", authenticateCustomer, addToWishlist);
router.delete("/wishlist/:productId", authenticateCustomer, removeFromWishlist);

export default router;
