import { Router } from "express";
import { body, param } from "express-validator";
import {
  getMyKyc,
  getPendingKyc,
  reviewKyc,
  submitKyc
} from "../controllers/kyc.controller.js";
import { protect, protectAdmin } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.get("/me", protect, getMyKyc);

router.post(
  "/submit",
  protect,
  [
    body("fullName").trim().isLength({ min: 2, max: 80 }).withMessage("fullName is required."),
    body("dateOfBirth").isISO8601().withMessage("Valid dateOfBirth is required."),
    body("licenseNumber")
      .trim()
      .isLength({ min: 4, max: 40 })
      .withMessage("Valid licenseNumber is required."),
    body("licenseExpiry").isISO8601().withMessage("Valid licenseExpiry is required."),
    body("idType")
      .isIn(["aadhaar", "passport", "voter-id", "other"])
      .withMessage("Valid idType is required."),
    body("idNumber").trim().isLength({ min: 4, max: 40 }).withMessage("Valid idNumber is required."),
    body("address").trim().isLength({ min: 8, max: 240 }).withMessage("Valid address is required."),
    body("documentUrls.licenseFront").isURL().withMessage("Valid licenseFront URL is required."),
    body("documentUrls.licenseBack").isURL().withMessage("Valid licenseBack URL is required."),
    body("documentUrls.idFront").isURL().withMessage("Valid idFront URL is required."),
    body("documentUrls.selfie").isURL().withMessage("Valid selfie URL is required.")
  ],
  validateRequest,
  submitKyc
);

router.get("/pending", protect, protectAdmin, getPendingKyc);

router.patch(
  "/:kycId/review",
  protect,
  protectAdmin,
  [
    param("kycId").isMongoId().withMessage("Valid kycId is required."),
    body("status").isIn(["approved", "rejected"]).withMessage("status must be approved/rejected."),
    body("reviewNote").optional().trim().isLength({ max: 240 })
  ],
  validateRequest,
  reviewKyc
);

export default router;
