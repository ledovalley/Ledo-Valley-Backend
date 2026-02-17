import Customer from "../../models/Customer.js";
import Product from "../../models/Product.js";

/* ======================================================
   HELPER: Populate Cart
====================================================== */
const populateCart = async (customer) => {
  return await customer.populate("cart.product");
};

/* ======================================================
   GET CART
====================================================== */
export const getCart = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    await populateCart(customer);

    const formattedCart = customer.cart.map((item) => {
      const product = item.product;

      if (!product) return null;

      const variant = product.variants.id(item.variantId);

      if (!variant) return null;

      return {
        product: {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          images: variant.images?.length
            ? variant.images
            : product.images || [],
        },
        variant: {
          _id: variant._id,
          weight: variant.weight,
        },
        quantity: item.quantity,
        priceAtAdd: item.priceAtAdd,
      };
    });

    res.json(formattedCart.filter(Boolean));
  } catch (error) {
    console.error("GET CART ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch cart",
    });
  }
};

/* ======================================================
   ADD TO CART
====================================================== */
export const addToCart = async (req, res) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;

    if (!productId || !variantId) {
      return res.status(400).json({
        message: "Product and variant required",
      });
    }

    const product = await Product.findById(productId);

    if (!product || product.status !== "ACTIVE") {
      return res.status(400).json({
        message: "Product unavailable",
      });
    }

    const variant = product.variants.id(variantId);

    if (
      !variant ||
      variant.status !== "ACTIVE" ||
      !variant.availability
    ) {
      return res.status(400).json({
        message: "Variant unavailable",
      });
    }

    if (variant.stock < quantity) {
      return res.status(400).json({
        message: "Insufficient stock",
      });
    }

    const customer = await Customer.findById(req.customer.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const existingItem = customer.cart.find(
      (item) =>
        item.product.toString() === productId &&
        item.variantId.toString() === variantId
    );

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;

      if (newQty > variant.stock) {
        return res.status(400).json({
          message: "Stock limit exceeded",
        });
      }

      existingItem.quantity = newQty;
    } else {
      customer.cart.push({
        product: productId,
        variantId,
        quantity,
        priceAtAdd: variant.finalPrice,
      });
    }

    await customer.save();
    await populateCart(customer);

    res.json(customer.cart);
  } catch (error) {
    console.error("ADD TO CART ERROR:", error);
    res.status(500).json({
      message: "Failed to add to cart",
    });
  }
};

/* ======================================================
   UPDATE CART ITEM (CHANGE QUANTITY)
====================================================== */
export const updateCartItem = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        message: "Invalid quantity",
      });
    }

    const customer = await Customer.findById(req.customer.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const item = customer.cart.find(
      (i) =>
        i.product.toString() === productId &&
        i.variantId.toString() === variantId
    );

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    const product = await Product.findById(productId);
    const variant = product?.variants.id(variantId);

    if (!variant || variant.stock < quantity) {
      return res.status(400).json({
        message: "Insufficient stock",
      });
    }

    item.quantity = quantity;

    await customer.save();
    await populateCart(customer);

    res.json(customer.cart);
  } catch (error) {
    console.error("UPDATE CART ERROR:", error);
    res.status(500).json({
      message: "Failed to update cart",
    });
  }
};

/* ======================================================
   REMOVE SINGLE ITEM
====================================================== */
export const removeCartItem = async (req, res) => {
  try {
    const { productId, variantId } = req.params;

    const customer = await Customer.findById(req.customer.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    customer.cart = customer.cart.filter(
      (item) =>
        !(
          item.product.toString() === productId &&
          item.variantId.toString() === variantId
        )
    );

    await customer.save();
    await populateCart(customer);

    res.json(customer.cart);
  } catch (error) {
    console.error("REMOVE CART ITEM ERROR:", error);
    res.status(500).json({
      message: "Failed to remove item",
    });
  }
};

/* ======================================================
   CLEAR ENTIRE CART
====================================================== */
export const clearCart = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    customer.cart = [];

    await customer.save();

    res.json({
      message: "Cart cleared",
    });
  } catch (error) {
    console.error("CLEAR CART ERROR:", error);
    res.status(500).json({
      message: "Failed to clear cart",
    });
  }
};
