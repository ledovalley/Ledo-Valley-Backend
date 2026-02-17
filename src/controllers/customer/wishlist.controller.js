import Customer from "../../models/Customer.js";

/**
 * GET WISHLIST
 */
export const getWishlist = async (req, res) => {
  const customer = await Customer.findById(req.customer.id)
    .populate("wishlist");

  res.json(customer.wishlist);
};

/**
 * ADD TO WISHLIST
 */
export const addToWishlist = async (req, res) => {
  const { productId } = req.params;

  const customer = await Customer.findById(req.customer.id);

  if (customer.wishlist.includes(productId)) {
    return res.json({ message: "Already in wishlist" });
  }

  customer.wishlist.push(productId);
  await customer.save();

  res.json({ message: "Added to wishlist" });
};

/**
 * REMOVE FROM WISHLIST
 */
export const removeFromWishlist = async (req, res) => {
  const { productId } = req.params;

  const customer = await Customer.findById(req.customer.id);

  customer.wishlist = customer.wishlist.filter(
    (id) => id.toString() !== productId
  );

  await customer.save();

  res.json({ message: "Removed from wishlist" });
};
