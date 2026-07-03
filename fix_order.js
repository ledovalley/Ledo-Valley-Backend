import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const OrderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model("Order", OrderSchema);

async function fixOrder() {
  await mongoose.connect(process.env.MONGO_URI);
  const order = await Order.findOne({ orderNumber: "LV000621" });
  if (order) {
    await Order.updateOne(
      { orderNumber: "LV000621" },
      { 
        $set: { 
          status: "PAYMENT_SUCCESS", 
          "payment.status": "SUCCESS" 
        } 
      }
    );
    console.log("Order fixed!");
  } else {
    console.log("Order not found");
  }
  mongoose.disconnect();
}
fixOrder();
