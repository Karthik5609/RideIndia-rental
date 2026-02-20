import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { getBikeImageUrl, handleBikeImageError } from "../../utils/bikeMedia";
import { loadRazorpayCheckout } from "../../utils/loadRazorpay";
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

function canPayBooking(trip) {
  return trip.status === "confirmed" && trip.paymentStatus !== "paid";
}

const cityOptions = getCityOptions();

function getPointOptions(city, selectedPoint) {
  const points = getPointsByCity(city);
  if (selectedPoint && !points.includes(selectedPoint)) {
    return [selectedPoint, ...points];
  }
  return points;
}

const paymentMethodOptions = [
  { key: "upi", label: "UPI" },
  { key: "card", label: "Card" },
  { key: "netbanking", label: "Net Banking" },
  { key: "qr", label: "QR Scanner" },
  { key: "wallet", label: "Wallet" }
];

const bankOptions = ["HDFC Bank", "SBI", "ICICI Bank", "Axis Bank", "Kotak Bank"];
const walletOptions = ["PhonePe", "Paytm", "Amazon Pay", "Mobikwik"];

function getMockPaymentId(method) {
  const safeMethod = String(method || "mock").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `pay_mock_${safeMethod}_${Date.now()}`;
}

function getPaymentMethodPayload(methodForm) {
  const method = methodForm.method;

  if (method === "upi") {
    if (!methodForm.upiId || !methodForm.upiId.includes("@")) {
      return { error: "Enter a valid UPI ID (example: rider@oksbi)." };
    }
    return { method, paymentId: getMockPaymentId(`upi_${methodForm.upiId}`) };
  }

  if (method === "card") {
    const cardNumber = methodForm.cardNumber.replace(/\s+/g, "");
    if (!/^\d{16}$/.test(cardNumber)) {
      return { error: "Card number must be 16 digits." };
    }
    if (!/^\d{2}\/\d{2}$/.test(methodForm.cardExpiry)) {
      return { error: "Card expiry must be in MM/YY format." };
    }
    if (!/^\d{3}$/.test(methodForm.cardCvv)) {
      return { error: "CVV must be 3 digits." };
    }
    return {
      method,
      paymentId: getMockPaymentId(`card_${cardNumber.slice(-4)}`)
    };
  }

  if (method === "netbanking") {
    if (!methodForm.bank) {
      return { error: "Select a bank for net banking." };
    }
    return { method, paymentId: getMockPaymentId(`nb_${methodForm.bank.replace(/\s+/g, "_")}`) };
  }

  if (method === "wallet") {
    if (!methodForm.wallet) {
      return { error: "Select a wallet provider." };
    }
    return { method, paymentId: getMockPaymentId(`wallet_${methodForm.wallet}`) };
  }

  return { method: "qr", paymentId: getMockPaymentId("qr_scan") };
}

export default function MyTrips({ refreshSignal = 0, latestBooking = null }) {
  const { isAuthenticated, user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [editingTripId, setEditingTripId] = useState(null);
  const [cancelTrip, setCancelTrip] = useState(null);
  const [paymentLoadingId, setPaymentLoadingId] = useState(null);
  const [paymentSheet, setPaymentSheet] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    method: "upi",
    upiId: "",
    bank: bankOptions[0],
    wallet: walletOptions[0],
    cardNumber: "",
    cardName: "",
    cardExpiry: "",
    cardCvv: "",
    error: "",
    submitting: false
  });
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
  }, [fetchTrips, refreshSignal]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;

    const fetchPaymentConfig = async () => {
      try {
        const { data } = await api.get("/payments/config");
        if (!active) return;
        setPaymentConfig(data?.data || null);
      } catch {
        if (active) setPaymentConfig(null);
      }
    };

    fetchPaymentConfig();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const hasPendingPayment = trips.some(
      (trip) => trip.status === "confirmed" && trip.paymentStatus === "pending"
    );
    if (!hasPendingPayment) return;

    const intervalId = setInterval(() => {
      fetchTrips();
    }, 15000);

    return () => clearInterval(intervalId);
  }, [fetchTrips, isAuthenticated, trips]);

  useEffect(() => {
    if (!isAuthenticated || !latestBooking?._id) return;

    setTrips((prev) => {
      const existingIndex = prev.findIndex((trip) => trip._id === latestBooking._id);
      if (existingIndex === -1) {
        return [latestBooking, ...prev];
      }
      return prev.map((trip) => (trip._id === latestBooking._id ? latestBooking : trip));
    });
  }, [latestBooking, isAuthenticated]);

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

  const closePaymentSheet = () => {
    setPaymentSheet(null);
    setPaymentForm({
      method: "upi",
      upiId: "",
      bank: bankOptions[0],
      wallet: walletOptions[0],
      cardNumber: "",
      cardName: "",
      cardExpiry: "",
      cardCvv: "",
      error: "",
      submitting: false
    });
  };

  const handlePaymentField = (event) => {
    const { name, value } = event.target;
    setPaymentForm((prev) => ({
      ...prev,
      [name]: value,
      error: ""
    }));
  };

  const confirmMockPayment = async () => {
    if (!paymentSheet?.trip?._id || !paymentSheet?.order?.orderId) return;

    const parsed = getPaymentMethodPayload(paymentForm);
    if (parsed.error) {
      setPaymentForm((prev) => ({ ...prev, error: parsed.error }));
      return;
    }

    setPaymentForm((prev) => ({ ...prev, submitting: true, error: "" }));

    try {
      const { data: verifyData } = await api.post("/payments/verify", {
        bookingId: paymentSheet.trip._id,
        orderId: paymentSheet.order.orderId,
        paymentId: parsed.paymentId,
        signature: ""
      });
      setActionMessage(verifyData.message || "Payment completed successfully.");
      closePaymentSheet();
      await fetchTrips();
    } catch (apiError) {
      setPaymentForm((prev) => ({
        ...prev,
        error: getApiErrorMessage(apiError, "Could not complete payment."),
        submitting: false
      }));
    }
  };

  const payBooking = async (trip) => {
    setActionMessage("");
    setPaymentLoadingId(trip._id);

    try {
      const { data: orderResponse } = await api.post("/payments/create-order", {
        bookingId: trip._id
      });
      const order = orderResponse.data;

      if (order.mockMode || !order.keyId) {
        if (order.fallbackReason === "missing_razorpay_keys") {
          setActionMessage(
            "Live gateway is not configured yet. Add Razorpay keys on server to enable real-time payments."
          );
        } else if (order.fallbackReason === "mock_mode_enabled") {
          setActionMessage(
            "Payments are running in mock mode. Set PAYMENTS_MOCK_MODE=false for real-time gateway."
          );
        }
        setPaymentSheet({ trip, order });
        setPaymentForm({
          method: "upi",
          upiId: "",
          bank: bankOptions[0],
          wallet: walletOptions[0],
          cardNumber: "",
          cardName: "",
          cardExpiry: "",
          cardCvv: "",
          error: "",
          submitting: false
        });
        return;
      }

      const razorpayLoaded = await loadRazorpayCheckout();
      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout. Please try again.");
      }

      await new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "Ride India",
          description: `${trip.bike?.brand} ${trip.bike?.model} booking payment`,
          order_id: order.orderId,
          prefill: {
            name: user?.name || "",
            email: user?.email || ""
          },
          method: {
            upi: true,
            card: true,
            netbanking: true,
            wallet: true,
            emi: true,
            paylater: true
          },
          config: {
            display: {
              blocks: {
                upi: {
                  name: "UPI",
                  instruments: [{ method: "upi" }]
                },
                cards: {
                  name: "Cards",
                  instruments: [{ method: "card" }]
                },
                netbanking: {
                  name: "Net Banking",
                  instruments: [{ method: "netbanking" }]
                },
                wallets: {
                  name: "Wallets",
                  instruments: [{ method: "wallet" }]
                }
              },
              sequence: ["block.upi", "block.cards", "block.netbanking", "block.wallets"],
              preferences: {
                show_default_blocks: true
              }
            }
          },
          retry: {
            enabled: true,
            max_count: 3
          },
          handler: async (response) => {
            try {
              const { data: verifyData } = await api.post("/payments/verify", {
                bookingId: trip._id,
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature
              });
              setActionMessage(verifyData.message || "Payment verified.");
              await fetchTrips();
              resolve(true);
            } catch (apiError) {
              reject(apiError);
            }
          },
          modal: {
            ondismiss: () => resolve(false)
          },
          theme: {
            color: "#ff9933"
          }
        });

        razorpay.on("payment.failed", () => {
          reject(new Error("Payment failed. Please retry."));
        });

        razorpay.open();
      });
    } catch (apiError) {
      setActionMessage(getApiErrorMessage(apiError, "Could not process payment."));
    } finally {
      setPaymentLoadingId(null);
    }
  };

  const isGatewayMock = paymentConfig?.mockMode;

  return (
    <section id="my-trips" className="glass-card trips-section">
      <div className="section-head">
        <h2>My Trips</h2>
        <p>View your rental history.</p>
      </div>
      {isAuthenticated && isGatewayMock && (
        <p className="hint">
          Payment gateway is in demo mode. Configure Razorpay keys + webhook for live payments.
        </p>
      )}

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
                <span
                  className={`status-pill payment-pill ${trip.paymentStatus || "pending"} payment-${trip.paymentStatus || "pending"}`}
                >
                  Payment: {trip.paymentStatus || "pending"}
                </span>
                {canManageBooking(trip) && (
                  <div className="trip-actions">
                    {canPayBooking(trip) && (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => payBooking(trip)}
                        disabled={paymentLoadingId === trip._id}
                      >
                        {paymentLoadingId === trip._id ? "Processing..." : "Pay Now"}
                      </button>
                    )}
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

      {paymentSheet && (
        <div className="modal-backdrop" onClick={closePaymentSheet}>
          <div
            className="modal-card glass-card payment-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Complete Payment</h3>
            <p>
              Paying for {paymentSheet.trip?.bike?.brand} {paymentSheet.trip?.bike?.model} | INR{" "}
              {paymentSheet.trip?.totalPrice}
            </p>

            <div className="payment-method-tabs">
              {paymentMethodOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`btn-outline ${paymentForm.method === option.key ? "active" : ""}`}
                  onClick={() =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      method: option.key,
                      error: ""
                    }))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>

            {paymentForm.method === "upi" && (
              <input
                type="text"
                name="upiId"
                value={paymentForm.upiId}
                onChange={handlePaymentField}
                placeholder="UPI ID (example: rider@oksbi)"
              />
            )}

            {paymentForm.method === "card" && (
              <div className="payment-form-grid">
                <input
                  type="text"
                  name="cardNumber"
                  value={paymentForm.cardNumber}
                  onChange={handlePaymentField}
                  placeholder="Card number (16 digits)"
                />
                <input
                  type="text"
                  name="cardName"
                  value={paymentForm.cardName}
                  onChange={handlePaymentField}
                  placeholder="Card holder name"
                />
                <input
                  type="text"
                  name="cardExpiry"
                  value={paymentForm.cardExpiry}
                  onChange={handlePaymentField}
                  placeholder="MM/YY"
                />
                <input
                  type="password"
                  name="cardCvv"
                  value={paymentForm.cardCvv}
                  onChange={handlePaymentField}
                  placeholder="CVV"
                />
              </div>
            )}

            {paymentForm.method === "netbanking" && (
              <select name="bank" value={paymentForm.bank} onChange={handlePaymentField}>
                {bankOptions.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            )}

            {paymentForm.method === "wallet" && (
              <select name="wallet" value={paymentForm.wallet} onChange={handlePaymentField}>
                {walletOptions.map((wallet) => (
                  <option key={wallet} value={wallet}>
                    {wallet}
                  </option>
                ))}
              </select>
            )}

            {paymentForm.method === "qr" && (
              <div className="payment-qr-shell">
                <div className="payment-qr-grid" />
                <p>Scan this QR with any UPI app to complete payment.</p>
              </div>
            )}

            {paymentForm.error && <p className="error-text">{paymentForm.error}</p>}

            <div className="modal-actions">
              <button type="button" className="btn-outline" onClick={closePaymentSheet}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={confirmMockPayment}
                disabled={paymentForm.submitting}
              >
                {paymentForm.submitting ? "Processing..." : "Pay Securely"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
