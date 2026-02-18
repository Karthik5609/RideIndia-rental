import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { getBikeImageUrl, handleBikeImageError } from "../../utils/bikeMedia";
import {
  composeLocation,
  getCityOptions,
  getPointsByCity,
  parseLocation
} from "../../utils/locationPoints";

function toInputDate(dateString) {
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function canManageBooking(trip) {
  return trip.status === "confirmed";
}

const cityOptions = getCityOptions();

function getPointOptions(city, selectedPoint) {
  const points = getPointsByCity(city);
  if (selectedPoint && !points.includes(selectedPoint)) {
    return [selectedPoint, ...points];
  }
  return points;
}

export default function MyTrips() {
  const { isAuthenticated } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [editingTripId, setEditingTripId] = useState(null);
  const [cancelTrip, setCancelTrip] = useState(null);
  const [editForm, setEditForm] = useState({
    startDate: "",
    endDate: "",
    pickupCity: "",
    pickupPoint: "",
    dropCity: "",
    dropPoint: "",
    notes: ""
  });

  const fetchTrips = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/bookings/my-trips");
      setTrips(data.data || []);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Could not fetch trips."));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const startEditing = (trip) => {
    setActionMessage("");
    setEditingTripId(trip._id);
    const fallbackCity = trip.bike?.location?.city || "Bengaluru";
    const parsedPickup = parseLocation(trip.pickupLocation, fallbackCity);
    const parsedDrop = parseLocation(trip.dropLocation, "Ooty");
    setEditForm({
      startDate: toInputDate(trip.startDate),
      endDate: toInputDate(trip.endDate),
      pickupCity: parsedPickup.city,
      pickupPoint: parsedPickup.point,
      dropCity: parsedDrop.city,
      dropPoint: parsedDrop.point,
      notes: trip.notes || ""
    });
  };

  const cancelEditing = () => {
    setEditingTripId(null);
    setEditForm({
      startDate: "",
      endDate: "",
      pickupCity: "",
      pickupPoint: "",
      dropCity: "",
      dropPoint: "",
      notes: ""
    });
  };

  const handleEditField = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "pickupCity") {
        const points = getPointsByCity(value);
        next.pickupPoint = points[0] || "";
      }
      if (name === "dropCity") {
        const points = getPointsByCity(value);
        next.dropPoint = points[0] || "";
      }

      return next;
    });
  };

  const submitEdit = async (tripId) => {
    try {
      const payload = {
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        pickupLocation: composeLocation(editForm.pickupCity, editForm.pickupPoint),
        dropLocation: composeLocation(editForm.dropCity, editForm.dropPoint),
        notes: editForm.notes
      };
      const { data } = await api.put(`/bookings/${tripId}`, payload);
      if (data?.data?._id) {
        setTrips((prev) =>
          prev.map((trip) => (trip._id === data.data._id ? data.data : trip))
        );
      }
      setActionMessage(data.message || "Booking updated successfully.");
      cancelEditing();
      // Background sync to keep list consistent across status/date changes.
      fetchTrips();
    } catch (apiError) {
      setActionMessage(getApiErrorMessage(apiError, "Could not update booking."));
    }
  };

  const openCancelModal = (trip) => {
    setCancelTrip(trip);
  };

  const closeCancelModal = () => {
    setCancelTrip(null);
  };

  const cancelBooking = async () => {
    if (!cancelTrip?._id) return;
    try {
      const { data } = await api.patch(`/bookings/${cancelTrip._id}/cancel`);
      setActionMessage(data.message || "Booking cancelled successfully.");
      closeCancelModal();
      await fetchTrips();
    } catch (apiError) {
      setActionMessage(getApiErrorMessage(apiError, "Could not cancel booking."));
    }
  };

  return (
    <section id="my-trips" className="glass-card trips-section">
      <div className="section-head">
        <h2>My Trips</h2>
        <p>View your rental history.</p>
      </div>

      {!isAuthenticated && (
        <p className="hint">Login to view your trip history and booking records.</p>
      )}
      {loading && <p>Loading your trips...</p>}
      {error && <p className="error-text">{error}</p>}
      {actionMessage && <p className="hint">{actionMessage}</p>}
      {!loading && isAuthenticated && trips.length === 0 && (
        <p className="hint">No bookings yet. Book a bike from the catalog to see trips here.</p>
      )}

      <div className="trip-list">
        {trips.map((trip, index) => (
          <motion.article
            key={trip._id}
            className="trip-item"
            initial={{ opacity: 0, x: index % 2 === 0 ? 20 : -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.4 }}
          >
            <div className="trip-summary">
              <div className="trip-main">
                <img
                  src={getBikeImageUrl(trip.bike)}
                  alt={`${trip.bike?.brand} ${trip.bike?.model}`}
                  className="trip-thumb"
                  loading="lazy"
                  onError={(event) => handleBikeImageError(event, trip.bike?.type)}
                />
                <div>
                  <h3>
                    {trip.bike?.brand} {trip.bike?.model}
                  </h3>
                  <p>
                    {new Date(trip.startDate).toLocaleDateString()} to{" "}
                    {new Date(trip.endDate).toLocaleDateString()}
                  </p>
                  <p>
                    {trip.pickupLocation} {"->"} {trip.dropLocation}
                  </p>
                </div>
              </div>
              <div className="trip-metrics">
                <p>{trip.totalDays} days</p>
                <p>INR {trip.totalPrice}</p>
                <span className={`status-pill ${trip.status}`}>{trip.status}</span>
                {canManageBooking(trip) && (
                  <div className="trip-actions">
                    <button type="button" className="btn-outline" onClick={() => startEditing(trip)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-outline btn-danger"
                      onClick={() => openCancelModal(trip)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {editingTripId === trip._id && (
              <div className="trip-edit-form">
                <div className="booking-row">
                  <input
                    type="date"
                    name="startDate"
                    min={new Date().toISOString().slice(0, 10)}
                    value={editForm.startDate}
                    onChange={handleEditField}
                  />
                  <input
                    type="date"
                    name="endDate"
                    min={editForm.startDate}
                    value={editForm.endDate}
                    onChange={handleEditField}
                  />
                </div>
                <div className="booking-row">
                  <select
                    name="pickupCity"
                    value={editForm.pickupCity}
                    onChange={handleEditField}
                  >
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>
                        Pickup city: {city}
                      </option>
                    ))}
                  </select>
                  <select
                    name="pickupPoint"
                    value={editForm.pickupPoint}
                    onChange={handleEditField}
                  >
                    {getPointOptions(editForm.pickupCity, editForm.pickupPoint).map((point) => (
                      <option key={point} value={point}>
                        Pickup point: {point}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="booking-row">
                  <select
                    name="dropCity"
                    value={editForm.dropCity}
                    onChange={handleEditField}
                  >
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>
                        Drop city: {city}
                      </option>
                    ))}
                  </select>
                  <select
                    name="dropPoint"
                    value={editForm.dropPoint}
                    onChange={handleEditField}
                  >
                    {getPointOptions(editForm.dropCity, editForm.dropPoint).map((point) => (
                      <option key={point} value={point}>
                        Drop point: {point}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  name="notes"
                  value={editForm.notes}
                  onChange={handleEditField}
                  placeholder="Notes (optional)"
                />
                <div className="trip-edit-actions">
                  <button type="button" className="btn-primary" onClick={() => submitEdit(trip._id)}>
                    Save Changes
                  </button>
                  <button type="button" className="btn-outline" onClick={cancelEditing}>
                    Discard
                  </button>
                </div>
              </div>
            )}
          </motion.article>
        ))}
      </div>

      {cancelTrip && (
        <div className="modal-backdrop" onClick={closeCancelModal}>
          <div className="modal-card glass-card" onClick={(event) => event.stopPropagation()}>
            <h3>Cancel Booking?</h3>
            <p>
              Cancel your booking for {cancelTrip.bike?.brand} {cancelTrip.bike?.model}? This
              action cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-outline" onClick={closeCancelModal}>
                Keep Booking
              </button>
              <button type="button" className="btn-outline btn-danger" onClick={cancelBooking}>
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
