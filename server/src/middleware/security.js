import rateLimit from "express-rate-limit";

function toPositiveInt(rawValue, fallback) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

const windowMinutes = toPositiveInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 15);
const defaultLimiterOptions = {
  windowMs: windowMinutes * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false
};

export const apiLimiter = rateLimit({
  ...defaultLimiterOptions,
  max: toPositiveInt(process.env.RATE_LIMIT_MAX_REQUESTS, 400),
  message: {
    message: "Too many requests. Please try again in a few minutes."
  }
});

export const authLimiter = rateLimit({
  ...defaultLimiterOptions,
  max: toPositiveInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS, 20),
  message: {
    message: "Too many authentication attempts. Please wait and try again."
  }
});

export const bookingWriteLimiter = rateLimit({
  ...defaultLimiterOptions,
  max: toPositiveInt(process.env.RATE_LIMIT_BOOKING_MAX_REQUESTS, 80),
  message: {
    message: "Too many booking actions. Please slow down and try again."
  }
});
