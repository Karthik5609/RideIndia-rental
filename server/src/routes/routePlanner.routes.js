import { Router } from "express";
import { query } from "express-validator";
import { planRoute } from "../controllers/routePlanner.controller.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.get(
  "/",
  [
    query("fromLat").isFloat({ min: -90, max: 90 }).withMessage("fromLat is required."),
    query("fromLng").isFloat({ min: -180, max: 180 }).withMessage("fromLng is required."),
    query("toLat").isFloat({ min: -90, max: 90 }).withMessage("toLat is required."),
    query("toLng").isFloat({ min: -180, max: 180 }).withMessage("toLng is required."),
    query("profile").optional().isIn(["bike"]).withMessage("Invalid route profile.")
  ],
  validateRequest,
  planRoute
);

export default router;
