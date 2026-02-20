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
import paymentRoutes from "./routes/payment.routes.js";
import kycRoutes from "./routes/kyc.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import routePlannerRoutes from "./routes/routePlanner.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/security.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");

function normalizeOrigin(origin) {
  const trimmed = String(origin || "").trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return `${url.protocol}//${url.host}`.replace(/\/+$/, "");
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

function getOriginHostname(origin) {
  if (!origin) return "";
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function originMatchesPattern(origin, pattern) {
  if (!pattern.includes("*")) {
    return origin === pattern;
  }

  const regexSource = `^${pattern
    .split("*")
    .map((part) => escapeRegExp(part))
    .join(".*")}$`;
  return new RegExp(regexSource).test(origin);
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

function getAllowedOriginSuffixes() {
  const raw =
    process.env.CORS_ALLOWED_ORIGIN_SUFFIXES ||
    "localhost,127.0.0.1,onrender.com,netlify.app";

  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

const allowedOrigins = getAllowedOrigins();
const allowedOriginSuffixes = getAllowedOriginSuffixes();

if (isProduction) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");

app.use(
  cors((req, callback) => {
    const origin = req.header("origin");

    // Allow requests without an Origin header (server health checks, curl, etc).
    if (!origin) return callback(null, { origin: true });

    const normalizedOrigin = normalizeOrigin(origin);
    const host = req.get("host");
    const forwardedProto = (req.header("x-forwarded-proto") || req.protocol || "")
      .split(",")[0]
      .trim();
    const protocol = forwardedProto || req.protocol || "http";
    const requestHostOrigin = host ? normalizeOrigin(`${protocol}://${host}`) : "";
    const isSameOrigin = requestHostOrigin && normalizedOrigin === requestHostOrigin;
    const originHostname = getOriginHostname(normalizedOrigin);
    const isAllowedByExactList = allowedOrigins.some((candidate) =>
      originMatchesPattern(normalizedOrigin, candidate)
    );
    const isAllowedBySuffix = allowedOriginSuffixes.some(
      (suffix) => originHostname === suffix || originHostname.endsWith(`.${suffix}`)
    );

    if (
      isSameOrigin ||
      allowedOrigins.length === 0 ||
      isAllowedByExactList ||
      isAllowedBySuffix
    ) {
      return callback(null, { origin: true });
    }

    console.warn(
      `[cors] blocked origin="${normalizedOrigin}" host="${requestHostOrigin}" allowed="${allowedOrigins.join(",") || "(none)"}" allowedSuffixes="${allowedOriginSuffixes.join(",")}"`
    );
    const error = new Error("Origin not allowed by CORS policy.");
    error.status = 403;
    return callback(error);
  })
);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "blob:", "https:"],
        "connect-src": ["'self'", "https:"],
        "script-src": ["'self'", "https://checkout.razorpay.com"],
        "frame-src": ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"]
      }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(morgan(isProduction ? "combined" : "dev"));
app.use((req, res, next) => {
  if (req.path === "/api/payments/webhook") return next();
  return apiLimiter(req, res, next);
});
app.use(
  express.json({
    limit: "256kb",
    verify: (req, _res, buffer) => {
      if (req.originalUrl.startsWith("/api/payments/webhook")) {
        req.rawBody = buffer.toString("utf8");
      }
    }
  })
);
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(mongoSanitize());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ride-india-api",
    environment: process.env.NODE_ENV || "development"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/bikes", bikeRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/route-planner", routePlannerRoutes);

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
