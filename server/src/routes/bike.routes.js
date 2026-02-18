import { Router } from "express";
import { query } from "express-validator";
import { getBikes } from "../controllers/bike.controller.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.get(
  "/",
  [
    query("q").optional().trim().isLength({ max: 60 }),
    query("city").optional().trim().isLength({ max: 40 }),
    query("state").optional().trim().isLength({ max: 40 }),
    query("type")
      .optional()
      .isIn(["commuter", "touring", "adventure", "sports", "cruiser", "scooter"]),
    query("availability").optional().isIn(["available", "booked", "maintenance", "all"]),
    query("minPrice").optional().isFloat({ min: 0, max: 100000 }),
    query("maxPrice").optional().isFloat({ min: 0, max: 100000 }),
    query("page").optional().isInt({ min: 1, max: 1000 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("sort").optional().isIn(["priceAsc", "priceDesc", "rating", "newest"])
  ],
  validateRequest,
  getBikes
);

export default router;
