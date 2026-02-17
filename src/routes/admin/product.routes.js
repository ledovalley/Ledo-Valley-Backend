import express from "express";
import {
  createProduct,
  addVariant,
  updateVariant,
  toggleVariantStatus,
  deleteVariant,
  getAllProducts,
  toggleProductStatus,
  getProductById,
  updateProductMeta,
  deleteProduct,
} from "../../controllers/admin/product.controller.js";
import { authenticateAdmin } from "../../middlewares/authenticateAdmin.js";
import { uploadProductImage } from "../../middlewares/uploadImage.js";

const router = express.Router();

/* PRODUCT */
router.get("/products", authenticateAdmin, getAllProducts);
router.post("/products", authenticateAdmin, createProduct);
router.get(
  "/products/:productId",
  authenticateAdmin,
  getProductById
);
router.put(
  "/products/:productId",
  authenticateAdmin,
  updateProductMeta
);
router.delete("/products/:productId", authenticateAdmin, deleteProduct);
router.put("/products/:productId/toggle", authenticateAdmin, toggleProductStatus);

/* VARIANTS */
router.post(
  "/products/:productId/variants",
  authenticateAdmin,
  uploadProductImage.array("images", 5),
  addVariant
);

router.put(
  "/products/:productId/variants/:variantId",
  authenticateAdmin,
  updateVariant
);

router.put(
  "/products/:productId/variants/:variantId/toggle",
  authenticateAdmin,
  toggleVariantStatus
);

router.delete(
  "/products/:productId/variants/:variantId",
  authenticateAdmin,
  deleteVariant
);

export default router;
