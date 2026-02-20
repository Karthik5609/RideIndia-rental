import { Router } from "express";
import { body } from "express-validator";
import {
  createPaymentOrder,
  getPaymentConfig,
  handleRazorpayWebhook,
  verifyPayment
} from "../controllers/payment.controller.js";
import { protect } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { bookingWriteLimiter } from "../middleware/security.js";

const router = Router();

router.get("/config", protect, getPaymentConfig);

router.post(
  "/create-order",
  protect,
  bookingWriteLimiter,
  [body("bookingId").isMongoId().withMessage("Valid bookingId is required.")],
  validateRequest,
  createPaymentOrder
);

router.post(
  "/verify",
  protect,
  bookingWriteLimiter,
  [
    body("bookingId").isMongoId().withMessage("Valid bookingId is required."),
    body("orderId").trim().notEmpty().withMessage("orderId is required."),
    body("paymentId").optional().trim(),
    body("signature").optional().trim()
  ],
  validateRequest,
  verifyPayment
);

// Razorpay server-to-server webhook (signature-verified in controller).
router.post("/webhook", handleRazorpayWebhook);

export default router;
