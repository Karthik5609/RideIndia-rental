import jwt from "jsonwebtoken";
import User from "../models/User.js";

function signToken(user) {
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn
  });
}

function formatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    kycStatus: user.kycStatus || "not_submitted"
  };
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already exists." });
    }

    const user = await User.create({ name: normalizedName, email: normalizedEmail, password });
    const token = signToken(user);

    return res.status(201).json({
      token,
      user: formatUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const validPassword = await user.comparePassword(password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: formatUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("name email role kycStatus");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.json({ data: formatUser(user) });
  } catch (error) {
    return next(error);
  }
}
