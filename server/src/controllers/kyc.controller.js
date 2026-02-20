import KycVerification from "../models/KycVerification.js";
import User from "../models/User.js";
import { createUserNotification } from "../services/notification.service.js";

function normalizeDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function isAutoApproveEnabled() {
  // Default to auto-approve for this demo project unless explicitly disabled.
  return process.env.KYC_AUTO_APPROVE !== "false";
}

export async function getMyKyc(req, res, next) {
  try {
    const kyc = await KycVerification.findOne({ user: req.user.id });
    if (!kyc) {
      return res.json({
        data: {
          status: "not_submitted"
        }
      });
    }

    return res.json({ data: kyc });
  } catch (error) {
    return next(error);
  }
}

export async function submitKyc(req, res, next) {
  try {
    const {
      fullName,
      dateOfBirth,
      licenseNumber,
      licenseExpiry,
      idType,
      idNumber,
      address,
      documentUrls
    } = req.body;

    const dob = normalizeDate(dateOfBirth);
    const expiry = normalizeDate(licenseExpiry);

    if (!dob || !expiry) {
      return res.status(400).json({ message: "Invalid date provided for KYC." });
    }
    if (expiry <= new Date()) {
      return res.status(400).json({ message: "Driving license expiry must be in the future." });
    }

    const update = {
      fullName: fullName.trim(),
      dateOfBirth: dob,
      licenseNumber: licenseNumber.trim().toUpperCase(),
      licenseExpiry: expiry,
      idType,
      idNumber: idNumber.trim(),
      address: address.trim(),
      documentUrls: {
        licenseFront: documentUrls.licenseFront.trim(),
        licenseBack: documentUrls.licenseBack.trim(),
        idFront: documentUrls.idFront.trim(),
        selfie: documentUrls.selfie.trim()
      },
      status: isAutoApproveEnabled() ? "approved" : "pending",
      reviewNote: isAutoApproveEnabled() ? "Auto-approved in demo mode." : "",
      reviewedBy: null,
      reviewedAt: isAutoApproveEnabled() ? new Date() : null
    };

    const kyc = await KycVerification.findOneAndUpdate(
      { user: req.user.id },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await User.findByIdAndUpdate(req.user.id, {
      $set: { kycStatus: update.status, kycUpdatedAt: new Date() }
    });

    await createUserNotification({
      userId: req.user.id,
      type: "kyc",
      title: isAutoApproveEnabled() ? "KYC Approved" : "KYC Submitted",
      message: isAutoApproveEnabled()
        ? "Your KYC was auto-approved in demo mode. Booking is now enabled."
        : "Your KYC was submitted successfully and is now under review.",
      metadata: { kycId: kyc._id }
    });

    return res.status(201).json({
      message: "KYC submitted successfully.",
      data: kyc
    });
  } catch (error) {
    return next(error);
  }
}

export async function getPendingKyc(req, res, next) {
  try {
    const list = await KycVerification.find({ status: "pending" })
      .populate("user", "name email kycStatus")
      .sort({ updatedAt: 1 });
    return res.json({ data: list });
  } catch (error) {
    return next(error);
  }
}

export async function reviewKyc(req, res, next) {
  try {
    const { kycId } = req.params;
    const { status, reviewNote = "" } = req.body;

    const kyc = await KycVerification.findById(kycId);
    if (!kyc) {
      return res.status(404).json({ message: "KYC request not found." });
    }
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid KYC review status." });
    }

    kyc.status = status;
    kyc.reviewNote = reviewNote.trim();
    kyc.reviewedBy = req.user.id;
    kyc.reviewedAt = new Date();
    await kyc.save();

    await User.findByIdAndUpdate(kyc.user, {
      $set: { kycStatus: status, kycUpdatedAt: new Date() }
    });

    await createUserNotification({
      userId: kyc.user,
      type: "kyc",
      title: status === "approved" ? "KYC Approved" : "KYC Rejected",
      message:
        status === "approved"
          ? "Your KYC is approved. You can now book and pay for trips."
          : `Your KYC was rejected.${kyc.reviewNote ? ` Note: ${kyc.reviewNote}` : ""}`,
      metadata: { kycId: kyc._id }
    });

    return res.json({
      message: `KYC ${status} successfully.`,
      data: kyc
    });
  } catch (error) {
    return next(error);
  }
}
