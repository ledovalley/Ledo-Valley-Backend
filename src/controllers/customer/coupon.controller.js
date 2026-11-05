import Coupon from "../../models/Coupon.js";

export const listActiveCoupons = async (req, res) => {
  const now = new Date();

  const coupons = await Coupon.find({
    status: "ACTIVE",
    expiresAt: { $gt: now },
  }).select("-usedCount -usageLimit");

  res.json(coupons);
};

export const validateCoupon = async (req, res) => {
  const { code, orderAmount } = req.body;

  if (!code || !orderAmount) {
    return res.status(400).json({
      message: "Coupon code and order amount required",
    });
  }

  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
  });

  if (!coupon) {
    return res.status(404).json({
      message: "Invalid coupon",
    });
  }

  if (coupon.status !== "ACTIVE") {
    return res.status(400).json({
      message: "Coupon inactive",
    });
  }

  if (coupon.expiresAt < new Date()) {
    return res.status(400).json({
      message: "Coupon expired",
    });
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    return res.status(400).json({
      message: "Coupon usage limit reached",
    });
  }

  if (orderAmount < coupon.minOrderAmount) {
    return res.status(400).json({
      message: `Minimum order amount ₹${coupon.minOrderAmount}`,
    });
  }

  let discountAmount = 0;

  if (coupon.type === "PERCENT") {
    discountAmount =
      (orderAmount * coupon.value) / 100;

    if (coupon.maxDiscount) {
      discountAmount = Math.min(
        discountAmount,
        coupon.maxDiscount
      );
    }
  } else {
    discountAmount = coupon.value;
  }

  const finalAmount = orderAmount - discountAmount;

  res.json({
    valid: true,
    discountAmount,
    finalAmount,
  });
};
