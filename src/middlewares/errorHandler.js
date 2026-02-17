export const errorHandler = (err, req, res, next) => {

  console.error("🔥 GLOBAL ERROR:", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
  });

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};
