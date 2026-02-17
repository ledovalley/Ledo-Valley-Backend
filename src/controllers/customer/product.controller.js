import Product from "../../models/Product.js";

/* ======================================================
   LIST PRODUCTS (Shop Page)
====================================================== */
export const listProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 9,
      search,
      sort = "newest",
      tag,
      teaType,
      minPrice,
      maxPrice,
      available,
      weight,
      unit,
    } = req.query;

    const safeLimit = Math.min(parseInt(limit) || 9, 50);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    /* =====================
       BASE PRODUCT MATCH
    ===================== */
    const productMatch = {
      status: "ACTIVE",
    };

    /* =====================
       SEARCH
    ===================== */
    if (search?.trim()) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      productMatch.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { teaType: { $regex: escaped, $options: "i" } },
        { tags: escaped.toUpperCase() },
      ];
    }

    if (tag) {
      productMatch.tags = tag.toUpperCase();
    }

    if (teaType) {
      productMatch.teaType = { $in: [].concat(teaType) };
    }

    /* ======================================================
       AGGREGATION PIPELINE
    ====================================================== */
    const pipeline = [
      { $match: productMatch },

      /* ---------- Filter Variants ---------- */
      {
        $addFields: {
          filteredVariants: {
            $filter: {
              input: "$variants",
              as: "variant",
              cond: {
                $and: [
                  { $eq: ["$$variant.status", "ACTIVE"] },

                  available === "true"
                    ? { $eq: ["$$variant.availability", true] }
                    : true,

                  available === "true"
                    ? { $gt: ["$$variant.stock", 0] }
                    : true,

                  minPrice
                    ? { $gte: ["$$variant.finalPrice", Number(minPrice)] }
                    : true,

                  maxPrice
                    ? { $lte: ["$$variant.finalPrice", Number(maxPrice)] }
                    : true,

                  weight && unit
                    ? {
                        $and: [
                          {
                            $eq: [
                              "$$variant.weight.value",
                              Number(weight),
                            ],
                          },
                          {
                            $eq: ["$$variant.weight.unit", unit],
                          },
                        ],
                      }
                    : true,
                ],
              },
            },
          },
        },
      },

      /* ---------- Remove products with no variants ---------- */
      {
        $match: {
          "filteredVariants.0": { $exists: true },
        },
      },

      /* ---------- Cheapest Variant Price ---------- */
      {
        $addFields: {
          sortPrice: { $min: "$filteredVariants.finalPrice" },
        },
      },

      /* ---------- Sorting ---------- */
      {
        $sort:
          sort === "price_asc"
            ? { sortPrice: 1 }
            : sort === "price_desc"
            ? { sortPrice: -1 }
            : sort === "popular"
            ? { rating: -1 }
            : { createdAt: -1 },
      },

      /* ---------- Pagination ---------- */
      { $skip: skip },
      { $limit: safeLimit },

      /* ---------- Clean Response ---------- */
      {
        $project: {
          reviews: 0,
          filteredVariants: 0,
          sortPrice: 0,
        },
      },
    ];

    /* ======================================================
       EXECUTION
    ====================================================== */

    const products = await Product.aggregate(pipeline);

    /* ---------- Correct Total Count (after filters) ---------- */
    const countPipeline = [
      { $match: productMatch },
      {
        $addFields: {
          filteredVariants: {
            $filter: {
              input: "$variants",
              as: "variant",
              cond: {
                $and: [
                  { $eq: ["$$variant.status", "ACTIVE"] },
                ],
              },
            },
          },
        },
      },
      {
        $match: {
          "filteredVariants.0": { $exists: true },
        },
      },
      { $count: "total" },
    ];

    const countResult = await Product.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    res.json({
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      products,
    });
  } catch (error) {
    console.error("listProducts error:", error);
    res.status(500).json({
      message: "Failed to fetch products",
    });
  }
};

/* ======================================================
   GET SINGLE PRODUCT (Slug Based)
====================================================== */
export const getSingleProduct = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({
      slug,
      status: "ACTIVE",
    }).lean();

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const variants = product.variants.filter(
      (v) =>
        v.status === "ACTIVE" &&
        v.availability === true &&
        v.stock > 0
    );

    if (!variants.length) {
      return res.status(404).json({
        message: "Product currently unavailable",
      });
    }

    res.json({
      _id: product._id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      teaType: product.teaType,
      bestFor: product.bestFor,
      tags: product.tags,
      featured: product.featured,
      rating: product.rating,
      reviewCount: product.reviewCount,
      reviews: product.reviews.filter(
        (r) => r.status === "VISIBLE"
      ),

      variants: variants.map((v) => ({
        _id: v._id,
        variantSku: v.variantSku,
        weight: v.weight,
        sellingPrice: v.sellingPrice,
        finalPrice: v.finalPrice,
        discount: v.discount,
        images: v.images,
        stock: v.stock,
        availability: v.availability,
      })),
    });
  } catch (error) {
    console.error("getSingleProduct error:", error);
    res.status(500).json({
      message: "Failed to fetch product",
    });
  }
};
