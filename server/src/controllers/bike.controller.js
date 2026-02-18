import Bike from "../models/Bike.js";

function escapeRegex(input = "") {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getBikes(req, res, next) {
  try {
    const {
      q,
      city,
      state,
      type,
      minPrice,
      maxPrice,
      availability = "available",
      page = 1,
      limit = 12,
      sort = "priceAsc"
    } = req.query;

    const query = {};
    const safeQ = q ? escapeRegex(String(q).trim()) : "";
    const safeCity = city ? escapeRegex(String(city).trim()) : "";
    const safeState = state ? escapeRegex(String(state).trim()) : "";
    const safeType = type ? String(type).trim().toLowerCase() : "";
    const safeAvailability = availability ? String(availability).trim().toLowerCase() : "available";

    if (safeQ) {
      query.$or = [
        { name: { $regex: safeQ, $options: "i" } },
        { brand: { $regex: safeQ, $options: "i" } },
        { model: { $regex: safeQ, $options: "i" } }
      ];
    }
    if (safeCity) query["location.city"] = { $regex: safeCity, $options: "i" };
    if (safeState) query["location.state"] = { $regex: safeState, $options: "i" };
    if (safeType) query.type = safeType;
    if (safeAvailability !== "all") query.availabilityStatus = safeAvailability;

    if (minPrice || maxPrice) {
      query.pricePerDay = {};
      if (minPrice) query.pricePerDay.$gte = Math.max(Number(minPrice), 0);
      if (maxPrice) query.pricePerDay.$lte = Math.max(Number(maxPrice), 0);
      if (query.pricePerDay.$gte && query.pricePerDay.$lte) {
        query.pricePerDay.$gte = Math.min(query.pricePerDay.$gte, query.pricePerDay.$lte);
      }
    }

    const sortMap = {
      priceAsc: { pricePerDay: 1 },
      priceDesc: { pricePerDay: -1 },
      rating: { rating: -1 },
      newest: { createdAt: -1 }
    };

    const numericPage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const numericLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 12, 1), 50);
    const skip = (numericPage - 1) * numericLimit;

    const [bikes, total] = await Promise.all([
      Bike.find(query)
        .sort(sortMap[sort] || sortMap.priceAsc)
        .skip(skip)
        .limit(numericLimit),
      Bike.countDocuments(query)
    ]);

    return res.json({
      data: bikes,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        totalPages: Math.ceil(total / numericLimit)
      }
    });
  } catch (error) {
    return next(error);
  }
}
