import Product from "../../models/Product.js";
import cloudinary from "../../services/cloudinary.service.js";
import slugify from "slugify";

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
    console.error("Create product error:", error);
    res.status(500).json({ message: "Failed to create product" });
  }
};

/* =====================
   DELETE PRODUCT
===================== */
export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    /* --------------------------------
       OPTIONAL SAFETY CHECK
       Prevent deleting active product
    --------------------------------- */
    if (product.status === "ACTIVE") {
      return res.status(400).json({
        message: "Deactivate product before deleting",
      });
    }

    /* --------------------------------
       Delete all variant images
    --------------------------------- */
    for (const variant of product.variants) {
      for (const img of variant.images) {
        if (img.publicId) {
          await cloudinary.uploader.destroy(img.publicId);
        }
      }
    }

    /* --------------------------------
       Delete product
    --------------------------------- */
    await product.deleteOne();

    res.json({
      message: "Product deleted successfully",
    });

  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      message: "Failed to delete product",
    });
  }
};

/* =====================
   ADD VARIANT (UPDATED)
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

    const product = await Product.findById(productId).session(session);
    if (!product) throw new Error("Product not found");

    const skuUpper = variantSku?.toUpperCase();
    if (!skuUpper) throw new Error("Variant SKU required");

    // 🔥 Global SKU protection
    const skuExists = await Product.findOne({
      "variants.variantSku": skuUpper,
    }).session(session);

    if (skuExists) {
      throw new Error("Variant SKU already exists globally");
    }

    /* =====================
       PARSE NESTED FIELDS
    ===================== */

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

    /* =====================
       IMAGES
    ===================== */

    const images =
      req.files?.map((file) => ({
        url: file.path,
        publicId: file.filename,
      })) || [];

    /* =====================
       PUSH VARIANT
    ===================== */

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
        product.status === "ACTIVE" &&
        parsedStock > 0,
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
   UPDATE VARIANT (UPDATED)
===================== */
export const updateVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    // Update allowed fields
    if (req.body.stock !== undefined) {
      const parsedStock = Number(req.body.stock);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ message: "Invalid stock" });
      }
      variant.stock = parsedStock;
    }

    if (req.body.sellingPrice !== undefined) {
      variant.sellingPrice = Number(req.body.sellingPrice);
    }

    if (req.body.discount !== undefined) {
      const parsedDiscount =
        typeof req.body.discount === "string"
          ? JSON.parse(req.body.discount)
          : req.body.discount;

      variant.discount = parsedDiscount;
    }

    // 🔥 Always recalc final price
    variant.finalPrice = calculateFinalPrice(
      variant.sellingPrice,
      variant.discount
    );

    variant.availability =
      product.status === "ACTIVE" &&
      variant.status === "ACTIVE" &&
      variant.stock > 0;

    await product.save();

    res.json({ message: "Variant updated", variant });
  } catch (error) {
    console.error("Update variant error:", error);
    res.status(500).json({ message: "Failed to update variant" });
  }
};

/* =====================
   TOGGLE VARIANT STATUS (UPDATED)
===================== */
export const toggleVariantStatus = async (req, res) => {
  const { productId, variantId } = req.params;

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
  res.json(variant);
};

/* =====================
   DELETE VARIANT
===================== */
export const deleteVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    /* ---------------------
       Delete images from Cloudinary
    --------------------- */
    for (const img of variant.images) {
      if (img.publicId) {
        await cloudinary.uploader.destroy(img.publicId);
      }
    }

    if (product.variants.length <= 1) {
      return res.status(400).json({
        message: "Product must have at least one variant",
      });
    }

    /* ---------------------
       Remove variant safely (Mongoose v7+)
    --------------------- */
    product.variants.pull({ _id: variantId });

    await product.save();

    res.json({ message: "Variant deleted successfully" });
  } catch (error) {
    console.error("Delete variant error:", error);
    res.status(500).json({ message: "Failed to delete variant" });
  }
};

/* =====================
   TOGGLE PRODUCT STATUS (UPDATED)
===================== */
export const toggleProductStatus = async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // 🔥 Prevent activation without variants
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
    message: "Product status updated",
    status: product.status,
  });
};

/* =====================
   GET ALL PRODUCTS (ADMIN)
===================== */
export const getAllProducts = async (req, res) => {
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
};


/* =====================
   GET SINGLE PRODUCT (ADMIN)
===================== */
export const getProductById = async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json(product);
};

/* =====================
   UPDATE PRODUCT META (FULL FIX)
===================== */
export const updateProductMeta = async (req, res) => {
  try {
    const { productId } = req.params;
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

    /* ---------------------
       BASIC FIELDS
    --------------------- */

    if (name !== undefined) {
      product.name = name.trim();

      // regenerate slug if name changes
      product.slug = slugify(name, {
        lower: true,
        strict: true,
      });
    }

    if (description !== undefined) {
      product.description = description;
    }

    if (teaType !== undefined) {
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

    /* ---------------------
       STATUS UPDATE
    --------------------- */

    if (status !== undefined) {
      if (
        status === "ACTIVE" &&
        product.variants.length === 0
      ) {
        return res.status(400).json({
          message:
            "Cannot activate product without at least one variant",
        });
      }

      product.status = status;

      // recalc availability for variants
      product.variants.forEach((variant) => {
        variant.availability =
          product.status === "ACTIVE" &&
          variant.status === "ACTIVE" &&
          variant.stock > 0;
      });
    }

    await product.save();

    res.json({
      message: "Product updated successfully",
      product,
    });

  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      message: "Failed to update product",
    });
  }
};
