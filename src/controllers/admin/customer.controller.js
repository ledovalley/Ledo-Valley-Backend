import Customer from "../../models/Customer.js";
import Order from "../../models/Order.js";

/* ======================================================
   LIST CUSTOMERS (ADMIN)
====================================================== */
export const listCustomers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            minSpend,
            maxSpend,
            minOrders,
            maxOrders,
            emailVerified,
            startDate,
            endDate,
            sort = "newest",
        } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const pipeline = [];

        /* ================= BASE MATCH ================= */

        const matchStage = {};

        if (search) {
            matchStage.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
            ];
        }

        if (emailVerified === "true" || emailVerified === "false") {
            matchStage.emailVerified = emailVerified === "true";
        }

        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        pipeline.push({ $match: matchStage });

        /* ================= JOIN ORDERS ================= */

        pipeline.push({
            $lookup: {
                from: "orders",
                localField: "_id",
                foreignField: "customerId",
                as: "orders",
            },
        });

        /* ================= CALCULATE STATS ================= */

        pipeline.push({
            $addFields: {
                totalOrders: { $size: "$orders" },
                totalSpend: {
                    $sum: {
                        $map: {
                            input: "$orders",
                            as: "order",
                            in: "$$order.grandTotal",
                        },
                    },
                },
                lastOrderDate: { $max: "$orders.createdAt" },
            },
        });

        /* ================= FILTERS AFTER CALC ================= */

        const statsMatch = {};

        if (minSpend) statsMatch.totalSpend = { $gte: Number(minSpend) };
        if (maxSpend)
            statsMatch.totalSpend = {
                ...statsMatch.totalSpend,
                $lte: Number(maxSpend),
            };

        if (minOrders) statsMatch.totalOrders = { $gte: Number(minOrders) };
        if (maxOrders)
            statsMatch.totalOrders = {
                ...statsMatch.totalOrders,
                $lte: Number(maxOrders),
            };

        if (Object.keys(statsMatch).length) {
            pipeline.push({ $match: statsMatch });
        }

        /* ================= REMOVE HEAVY DATA ================= */

        pipeline.push({
            $project: {
                orders: 0,
                emailVerificationToken: 0,
                emailVerificationTokenExpires: 0,
            },
        });

        /* ================= SORT ================= */

        let sortOption = { createdAt: -1 };

        if (sort === "oldest") sortOption = { createdAt: 1 };
        if (sort === "highSpend") sortOption = { totalSpend: -1 };
        if (sort === "mostOrders") sortOption = { totalOrders: -1 };

        pipeline.push({ $sort: sortOption });

        /* ================= PAGINATION ================= */

        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: Number(limit) });

        const customers = await Customer.aggregate(pipeline);

        const total = await Customer.countDocuments(matchStage);

        res.json({
            customers,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
        });

    } catch (error) {
        console.error("LIST CUSTOMERS ERROR:", error);
        res.status(500).json({ message: "Failed to fetch customers" });
    }
};


/* ======================================================
   GET CUSTOMER PROFILE (ADMIN)
====================================================== */
export const getCustomerProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { orderPage = 1, orderLimit = 10 } = req.query;

        const skip = (Number(orderPage) - 1) * Number(orderLimit);

        const customer = await Customer.findById(id).select(
            "-emailVerificationToken -emailVerificationTokenExpires"
        );

        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        const [orders, totalOrdersCount] = await Promise.all([
            Order.find({ customerId: id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(orderLimit))
                .lean(),

            Order.countDocuments({ customerId: id }),
        ]);

        const totalSpendAgg = await Order.aggregate([
            { $match: { customerId: customer._id } },
            {
                $group: {
                    _id: null,
                    totalSpend: { $sum: "$grandTotal" },
                    lastOrderDate: { $max: "$createdAt" },
                },
            },
        ]);

        const totalSpend = totalSpendAgg[0]?.totalSpend || 0;
        const lastOrderDate = totalSpendAgg[0]?.lastOrderDate || null;

        const stats = {
            totalOrders: totalOrdersCount,
            totalSpend,
            lastOrderDate,
            averageOrderValue:
                totalOrdersCount > 0
                    ? totalSpend / totalOrdersCount
                    : 0,
        };

        res.json({
            customer,
            stats,
            orders,
            orderPage: Number(orderPage),
            orderPages: Math.ceil(totalOrdersCount / Number(orderLimit)),
        });

    } catch (error) {
        console.error("CUSTOMER PROFILE ERROR:", error);
        res.status(500).json({ message: "Failed to fetch profile" });
    }
};
