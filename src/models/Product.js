import mongoose from "mongoose";
import slugify from "slugify";

/* =====================================================
   REVIEW SCHEMA
===================================================== */
const reviewSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    review: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    isTestimonial: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["VISIBLE", "HIDDEN"],
      default: "VISIBLE",
    },
  },
  { timestamps: true }
);

/* =====================================================
   VARIANT SCHEMA
===================================================== */
const variantSchema = new mongoose.Schema(
  {
    variantSku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    weight: {
      value: {
        type: Number,
        required: true,
      },
      unit: {
        type: String,
        enum: ["g", "kg"],
        required: true,
      },
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    dimensions: {
      length: Number,
      breadth: Number,
      height: Number,
      weight: Number,
    },

    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: {
        type: String,
        enum: ["PERCENT", "FLAT"],
        default: "PERCENT",
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    finalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    images: [
      {
        url: { type: String, required: true },
        publicId: String,
      },
    ],

    availability: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

/* =====================================================
   PRODUCT SCHEMA
===================================================== */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    teaType: {
      type: String,
      index: true,
    },

    bestFor: [String],

    tags: {
      type: [
        {
          type: String,
          enum: [
            "TOP_SELLER",
            "BEST_SELLER",
            "NEW_LAUNCH",
            "LIMITED_EDITION",
            "ORGANIC",
            "SEASONAL",
          ],
        },
      ],
      default: [],
      index: true,
    },

    featured: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "DRAFT"],
      default: "DRAFT",
      index: true,
    },

    variants: {
      type: [variantSchema],
      default: [],
    },

    reviews: [reviewSchema],

    rating: {
      type: Number,
      default: 0,
      index: true,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* =====================================================
   INDEXES (Performance)
===================================================== */

productSchema.index({ createdAt: -1 });
productSchema.index({ rating: -1 });
productSchema.index({ "variants.finalPrice": 1 });

/* =====================================================
   SLUG GENERATION
===================================================== */
productSchema.pre("save", function (next) {
  if (!this.slug || this.isModified("name")) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
    });
  }
});

/* =====================================================
   AUTO RATING CALCULATION
===================================================== */
productSchema.methods.calculateRating = function () {
  if (!this.reviews.length) {
    this.rating = 0;
    this.reviewCount = 0;
    return;
  }

  const total = this.reviews.reduce(
    (sum, r) => sum + r.rating,
    0
  );

  this.reviewCount = this.reviews.length;
  this.rating = parseFloat(
    (total / this.reviewCount).toFixed(1)
  );
};

/* =====================================================
   VIRTUAL: CHEAPEST VARIANT
===================================================== */
productSchema.virtual("cheapestPrice").get(function () {
  if (!this.variants?.length) return 0;

  const availableVariants = this.variants.filter(
    (v) =>
      v.status === "ACTIVE" &&
      v.availability &&
      v.stock > 0
  );

  if (!availableVariants.length) return 0;

  return Math.min(
    ...availableVariants.map((v) => v.finalPrice)
  );
});

export default mongoose.model("Product", productSchema);
