import Product, { TEA_TYPES } from "../../models/Product.js";
import cloudinary from "../../services/cloudinary.service.js";
import slugify from "slugify";
import mongoose from "mongoose";

const calculateFinalPrice = (sellingPrice, discount) => {
  if (!discount || !discount.value) return sellingPrice;

  if (discount.type === "PERCENT") {
    return Math.max(
      sellingPrice - (sellingPrice * discount.value) / 100,
      0
    );
  }

  return Math.max(sellingPrice - discount.value, 0);
};

/* =====================
   CREATE PRODUCT
===================== */
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      description,
      teaType,
      bestFor = [],
      tags = [],
      featured = false,
    } = req.body;

    if (!name?.trim() || !sku?.trim()) {
      return res.status(400).json({
        message: "Name and SKU are required",
      });
    }

    if (!TEA_TYPES.includes(teaType)) {
      return res.status(400).json({
        message: "Invalid tea type",
      });
    }

    const upperSku = sku.toUpperCase().trim();

    const exists = await Product.findOne({ sku: upperSku });
    if (exists) {
      return res.status(400).json({
        message: "Product SKU already exists",
      });
    }

    const slug = slugify(name, { lower: true, strict: true });

    const slugExists = await Product.findOne({ slug });
    if (slugExists) {
      return res.status(400).json({
        message: "Product with similar name already exists",
      });
    }

    const product = await Product.create({
      name: name.trim(),
      slug,
      sku: upperSku,
      description: description?.trim(),
      teaType,
      bestFor: Array.isArray(bestFor) ? bestFor : [],
      tags: Array.isArray(tags) ? tags : [],
      featured: Boolean(featured),
      status: "DRAFT",
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);
    res.status(500).json({ message: "Failed to create product" });
  }
};

/* =====================
   DELETE PRODUCT
===================== */
export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (product.status === "ACTIVE") {
      return res.status(400).json({
        message: "Deactivate product before deleting",
      });
    }

    for (const variant of product.variants) {
      for (const img of variant.images) {
        if (img.publicId) {
          await cloudinary.uploader.destroy(img.publicId);
        }
      }
    }

    await product.deleteOne();

    res.json({
      message: "Product deleted successfully",
    });

  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);
    res.status(500).json({
      message: "Failed to delete product",
    });
  }
};

/* =====================
   ADD VARIANT
===================== */
export const addVariant = async (req, res) => {
  const session = await Product.startSession();
  session.startTransaction();

  try {
    const { productId } = req.params;
    const {
      variantSku,
      weight,
      dimensions,
      costPrice,
      sellingPrice,
      discount,
      stock,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error("Invalid product ID");
    }

    const product = await Product.findById(productId).session(session);
    if (!product) throw new Error("Product not found");

    const skuUpper = variantSku?.toUpperCase();
    if (!skuUpper) throw new Error("Variant SKU required");

    const skuExists = await Product.findOne({
      "variants.variantSku": skuUpper,
    }).session(session);

    if (skuExists) {
      throw new Error("Variant SKU already exists globally");
    }

    const parsedWeight =
      typeof weight === "string" ? JSON.parse(weight) : weight;

    if (!parsedWeight?.value || !parsedWeight?.unit) {
      throw new Error("Invalid weight data");
    }

    const parsedDiscount =
      discount
        ? typeof discount === "string"
          ? JSON.parse(discount)
          : discount
        : { type: "PERCENT", value: 0 };

    const parsedSelling = Number(sellingPrice);
    const parsedCost = Number(costPrice);
    const parsedStock = Number(stock || 0);

    if (
      isNaN(parsedSelling) ||
      isNaN(parsedCost) ||
      parsedSelling < 0 ||
      parsedCost < 0
    ) {
      throw new Error("Invalid price values");
    }

    const finalPrice = calculateFinalPrice(
      parsedSelling,
      parsedDiscount
    );

    const images =
      req.files?.map((file) => ({
        url: file.path,
        publicId: file.filename,
      })) || [];

    product.variants.push({
      variantSku: skuUpper,
      weight: parsedWeight,
      dimensions,
      costPrice: parsedCost,
      sellingPrice: parsedSelling,
      discount: parsedDiscount,
      finalPrice,
      stock: parsedStock,
      images,
      availability:
        product.status === "ACTIVE" && parsedStock > 0,
    });

    await product.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.json({
      message: "Variant added successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      message: error.message || "Failed to add variant",
    });
  }
};

/* =====================
   UPDATE VARIANT
===================== */
export const updateVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ message: "Invalid variant ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    if (req.body.stock !== undefined) {
      const parsedStock = Number(req.body.stock);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ message: "Invalid stock value" });
      }
      variant.stock = parsedStock;
    }

    if (req.body.sellingPrice !== undefined) {
      const parsedPrice = Number(req.body.sellingPrice);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ message: "Invalid selling price" });
      }
      variant.sellingPrice = parsedPrice;
    }

    if (req.body.discount !== undefined) {
      const parsedDiscount =
        typeof req.body.discount === "string"
          ? JSON.parse(req.body.discount)
          : req.body.discount;
      variant.discount = parsedDiscount;
    }

    variant.finalPrice = calculateFinalPrice(
      variant.sellingPrice,
      variant.discount
    );

    variant.availability =
      product.status === "ACTIVE" &&
      variant.status === "ACTIVE" &&
      variant.stock > 0;

    await product.save();

    res.json({
      success: true,
      message: "Variant updated successfully",
      variant,
    });
  } catch (error) {
    console.error("UPDATE VARIANT ERROR:", error);
    res.status(500).json({ message: "Failed to update variant" });
  }
};

/* =====================
   TOGGLE VARIANT STATUS
===================== */
export const toggleVariantStatus = async (req, res) => {
  try {
    const { productId, variantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ message: "Invalid variant ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    variant.status =
      variant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    variant.availability =
      product.status === "ACTIVE" &&
      variant.status === "ACTIVE" &&
      variant.stock > 0;

    await product.save();

    res.json({
      success: true,
      message: "Variant status updated",
      variant,
    });
  } catch (error) {
    console.error("TOGGLE VARIANT STATUS ERROR:", error);
    res.status(500).json({ message: "Failed to update variant status" });
  }
};

/* =====================
   DELETE VARIANT
===================== */
export const deleteVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ message: "Invalid variant ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    if (product.variants.length <= 1) {
      return res.status(400).json({
        message: "Product must have at least one variant",
      });
    }

    for (const img of variant.images) {
      if (img.publicId) {
        await cloudinary.uploader.destroy(img.publicId);
      }
    }

    product.variants.pull({ _id: variantId });
    await product.save();

    res.json({ message: "Variant deleted successfully" });
  } catch (error) {
    console.error("DELETE VARIANT ERROR:", error);
    res.status(500).json({ message: "Failed to delete variant" });
  }
};

/* =====================
   TOGGLE PRODUCT STATUS
===================== */
export const toggleProductStatus = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.status === "DRAFT" && product.variants.length === 0) {
      return res.status(400).json({
        message: "Cannot activate draft product without variants",
      });
    }

    product.status =
      product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    product.variants.forEach((variant) => {
      variant.availability =
        product.status === "ACTIVE" &&
        variant.status === "ACTIVE" &&
        variant.stock > 0;
    });

    await product.save();

    res.json({
      success: true,
      message: "Product status updated",
      status: product.status,
    });
  } catch (error) {
    console.error("TOGGLE PRODUCT STATUS ERROR:", error);
    res.status(500).json({ message: "Failed to update product status" });
  }
};

/* =====================
   GET ALL PRODUCTS (ADMIN)
===================== */
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .select("name status variants createdAt featured tags");

    res.json(
      products.map((p) => ({
        _id: p._id,
        name: p.name,
        status: p.status,
        variantCount: p.variants.length,
        createdAt: p.createdAt,
        featured: p.featured,
        tags: p.tags,
      }))
    );
  } catch (error) {
    console.error("GET ALL PRODUCTS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

/* =====================
   GET SINGLE PRODUCT (ADMIN)
===================== */
export const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("GET PRODUCT ERROR:", error);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

/* =====================
   UPDATE PRODUCT META
===================== */
export const updateProductMeta = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const {
      name,
      featured,
      tags,
      bestFor,
      description,
      teaType,
      status,
    } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (name !== undefined) {
      product.name = name.trim();
      product.slug = slugify(name, { lower: true, strict: true });
    }

    if (description !== undefined) {
      product.description = description;
    }

    if (teaType !== undefined) {
      if (!TEA_TYPES.includes(teaType)) {
        return res.status(400).json({
          message: "Invalid tea type",
        });
      }
      product.teaType = teaType;
    }

    if (Array.isArray(bestFor)) {
      product.bestFor = bestFor;
    }

    if (Array.isArray(tags)) {
      product.tags = tags;
    }

    if (typeof featured === "boolean") {
      product.featured = featured;
    }

    if (status !== undefined) {
      if (status === "ACTIVE" && product.variants.length === 0) {
        return res.status(400).json({
          message: "Cannot activate product without at least one variant",
        });
      }

      product.status = status;

      product.variants.forEach((variant) => {
        variant.availability =
          product.status === "ACTIVE" &&
          variant.status === "ACTIVE" &&
          variant.stock > 0;
      });
    }

    await product.save();

    res.json({
      success: true,
      message: "Product updated successfully",
      product,
    });

  } catch (error) {
    console.error("UPDATE PRODUCT META ERROR:", error);
    res.status(500).json({
      message: "Failed to update product",
    });
  }
};
