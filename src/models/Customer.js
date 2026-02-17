import mongoose from "mongoose";

/* ================= ADDRESS SUBSCHEMA ================= */

const addressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },

    addressLine2: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

/* ================= CART SUBSCHEMA ================= */

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    priceAtAdd: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

/* ================= MAIN SCHEMA ================= */

const customerSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    name: {
      type: String,
      trim: true,
      maxlength: 80,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true, // allow multiple null values
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      select: false, // 🔥 security: never return automatically
    },

    emailVerificationTokenExpires: {
      type: Date,
      select: false,
    },

    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    cart: [cartItemSchema],

    addresses: [addressSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Customer", customerSchema);
