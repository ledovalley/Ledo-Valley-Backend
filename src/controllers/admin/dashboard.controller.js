import Order from "../../models/Order.js";
import Product from "../../models/Product.js";
import Customer from "../../models/Customer.js";

export const getDashboardStats = async (req, res, next) => {
  try {
    /* =========================================
       1. RANGE HANDLING (Dynamic Filters)
    ========================================= */
    const range = req.query.range || "30d";

    let days = 30;
    if (range === "1d") days = 1;
    if (range === "7d") days = 7;
    if (range === "90d") days = 90;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // grouping format
    const groupFormat =
      range === "1d"
        ? "%H:00" // hourly
        : "%Y-%m-%d"; // daily

    /* =========================================
       2. PARALLEL DB CALLS (PERFORMANCE BOOST)
    ========================================= */
    const [
      totalOrders,
      totalProducts,
      totalCustomers,
      revenueResult,
      chartData,
      topProductsRaw,
      recentOrdersRaw
    ] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      Customer.countDocuments(),

      // total revenue
      Order.aggregate([
        {
          $match: {
            status: { $nin: ["CANCELLED", "PAYMENT_FAILED"] },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$grandTotal" },
          },
        },
      ]),

      // chart and comparison data
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: fromDate },
            status: { $nin: ["CANCELLED", "PAYMENT_FAILED"] },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: groupFormat,
                date: "$createdAt",
              },
            },
            revenue: { $sum: "$grandTotal" },
            orders: { $sum: 1 }
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // top products
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: fromDate },
            status: { $nin: ["CANCELLED", "PAYMENT_FAILED"] },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productName",
            totalSold: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.subtotal" },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
      ]),

      // recent orders
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "orderNumber customerSnapshot.name grandTotal status createdAt items.quantity"
        ),
    ]);

    /* =========================================
       3. FORMAT DATA
    ========================================= */

    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    const salesChart = chartData.map((item) => ({
      date: item._id,
      revenue: item.revenue,
    }));

    const comparisonChart = chartData.map((item) => ({
      date: item._id,
      revenue: item.revenue,
      orders: item.orders,
    }));

    const topProducts = topProductsRaw.map((item) => ({
      name: item._id,
      totalSold: item.totalSold,
      revenue: item.revenue,
    }));

    const recentOrders = recentOrdersRaw.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customerSnapshot?.name || "Unknown",
      total: order.grandTotal,
      status: order.status,
      date: order.createdAt,
      itemsCount: order.items.reduce(
        (acc, item) => acc + item.quantity,
        0
      ),
    }));

    /* =========================================
       4. RESPONSE
    ========================================= */
    res.status(200).json({
      success: true,
      stats: {
        totalRevenue,
        totalOrders,
        totalProducts,
        totalCustomers,
      },
      salesChart,
      comparisonChart,
      topProducts,
      recentOrders,
    });
  } catch (error) {
    next(error);
  }
};