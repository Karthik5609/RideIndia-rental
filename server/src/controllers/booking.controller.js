import Bike from "../models/Bike.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { createUserNotification } from "../services/notification.service.js";

const ACTIVE_BOOKING_STATUSES = ["confirmed", "ongoing"];

function normalizeToStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function calculateDays(startDate, endDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.ceil((endDate - startDate) / msPerDay) + 1;
  return Math.max(diff, 1);
}

async function findOverlappingBooking({ bikeId, startDate, endDate, excludeBookingId }) {
  const query = {
    bike: bikeId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return Booking.findOne(query);
}

async function syncBikeAvailability(bikeId) {
  const bike = await Bike.findById(bikeId);
  if (!bike || bike.availabilityStatus === "maintenance") return;

  const today = normalizeToStartOfDay(new Date());

  const activeToday = await Booking.findOne({
    bike: bikeId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    startDate: { $lte: today },
    endDate: { $gte: today }
  }).sort({ endDate: 1 });

  if (activeToday) {
    bike.availabilityStatus = "booked";
    bike.nextAvailableDate = activeToday.endDate;
    await bike.save();
    return;
  }

  const upcoming = await Booking.findOne({
    bike: bikeId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    startDate: { $gt: today }
  }).sort({ startDate: 1 });

  bike.availabilityStatus = "available";
  bike.nextAvailableDate = upcoming ? upcoming.startDate : null;
  await bike.save();
}

export async function createBooking(req, res, next) {
  try {
    const { bikeId, startDate, endDate, pickupLocation, dropLocation, notes } = req.body;

    const user = await User.findById(req.user.id).select("kycStatus");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (user.kycStatus !== "approved") {
      return res.status(403).json({
        message: "KYC approval is required before creating a booking."
      });
    }

    const parsedStart = normalizeToStartOfDay(new Date(startDate));
    const parsedEnd = normalizeToStartOfDay(new Date(endDate));
    const today = normalizeToStartOfDay(new Date());

    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ message: "Invalid start or end date." });
    }
    if (parsedStart < today) {
      return res.status(400).json({ message: "Start date cannot be in the past." });
    }
    if (parsedEnd < parsedStart) {
      return res.status(400).json({ message: "End date must be on/after start date." });
    }

    const bike = await Bike.findById(bikeId);
    if (!bike) return res.status(404).json({ message: "Bike not found." });
    if (bike.availabilityStatus === "maintenance") {
      return res.status(409).json({ message: "Bike is under maintenance." });
    }

    const overlappingBooking = await findOverlappingBooking({
      bikeId,
      startDate: parsedStart,
      endDate: parsedEnd
    });

    if (overlappingBooking) {
      return res.status(409).json({
        message: "Bike already booked for selected dates. Please choose different dates."
      });
    }

    const totalDays = calculateDays(parsedStart, parsedEnd);
    const totalPrice = totalDays * bike.pricePerDay;

    const booking = await Booking.create({
      user: req.user.id,
      bike: bike._id,
      startDate: parsedStart,
      endDate: parsedEnd,
      pickupLocation,
      dropLocation,
      totalDays,
      totalPrice,
      paymentStatus: "pending",
      payment: {
        provider: "mock",
        currency: "INR",
        amount: Math.round(totalPrice * 100)
      },
      notes
    });

    await syncBikeAvailability(bike._id);

    const populatedBooking = await Booking.findById(booking._id).populate(
      "bike",
      "name brand model location pricePerDay images"
    );

    await createUserNotification({
      userId: req.user.id,
      type: "booking",
      title: "Booking Confirmed",
      message: `${bike.brand} ${bike.model} booked from ${pickupLocation} to ${dropLocation}.`,
      metadata: { bookingId: booking._id }
    });

    return res.status(201).json({
      message: "Booking created successfully.",
      data: populatedBooking
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateBooking(req, res, next) {
  try {
    const { bookingId } = req.params;
    const { startDate, endDate, pickupLocation, dropLocation, notes } = req.body;

    const booking = await Booking.findById(bookingId).populate("bike", "pricePerDay");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only edit your own booking." });
    }
    if (booking.status !== "confirmed") {
      return res.status(400).json({ message: "Only confirmed bookings can be edited." });
    }

    const parsedStart = normalizeToStartOfDay(new Date(startDate));
    const parsedEnd = normalizeToStartOfDay(new Date(endDate));
    const today = normalizeToStartOfDay(new Date());

    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ message: "Invalid start or end date." });
    }
    if (parsedStart < today) {
      return res.status(400).json({ message: "Start date cannot be in the past." });
    }
    if (parsedEnd < parsedStart) {
      return res.status(400).json({ message: "End date must be on/after start date." });
    }

    const overlappingBooking = await findOverlappingBooking({
      bikeId: booking.bike._id,
      startDate: parsedStart,
      endDate: parsedEnd,
      excludeBookingId: booking._id
    });

    if (overlappingBooking) {
      return res.status(409).json({
        message: "Bike already booked for selected dates. Please choose different dates."
      });
    }

    const totalDays = calculateDays(parsedStart, parsedEnd);

    booking.startDate = parsedStart;
    booking.endDate = parsedEnd;
    booking.pickupLocation = pickupLocation;
    booking.dropLocation = dropLocation;
    booking.notes = notes || "";
    booking.totalDays = totalDays;
    booking.totalPrice = totalDays * booking.bike.pricePerDay;
    await booking.save();

    await syncBikeAvailability(booking.bike._id);

    const populatedBooking = await Booking.findById(booking._id).populate(
      "bike",
      "name brand model location pricePerDay images type"
    );

    await createUserNotification({
      userId: req.user.id,
      type: "booking",
      title: "Booking Updated",
      message: "Your booking dates or trip details were updated successfully.",
      metadata: { bookingId: booking._id }
    });

    return res.json({
      message: "Booking updated successfully.",
      data: populatedBooking
    });
  } catch (error) {
    return next(error);
  }
}

export async function cancelBooking(req, res, next) {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId).populate("bike", "_id");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only cancel your own booking." });
    }
    if (booking.status === "cancelled") {
      return res.json({ message: "Booking is already cancelled.", data: booking });
    }
    if (booking.status !== "confirmed") {
      return res.status(400).json({ message: "Only confirmed bookings can be cancelled." });
    }

    const today = normalizeToStartOfDay(new Date());
    const bookingStart = normalizeToStartOfDay(new Date(booking.startDate));
    if (bookingStart < today) {
      return res.status(400).json({
        message: "Booking cannot be cancelled after the trip start date."
      });
    }

    booking.status = "cancelled";
    if (booking.paymentStatus === "paid") {
      booking.paymentStatus = "refunded";
    }
    await booking.save();
    await syncBikeAvailability(booking.bike._id);

    const populatedBooking = await Booking.findById(booking._id).populate(
      "bike",
      "name brand model location pricePerDay images type"
    );

    await createUserNotification({
      userId: req.user.id,
      type: "booking",
      title: "Booking Cancelled",
      message: "Your booking has been cancelled successfully.",
      metadata: { bookingId: booking._id }
    });

    return res.json({
      message: "Booking cancelled successfully.",
      data: populatedBooking
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMyTrips(req, res, next) {
  try {
    const { status } = req.query;

    const query = { user: req.user.id };
    if (status) query.status = status;

    const trips = await Booking.find(query)
      .populate("bike", "name brand model location images pricePerDay type")
      .sort({ createdAt: -1 });

    return res.json({ data: trips });
  } catch (error) {
    return next(error);
  }
}
