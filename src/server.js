import app from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { initCronJobs } from "./services/cronService.js";

const startServer = async () => {
  await connectDB();
  initCronJobs();

  app.listen(env.PORT, () => {
    console.log(`🚀 Server running on port ${env.PORT}`);
  });
};

startServer();
