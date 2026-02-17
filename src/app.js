import express from "express";
import cors from "cors";

import adminAuthRoutes from "./routes/admin/auth.routes.js";
import adminProductRoutes from "./routes/admin/product.routes.js";
import adminCouponRoutes from "./routes/admin/coupon.routes.js";
import adminOrderRoutes from "./routes/admin/order.routes.js";
import adminContactRoutes from "./routes/admin/contact.routes.js";
import adminNewsletterRoutes from "./routes/admin/newsletter.routes.js";
import adminCustomersRoutes from "./routes/admin/customer.routes.js";
import adminReviewsRoutes from "./routes/admin/review.routes.js";
import adminTopBannerRoutes from "./routes/admin/banner.routes.js";
import adminShopBannerRoutes from "./routes/admin/shopBanner.routes.js";

import customerAuthRoutes from "./routes/customer/auth.routes.js";
import customerProductRoutes from "./routes/customer/product.routes.js";
import customerProfileRoutes from "./routes/customer/profile.routes.js";
import customerAddressRoutes from "./routes/customer/address.routes.js";
import customerWishlistRoutes from "./routes/customer/wishlist.routes.js";
import customerCartRoutes from "./routes/customer/cart.routes.js";
import customerCouponRoutes from "./routes/customer/coupon.routes.js";
import customerOrderRoutes from "./routes/customer/order.routes.js";
import customerCheckoutRoutes from "./routes/customer/checkout.routes.js";
import paymentRoutes from "./routes/customer/payment.routes.js";
import customerContactRoutes from "./routes/customer/contact.routes.js";
import customerNewsletterRoutes from "./routes/customer/newsletter.routes.js";
import customerTopBannerRoutes from "./routes/customer/banner.routes.js";
import customerShopBannerRoutes from "./routes/customer/shopBanner.routes.js";

import shippingRoutes from "./routes/shipping.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://ledo-valley-admin.vercel.app/admin/login",
      "https://ledo-valley-website.vercel.app/"
    ],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "Ledo Valley Backend",
  });
});

/* =======================
   ADMIN ROUTES
======================= */
app.use("/api/auth/admin", adminAuthRoutes);
app.use("/api/admin", adminProductRoutes);
app.use("/api/admin", adminCouponRoutes);
app.use("/api/admin", adminOrderRoutes);
app.use("/api/admin", adminContactRoutes);
app.use("/api/admin/newsletter", adminNewsletterRoutes);
app.use("/api/admin/customers", adminCustomersRoutes);
app.use("/api/admin/reviews", adminReviewsRoutes);
app.use("/api/admin/top-banner", adminTopBannerRoutes);
app.use("/api/admin/shop-banner", adminShopBannerRoutes);

/* =======================
CUSTOMER ROUTES
======================= */
app.use("/api/auth/customer", customerAuthRoutes);
app.use("/api/customer", customerProductRoutes);
app.use("/api/customer", customerProfileRoutes);
app.use("/api/customer", customerAddressRoutes);
app.use("/api/customer", customerWishlistRoutes);
app.use("/api/customer", customerCartRoutes);
app.use("/api/customer", customerCouponRoutes);
app.use("/api/customer", customerOrderRoutes);
app.use("/api/customer", customerCheckoutRoutes);
app.use("/api/customer", customerContactRoutes);
app.use("/api/customer/newsletter", customerNewsletterRoutes);
app.use("/api/customer/top-banner", customerTopBannerRoutes);
app.use("/api/customer/shop-banner", customerShopBannerRoutes);

app.use("/api", shippingRoutes);
app.use("/api", paymentRoutes);
app.use("/invoices", express.static("invoices"));

app.use(errorHandler);

export default app;
