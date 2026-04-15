import cron from "node-cron";
import Order from "../models/Order.js";

/**
 * CRON SERVICE
 * Runs background tasks for order management
 */

export const initCronJobs = () => {
    // Run every hour at the top of the hour
    cron.schedule("0 * * * *", async () => {
        console.log("Running hourly cron job: Auto-cancelling expired orders...");
        
        try {
            const THREE_DAYS_AGO = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

            // Find orders that are still pending/failed after 3 days
            const expiredOrders = await Order.find({
                status: { $in: ["PAYMENT_PENDING", "PAYMENT_FAILED"] },
                createdAt: { $lt: THREE_DAYS_AGO }
            });

            if (expiredOrders.length > 0) {
                const orderIds = expiredOrders.map(o => o._id);
                
                await Order.updateMany(
                    { _id: { $in: orderIds } },
                    { 
                        $set: { 
                            status: "CANCELLED",
                            "payment.failureReason": "Auto-cancelled due to non-payment within 3 days."
                        } 
                    }
                );

                console.log(`Successfully cancelled ${expiredOrders.length} expired orders.`);
            } else {
                console.log("No expired orders found to cancel.");
            }
        } catch (error) {
            console.error("CRON JOB ERROR (Auto-cancellation):", error);
        }
    });

    console.log("Cron jobs initialized successfully.");
};
