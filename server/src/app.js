import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoSanitize from "express-mongo-sanitize";

import authRoutes from "./routes/auth.routes.js";
import bikeRoutes from "./routes/bike.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter, authLimiter } from "./middleware/security.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");

function normalizeOrigin(origin) {
  return origin.replace(/\/+$/, "").trim();
}

function getAllowedOrigins() {
  const raw = process.env.FRONTEND_URL || "";
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);

  return [...new Set(origins)];
}

const allowedOrigins = getAllowedOrigins();

if (isProduction) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(normalizeOrigin(origin))) {
        return callback(null, true);
      }
      const error = new Error("Origin not allowed by CORS policy.");
      error.status = 403;
      return callback(error);
    }
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(morgan(isProduction ? "combined" : "dev"));
app.use(apiLimiter);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(mongoSanitize());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ride-india-api",
    environment: process.env.NODE_ENV || "development"
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/bikes", bikeRoutes);
app.use("/api/bookings", bookingRoutes);

if (isProduction) {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    return res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
