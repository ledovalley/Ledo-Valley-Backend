import Product from "../../models/Product.js";
import Order from "../../models/Order.js";
import Customer from "../../models/Customer.js";

export const addProductReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, review, orderId } = req.body;

    const customerId = req.customer.id;

    /* ==========================
       CHECK ORDER VALIDITY
    =========================== */

    const order = await Order.findOne({
      _id: orderId,
      customerId,
      status: "DELIVERED",
      "items.productId": productId,
    });

    if (!order) {
      return res.status(400).json({
        message: "You can review only purchased & delivered products",
      });
    }

    /* ==========================
       CHECK DUPLICATE REVIEW
    =========================== */

    const product = await Product.findById(productId);

    const alreadyReviewed = product.reviews.find(
      (r) =>
        r.customerId.toString() === customerId &&
        r.orderId.toString() === orderId
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        message: "You already reviewed this purchase",
      });
    }

    const customer = await Customer.findById(customerId);

    /* ==========================
       ADD REVIEW
    =========================== */

    product.reviews.push({
      customerId,
      orderId,
      productId,
      customerName: customer.name,
      rating,
      review,
    });

    product.calculateRating();

    await product.save();

    res.json({
      message: "Review added successfully",
    });

  } catch (error) {
    console.error("ADD REVIEW ERROR:", error);
    res.status(500).json({
      message: "Failed to add review",
    });
  }
};

export const checkReviewEligibility = async (req, res) => {
  try {
    const { productId } = req.params;
    const customerId = req.customer.id;

    const deliveredOrders = await Order.find({
      customerId,
      status: "DELIVERED",
      "items.productId": productId,
    }).lean();

    if (!deliveredOrders.length) {
      return res.json({ eligible: false });
    }

    const product = await Product.findById(productId).lean();

    const eligibleOrders = deliveredOrders.filter(order => {
      const alreadyReviewed = product.reviews.some(
        r =>
          r.customerId.toString() === customerId &&
          r.orderId.toString() === order._id.toString()
      );

      return !alreadyReviewed;
    });

    res.json({
      eligible: eligibleOrders.length > 0,
      orders: eligibleOrders.map(o => ({
        orderId: o._id,
        orderNumber: o.orderNumber,
      })),
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to check review eligibility",
    });
  }
};

export const getAllReviews = async (req, res) => {
  try {
    const { search, rating, testimonial } = req.query;

    const products = await Product.find().lean();

    let reviews = [];

    products.forEach(product => {
      product.reviews.forEach(review => {
        reviews.push({
          ...review,
          productName: product.name,
          productId: product._id,
        });
      });
    });

    // Filters
    if (search) {
      reviews = reviews.filter(r =>
        r.review.toLowerCase().includes(search.toLowerCase()) ||
        r.customerName.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (rating) {
      reviews = reviews.filter(r => r.rating == Number(rating));
    }

    if (testimonial) {
      reviews = reviews.filter(
        r => r.isTestimonial === (testimonial === "true")
      );
    }

    // Sort newest first
    reviews.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(reviews);

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch reviews",
    });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    product.reviews = product.reviews.filter(
      (r) => r._id.toString() !== reviewId
    );

    product.calculateRating();
    await product.save();

    res.json({
      message: "Review deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to delete review",
    });
  }
};

export const toggleTestimonial = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;

    const product = await Product.findById(productId);

    const review = product.reviews.id(reviewId);

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    review.isTestimonial = !review.isTestimonial;

    await product.save();

    res.json({
      message: "Updated successfully",
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to update review",
    });
  }
};

export const getTestimonials = async (req, res) => {
  try {
    const products = await Product.find().lean();

    let testimonials = [];

    products.forEach(product => {
      product.reviews.forEach(review => {
        if (review.isTestimonial && review.status === "VISIBLE") {
          testimonials.push({
            ...review,
            productName: product.name,
          });
        }
      });
    });

    res.json(testimonials.slice(0, 6));

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch testimonials",
    });
  }
};
