import crypto from "node:crypto";
import Razorpay from "razorpay";
import Booking from "../models/Booking.js";
import { createUserNotification } from "../services/notification.service.js";

const SUPPORTED_PAYMENT_METHODS = [
  "upi",
  "card",
  "netbanking",
  "wallet",
  "emi",
  "paylater"
];

function isMockPaymentMode() {
  return process.env.PAYMENTS_MOCK_MODE === "true";
}

function getRazorpayConfig() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || ""
  };
}

function getRazorpayClient() {
  const { keyId, keySecret } = getRazorpayConfig();
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function buildMockOrderId(bookingId) {
  return `order_mock_${bookingId}_${Date.now()}`;
}

function buildMockPaymentId(bookingId) {
  return `pay_mock_${bookingId}_${Date.now()}`;
}

function getGatewayMode({ keyId }) {
  if (isMockPaymentMode()) return "mock_forced";
  if (!keyId) return "mock_missing_keys";
  if (keyId.startsWith("rzp_live_")) return "live";
  return "test";
}

function getPaymentConfigResponse() {
  const { keyId, webhookSecret } = getRazorpayConfig();
  const gatewayMode = getGatewayMode({ keyId });
  const isMock = gatewayMode.startsWith("mock");

  return {
    provider: "razorpay",
    gatewayMode,
    mockMode: isMock,
    keyId: isMock ? null : keyId,
    webhookEnabled: Boolean(webhookSecret),
    supportedMethods: SUPPORTED_PAYMENT_METHODS
  };
}

function makeRazorpaySignature(orderId, paymentId, keySecret) {
  return crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

function verifyWebhookSignature(rawBody, signature, webhookSecret) {
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return expected === signature;
}

function extractWebhookPaymentData(payload) {
  const event = payload?.event || "";
  const paymentEntity = payload?.payload?.payment?.entity || null;
  const orderEntity = payload?.payload?.order?.entity || null;
  const errorData = payload?.payload?.payment?.entity?.error_description || "";

  const orderId = paymentEntity?.order_id || orderEntity?.id || "";
  const paymentId = paymentEntity?.id || "";

  return {
    event,
    orderId,
    paymentId,
    errorData
  };
}

async function markBookingPaid(booking, { paymentId = "", signature = "" } = {}) {
  if (booking.paymentStatus === "paid") return booking;

  booking.paymentStatus = "paid";
  booking.payment.paymentId = paymentId || booking.payment.paymentId || "";
  booking.payment.signature = signature || booking.payment.signature || "";
  booking.payment.paidAt = new Date();
  await booking.save();

  await createUserNotification({
    userId: booking.user,
    type: "payment",
    title: "Payment Successful",
    message: `Payment received for ${booking.bike?.brand || "your bike"} booking.`,
    metadata: { bookingId: booking._id }
  });

  return booking;
}

async function markBookingFailed(booking, reason = "") {
  if (booking.paymentStatus === "failed") return booking;

  booking.paymentStatus = "failed";
  await booking.save();

  await createUserNotification({
    userId: booking.user,
    type: "payment",
    title: "Payment Failed",
    message: reason
      ? `Payment failed: ${reason}`
      : "Payment failed. Please retry from My Trips.",
    metadata: { bookingId: booking._id }
  });

  return booking;
}

export async function getPaymentConfig(_req, res, next) {
  try {
    return res.json({ data: getPaymentConfigResponse() });
  } catch (error) {
    return next(error);
  }
}

export async function createPaymentOrder(req, res, next) {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only pay for your own booking." });
    }
    if (booking.status !== "confirmed") {
      return res.status(400).json({ message: "Payments are allowed only for confirmed bookings." });
    }
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({ message: "Booking is already paid." });
    }

    const amountPaise = Math.round(booking.totalPrice * 100);
    const currency = "INR";
    const { keyId } = getRazorpayConfig();
    const gatewayMode = getGatewayMode({ keyId });

    const razorpay = getRazorpayClient();
    const useMock = isMockPaymentMode() || !razorpay;
    const fallbackReason = useMock
      ? isMockPaymentMode()
        ? "mock_mode_enabled"
        : "missing_razorpay_keys"
      : "";

    let orderId;
    let provider = "mock";

    if (useMock) {
      orderId = buildMockOrderId(booking._id);
    } else {
      provider = "razorpay";
      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency,
        receipt: `ride_${booking._id.toString().slice(-10)}`,
        notes: {
          bookingId: booking._id.toString(),
          userId: req.user.id
        }
      });
      orderId = order.id;
    }

    booking.payment.provider = provider;
    booking.payment.currency = currency;
    booking.payment.amount = amountPaise;
    booking.payment.orderId = orderId;
    booking.payment.paymentId = "";
    booking.payment.signature = "";
    booking.payment.paidAt = null;
    booking.paymentStatus = "pending";
    await booking.save();

    return res.json({
      message: "Payment order created.",
      data: {
        bookingId: booking._id,
        amount: amountPaise,
        currency,
        orderId,
        provider,
        gatewayMode,
        fallbackReason,
        mockMode: useMock,
        keyId: useMock ? null : getRazorpayConfig().keyId
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function verifyPayment(req, res, next) {
  try {
    const {
      bookingId,
      orderId,
      paymentId,
      signature
    } = req.body;

    const booking = await Booking.findById(bookingId).populate(
      "bike",
      "name brand model location pricePerDay images type"
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only verify your own booking payment." });
    }
    if (booking.paymentStatus === "paid") {
      return res.json({ message: "Booking payment already verified.", data: booking });
    }
    if (!booking.payment.orderId) {
      return res.status(400).json({ message: "Payment order not found for this booking." });
    }
    if (orderId !== booking.payment.orderId) {
      return res.status(400).json({ message: "Payment order mismatch." });
    }

    const { keySecret } = getRazorpayConfig();
    const requiresSignatureCheck =
      booking.payment.provider === "razorpay" &&
      !isMockPaymentMode() &&
      Boolean(keySecret);

    const resolvedPaymentId = paymentId || buildMockPaymentId(booking._id);

    if (requiresSignatureCheck) {
      if (!signature || !resolvedPaymentId) {
        return res.status(400).json({ message: "Missing payment verification data." });
      }
      const generatedSignature = makeRazorpaySignature(orderId, resolvedPaymentId, keySecret);

      if (generatedSignature !== signature) {
        await markBookingFailed(booking, "Signature verification failed.");
        return res.status(400).json({ message: "Payment signature verification failed." });
      }
    }

    await markBookingPaid(booking, {
      paymentId: resolvedPaymentId,
      signature: signature || ""
    });

    return res.json({
      message: "Payment verified successfully.",
      data: booking
    });
  } catch (error) {
    return next(error);
  }
}

export async function handleRazorpayWebhook(req, res, next) {
  try {
    const { webhookSecret } = getRazorpayConfig();
    if (!webhookSecret) {
      return res.status(503).json({
        message: "Webhook secret is not configured."
      });
    }

    const signature = req.header("x-razorpay-signature") || "";
    const rawBody = req.rawBody || "";
    if (!signature || !rawBody) {
      return res.status(400).json({ message: "Missing webhook signature/body." });
    }

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return res.status(401).json({ message: "Invalid webhook signature." });
    }

    const payload = req.body || {};
    const { event, orderId, paymentId, errorData } = extractWebhookPaymentData(payload);

    if (!orderId) {
      return res.status(200).json({ received: true, ignored: "order_id_missing" });
    }

    const booking = await Booking.findOne({ "payment.orderId": orderId }).populate(
      "bike",
      "brand model"
    );
    if (!booking) {
      return res.status(200).json({ received: true, ignored: "booking_not_found" });
    }

    if (event === "payment.captured" || event === "order.paid") {
      await markBookingPaid(booking, {
        paymentId: paymentId || booking.payment.paymentId || ""
      });
      return res.status(200).json({ received: true, status: "paid" });
    }

    if (event === "payment.failed") {
      await markBookingFailed(booking, errorData);
      return res.status(200).json({ received: true, status: "failed" });
    }

    return res.status(200).json({ received: true, ignored: event || "unhandled_event" });
  } catch (error) {
    return next(error);
  }
}
