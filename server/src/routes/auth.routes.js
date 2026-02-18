import { Router } from "express";
import { body } from "express-validator";
import { register, login } from "../controllers/auth.controller.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.post(
  "/register",
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
  [
    body("email").trim().normalizeEmail().isEmail().withMessage("Valid email is required."),
    body("password").notEmpty().withMessage("Password is required.")
  ],
  validateRequest,
  login
);

export default router;
