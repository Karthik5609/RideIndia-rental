import { Router } from "express";
import { body, param, query } from "express-validator";
import {
  createBooking,
  getMyTrips,
  updateBooking,
  cancelBooking
} from "../controllers/booking.controller.js";
import { protect } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { bookingWriteLimiter } from "../middleware/security.js";

const router = Router();

router.get(
  "/my-trips",
  protect,
  [
    query("status")
      .optional()
      .isIn(["confirmed", "ongoing", "completed", "cancelled"])
      .withMessage("Invalid booking status filter.")
  ],
  validateRequest,
  getMyTrips
);

router.post(
  "/",
  protect,
  bookingWriteLimiter,
  [
    body("bikeId").isMongoId().withMessage("Valid bikeId is required."),
    body("startDate").isISO8601().withMessage("Valid startDate is required."),
    body("endDate").isISO8601().withMessage("Valid endDate is required."),
    body("pickupLocation")
      .trim()
      .notEmpty()
      .isLength({ max: 120 })
      .withMessage("pickupLocation is required and can be up to 120 characters."),
    body("dropLocation")
      .trim()
      .notEmpty()
      .isLength({ max: 120 })
      .withMessage("dropLocation is required and can be up to 120 characters."),
    body("notes").optional().trim().isLength({ max: 500 }).withMessage("notes can be up to 500 chars.")
  ],
  validateRequest,
  createBooking
);

router.put(
  "/:bookingId",
  protect,
  bookingWriteLimiter,
  [
    param("bookingId").isMongoId().withMessage("Valid bookingId is required."),
    body("startDate").isISO8601().withMessage("Valid startDate is required."),
    body("endDate").isISO8601().withMessage("Valid endDate is required."),
    body("pickupLocation")
      .trim()
      .notEmpty()
      .isLength({ max: 120 })
      .withMessage("pickupLocation is required and can be up to 120 characters."),
    body("dropLocation")
      .trim()
      .notEmpty()
      .isLength({ max: 120 })
      .withMessage("dropLocation is required and can be up to 120 characters."),
    body("notes").optional().trim().isLength({ max: 500 }).withMessage("notes can be up to 500 chars.")
  ],
  validateRequest,
  updateBooking
);

router.patch(
  "/:bookingId/cancel",
  protect,
  bookingWriteLimiter,
  [param("bookingId").isMongoId().withMessage("Valid bookingId is required.")],
  validateRequest,
  cancelBooking
);

export default router;
