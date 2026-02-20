import jwt from "jsonwebtoken";

export function protect(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: token missing." });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: token missing." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"]
    });
    req.user = { id: decoded.id, role: decoded.role };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized: invalid token." });
  }
}

export function protectAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  return next();
}
