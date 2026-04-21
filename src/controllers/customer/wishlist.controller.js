import Customer from "../../models/Customer.js";
import mongoose from "mongoose";

/**
 * GET WISHLIST
 */
export const getWishlist = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.id).populate(
      "wishlist",
      "name slug rating reviewCount variants images" // only fetch needed fields - faster!
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer.wishlist);
  } catch (error) {
    console.error("GET WISHLIST ERROR:", error);
    res.status(500).json({ message: "Failed to fetch wishlist" });
  }
};

/**
 * ADD TO WISHLIST
 */
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const customer = await Customer.findById(req.customer.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const alreadyInWishlist = customer.wishlist.some(
      (id) => id.toString() === productId
    );

    if (alreadyInWishlist) {
      return res.status(400).json({ message: "Product already in wishlist" });
    }

    customer.wishlist.push(productId);
    await customer.save();

    res.json({ message: "Added to wishlist" });
  } catch (error) {
    console.error("ADD TO WISHLIST ERROR:", error);
    res.status(500).json({ message: "Failed to add to wishlist" });
  }
};

/**
 * REMOVE FROM WISHLIST
 */
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const customer = await Customer.findById(req.customer.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const existed = customer.wishlist.some(
      (id) => id.toString() === productId
    );

    if (!existed) {
      return res.status(404).json({ message: "Product not in wishlist" });
    }

    customer.wishlist = customer.wishlist.filter(
      (id) => id.toString() !== productId
    );

    await customer.save();

    res.json({ message: "Removed from wishlist" });
  } catch (error) {
    console.error("REMOVE FROM WISHLIST ERROR:", error);
    res.status(500).json({ message: "Failed to remove from wishlist" });
  }
};