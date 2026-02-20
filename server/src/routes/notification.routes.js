import { Router } from "express";
import { param, query } from "express-validator";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../controllers/notification.controller.js";
import { protect } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.get(
  "/",
  protect,
  [query("limit").optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  getMyNotifications
);

router.patch(
  "/read-all",
  protect,
  markAllNotificationsRead
);

router.patch(
  "/:notificationId/read",
  protect,
  [param("notificationId").isMongoId().withMessage("Valid notificationId is required.")],
  validateRequest,
  markNotificationRead
);

export default router;
