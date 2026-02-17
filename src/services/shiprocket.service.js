import axios from "axios";

/* ======================================================
   TOKEN CACHE
====================================================== */
let cachedToken = null;
let tokenExpiry = null;

/* ======================================================
   VALIDATE ENV
====================================================== */
const validateEnv = () => {
  if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
    throw new Error("Shiprocket credentials missing in env");
  }
};

/* ======================================================
   GET SHIPROCKET TOKEN
====================================================== */
export const getShiprocketToken = async () => {
  try {
    validateEnv();

    if (
      cachedToken &&
      tokenExpiry &&
      tokenExpiry > Date.now() + 2 * 60 * 1000
    ) {
      return cachedToken;
    }

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      }
    );

    if (!response.data?.token) {
      throw new Error("Shiprocket token missing");
    }

    cachedToken = response.data.token;
    tokenExpiry = Date.now() + 220 * 60 * 1000;

    return cachedToken;
  } catch (error) {
    console.error("SHIPROCKET AUTH ERROR:", error.response?.data || error.message);
    throw new Error("Shiprocket authentication failed");
  }
};

/* ======================================================
   CREATE SHIPROCKET ORDER
====================================================== */
export const createShiprocketOrder = async (order) => {
  try {
    const token = await getShiprocketToken();

    /* =========================================
       SPLIT NAME (Shiprocket Requires Last Name)
    ========================================== */

    const fullName = (order.shippingAddress?.name || "").trim();

    let firstName = "Customer";
    let lastName = "User";

    if (fullName) {
      const parts = fullName.split(" ");
      firstName = parts[0];

      if (parts.length > 1) {
        lastName = parts.slice(1).join(" ");
      }
    }

    /* =========================================
       CALCULATE PACKAGE DIMENSIONS
    ========================================== */

    let totalWeightGrams = 0;
    let maxLength = 10;
    let maxBreadth = 10;
    let totalHeight = 5;

    order.items.forEach((item) => {
      const weightValue = item.weight?.value || 0;
      const weightUnit = item.weight?.unit || "g";

      const weightInGrams =
        weightUnit === "kg" ? weightValue * 1000 : weightValue;

      totalWeightGrams += weightInGrams * item.quantity;

      const dims = item.dimensions || {};

      maxLength = Math.max(maxLength, dims.length || 10);
      maxBreadth = Math.max(maxBreadth, dims.breadth || 10);
      totalHeight += (dims.height || 2) * item.quantity;
    });

    const finalWeight =
      Number((totalWeightGrams / 1000).toFixed(3)) || 0.5;

    /* =========================================
       PREPARE ORDER ITEMS
    ========================================== */

    const items = order.items.map((item) => ({
      name: item.productName,
      sku: item.variantSku,
      units: item.quantity,
      selling_price: item.finalPrice,
    }));

    /* =========================================
       FINAL PAYLOAD
    ========================================== */

    const payload = {
      order_id: order.orderNumber,
      order_date: new Date().toISOString().split("T")[0],
      pickup_location: "Home",

      billing_customer_name: firstName,
      billing_last_name: lastName, // 🔥 REQUIRED FIX

      billing_address: order.shippingAddress.addressLine1,
      billing_address_2:
        order.shippingAddress.addressLine2 || "",
      billing_city: order.shippingAddress.city,
      billing_pincode: order.shippingAddress.pincode,
      billing_state: order.shippingAddress.state,
      billing_country: "India",
      billing_email: order.customerSnapshot.email,
      billing_phone: order.shippingAddress.phone,

      shipping_is_billing: true,
      order_items: items,
      payment_method: "Prepaid",
      sub_total: order.grandTotal,

      length: maxLength,
      breadth: maxBreadth,
      height: totalHeight,
      weight: finalWeight,
    };

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;

    if (!data || !data.shipment_id) {
      throw new Error(data?.message || "Order creation failed");
    }

    return data;
  } catch (error) {
    console.error(
      "SHIPROCKET ORDER ERROR:",
      error.response?.data || error.message
    );
    throw new Error("Shiprocket order creation failed");
  }
};


/* ======================================================
   ASSIGN COURIER (GENERATE AWB)
====================================================== */
export const assignCourier = async (shipmentId) => {
  try {
    const token = await getShiprocketToken();

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/courier/assign/awb",
      { shipment_id: shipmentId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;

    console.log("AWB RAW RESPONSE:", data);

    // ✅ SUCCESS CASE
    if (data.awb_assign_status === 1) {
      return data;
    }

    // ✅ ALREADY ASSIGNED CASE (TREAT AS SUCCESS)
    const awbError =
      data?.response?.data?.awb_assign_error || "";

    if (awbError.includes("AWB is already assigned")) {

      const match = awbError.match(/awb - (\d+)/i);
      const existingAwb = match ? match[1] : null;

      return {
        awb_assign_status: 1,
        response: {
          awb_code: existingAwb,
          courier_name: "Already Assigned",
        },
      };
    }

    // ❌ REAL FAILURE
    throw new Error(
      data?.response?.data?.awb_assign_error ||
      data?.message ||
      "AWB assignment failed"
    );

  } catch (error) {
    console.error(
      "SHIPROCKET AWB ERROR:",
      error.response?.data || error.message
    );
    throw new Error("AWB generation failed");
  }
};

/* ======================================================
   REQUEST PICKUP
====================================================== */
export const requestPickup = async (shipmentId) => {
  try {
    const token = await getShiprocketToken();

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup",
      { shipment_id: shipmentId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;

    console.log("PICKUP RAW RESPONSE:", data);

    // ✅ SUCCESS CASE (THIS IS THE REAL CONDITION)
    if (data?.pickup_status === 1) {
      return data;
    }

    const message =
      data?.response?.data ||
      data?.message ||
      "";

    // ✅ Already scheduled → treat as success
    if (
      typeof message === "string" &&
      message.toLowerCase().includes("already")
    ) {
      return {
        pickup_status: 1,
        message: "Pickup already scheduled",
      };
    }

    throw new Error(message || "Pickup scheduling failed");

  } catch (error) {
    console.error(
      "SHIPROCKET PICKUP ERROR:",
      error.response?.data || error.message
    );
    throw new Error("Pickup scheduling failed");
  }
};
