import { Router } from "express";
import { body } from "express-validator";
import { register, login, getMe } from "../controllers/auth.controller.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { protect } from "../middleware/auth.js";
import { authLimiter } from "../middleware/security.js";

const router = Router();

router.post(
  "/register",
  authLimiter,
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 60 })
      .withMessage("Name must be between 2 and 60 characters."),
    body("email").trim().normalizeEmail().isEmail().withMessage("Valid email is required."),
    body("password")
      .isLength({ min: 6, max: 72 })
      .withMessage("Password must be between 6 and 72 characters.")
  ],
  validateRequest,
  register
);

router.post(
  "/login",
  authLimiter,
  [
    body("email").trim().normalizeEmail().isEmail().withMessage("Valid email is required."),
    body("password").notEmpty().withMessage("Password is required.")
  ],
  validateRequest,
  login
);

router.get("/me", protect, getMe);

export default router;
