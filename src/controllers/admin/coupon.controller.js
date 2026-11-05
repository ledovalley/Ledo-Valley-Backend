import Coupon from "../../models/Coupon.js";

export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      type,
      value,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      expiresAt,
    } = req.body;

    if (!code || !type || !value || !expiresAt) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const exists = await Coupon.findOne({
      code: code.toUpperCase(),
    });

    if (exists) {
      return res.status(400).json({
        message: "Coupon code already exists",
      });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      description,
      type,
      value,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      expiresAt,
    });

    res.status(201).json(coupon);
  } catch (error) {
    console.error("Create coupon error:", error);
    res.status(500).json({ message: "Failed to create coupon" });
  }
};

export const updateCoupon = async (req, res) => {
  const { couponId } = req.params;

  const coupon = await Coupon.findById(couponId);

  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found" });
  }

  Object.assign(coupon, req.body);

  await coupon.save();

  res.json(coupon);
};

export const toggleCouponStatus = async (req, res) => {
  const { couponId } = req.params;

  const coupon = await Coupon.findById(couponId);

  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found" });
  }

  coupon.status =
    coupon.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  await coupon.save();

  res.json({
    message: "Coupon status updated",
    status: coupon.status,
  });
};

export const deleteCoupon = async (req, res) => {
  const { couponId } = req.params;

  const coupon = await Coupon.findById(couponId);

  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found" });
  }

  await coupon.deleteOne();

  res.json({ message: "Coupon deleted" });
};

export const getAllCoupons = async (req, res) => {
  const coupons = await Coupon.find().sort({
    createdAt: -1,
  });

  res.json(coupons);
};
