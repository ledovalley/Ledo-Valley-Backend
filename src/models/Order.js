import mongoose from "mongoose";

/* =====================================================
   ORDER ITEM (SNAPSHOT)
===================================================== */
const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    productName: {
      type: String,
      required: true,
    },

    productSlug: {
      type: String,
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    variantSku: {
      type: String,
      required: true,
    },

    weight: {
      value: Number,
      unit: String,
    },

    image: {
      type: String,
      required: true,
    },

    dimensions: {
      length: Number,
      breadth: Number,
      height: Number,
      weight: Number,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    price: {
      type: Number, // selling price at time of order
      required: true,
    },

    finalPrice: {
      type: Number, // discounted price at time of order
      required: true,
    },

    subtotal: {
      type: Number, // finalPrice * quantity
      required: true,
    },

    productUrl: {
      type: String,
    }
  },
  { _id: false }
);

/* =====================================================
   ADDRESS SNAPSHOT
===================================================== */
const addressSnapshotSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
  },
  { _id: false }
);

/* =====================================================
   COUPON SNAPSHOT
===================================================== */
const couponSnapshotSchema = new mongoose.Schema(
  {
    code: String,
    type: {
      type: String,
      enum: ["PERCENT", "FLAT"],
    },
    value: Number,
    discountAmount: Number,
  },
  { _id: false }
);

/* =====================================================
   PAYMENT SECTION
===================================================== */
const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      default: "PAYU",
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "SUCCESS",
        "FAILED",
        "REFUND_PENDING",
        "REFUNDED",
      ],
      default: "PENDING",
    },

    transactionId: String,   // internal ID
    payuTxnId: String,
    payuPaymentId: String,

    paidAt: Date,

    failureReason: String,
  },
  { _id: false }
);

/* =====================================================
   SHIPPING SECTION
===================================================== */
const shippingSchema = new mongoose.Schema(
  {
    shiprocketOrderId: String,
    shipmentId: String,
    awbCode: String,
    courierName: String,

    status: {
      type: String,
      default: null,
    },

    shippedAt: Date,
    deliveredAt: Date,
  },
  { _id: false }
);

/* =====================================================
   MAIN ORDER SCHEMA
===================================================== */
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    customerSnapshot: {
      name: String,
      phone: String,
      email: String,
    },

    items: [orderItemSchema],

    shippingAddress: addressSnapshotSchema,

returnInfo: {
  requestedAt: Date,
  reason: String,
  status: {
    type: String,
    enum: [
      "NONE",
      "REQUESTED",
      "APPROVED",
      "REJECTED",
      "COMPLETED",
    ],
    default: "NONE",
  },
  refundAmount: Number,
  refundedAt: Date,
  invoiceUrl: String,
},

    /* ================= PRICE BREAKDOWN ================= */

    itemsTotal: {
      type: Number,
      required: true,
    },

    gstAmount: {
      type: Number,
      required: true,
    },

    shippingAmount: {
      type: Number,
      default: 60,
    },

    discountAmount: {
      type: Number,
      default: 0,
    },

    grandTotal: {
      type: Number,
      required: true,
    },

    coupon: couponSnapshotSchema,

    /* ================= STATUS ================= */

    status: {
      type: String,
      enum: [
        "PLACED",
        "PAYMENT_PENDING",
        "PAYMENT_FAILED",
        "PAYMENT_SUCCESS",
        "READY_TO_SHIP",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "RETURN_REQUESTED",
        "RETURN_APPROVED",
        "RETURN_REJECTED",
        "REFUNDED",
      ],
      default: "PAYMENT_PENDING",
      index: true,
    },

    payment: paymentSchema,

    shipping: shippingSchema,
  },
  {
    timestamps: true,
  }
);

/* =====================================================
   AUTO ORDER NUMBER GENERATION
===================================================== */
orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    const random = Math.floor(Math.random() * 1000);
    this.orderNumber = `LV${Date.now()}${random}`;
  }
});

/* =====================================================
   INDEXES FOR PERFORMANCE
===================================================== */
orderSchema.index({ "customerSnapshot.email": 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "payment.status": 1 });

export default mongoose.model("Order", orderSchema);
